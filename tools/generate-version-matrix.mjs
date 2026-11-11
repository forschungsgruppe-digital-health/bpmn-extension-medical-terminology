#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(repoRoot, 'docs-site/src/content/docs/version-matrix.md');
const releasesPath = join(repoRoot, 'docs-site/published-versions.json');
const packageName = 'bpmn-extension-medical-terminology';
const peers = [
  'bpmn-js',
  'bpmn-js-properties-panel',
  '@bpmn-io/properties-panel'
];
const demoPackages = [
  [ 'bpmn-js', 'bpmn-js' ],
  [ 'bpmn-js-properties-panel', 'bpmn-js-properties-panel' ],
  [ '@bpmn-io/properties-panel', '@bpmn-io/properties-panel' ],
  [ 'vite', 'vite' ]
];

function readJson(source, path) {
  const contents = source === 'working tree'
    ? readFileSync(join(repoRoot, path), 'utf8')
    : execFileSync('git', [ 'show', `${source}:${path}` ], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: [ 'ignore', 'pipe', 'ignore' ]
    });
  return JSON.parse(contents);
}

function readDescriptor(source) {
  const descriptorPaths = [
    'extension/src/moddle/medical-terminology.json',
    'extension/src/moddle/clinical.json'
  ];

  for (const path of descriptorPaths) {
    try {
      return readJson(source, path);
    } catch {
      continue;
    }
  }
  throw new Error(`${source} has no recognized terminology moddle descriptor.`);
}

function getNodeVersion(source) {
  const workflow = source === 'working tree'
    ? readFileSync(join(repoRoot, '.github/workflows/validate.yml'), 'utf8')
    : execFileSync('git', [ 'show', `${source}:.github/workflows/validate.yml` ], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: [ 'ignore', 'pipe', 'ignore' ]
    });
  const match = workflow.match(/node-version:\s*(?:\[\s*)?["']?(\d+)/);
  return match ? `Node ${match[1]}` : 'Not declared';
}

function getLockedVersion(lock, name) {
  const paths = [
    `demo/node_modules/${name}`,
    `node_modules/${name}`
  ];
  const entry = paths.map(path => lock.packages?.[path]).find(Boolean);
  return entry?.version || 'Not locked';
}

function getRow(source, label) {
  const manifest = readJson(source, 'extension/package.json');
  const lock = readJson(source, 'package-lock.json');
  const descriptor = readDescriptor(source);
  const peersText = peers
    .map(name => `${name} ${manifest.peerDependencies?.[name] || 'not declared'}`)
    .join('<br>');
  const testedText = demoPackages
    .map(([ name, lockName ]) => `${name} ${getLockedVersion(lock, lockName)}`)
    .join('<br>');
  return {
    version: manifest.version,
    source: label,
    namespace: `${descriptor.prefix}: ${descriptor.uri}`,
    peers: peersText,
    tested: testedText,
    node: getNodeVersion(source)
  };
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|');
}

export function publishedVersions(npm, github) {
  const versions = new Map();
  for (const [ version, metadata ] of Object.entries(npm.versions)) {
    if (!metadata.stub) versions.set(version, [ 'npm' ]);
  }
  for (const { name } of github) {
    const registries = versions.get(name) || [];
    registries.push('GitHub Packages');
    versions.set(name, registries);
  }
  return Object.fromEntries(versions);
}

export function compareVersionsDescending(a, b) {
  const parse = version => {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
    if (!match) throw new Error(`Invalid package version: ${version}`);
    return { core: match.slice(1, 4).map(BigInt), prerelease: match[4]?.split('.') };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i]) return left.core[i] > right.core[i] ? -1 : 1;
  }
  if (!left.prerelease || !right.prerelease) {
    return left.prerelease ? 1 : right.prerelease ? -1 : 0;
  }
  for (let i = 0; i < Math.max(left.prerelease.length, right.prerelease.length); i++) {
    const x = left.prerelease[i];
    const y = right.prerelease[i];
    if (x === undefined || y === undefined) return x === undefined ? 1 : -1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return BigInt(x) > BigInt(y) ? -1 : 1;
    if (xn !== yn) return xn ? 1 : -1;
    return x > y ? -1 : 1;
  }
  return 0;
}

function refreshPublishedVersions() {
  const npm = JSON.parse(execFileSync('curl', [
    '--fail', '--silent', '--show-error', '--location',
    `https://registry.npmjs.org/%40forschungsgruppe-digital-health%2F${packageName}`
  ], { encoding: 'utf8' }));
  const github = execFileSync('gh', [
    'api', '--paginate',
    `orgs/forschungsgruppe-digital-health/packages/npm/${packageName}/versions?per_page=100`,
    '--jq', '.[].name'
  ], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(name => ({ name }));
  const versions = publishedVersions(npm, github);
  if (!Object.keys(versions).length) throw new Error('Both registries returned no published versions.');
  writeFileSync(releasesPath, `${JSON.stringify(versions, null, 2)}\n`);
}

function renderMatrix() {
  const published = JSON.parse(readFileSync(releasesPath, 'utf8'));
  const versions = Object.keys(published).sort(compareVersionsDescending);
  if (!versions.length) throw new Error('No published package versions are recorded.');
  const rows = versions.map(version => {
    const tag = `terminology-v${version}`;
    const row = getRow(tag, `${tag}<br>${published[version].join(', ')}`);
    if (row.version !== version) {
      throw new Error(`${tag} points to package version ${row.version}.`);
    }
    return row;
  });

  const lines = [
    '---',
    'title: Version matrix',
    'description: Published packages and the versions declared or resolved by their release tags.',
    '---',
    '',
    'This table lists package versions published to npm or GitHub Packages, using their Git tags.',
    'The registry snapshot is refreshed explicitly after publishing. The table separates',
    'declared compatibility ranges from the exact demo dependencies resolved in each committed',
    'lockfile. The lockfile versions are the repository\'s exercised integration stack, not an',
    'exhaustive compatibility matrix for every version in the peer ranges.',
    '',
    'The CI column reports the Node.js major configured in `validate.yml`; it does not pin the',
    'runner\'s exact Node.js or npm patch version.',
    '',
    '| Extension version | Source | Namespace URI | Declared peer ranges | Locked demo versions | CI Node |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of rows) {
    lines.push(`| ${escapeCell(row.version)} | ${escapeCell(row.source)} | \`${escapeCell(row.namespace)}\` | ${row.peers} | ${row.tested} | ${escapeCell(row.node)} |`);
  }

  lines.push(
    '',
    'After publishing, fetch all tags and refresh registry data with',
    '`node tools/generate-version-matrix.mjs --refresh` (requires `gh` with `read:packages` and',
    '`curl`). Commit the snapshot and table. Regenerate offline with `npm run docs:versions`;',
    'verify with `npm run docs:versions:check`.',
    ''
  );
  return lines.join('\n');
}

function run() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && ![ '--check', '--refresh' ].includes(args[0]))) {
    throw new Error('Usage: node tools/generate-version-matrix.mjs [--check|--refresh]');
  }

  if (args[0] === '--refresh') refreshPublishedVersions();
  const rendered = renderMatrix();
  if (args[0] === '--check') {
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== rendered) {
      console.error(`${outputPath} is out of date.`);
      console.error('Run `npm run docs:versions` and commit the result.');
      process.exitCode = 1;
      return;
    }
    console.log('Version matrix is up to date.');
    return;
  }

  writeFileSync(outputPath, rendered);
  console.log(`Wrote ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    run();
  } catch (error) {
    console.error(`generate-version-matrix: ${error.message}`);
    process.exitCode = 1;
  }
}
