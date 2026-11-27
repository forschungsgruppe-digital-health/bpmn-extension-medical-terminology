import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkDemoGates } from '../../../tools/check-demo-gates.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const workflowsDir = '.github/workflows';
const gate = 'docs/RELEASE-TESTING.md';
const optInExpression = '${{ vars.DEMO_OPT_IN_FHIR_BASE_URL }}';
const hasGit = spawnSync('git', ['--version']).status === 0;

const workflow = env => [
  'name: demo',
  'on: push',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Build demo application',
  '        env:',
  ...env.map(line => `          ${line}`),
  '        run: npm run build',
  ''
].join('\n');

const runStep = script => [
  'name: demo',
  'on: push',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Build demo application',
  '        run: |',
  ...script.map(line => `          ${line}`),
  ''
].join('\n');

describe('demo build gates', () => {
  let root;
  const write = (file, text) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'terminology-demo-gates-'));
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('accepts the workflows and committed env files of this checkout', () => {
    for (const file of readdirSync(join(repoRoot, workflowsDir))) {
      write(`${workflowsDir}/${file}`, readFileSync(join(repoRoot, workflowsDir, file), 'utf8'));
    }
    write('demo/.env.example', readFileSync(join(repoRoot, 'demo/.env.example'), 'utf8'));
    for (const file of ['package.json', 'demo/package.json', 'extension/package.json', 'docs-site/package.json']) {
      write(file, readFileSync(join(repoRoot, file), 'utf8'));
    }

    const result = checkDemoGates(root);

    expect(result.errors).toEqual([]);
    expect(result.files).toContain(`${workflowsDir}/pages.yml`);
    expect(result.files).toContain(`${workflowsDir}/docs-preview.yml`);
    expect(result.files).toContain('demo/.env.example');
    expect(result.files).toContain('demo/package.json');
  });

  it('accepts the opt-in URL from the repository variable, also quoted or in a run script', () => {
    write(`${workflowsDir}/a.yml`, workflow([`VITE_OPT_IN_FHIR_BASE_URL: ${optInExpression}`]));
    write(`${workflowsDir}/b.yaml`, workflow([`"VITE_OPT_IN_FHIR_BASE_URL": '${optInExpression}'`]));
    write(`${workflowsDir}/c.yml`, runStep([
      `VITE_OPT_IN_FHIR_BASE_URL="${optInExpression}" npm run build`,
      `echo "VITE_OPT_IN_FHIR_BASE_URL=${optInExpression}" >> "$GITHUB_ENV"`
    ]));

    expect(checkDemoGates(root).errors).toEqual([]);
  });

  it('accepts the quoted opt-in expression in flow mappings, also over several lines', () => {
    write(`${workflowsDir}/a.yml`, `env: { BASE_PATH: /demo/, VITE_OPT_IN_FHIR_BASE_URL: "${optInExpression}" }\n`);
    write(`${workflowsDir}/b.yml`, `env: { VITE_OPT_IN_FHIR_BASE_URL: '${optInExpression}', BASE_PATH: /demo/ }\n`);
    write(`${workflowsDir}/c.yml`, [
      'env: { BASE_PATH: /demo/,',
      `       VITE_OPT_IN_FHIR_BASE_URL: "${optInExpression}",`,
      '         CI: true }',
      ''
    ].join('\n'));

    expect(checkDemoGates(root).errors).toEqual([]);
  });

  it('accepts the opt-in expression followed by a more indented comment line', () => {
    write(`${workflowsDir}/pages.yml`, workflow([
      `VITE_OPT_IN_FHIR_BASE_URL: ${optInExpression}`,
      '  # Set only after the release gate.',
      'BASE_PATH: /demo/'
    ]));

    expect(checkDemoGates(root).errors).toEqual([]);
  });

  it.each([
    ['text appended to the expression', `VITE_OPT_IN_FHIR_BASE_URL=${optInExpression}https://tx.fhir.de/fhir npm run build`],
    ['text appended after the quotes', `export VITE_OPT_IN_FHIR_BASE_URL="${optInExpression}"https://tx.fhir.de/fhir`],
    ['a quoted part appended', `VITE_OPT_IN_FHIR_BASE_URL=${optInExpression}'https://tx.fhir.de/fhir' npm run build`],
    ['text appended in a GITHUB_ENV line', `echo "VITE_OPT_IN_FHIR_BASE_URL=${optInExpression} https://tx.fhir.de/fhir" >> "$GITHUB_ENV"`],
    ['text appended after a GITHUB_ENV quote', `echo "VITE_OPT_IN_FHIR_BASE_URL=${optInExpression}"https://tx.fhir.de/fhir >> "$GITHUB_ENV"`],
    ['a line continuation', `VITE_OPT_IN_FHIR_BASE_URL="${optInExpression}"\\`],
    ['an open quote', `echo "VITE_OPT_IN_FHIR_BASE_URL=${optInExpression}`],
    ['the GITHUB_ENV multi-line form', `echo 'VITE_OPT_IN_FHIR_BASE_URL<<EOF' >> "$GITHUB_ENV"`]
  ])('rejects the opt-in URL in a run script with %s', (_, line) => {
    write(`${workflowsDir}/pages.yml`, runStep([line, 'npm run build']));

    const { errors } = checkDemoGates(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${workflowsDir}/pages.yml:9:`);
    expect(errors[0]).toContain(gate);
  });

  it.each([
    ['a continuation line', [`VITE_OPT_IN_FHIR_BASE_URL: ${optInExpression}`, '  https://tx.fhir.de/fhir']],
    ['a continuation after a blank line', [`VITE_OPT_IN_FHIR_BASE_URL: ${optInExpression}`, '', '    https://tx.fhir.de/fhir']],
    ['the value on the next line', ['VITE_OPT_IN_FHIR_BASE_URL:', `  ${optInExpression}`]],
    ['a quoted value that goes on', [`VITE_OPT_IN_FHIR_BASE_URL: "${optInExpression}`, '  https://tx.fhir.de/fhir"']],
    ['a block scalar', ['VITE_OPT_IN_FHIR_BASE_URL: >-', `  ${optInExpression}`]],
    ['text after the quotes', [`VITE_OPT_IN_FHIR_BASE_URL: "${optInExpression}" https://tx.fhir.de/fhir`]]
  ])('rejects the opt-in URL as a YAML env key with %s', (_, lines) => {
    write(`${workflowsDir}/pages.yml`, workflow(lines));

    const { errors } = checkDemoGates(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${workflowsDir}/pages.yml:9:`);
    expect(errors[0]).toContain(gate);
  });

  it('rejects the opt-in URL in a flow mapping that it does not end on the line', () => {
    write(`${workflowsDir}/flow.yml`, [
      `env: { VITE_OPT_IN_FHIR_BASE_URL: "${optInExpression}" https://tx.fhir.de/fhir }`,
      `env: { BASE_PATH: /demo/, VITE_OPT_IN_FHIR_BASE_URL: ${optInExpression}`,
      '  https://tx.fhir.de/fhir }',
      ''
    ].join('\n'));

    expect(checkDemoGates(root).errors.map(error => error.split(': ')[0])).toEqual([
      `${workflowsDir}/flow.yml:1`,
      `${workflowsDir}/flow.yml:2`
    ]);
  });

  it('rejects the GITHUB_ENV multi-line form for gated names', () => {
    write(`${workflowsDir}/pages.yml`, runStep([
      'echo "VITE_OPT_IN_SNOMED_EDITION<<EOF" >> "$GITHUB_ENV"; echo 11000274103 >> "$GITHUB_ENV"; echo EOF >> "$GITHUB_ENV"',
      '{',
      "  echo 'VITE_OPT_IN_FHIR_BASE_URL<<EOF'",
      `  echo '${optInExpression}'`,
      '  echo EOF',
      '} >> "$GITHUB_ENV"'
    ]));

    const { errors } = checkDemoGates(root);

    expect(errors.map(error => error.split(': ')[0])).toEqual([
      `${workflowsDir}/pages.yml:9`,
      `${workflowsDir}/pages.yml:11`
    ]);
    expect(errors[0]).toContain('VITE_OPT_IN_SNOMED_EDITION');
    expect(errors[1]).toContain('VITE_OPT_IN_FHIR_BASE_URL');
  });

  it('rejects any other opt-in URL and names file, line and release gate', () => {
    write(`${workflowsDir}/preview.yml`, workflow(['VITE_OPT_IN_FHIR_BASE_URL: https://tx.fhir.de/fhir']));

    const { errors } = checkDemoGates(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${workflowsDir}/preview.yml:9:`);
    expect(errors[0]).toContain('VITE_OPT_IN_FHIR_BASE_URL');
    expect(errors[0]).toContain('"https://tx.fhir.de/fhir"');
    expect(errors[0]).toContain(gate);
  });

  it.each([
    ['a fallback in the expression', `VITE_OPT_IN_FHIR_BASE_URL: \${{ vars.DEMO_OPT_IN_FHIR_BASE_URL || 'https://tx.fhir.de/fhir' }}`],
    ['another variable', 'VITE_OPT_IN_FHIR_BASE_URL: ${{ vars.SOME_OTHER_URL }}'],
    ['an empty value', "VITE_OPT_IN_FHIR_BASE_URL: ''"]
  ])('rejects the opt-in URL with %s', (_, line) => {
    write(`${workflowsDir}/pages.yml`, workflow([line]));
    expect(checkDemoGates(root).errors).toHaveLength(1);
  });

  it.each([
    'VITE_OPT_IN_SNOMED_EDITION: "11000274103"',
    'VITE_OPT_IN_SNOMED_EDITION_VERSION: "20260815"',
    'VITE_FHIR_BASE_URL: https://terminology.example.org/fhir',
    'VITE_SNOMED_EDITION: ${{ vars.SNOMED_EDITION }}',
    'VITE_SNOWSTORM_BASE_URL: https://snowstorm.example.test',
    "VITE_SNOWSTORM_BRANCH: ''"
  ])('rejects the workflow env key %s with any value', line => {
    write(`${workflowsDir}/pages.yml`, workflow([line]));

    const { errors } = checkDemoGates(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${workflowsDir}/pages.yml:9:`);
    expect(errors[0]).toContain(line.split(':')[0]);
    expect(errors[0]).toContain(gate);
  });

  it('rejects assignments in run scripts and flow mappings', () => {
    write(`${workflowsDir}/pages.yml`, runStep([
      'export VITE_OPT_IN_SNOMED_EDITION=11000274103',
      'VITE_FHIR_BASE_URL=https://terminology.example.org/fhir npm run build',
      'echo "VITE_SNOMED_EDITION=11000274103" >> "$GITHUB_ENV"',
      'npm run build; VITE_SNOWSTORM_BASE_URL=https://snowstorm.example.test npm run build',
      'VITE_OPT_IN_FHIR_BASE_URL=https://tx.fhir.de/fhir npm run build'
    ]));
    write(`${workflowsDir}/flow.yml`, 'env: { CI: true, VITE_OPT_IN_SNOMED_EDITION: "11000274103" }\n');

    const { errors } = checkDemoGates(root);

    expect(errors.map(error => error.split(': ')[0])).toEqual([
      `${workflowsDir}/flow.yml:1`,
      `${workflowsDir}/pages.yml:9`,
      `${workflowsDir}/pages.yml:10`,
      `${workflowsDir}/pages.yml:11`,
      `${workflowsDir}/pages.yml:12`,
      `${workflowsDir}/pages.yml:13`
    ]);
  });

  it.each([
    ['a \\n escape in printf', ["printf 'BASE_PATH=/demo/\\nVITE_OPT_IN_SNOMED_EDITION=11000274103\\n' >> \"$GITHUB_ENV\""]],
    ['a \\n escape in echo -e', ['echo -e "BASE_PATH=/demo/\\nVITE_OPT_IN_FHIR_BASE_URL=https://tx.fhir.de/fhir" >> "$GITHUB_ENV"']],
    ['printf with the name as an argument', ["printf '%s=%s\\n' VITE_OPT_IN_SNOMED_EDITION 11000274103 >> \"$GITHUB_ENV\""]],
    ['an append', ['export VITE_OPT_IN_SNOMED_EDITION+=11000274103']],
    ['the opt-in expression appended', [`VITE_OPT_IN_FHIR_BASE_URL+=${optInExpression}`]],
    ['a default assignment', [': "${VITE_OPT_IN_FHIR_BASE_URL:=https://tx.fhir.de/fhir}"', 'export VITE_OPT_IN_FHIR_BASE_URL']],
    ['core.exportVariable', ["core.exportVariable('VITE_OPT_IN_SNOMED_EDITION', '11000274103')"]],
    ['an assignment to process.env', ["process.env['VITE_SNOMED_EDITION'] = '11000274103'"]]
  ])('rejects a gated name set in a script by %s', (_, script) => {
    write(`${workflowsDir}/pages.yml`, runStep(script));

    const { errors } = checkDemoGates(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${workflowsDir}/pages.yml:9:`);
    expect(errors[0]).toContain(gate);
  });

  it.each([
    ['a gated name', 'env: {"VITE_SNOMED_EDITION":"x"}'],
    ['the opt-in URL', 'env: {"VITE_OPT_IN_FHIR_BASE_URL":"https://tx.fhir.de/fhir"}']
  ])('rejects %s as a quoted flow mapping key without a space after the colon', (_, line) => {
    write(`${workflowsDir}/flow.yml`, `${line}\n`);

    const { errors } = checkDemoGates(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${workflowsDir}/flow.yml:1:`);
  });

  it('rejects gated names in npm scripts and local composite actions', () => {
    write('demo/package.json', JSON.stringify({
      name: 'demo',
      scripts: {
        dev: 'vite',
        build: 'VITE_OPT_IN_SNOMED_EDITION=11000274103 vite build'
      }
    }, null, 2));
    write('package.json', JSON.stringify({
      scripts: { build: 'cross-env VITE_FHIR_BASE_URL=https://terminology.example.org/fhir npm run build --workspaces' }
    }, null, 2));
    write('.github/actions/build-demo/action.yml', [
      'name: Build demo',
      'runs:',
      '  using: composite',
      '  steps:',
      '    - shell: bash',
      '      env:',
      '        VITE_SNOMED_EDITION: "11000274103"',
      '      run: npm run build',
      ''
    ].join('\n'));
    write(`${workflowsDir}/pages.yml`, runStep(['npm run build']));

    const { files, errors } = checkDemoGates(root);

    expect(files).toEqual(expect.arrayContaining([
      '.github/actions/build-demo/action.yml', 'package.json', 'demo/package.json'
    ]));
    expect(errors.map(error => error.split(': ')[0])).toEqual([
      '.github/actions/build-demo/action.yml:7',
      'package.json:3',
      'demo/package.json:5'
    ]);
  });

  it('ignores comments after an apostrophe and the prose of name and description values', () => {
    write(`${workflowsDir}/pages.yml`, [
      'name: demo',
      'on:',
      '  workflow_dispatch:',
      '    inputs:',
      '      build_ref:',
      "        description: 'Do not set VITE_OPT_IN_SNOMED_EDITION=11000274103 before BfArM confirms'",
      '        required: false',
      '      note:',
      '        description: |',
      '          VITE_SNOMED_EDITION=1 stays unset;',
      '          see the release gate.',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      "      - name: Build the demo (it's public) # never add VITE_OPT_IN_SNOMED_EDITION=11000274103",
      '        run: npm run build',
      '      - name: Build without VITE_SNOMED_EDITION=1',
      "        run: echo \"it's built\" # VITE_FHIR_BASE_URL=x",
      ''
    ].join('\n'));

    expect(checkDemoGates(root).errors).toEqual([]);
  });

  it('still checks the run script after a name or description block', () => {
    write(`${workflowsDir}/pages.yml`, [
      'jobs:',
      '  build:',
      '    steps:',
      '      - name: >-',
      '          Build the demo',
      '        run: |',
      '          VITE_SNOMED_EDITION=1 npm run build',
      ''
    ].join('\n'));

    expect(checkDemoGates(root).errors.map(error => error.split(': ')[0])).toEqual([
      `${workflowsDir}/pages.yml:7`
    ]);
  });

  it('ignores comments and reads that only mention the gated names', () => {
    write(`${workflowsDir}/pages.yml`, [
      workflow([
        '# Never set VITE_FHIR_BASE_URL, VITE_SNOMED_* or VITE_SNOWSTORM_* here.',
        '# VITE_OPT_IN_SNOMED_EDITION (SNOMED CT unlock) stays unset.',
        '# VITE_OPT_IN_FHIR_BASE_URL: https://tx.fhir.de/fhir',
        `VITE_OPT_IN_FHIR_BASE_URL: ${optInExpression} # VITE_FHIR_BASE_URL=x`,
        'OTHER_VITE_FHIR_BASE_URL: https://terminology.example.org/fhir'
      ]),
      runStep([
        '# VITE_SNOMED_EDITION=11000274103',
        'echo "VITE_FHIR_BASE_URL is ${{ env.VITE_FHIR_BASE_URL }} # not set"',
        'test -z "$VITE_SNOWSTORM_BASE_URL"',
        'npm run build # VITE_OPT_IN_SNOMED_EDITION=11000274103'
      ])
    ].join('\n'));

    expect(checkDemoGates(root).errors).toEqual([]);
  });

  it('checks root and demo env files, but not their comments', () => {
    write('.env', 'VITE_FHIR_BASE_URL=https://terminology.example.org/fhir\n');
    write('demo/.env.production', [
      '# VITE_SNOMED_EDITION=11000274103',
      'export VITE_OPT_IN_SNOMED_EDITION="11000274103" # unlock',
      'VITE_OPT_IN_FHIR_BASE_URL = https://tx.fhir.de/fhir',
      'VITE_SNOWSTORM_BRANCH: MAIN',
      'BASE_PATH=/demo/'
    ].join('\n'));
    write('demo/.env.example', '# VITE_FHIR_BASE_URL=https://tx.fhir.de/fhir\n');

    const { files, errors } = checkDemoGates(root);

    expect(files).toEqual(['.env', 'demo/.env.example', 'demo/.env.production']);
    expect(errors.map(error => error.split(': ')[0])).toEqual([
      '.env:1', 'demo/.env.production:2', 'demo/.env.production:3', 'demo/.env.production:4'
    ]);
    expect(errors.every(error => error.includes(gate))).toBe(true);
  });

  it.skipIf(!hasGit)('reads only env files that git tracks in a git checkout', () => {
    const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    expect(git('init', '-q').status).toBe(0);
    write('demo/.env.example', 'VITE_SNOMED_EDITION=11000274103\n');
    write('demo/.env.local', 'VITE_FHIR_BASE_URL=https://terminology.example.org/fhir\n');
    expect(git('add', '-f', 'demo/.env.example').status).toBe(0);

    const { files, errors } = checkDemoGates(root);

    expect(files).toEqual(['demo/.env.example']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('demo/.env.example:1:');
  });

  it('returns failure from the command line when started through a symlinked path', () => {
    const link = join(root, 'repo-link');
    symlinkSync(repoRoot, link, 'dir');
    const project = join(root, 'project');
    mkdirSync(join(project, workflowsDir), { recursive: true });
    writeFileSync(join(project, workflowsDir, 'pages.yml'), workflow(['VITE_SNOMED_EDITION: x']));

    const failed = spawnSync(process.execPath, [join(link, 'tools/check-demo-gates.mjs'), project], { encoding: 'utf8' });

    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain(`${workflowsDir}/pages.yml:9:`);
  });

  it('returns failure from the command line', () => {
    const command = join(repoRoot, 'tools/check-demo-gates.mjs');
    expect(spawnSync(process.execPath, [command, root], { encoding: 'utf8' }).status).toBe(0);

    write(`${workflowsDir}/pages.yml`, workflow(['VITE_OPT_IN_SNOMED_EDITION: "11000274103"']));
    const failed = spawnSync(process.execPath, [command, root], { encoding: 'utf8' });

    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain(`${workflowsDir}/pages.yml:9:`);
    expect(failed.stderr).toContain(gate);
  });
});
