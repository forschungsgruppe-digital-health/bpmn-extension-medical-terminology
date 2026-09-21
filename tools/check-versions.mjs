#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Compare release artifacts against the package in this checkout, not a remote
// "latest" version. Release PRs must also pass before their tag exists.
export function checkVersions(root = repoRoot, { tag } = {}) {
  const text = path => readFileSync(resolve(root, path), 'utf8');
  const json = path => JSON.parse(text(path));
  const version = json('extension/package.json').version;
  if (typeof version !== 'string' || !version.trim()) {
    throw new Error('extension/package.json: missing package version');
  }

  const errors = [];
  const compare = (location, actual, expected = version) => {
    if (actual !== expected) {
      errors.push(`${location}: expected ${expected}, found ${JSON.stringify(actual) ?? 'missing'}`);
    }
  };
  const lock = json('package-lock.json');
  const lintPath = 'extension/lint/bpmnlint-plugin-terminology';

  compare('.release-please-manifest.json: extension', json('.release-please-manifest.json').extension);
  compare(`${lintPath}/package.json: version`, json(`${lintPath}/package.json`).version);
  compare('extension/src/moddle/clinical.json: version', json('extension/src/moddle/clinical.json').version);
  compare('codemeta.json: version', json('codemeta.json').version);
  compare('package-lock.json: packages.extension.version', lock.packages?.extension?.version);
  compare(`package-lock.json: packages[${lintPath}].version`, lock.packages?.[lintPath]?.version);

  // CFF is YAML. Only its top-level scalar software version is relevant here;
  // cff-version describes the citation schema and must not track our release.
  const citation = text('CITATION.cff');
  const citationVersions = [...citation.matchAll(
    /^version:[ \t]*(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s#]+))[ \t]*(?:#.*)?\r?$/gm
  )];
  const citationVersion = citation.match(/^version:/gm)?.length === 1 && citationVersions.length === 1
    ? citationVersions[0].slice(1).find(value => value !== undefined)
    : undefined;
  compare('CITATION.cff: version (one top-level scalar required)', citationVersion);

  const schemaVersions = [...text('schema/clinical-semantics.xsd').matchAll(
    /<!-- extension version (\S+) \(kept in sync by Release Please\) x-release-please-version -->/g
  )];
  compare('schema/clinical-semantics.xsd: extension version',
    schemaVersions.length === 1 ? schemaVersions[0][1] : undefined);

  // The private demo keeps its own version, but its lock entry must agree.
  const demoVersion = json('demo/package.json').version;
  if (typeof demoVersion !== 'string' || !demoVersion.trim()) {
    errors.push('demo/package.json: missing demo version');
  } else {
    compare('package-lock.json: packages.demo.version', lock.packages?.demo?.version, demoVersion);
  }

  if (tag !== undefined) {
    compare('release tag', tag, `terminology-v${version}`);
  }
  return { version, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length && !(args.length === 2 && args[0] === '--tag' && args[1])) {
      throw new Error('Usage: node tools/check-versions.mjs [--tag terminology-vX.Y.Z]');
    }
    const { version, errors } = checkVersions(repoRoot, { tag: args[1] });
    for (const error of errors) console.error(`check-versions: ${error}`);
    if (!errors.length) console.log(`check-versions: release artifacts agree on ${version}.`);
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) {
    console.error(`check-versions: ${error.message}`);
    process.exitCode = 1;
  }
}
