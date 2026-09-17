#!/usr/bin/env node
/**
 * Build a task-organised sidebar for the generated API reference.
 *
 * starlight-typedoc autogenerates its sidebar from the output directory, and
 * typedoc-plugin-markdown lays that directory out by declaration kind. The
 * result is five buckets — classes, functions, interfaces, type aliases,
 * variables — which tells a reader what a symbol IS but not what it is FOR.
 *
 * The `@category` tags on the entry point already group the reference index by
 * task. This script reads that index and turns the same grouping into sidebar
 * entries, so the navigation and the index agree and neither is hand-maintained.
 *
 * Run by `prebuild` and `predev`. If TypeDoc has never run, it is invoked once.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const index = join(repoRoot, 'docs-site', '.typedoc-out', 'README.md');
const target = join(here, '..', 'src', 'generated', 'api-sidebar.json');

if (!existsSync(index)) {
  console.log('No TypeDoc index found; running TypeDoc once to derive the API sidebar.');
  const run = spawnSync(process.execPath, [join(repoRoot, 'node_modules', 'typedoc', 'bin', 'typedoc')], {
    cwd: repoRoot,
    stdio: 'inherit'
  });
  if (run.status !== 0 || !existsSync(index)) {
    console.error('TypeDoc did not produce an index. Run `npm run docs:api` at the repository root.');
    process.exit(1);
  }
}

const markdown = readFileSync(index, 'utf8');

/** `functions/createTerminologyModule.md` -> `/api/functions/createterminologymodule/` */
function toSitePath(href) {
  const withoutExtension = href.replace(/\.md$/, '');
  return `/api/${withoutExtension.toLowerCase()}/`;
}

const groups = [];
let current = null;

for (const line of markdown.split('\n')) {
  const heading = line.match(/^##\s+(.+?)\s*$/);
  if (heading) {
    current = { label: heading[1], collapsed: true, items: [] };
    groups.push(current);
    continue;
  }
  const bullet = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)\s*$/);
  if (bullet && current) {
    current.items.push({ label: bullet[1], link: toSitePath(bullet[2]) });
  }
}

const populated = groups.filter(group => group.items.length > 0);

if (populated.length === 0) {
  console.error('Parsed no categories from the TypeDoc index. Are the @category tags still on the entry point?');
  process.exit(1);
}

// The overview page first, then one collapsed group per category.
const sidebar = [
  {
    label: 'API reference',
    collapsed: true,
    items: [{ label: 'Overview', link: '/api/' }, ...populated]
  }
];

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(sidebar, null, 2)}\n`);

const total = populated.reduce((sum, group) => sum + group.items.length, 0);
console.log(`API sidebar: ${populated.length} categories, ${total} symbols.`);
