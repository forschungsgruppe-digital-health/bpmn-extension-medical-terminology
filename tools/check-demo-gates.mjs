#!/usr/bin/env node
/**
 * Release gate for the demo builds (docs/RELEASE-TESTING.md, section 7.6).
 *
 * Fails when a GitHub workflow (.github/workflows/*.yml), a local composite
 * action (.github/actions/<name>/action.yml), an npm script of a committed
 * package.json or a committed env file (.env*, demo/.env*) assigns a demo
 * terminology variable that no shared build may set:
 *
 * - VITE_FHIR_BASE_URL, VITE_SNOMED_*, VITE_SNOWSTORM_* and VITE_OPT_IN_SNOMED_*
 *   (VITE_OPT_IN_SNOMED_EDITION and its _VERSION), with any value;
 * - VITE_OPT_IN_FHIR_BASE_URL, with any value other than the repository
 *   variable expression ${{ vars.DEMO_OPT_IN_FHIR_BASE_URL }}.
 *
 * Only assignments count: YAML keys (block and flow mappings, quoted keys also
 * without a space after the colon); in run scripts and npm scripts
 * `KEY=value`, `KEY+=value`, `export KEY=value`, `${KEY:=value}`, the
 * GITHUB_ENV forms `echo "KEY=value"` and `KEY<<DELIMITER` (also after a `\n`
 * or `\t` escape, as in `printf 'A=1\nKEY=value'`), any other mention of the
 * name on a line that writes to GITHUB_ENV (such as `printf '%s=%s' KEY
 * value`), `core.exportVariable('KEY', …)` and `process.env.KEY = …`; and the
 * lines of env files. Comments, reads such as `$KEY` or `env.KEY`, and the
 * prose of `name:` and `description:` values do not count. The opt-in value
 * must be exactly the expression: the whole shell word or YAML scalar is
 * compared, so text appended to the expression, a YAML continuation line or a
 * multi-line value fails. Env and package files count only when git tracks
 * them; outside a git checkout every matching file is read.
 *
 * Usage: node tools/check-demo-gates.mjs [root]
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const RELEASE_GATE = 'docs/RELEASE-TESTING.md, section 7.6 "Freigabe-Gates"';
export const OPT_IN_VARIABLE = 'VITE_OPT_IN_FHIR_BASE_URL';
export const OPT_IN_EXPRESSION = '${{ vars.DEMO_OPT_IN_FHIR_BASE_URL }}';

const OPT_IN_EXPRESSION_PATTERN = /^\$\{\{\s*vars\.DEMO_OPT_IN_FHIR_BASE_URL\s*\}\}$/;
const NAME = '[A-Za-z_][A-Za-z0-9_]*';
const ENV_FILE_PATTERN = /^(?:demo\/)?\.env[^/]*$/;
const PACKAGE_FILE_PATTERN = /^(?:[^/]+\/)*package\.json$/;
// Keys whose values GitHub only displays, never runs.
const PROSE_KEYS = new Set(['name', 'description']);

/**
 * Rule for a variable name, or `null` when the name is not gated.
 *
 * @param {string} name
 * @returns {'forbidden' | 'opt-in' | null}
 */
export function classifyVariable(name) {
  if (name === OPT_IN_VARIABLE) return 'opt-in';
  if (name === 'VITE_FHIR_BASE_URL' || /^VITE_(?:SNOMED|SNOWSTORM|OPT_IN_SNOMED)_/.test(name)) {
    return 'forbidden';
  }
  return null;
}

/**
 * Remove a trailing `#` comment (YAML, shell and dotenv agree here: `#` at the
 * line start or after whitespace, outside quotes).
 *
 * @param {string} line
 * @returns {string}
 */
export function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === '\\' && quote === '"') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }
  return line;
}

/**
 * Remove a trailing `#` comment from a YAML line outside block scalars. Unlike
 * shell, YAML treats a quote as a quote only where it opens a scalar (at the
 * line start, after `- `, `: `, `? `, `[`, `{` or `,`), so the apostrophe in
 * `name: Build it's demo # note` is text and the comment is still removed.
 *
 * @param {string} line
 * @returns {string}
 */
export function stripYamlComment(line) {
  let quote = null;
  let previous = '';
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === '\\' && quote === '"') index += 1;
      else if (char === quote) {
        quote = null;
        previous = char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      const spaced = index > 0 && /\s/.test(line[index - 1]);
      const opensScalar = previous === '' || '[{,'.includes(previous) ||
        ('-:?'.includes(previous) && spaced) ||
        (previous === ':' && /["']/.test(line[index - 2] ?? ''));
      if (opensScalar) {
        quote = char;
        continue;
      }
    } else if (char === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
    if (!/\s/.test(char)) previous = char;
  }
  return line;
}

/**
 * For each workflow line, whether it lies inside a YAML block scalar
 * (`key: |` or `key: >`, content indented further than the key) and which key
 * owns that scalar.
 *
 * @param {string[]} lines - Raw lines, comments included.
 * @returns {{ block: boolean, key: string | null }[]}
 */
export function yamlLineContexts(lines) {
  const contexts = [];
  let block = null;
  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    if (block && (line.trim() === '' || indent > block.column)) {
      contexts.push({ block: true, key: block.key });
      continue;
    }
    block = null;
    contexts.push({ block: false, key: null });
    const start = BLOCK_SCALAR_START.exec(line);
    if (start) block = { column: start[1].length, key: start[3] };
  }
  return contexts;
}

/** First YAML key of a line outside block scalars, or `null`. */
function lineKey(line) {
  return LINE_KEY.exec(line)?.[2] ?? null;
}

function unquote(value) {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return quoted ? quoted[2].trim() : trimmed;
}

/**
 * End of the GitHub expression `${{ ... }}` that starts at `index`: the index
 * after its `}}`, -1 when it does not close on this line, or `null` when no
 * expression starts there. GitHub substitutes expressions before YAML values
 * reach the shell, so the check treats each one as a unit, quotes included.
 */
function expressionEnd(text, index) {
  if (!text.startsWith('${{', index)) return null;
  const close = text.indexOf('}}', index + 3);
  return close === -1 ? -1 : close + 2;
}

/** Shell quote (`"`, `'` or `null`) in force at `position` of a run script line. */
function shellQuoteAt(line, position) {
  let quote = null;
  for (let index = 0; index < position; index += 1) {
    const end = expressionEnd(line, index);
    if (end !== null) {
      if (end === -1 || end > position) break;
      index = end - 1;
      continue;
    }
    const char = line[index];
    if (quote === "'") {
      if (char === "'") quote = null;
    } else if (char === '\\') {
      index += 1;
    } else if (quote === '"') {
      if (char === '"') quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    }
  }
  return quote;
}

const SHELL_WORD_END = /[\s;&|`()<>]/;

/**
 * Value of a shell assignment: the whole shell word that starts at `start`
 * (right after the `=`), with its quotes removed. `quote` is the quoting in
 * force there, for an assignment inside `echo "KEY=value"`. Returns `null`
 * when the word goes on past this line (an open quote or a trailing `\`).
 */
function shellValue(line, start, quote) {
  let value = '';
  let index = start;
  while (index < line.length) {
    const end = expressionEnd(line, index);
    if (end !== null) {
      if (end === -1) return null;
      value += line.slice(index, end);
      index = end;
      continue;
    }
    const char = line[index];
    if (quote === "'") {
      if (char === "'") quote = null;
      else value += char;
    } else if (char === '\\') {
      if (index + 1 >= line.length) return null;
      value += line.slice(index, index + 2);
      index += 1;
    } else if (quote === '"') {
      if (char === '"') quote = null;
      else value += char;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (SHELL_WORD_END.test(char)) {
      break;
    } else {
      value += char;
    }
    index += 1;
  }
  return quote ? null : value;
}

/**
 * Value of a YAML key, read from `text` (everything after the `:`). In a flow
 * mapping (`env: { A: 1, B: 2 }`) the value ends at `,`, `}` or `]`; in a
 * block mapping it is the rest of the line. A quoted value is read in full,
 * `${{ ... }}` included. `value` is `null` when the value may go on past this
 * line (an open quote, a plain flow value at the end of the line), and the raw
 * text when anything but the end of a flow entry follows a quoted scalar.
 * `plain` marks a block plain scalar, which more indented lines below continue.
 *
 * @returns {{ value: string | null, plain: boolean }}
 */
function yamlValue(text, flow) {
  let index = text.length - text.trimStart().length;
  const quote = text[index];
  let value = '';
  if (quote === '"' || quote === "'") {
    for (index += 1; ; index += 1) {
      if (index >= text.length) return { value: null, plain: false };
      const char = text[index];
      if (quote === '"' && char === '\\') {
        value += text.slice(index, index + 2);
        index += 1;
      } else if (char === quote) {
        if (quote === "'" && text[index + 1] === "'") {
          value += "'";
          index += 1;
        } else {
          index += 1;
          break;
        }
      } else {
        value += char;
      }
    }
    value = value.trim();
  } else {
    let end = index;
    while (end < text.length && !(flow && /[,}\]]/.test(text[end]))) {
      const expression = expressionEnd(text, end);
      end = expression === null ? end + 1 : expression === -1 ? text.length : expression;
    }
    value = text.slice(index, end).trim();
    index = end;
  }
  const quoted = quote === '"' || quote === "'";
  const after = text.slice(index).trim();
  // Only the end of a flow entry may follow (in block context, YAML rejects it anyway).
  if (after !== '' && !/^[,}\]]/.test(after)) return { value: text.trim(), plain: false };
  // A plain flow value that reaches the end of the line may go on below.
  if (!quoted && flow && after === '') return { value: null, plain: false };
  return { value, plain: !quoted && !flow };
}

// A quoted key may be followed by its value without a space (`{"KEY":"x"}`),
// a plain key only by whitespace or the end of the line.
const YAML_KEY = new RegExp(
  `(^\\s*(?:-\\s+)?|[{,]\\s*)(?:(["'])(${NAME})\\2\\s*:|(${NAME})\\s*:(?=\\s|$))`,
  'g'
);
// Also after a `\n` or `\t` escape, as in `printf 'A=1\nKEY=value' >> "$GITHUB_ENV"`.
const SHELL_ASSIGNMENT = new RegExp(
  `(?<=^|[\\s;&|(\`'"]|\\\\[nt])(?:(?:export|readonly|local|declare|typeset)\\s+(?:-[A-Za-z]+\\s+)*)?(${NAME})(\\+?=|<<)`,
  'g'
);
// `${KEY:=value}` and `${KEY=value}` assign a default.
const PARAMETER_DEFAULT = new RegExp(`\\$\\{(${NAME}):?=`, 'g');
// actions/github-script: `core.exportVariable('KEY', value)`.
const EXPORT_VARIABLE = new RegExp(`\\bexportVariable\\(\\s*(['"\`])(${NAME})\\1`, 'g');
// JavaScript: `process.env.KEY = value`, `process.env['KEY'] = value`.
const JS_ENV_ASSIGNMENT = new RegExp(
  `\\benv(?:\\.(${NAME})|\\[\\s*(['"\`])(${NAME})\\2\\s*\\])\\s*(?:\\|\\||&&|\\?\\?)?=(?!=)`,
  'g'
);
const GATED_NAME = new RegExp(`(?<![A-Za-z0-9_])(${NAME})(?![A-Za-z0-9_])`, 'g');
const BLOCK_SCALAR_START = /^(\s*(?:-\s+)*)(["']?)([^\s:'"#{}[\],]+)\2\s*:\s*[|>][1-9+-]*\s*(?:#.*)?$/;
const LINE_KEY = /^\s*(?:-\s+)*(["']?)([^\s:'"#{}[\],]+)\1\s*:(?=\s|$)/;

/** Value of `${KEY:=value}` from `start` (after the `=`) to its `}`, or `null`. */
function parameterDefaultValue(line, start) {
  for (let index = start; index < line.length; index += 1) {
    const end = expressionEnd(line, index);
    if (end === -1) return null;
    if (end !== null) {
      index = end - 1;
    } else if (line[index] === '}') {
      return unquote(line.slice(start, index));
    }
  }
  return null;
}

/**
 * Shell and JavaScript assignments on one run script or npm script line.
 *
 * @param {string} line - The line without its comment.
 * @returns {{ name: string, value: string | null, form?: string }[]}
 */
export function shellAssignments(line) {
  const found = [];
  const assigned = new Set();
  for (const match of line.matchAll(SHELL_ASSIGNMENT)) {
    const [, name, operator] = match;
    assigned.add(match.index + match[0].length - operator.length - name.length);
    // GITHUB_ENV multi-line form: `KEY<<DELIMITER`, the value follows on later lines.
    const value = operator === '<<'
      ? null
      : shellValue(line, match.index + match[0].length, shellQuoteAt(line, match.index));
    found.push(operator === '+=' ? { name, value, form: 'an append (+=)' } : { name, value });
  }
  for (const match of line.matchAll(PARAMETER_DEFAULT)) {
    assigned.add(match.index + 2);
    found.push({
      name: match[1],
      value: parameterDefaultValue(line, match.index + match[0].length),
      form: 'a default assignment (${NAME:=value})'
    });
  }
  for (const match of line.matchAll(EXPORT_VARIABLE)) {
    assigned.add(match.index + match[0].length - match[2].length - 1);
    found.push({ name: match[2], value: null, form: 'core.exportVariable' });
  }
  for (const match of line.matchAll(JS_ENV_ASSIGNMENT)) {
    const name = match[1] ?? match[3];
    assigned.add(match.index + match[0].indexOf(name));
    found.push({ name, value: null, form: 'a JavaScript assignment to process.env' });
  }
  // A line that writes to GITHUB_ENV in another form, such as
  // `printf '%s=%s\n' KEY value >> "$GITHUB_ENV"`: every other mention of a
  // gated name that is not a read ($KEY, ${KEY…}, env.KEY) counts.
  if (/GITHUB_ENV/.test(line)) {
    for (const match of line.matchAll(GATED_NAME)) {
      if (!classifyVariable(match[1]) || assigned.has(match.index)) continue;
      if (/(?:\$\{?|\benv\.)$/.test(line.slice(0, match.index))) continue;
      found.push({ name: match[1], value: null, form: 'a GITHUB_ENV write that the check cannot read' });
    }
  }
  return found;
}

/**
 * Assignments on one workflow line: YAML keys (block or flow mappings) and,
 * unless `shell` is false (the prose of a `name:` or `description:` value),
 * shell and JavaScript assignments in scripts. `value` is `null` when the
 * value cannot be read from this line alone. `column` is set for a YAML block
 * plain scalar: a following line indented further than that column continues
 * the value.
 *
 * @param {string} line - The line without its comment.
 * @param {{ shell?: boolean }} [options]
 * @returns {{ name: string, value: string | null, column?: number, form?: string }[]}
 */
export function workflowAssignments(line, { shell = true } = {}) {
  const found = [];
  for (const match of line.matchAll(YAML_KEY)) {
    const flow = /[{,]$/.test(match[1].trim());
    const { value, plain } = yamlValue(line.slice(match.index + match[0].length), flow);
    const assignment = { name: match[3] ?? match[4], value };
    if (plain) assignment.column = match.index + match[1].length;
    found.push(assignment);
  }
  if (shell) found.push(...shellAssignments(line));
  return found;
}

/** Whether a line after `index` indented further than `column` continues a plain scalar. */
function continuesBelow(lines, index, column) {
  for (let next = index + 1; next < lines.length; next += 1) {
    const text = lines[next];
    if (text.trim() === '') continue; // blank and comment-only lines
    return text.length - text.trimStart().length > column;
  }
  return false;
}

/**
 * Assignment on one env file line (dotenv syntax: `KEY=value`,
 * `export KEY=value`, `KEY: value`).
 *
 * @param {string} line - The line without its comment.
 * @returns {{ name: string, value: string }[]}
 */
export function envFileAssignments(line) {
  const match = new RegExp(`^\\s*(?:export\\s+)?(${NAME})(?:\\s*=|:(?=\\s|$))(.*)$`).exec(line);
  return match ? [{ name: match[1], value: unquote(match[2]) }] : [];
}

function listFiles(root, directory, accept) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute)
    .filter(name => accept(name) && statSync(join(absolute, name)).isFile())
    .map(name => (directory ? `${directory}/${name}` : name))
    .sort();
}

function envFiles(root) {
  if (existsSync(join(root, '.git'))) {
    const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
    if (!tracked.error && tracked.status === 0) {
      return tracked.stdout.split('\0')
        .filter(path => ENV_FILE_PATTERN.test(path) && existsSync(join(root, path)))
        .sort();
    }
  }
  const isEnvFile = name => name.startsWith('.env');
  return [...listFiles(root, '', isEnvFile), ...listFiles(root, 'demo', isEnvFile)];
}

function workflowFiles(root) {
  return listFiles(root, '.github/workflows', name => /\.ya?ml$/.test(name));
}

/** Local composite actions, `.github/actions/<name>/action.yml`, at any depth. */
function actionFiles(root, directory = '.github/actions') {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).sort().flatMap(name => {
    const path = `${directory}/${name}`;
    if (statSync(join(root, path)).isDirectory()) return actionFiles(root, path);
    return /^action\.ya?ml$/.test(name) ? [path] : [];
  });
}

function packageFiles(root) {
  if (existsSync(join(root, '.git'))) {
    const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
    if (!tracked.error && tracked.status === 0) {
      return tracked.stdout.split('\0')
        .filter(path => PACKAGE_FILE_PATTERN.test(path) && !path.split('/').includes('node_modules') &&
          existsSync(join(root, path)))
        .sort();
    }
  }
  const nested = readdirSync(root)
    .filter(name => name !== 'node_modules' && !name.startsWith('.') &&
      statSync(join(root, name)).isDirectory() && existsSync(join(root, name, 'package.json')))
    .map(name => `${name}/package.json`);
  return [...(existsSync(join(root, 'package.json')) ? ['package.json'] : []), ...nested.sort()];
}

/**
 * Assignments in the npm scripts of a package.json, with the line of each
 * script.
 *
 * @param {string} text
 * @returns {{ line: number, assignments: ReturnType<typeof shellAssignments> }[]}
 */
function packageScriptAssignments(text) {
  const scripts = JSON.parse(text).scripts;
  if (!scripts || typeof scripts !== 'object') return [];
  const lines = text.split(/\r?\n/);
  const scriptsLine = Math.max(0, lines.findIndex(line => /^\s*"scripts"\s*:/.test(line)));
  return Object.entries(scripts)
    .filter(([, command]) => typeof command === 'string')
    .map(([name, command]) => {
      const key = `${JSON.stringify(name)}:`;
      const offset = lines.slice(scriptsLine).findIndex(line => line.replace(/\s/g, '').startsWith(key));
      return {
        line: (offset === -1 ? scriptsLine : scriptsLine + offset) + 1,
        assignments: shellAssignments(command)
      };
    });
}

function describeViolation({ name, value, form }) {
  const shown = value === null
    ? 'a value that continues past this line (multi-line YAML, an open quote, a trailing ' +
      'backslash or GITHUB_ENV KEY<<DELIMITER)'
    : value === '' ? 'an empty value' : JSON.stringify(value);
  const how = form ? `set by ${form}` : `set to ${shown}`;
  if (classifyVariable(name) === 'opt-in') {
    return `${name} is ${how}; only ${OPT_IN_EXPRESSION}, alone and on one line, is ` +
      'allowed, so that the maintainers switch the live search on through the repository variable';
  }
  return `${name} is ${how}; GitHub workflows, actions, npm scripts and committed env files must ` +
    'not set it at all, only a local build (demo/.env.local or the command line)';
}

function report(errors, location, assignment) {
  const rule = classifyVariable(assignment.name);
  if (!rule) return;
  if (rule === 'opt-in' && !assignment.form && assignment.value !== null &&
    OPT_IN_EXPRESSION_PATTERN.test(assignment.value)) return;
  errors.push(`${location}: ${describeViolation(assignment)}. Release gate: ${RELEASE_GATE}.`);
}

/**
 * Check the workflows, local actions, npm scripts and committed env files
 * below `root`.
 *
 * @param {string} [root]
 * @returns {{ files: string[], errors: string[] }}
 */
export function checkDemoGates(root = repoRoot) {
  const files = [];
  const errors = [];

  for (const path of [...workflowFiles(root), ...actionFiles(root)]) {
    files.push(path);
    const rawLines = readFileSync(join(root, path), 'utf8').split(/\r?\n/);
    const contexts = yamlLineContexts(rawLines);
    const lines = rawLines.map((line, index) => (contexts[index].block ? stripComment(line) : stripYamlComment(line)));
    lines.forEach((line, index) => {
      const { block, key } = contexts[index];
      // The prose of a `name: |` or `description: >` block is never run.
      if (block && PROSE_KEYS.has(key)) return;
      const shell = block || !PROSE_KEYS.has(lineKey(line));
      for (const assignment of workflowAssignments(line, { shell })) {
        if (assignment.column !== undefined && classifyVariable(assignment.name) &&
          continuesBelow(lines, index, assignment.column)) {
          assignment.value = null;
        }
        report(errors, `${path}:${index + 1}`, assignment);
      }
    });
  }

  for (const path of packageFiles(root)) {
    files.push(path);
    for (const { line, assignments } of packageScriptAssignments(readFileSync(join(root, path), 'utf8'))) {
      for (const assignment of assignments) report(errors, `${path}:${line}`, assignment);
    }
  }

  for (const path of envFiles(root)) {
    files.push(path);
    const lines = readFileSync(join(root, path), 'utf8').split(/\r?\n/).map(stripComment);
    lines.forEach((line, index) => {
      for (const assignment of envFileAssignments(line)) report(errors, `${path}:${index + 1}`, assignment);
    });
  }

  return { files, errors };
}

/**
 * Whether this module is the script Node was started with. Node resolves
 * symlinks in `import.meta.url` but not in `process.argv[1]`, so compare real
 * paths: otherwise a symlinked path would skip the check and exit 0.
 */
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1) throw new Error('Usage: node tools/check-demo-gates.mjs [root]');
    const { files, errors } = checkDemoGates(args[0] ? resolve(args[0]) : repoRoot);
    for (const error of errors) console.error(`check-demo-gates: ${error}`);
    if (!errors.length) {
      console.log(`check-demo-gates: ${files.length} workflow, action, package and env files set no gated demo variable.`);
    }
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) {
    console.error(`check-demo-gates: ${error.message}`);
    process.exitCode = 1;
  }
}
