#!/usr/bin/env node
/**
 * Import repository Markdown that has a single source of truth outside the
 * documentation site.
 *
 * The arc42 chapters live in `docs/arc42/` because they are reviewed and
 * versioned with the code. Copying them in at build time keeps one source and
 * avoids a second, silently diverging copy. The copies are generated output
 * and are not committed.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const source = join(repoRoot, 'docs', 'arc42');
const target = join(here, '..', 'src', 'content', 'docs', 'architecture');

if (!existsSync(source)) {
  console.error(`No arc42 chapters at ${source}`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

/** `01_introduction_and_goals` -> `1. Introduction and goals` */
function titleFor(basename, body) {
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/^\d+\.?\s*/, '').trim();
  const [, number, rest] = basename.match(/^(\d+)_(.+)$/) || [];
  if (!number) return basename;
  const words = rest.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function quote(value) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

const chapters = readdirSync(source).filter(name => name.endsWith('.md')).sort();
let written = 0;

for (const name of chapters) {
  const body = readFileSync(join(source, name), 'utf8');
  const basename = name.replace(/\.md$/, '');
  const [, number] = basename.match(/^(\d+)/) || [];
  const title = titleFor(basename, body);

  // Drop the top-level heading: Starlight renders the frontmatter title as h1.
  const withoutHeading = body.replace(/^#\s+.+\n+/, '');

  const frontmatter = [
    '---',
    `title: ${quote(title)}`,
    `description: ${quote(`arc42 chapter ${Number(number)} of the architecture documentation.`)}`,
    'sidebar:',
    `  order: ${Number(number)}`,
    'editUrl: false',
    '---',
    '',
    ':::note',
    'This chapter is part of the arc42 architecture documentation, maintained at',
    `[\`docs/arc42/${name}\`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/arc42/${name})`,
    'and imported here unchanged.',
    ':::',
    ''
  ].join('\n');

  writeFileSync(join(target, name), `${frontmatter}\n${withoutHeading}`);
  written += 1;
}

console.log(`Imported ${written} arc42 chapter(s) into src/content/docs/architecture/.`);
