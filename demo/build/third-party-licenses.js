import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KDL_NOTICE } from '../src/terminology-notices.js';

const PLUGIN_NAME = 'demo-third-party-licenses';
const OUTPUT_FILE = 'THIRD_PARTY_LICENSES.txt';
const LICENSE_FILE_PATTERN = /^(licen[cs]e|copying|notice)([.-].*)?$/i;
const NODE_MODULES_MARKER = `${sep}node_modules${sep}`;
const REPOSITORY_LICENSE = resolve(fileURLToPath(new URL('../../LICENSE', import.meta.url)));
// Unmodified text of https://www.gnu.org/licenses/gpl-3.0.txt. GPL-3.0
// section 4 asks to give every recipient a copy of the licence; a link alone
// does not meet this.
const GPL_3_0_LICENSE = resolve(fileURLToPath(new URL('./licenses/GPL-3.0.txt', import.meta.url)));
const LINE_WIDTH = 72;

/**
 * Packages whose manifest declares no licence although the publisher states
 * one elsewhere, by `name@version`. A new release of such a package falls
 * back to the manifest until its licence statement has been checked again.
 * `licenseFiles` supplies the licence text when the package ships none.
 */
export const LICENSE_OVERRIDES = Object.freeze({
  'dvmd.kdl.r4@2026.0.0': Object.freeze({
    license: 'GPL-3.0-or-later (stated by DVMD in the KDL 2026 guide; the package manifest declares none)',
    notice: KDL_NOTICE,
    licenseFiles: Object.freeze([ GPL_3_0_LICENSE ])
  })
});

function wrapText(text, width = LINE_WIDTH) {
  const lines = [];
  let line = '';

  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.join('\n');
}

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
  const name = manifest.name || packageRoot;
  const version = manifest.version || 'unknown';
  const override = LICENSE_OVERRIDES[`${name}@${version}`];
  const packageLicenseTexts = readdirSync(packageRoot)
    .filter(fileName => LICENSE_FILE_PATTERN.test(fileName))
    .sort()
    .map(fileName => readFileSync(join(packageRoot, fileName), 'utf8').trim());
  // Supplied licence texts keep their leading indentation: the GPL text is
  // copied verbatim.
  const suppliedLicenseTexts = packageLicenseTexts.length === 0
    ? (override?.licenseFiles || []).map(filePath => readFileSync(filePath, 'utf8').trimEnd())
    : [];

  return {
    name,
    version,
    license: override?.license || (typeof manifest.license === 'string'
      ? manifest.license
      : manifest.license?.type || 'not declared'),
    notice: override?.notice || null,
    licenseTexts: packageLicenseTexts.length > 0 ? packageLicenseTexts : suppliedLicenseTexts,
    licenseTextsSupplied: suppliedLicenseTexts.length > 0
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
    'The demo\'s own source code is licensed under the MIT License:',
    '',
    readFileSync(REPOSITORY_LICENSE, 'utf8').trim(),
    '',
    'It contains the following packages. Terminology packages without a',
    'declared licence remain subject to their publishers\' terms.',
    ''
  ];

  for (const entry of entries) {
    sections.push(separator, `${entry.name}@${entry.version}`, `License: ${entry.license}`, '');

    if (entry.notice) {
      sections.push(wrapText(entry.notice), '');
    }

    if (entry.licenseTexts.length === 0) {
      sections.push('(No licence file is included in this package.)', '');
    } else {
      if (entry.licenseTextsSupplied) {
        sections.push(wrapText('(The package includes no licence file; the demo build supplies the licence text.)'), '');
      }
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
