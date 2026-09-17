#!/usr/bin/env node
/**
 * Link checker for the built documentation site.
 *
 * Astro rewrites the links it generates, but not the ones written by hand in a
 * Markdown page. Under a base path — and the site is published under one — a
 * hand-written `/schema/` resolves to the domain root and 404s with no build
 * error at all. A rehype plugin prefixes them; this check proves it worked and
 * catches links to pages that do not exist.
 *
 * Usage:
 *   node tools/check-site-links.mjs [directory] [--base /prefix]
 *
 * Defaults to the assembled tree in `_site` with the published base path.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const baseFlag = args.indexOf('--base');
const base = baseFlag >= 0 ? args[baseFlag + 1] : '/bpmn-extension-medical-terminology';
const root = args.find(arg => !arg.startsWith('--') && arg !== base) || '_site';

if (!existsSync(root)) {
  console.error(`No built site at ${root}. Build it first.`);
  process.exit(2);
}

function htmlFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...htmlFiles(path));
    else if (entry.endsWith('.html')) found.push(path);
  }
  return found;
}

function resolves(target) {
  const relativePath = target.slice(base.length).replace(/^\//, '');
  // A bare directory does not resolve: GitHub Pages serves index.html or 404s.
  return [
    join(root, relativePath, 'index.html'),
    `${join(root, relativePath.replace(/\/$/, ''))}.html`,
    join(root, relativePath)
  ].some(candidate => existsSync(candidate) && statSync(candidate).isFile());
}

const pages = htmlFiles(root);
const broken = new Map();
const unprefixed = new Map();

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, target] of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
    if (/^(https?:|mailto:|data:|\/\/)/.test(target)) continue;
    if (!target.startsWith('/')) continue;
    const record = (map, key) => {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(relative(root, page));
    };
    if (target.startsWith(base)) {
      if (!resolves(target)) record(broken, target);
    } else {
      record(unprefixed, target);
    }
  }
}

const report = (label, map, hint) => {
  if (map.size === 0) return 0;
  console.error(`\n${label}: ${map.size}`);
  for (const [target, pagesUsing] of [...map].slice(0, 40)) {
    console.error(`  ${target}`);
    console.error(`    in ${[...pagesUsing].slice(0, 3).join(', ')}`);
  }
  if (hint) console.error(`\n  ${hint}`);
  return map.size;
};

const failures =
  report('Links to pages that do not exist', broken) +
  report(
    'Root-relative links missing the site base',
    unprefixed,
    `These resolve above ${base} and will 404. Check the rehype base-link plugin in docs-site/astro.config.mjs.`
  );

if (failures > 0) {
  console.error(`\nLink check failed across ${pages.length} pages.`);
  process.exit(1);
}

console.log(`Link check passed: ${pages.length} pages, no broken or unprefixed internal links.`);
