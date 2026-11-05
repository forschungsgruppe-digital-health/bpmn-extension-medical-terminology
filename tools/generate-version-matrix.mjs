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

function renderMatrix() {
  const tags = execFileSync('git', [
    'for-each-ref',
    '--format=%(refname:short)',
    '--sort=version:refname',
    'refs/tags/terminology-v*'
  ], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);

  if (!tags.length) {
    throw new Error('No terminology-v* release tags are available; fetch repository tags first.');
  }

  const rows = tags.map(tag => {
    const row = getRow(tag, tag);
    const tagVersion = tag.slice('terminology-v'.length);
    if (row.version !== tagVersion) {
      throw new Error(`${tag} points to package version ${row.version}.`);
    }
    return row;
  });
  rows.push(getRow('working tree', 'Current checkout'));

  const lines = [
    '---',
    'title: Version matrix',
    'description: Release history and the versions declared or resolved by each tagged checkout.',
    '---',
    '',
    'This table is generated from `terminology-v*` Git tags and the current checkout. It separates',
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
    'Regenerate with `npm run docs:versions`; verify the committed table with',
    '`npm run docs:versions:check`.',
    ''
  );
  return lines.join('\n');
}

function run() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && args[0] !== '--check')) {
    throw new Error('Usage: node tools/generate-version-matrix.mjs [--check]');
  }

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
