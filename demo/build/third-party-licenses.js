import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_NAME = 'demo-third-party-licenses';
const OUTPUT_FILE = 'THIRD_PARTY_LICENSES.txt';
const LICENSE_FILE_PATTERN = /^(licen[cs]e|copying|notice)([.-].*)?$/i;
const NODE_MODULES_MARKER = `${sep}node_modules${sep}`;
const REPOSITORY_LICENSE = resolve(fileURLToPath(new URL('../../LICENSE', import.meta.url)));

/**
 * Resolve the package directory that contains a bundled module, or null for
 * the demo's own sources.
 *
 * @param {string} moduleId
 * @returns {string | null}
 */
export function findPackageRoot(moduleId) {
  const filePath = String(moduleId).replace(/^\0/, '').split('?')[0];
  const markerIndex = filePath.lastIndexOf(NODE_MODULES_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  const prefix = filePath.slice(0, markerIndex + NODE_MODULES_MARKER.length);
  const segments = filePath.slice(prefix.length).split(sep);
  const nameSegments = segments[0].startsWith('@') ? segments.slice(0, 2) : segments.slice(0, 1);

  return join(prefix, ...nameSegments);
}

function readPackageEntry(packageRoot) {
  const manifestPath = join(packageRoot, 'package.json');

  if (!existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const licenseTexts = readdirSync(packageRoot)
    .filter(fileName => LICENSE_FILE_PATTERN.test(fileName))
    .sort()
    .map(fileName => readFileSync(join(packageRoot, fileName), 'utf8').trim());

  return {
    name: manifest.name || packageRoot,
    version: manifest.version || 'unknown',
    license: typeof manifest.license === 'string'
      ? manifest.license
      : manifest.license?.type || 'not declared',
    licenseTexts
  };
}

/**
 * Render the third-party licence file for a set of bundled module ids.
 *
 * @param {Iterable<string>} moduleIds
 * @returns {string}
 */
export function renderThirdPartyLicenses(moduleIds) {
  const packageRoots = new Set();

  for (const moduleId of moduleIds) {
    const packageRoot = findPackageRoot(moduleId);

    if (packageRoot) {
      packageRoots.add(packageRoot);
    }
  }

  const entries = [...packageRoots]
    .map(readPackageEntry)
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));
  const separator = '-'.repeat(72);
  const sections = [
    'Third-party software and content bundled in this demo',
    '',
    'The demo application itself is licensed under the MIT License:',
    '',
    readFileSync(REPOSITORY_LICENSE, 'utf8').trim(),
    '',
    'It contains the following packages. Terminology packages without a',
    'declared licence remain subject to their publishers\' terms.',
    ''
  ];

  for (const entry of entries) {
    sections.push(separator, `${entry.name}@${entry.version}`, `License: ${entry.license}`, '');

    if (entry.licenseTexts.length === 0) {
      sections.push('(No licence file is included in this package.)', '');
    } else {
      sections.push(...entry.licenseTexts.flatMap(text => [text, '']));
    }
  }

  return `${sections.join('\n').trim()}\n`;
}

/**
 * Vite plugin that writes `THIRD_PARTY_LICENSES.txt` next to the built demo,
 * covering every npm package that ends up in the bundle.
 *
 * @returns {import('vite').Plugin}
 */
export function thirdPartyLicenses() {
  return {
    name: PLUGIN_NAME,
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: OUTPUT_FILE,
        source: renderThirdPartyLicenses(this.getModuleIds())
      });
    }
  };
}
