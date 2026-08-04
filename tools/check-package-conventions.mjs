#!/usr/bin/env node
/**
 * Publishing-convention check for the workspace packages (BLOCKING on errors).
 *
 * Verifies the bpmn.io / npm conventions for each publishable package under
 * `packages/*`:
 *
 *   ERROR (exit 1):
 *     - name uses an accepted prefix:
 *         @forschungsgruppe-digital-health/*  |  bpmn-js-*  |  bpmnlint-plugin-*
 *     - "type": "module"            (the repo ships raw ESM, no build step)
 *     - a license is declared
 *     - has an entry point          (main and/or exports)
 *
 *   WARN (exit 0):
 *     - no `exports` map            (recommended over bare `main`)
 *     - no peerDependencies         (bpmn-js modules should declare bpmn-js etc.)
 *     - no repository.directory     (monorepo provenance)
 *     - no publishConfig.registry   (target registry for `npm publish`)
 *
 * Packages marked `"private": true` (root, demo app) are skipped for the
 * publish-specific rules but still must be ESM.
 *
 * Usage: node tools/check-package-conventions.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(repoRoot, 'packages');

const ACCEPTED_NAME = (name) =>
  name.startsWith('@forschungsgruppe-digital-health/') ||
  name.startsWith('bpmn-js-') ||
  name.startsWith('bpmnlint-plugin-');

function listPackageJsons() {
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir)
    .map((name) => join(packagesDir, name))
    .filter((p) => statSync(p).isDirectory())
    .map((p) => join(p, 'package.json'))
    .filter((p) => existsSync(p));
}

let errors = 0;
let warnings = 0;
const err = (pkg, msg) => {
  console.log(`  ✖ ${pkg}: ${msg}`);
  errors++;
};
const warn = (pkg, msg) => {
  console.log(`  ⚠ ${pkg}: ${msg}`);
  warnings++;
};

const files = listPackageJsons();
if (!files.length) {
  console.log('check-package-conventions: no packages/* found — nothing to check.');
  process.exit(0);
}

console.log(`check-package-conventions: checking ${files.length} package(s)…\n`);

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const label = pkg.name || file;
  console.log(`• ${label}`);

  // ESM is required for every package (incl. private ones).
  if (pkg.type !== 'module') err(label, 'missing "type": "module" (the repo ships raw ESM)');

  if (pkg.private === true) {
    console.log('    (private — skipping publish-specific checks)');
    continue;
  }

  if (!pkg.name) err(label, 'missing "name"');
  else if (!ACCEPTED_NAME(pkg.name))
    err(
      label,
      `name "${pkg.name}" does not match an accepted prefix ` +
        '(@forschungsgruppe-digital-health/*, bpmn-js-*, bpmnlint-plugin-*)'
    );

  if (!pkg.license) err(label, 'missing "license"');

  if (!pkg.main && !pkg.exports) err(label, 'no entry point (neither "main" nor "exports")');
  else if (!pkg.exports) warn(label, 'no "exports" map — recommended over bare "main"');

  if (!pkg.peerDependencies) warn(label, 'no "peerDependencies" (bpmn-js modules should declare them)');
  if (!pkg.repository || !pkg.repository.directory)
    warn(label, 'no "repository.directory" — set it for monorepo provenance');
  if (!pkg.publishConfig || !pkg.publishConfig.registry)
    warn(label, 'no "publishConfig.registry" — set the target registry for `npm publish`');
}

console.log(`\ncheck-package-conventions: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors ? 1 : 0);
