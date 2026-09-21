#!/usr/bin/env node
/**
 * Link checker for the assembled documentation site.
 *
 * Checks root-relative and page-relative links exactly as a browser resolves
 * them under the GitHub Pages base path. It also verifies fragments against
 * ids in the target HTML document.
 *
 * Usage:
 *   node tools/check-site-links.mjs [directory] [--base /prefix]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function htmlFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(path));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

function normalizeBase(base) {
  const normalized = `/${base.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '' : normalized;
}

function pageRoute(root, page, base) {
  const file = relative(root, page).split('\\').join('/');
  const route = file.endsWith('index.html')
    ? file.slice(0, -'index.html'.length)
    : file;
  return `${base}/${route}`.replace(/\/{2,}/g, '/');
}

function targetFile(root, pathname, base) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const sitePath = decoded.slice(base.length).replace(/^\//, '');
  const localPath = resolve(root, sitePath);
  const rootPath = resolve(root);
  if (localPath !== rootPath && !localPath.startsWith(`${rootPath}/`)) return null;

  const candidates = [
    localPath,
    join(localPath, 'index.html'),
    `${localPath.replace(/\/$/, '')}.html`
  ];
  return candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile()) || null;
}

function record(map, key, page) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(page);
}

/**
 * @param {string} root
 * @param {string} configuredBase
 */
export function checkSiteLinks(root = '_site', configuredBase = '/bpmn-extension-medical-terminology') {
  if (!existsSync(root)) throw new Error(`No built site at ${root}. Build it first.`);

  const base = normalizeBase(configuredBase);
  const pages = htmlFiles(root);
  const broken = new Map();
  const unprefixed = new Map();
  const missingFragments = new Map();

  for (const page of pages) {
    const pageName = relative(root, page);
    const route = pageRoute(root, page, base);
    const html = readFileSync(page, 'utf8');

    for (const [, rawTarget] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(rawTarget)) continue;

      if (
        rawTarget.startsWith('/') &&
        rawTarget !== base &&
        !rawTarget.startsWith(`${base}/`)
      ) {
        record(unprefixed, rawTarget, pageName);
        continue;
      }

      let url;
      try {
        url = new URL(rawTarget, `https://site.invalid${route}`);
      } catch {
        record(broken, rawTarget, pageName);
        continue;
      }

      if (url.origin !== 'https://site.invalid') continue;
      if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) {
        record(unprefixed, `${rawTarget} -> ${url.pathname}`, pageName);
        continue;
      }

      const resolved = targetFile(root, url.pathname, base);
      if (!resolved) {
        record(broken, `${rawTarget} -> ${url.pathname}`, pageName);
        continue;
      }

      if (url.hash && resolved.endsWith('.html')) {
        let fragment;
        try {
          fragment = decodeURIComponent(url.hash.slice(1));
        } catch {
          record(broken, rawTarget, pageName);
          continue;
        }
        const targetHtml = readFileSync(resolved, 'utf8');
        const ids = new Set([...targetHtml.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
        if (!ids.has(fragment)) {
          record(missingFragments, `${rawTarget} -> #${fragment}`, pageName);
        }
      }
    }
  }

  return { pages, broken, unprefixed, missingFragments, base };
}

function report(label, findings, hint) {
  if (findings.size === 0) return 0;
  console.error(`\n${label}: ${findings.size}`);
  for (const [target, pagesUsing] of [...findings].slice(0, 40)) {
    console.error(`  ${target}`);
    console.error(`    in ${[...pagesUsing].slice(0, 3).join(', ')}`);
  }
  if (hint) console.error(`\n  ${hint}`);
  return findings.size;
}

function cli() {
  const args = process.argv.slice(2);
  let root = '_site';
  let base = '/bpmn-extension-medical-terminology';
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--base') {
      base = args[index + 1];
      index += 1;
    } else {
      root = args[index];
    }
  }

  let result;
  try {
    result = checkSiteLinks(root, base);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }

  const failures =
    report('Links to pages or files that do not exist', result.broken) +
    report('Links to headings that do not exist', result.missingFragments) +
    report(
      'Links escaping or missing the site base',
      result.unprefixed,
      `These resolve outside ${result.base || '/'} and will 404 on GitHub Pages.`
    );

  if (failures > 0) {
    console.error(`\nLink check failed across ${result.pages.length} pages.`);
    process.exit(1);
  }

  console.log(
    `Link check passed: ${result.pages.length} pages, ` +
    'no broken paths, fragments, or unprefixed internal links.'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  cli();
}
