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
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const source = join(repoRoot, 'docs', 'arc42');
const target = join(here, '..', 'src', 'content', 'docs', 'architecture');
const repositoryUrl = 'https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

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

/**
 * Translate links that are correct in docs/arc42 into routes that are correct
 * after the chapter has moved below /architecture/ on the generated site.
 * Repository-only documents remain links to their canonical GitHub source.
 */
function rewriteRepositoryLinks(markdown, sourceFile) {
  return markdown.replace(/(\]\()([^)]+)(\))/g, (match, opening, value, closing) => {
    const trimmed = value.trim();
    const targetMatch = trimmed.match(/^(\S+)(.*)$/);
    if (!targetMatch) return match;

    const [, rawTarget, suffix] = targetMatch;
    if (/^(?:[a-z][a-z+.-]*:|#|\/)/i.test(rawTarget)) return match;

    const [pathPart, fragment] = rawTarget.split('#', 2);
    const absoluteTarget = resolve(dirname(sourceFile), pathPart);
    const repositoryPath = relative(repoRoot, absoluteTarget).split(sep).join('/');
    if (repositoryPath.startsWith('../')) return match;

    let rewritten;
    const chapter = repositoryPath.match(/^docs\/arc42\/(.+)\.md$/);
    if (chapter) {
      rewritten = `/architecture/${chapter[1]}/`;
    } else if (repositoryPath === 'docs/ARCHITECTURE.md') {
      rewritten = '/architecture/';
    } else {
      const view = rawTarget.endsWith('/') ? 'tree' : 'blob';
      rewritten = `${repositoryUrl}/${view}/main/${repositoryPath}`;
    }

    if (fragment) rewritten += `#${fragment}`;
    return `${opening}${rewritten}${suffix}${closing}`;
  });
}

const chapters = readdirSync(source).filter(name => name.endsWith('.md')).sort();
const imported = [];
let written = 0;

for (const name of chapters) {
  const body = readFileSync(join(source, name), 'utf8');
  const basename = name.replace(/\.md$/, '');
  const [, number] = basename.match(/^(\d+)/) || [];
  const title = titleFor(basename, body);

  // Drop the top-level heading: Starlight renders the frontmatter title as h1.
  const withoutHeading = rewriteRepositoryLinks(
    body.replace(/^#\s+.+\n+/, ''),
    join(source, name)
  );

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
    'and imported here with repository-relative links adapted for the site.',
    ':::',
    ''
  ].join('\n');

  writeFileSync(join(target, name), `${frontmatter}\n${withoutHeading}`);
  imported.push({ number: Number(number), title, slug: basename });
  written += 1;
}

// A landing page, so /architecture/ resolves rather than 404ing as a bare
// sidebar group.
const indexBody = [
  '---',
  'title: "Architecture"',
  'description: "The arc42 architecture documentation for the terminology extension."',
  'editUrl: false',
  'sidebar:',
  '  order: 0',
  '---',
  '',
  'The architecture is documented with [arc42](https://arc42.org), a twelve-chapter template.',
  'The chapters are maintained in',
  '[`docs/arc42/`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/tree/main/docs/arc42)',
  'and imported here unchanged, so the repository stays the single source.',
  '',
  '| Chapter | Contents |',
  '| --- | --- |',
  ...imported.map(entry => `| [${entry.number}. ${entry.title}](/architecture/${entry.slug}/) | arc42 chapter ${entry.number} |`),
  ''
].join('\n');

writeFileSync(join(target, 'index.md'), indexBody);

console.log(`Imported ${written} arc42 chapter(s) into src/content/docs/architecture/.`);
