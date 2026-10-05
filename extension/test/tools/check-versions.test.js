import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkVersions } from '../../../tools/check-versions.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const lintPath = 'extension/lint/bpmnlint-plugin-terminology';
const files = [
  'extension/package.json', `${lintPath}/package.json`,
  'extension/src/moddle/clinical.json', '.release-please-manifest.json',
  'package-lock.json', 'demo/package.json', 'CITATION.cff', 'codemeta.json',
  'schema/clinical-semantics.xsd'
];

describe('release version consistency', () => {
  let root;
  let version;
  const write = (file, text) => writeFileSync(join(root, file), text);
  const read = file => readFileSync(join(root, file), 'utf8');
  const updateJson = (file, update) => {
    const value = JSON.parse(read(file));
    update(value);
    write(file, JSON.stringify(value));
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'terminology-versions-'));
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      write(file, readFileSync(join(repoRoot, file), 'utf8'));
    }
    version = JSON.parse(read('extension/package.json')).version;
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('accepts the checkout and its release tag', () => {
    expect(checkVersions(root, { tag: `terminology-v${version}` }).errors).toEqual([]);
  });

  it.each([
    ['.release-please-manifest.json', value => { value.extension = '0.0.0'; }],
    [`${lintPath}/package.json`, value => { value.version = '0.0.0'; }],
    ['extension/src/moddle/clinical.json', value => { value.version = '0.0.0'; }],
    ['codemeta.json', value => { delete value.version; }],
    ['package-lock.json', value => { value.packages.extension.version = '0.0.0'; }],
    ['package-lock.json', value => { value.packages[lintPath].version = '0.0.0'; }],
    ['package-lock.json', value => { delete value.packages[lintPath]; }]
  ])('rejects drift or missing metadata in %s', (file, mutate) => {
    updateJson(file, mutate);
    expect(checkVersions(root).errors).toHaveLength(1);
    expect(checkVersions(root).errors[0]).toContain(file);
  });

  it.each([
    'cff-version: 1.2.0\nversion: "0.0.0"\n',
    'cff-version: 1.2.0\n',
    'cff-version: 1.2.0\nreferences:\n  - version: "0.0.0"\n'
  ])('rejects stale or missing software versions in CFF', content => {
    write('CITATION.cff', content);
    expect(checkVersions(root).errors[0]).toContain('CITATION.cff');
  });

  it.each(['plain', 'single', 'double'])('accepts a %s CFF scalar and trailing comment', style => {
    const scalar = style === 'single' ? `'${version}'` : style === 'double' ? `"${version}"` : version;
    write('CITATION.cff', `cff-version: 1.2.0\nversion: ${scalar} # software version\n`);
    expect(checkVersions(root).errors).toEqual([]);
  });

  it.each(['"0.0.0"', ''])('rejects duplicate CFF versions, including an empty second value', duplicate => {
    write('CITATION.cff', `${read('CITATION.cff')}\nversion: ${duplicate}\n`);
    expect(checkVersions(root).errors[0]).toContain('CITATION.cff');
  });

  it('rejects stale or missing XSD version markers', () => {
    write('schema/clinical-semantics.xsd', read('schema/clinical-semantics.xsd')
      .replace(`extension version ${version}`, 'extension version 0.0.0'));
    expect(checkVersions(root).errors[0]).toContain('schema/clinical-semantics.xsd');
    write('schema/clinical-semantics.xsd', '<!-- no release metadata -->');
    expect(checkVersions(root).errors[0]).toContain('schema/clinical-semantics.xsd');
  });

  it('allows an independent demo version but rejects its lockfile drift', () => {
    updateJson('demo/package.json', value => { value.version = '9.9.9'; });
    expect(checkVersions(root).errors[0]).toContain('packages.demo.version');
    updateJson('package-lock.json', value => { value.packages.demo.version = '9.9.9'; });
    expect(checkVersions(root).errors).toEqual([]);
  });

  it('accepts a future release without changing the namespace or CFF schema version', () => {
    for (const file of files.filter(file => file !== 'demo/package.json')) {
      write(file, read(file).replaceAll(version, '2.0.0-rc.1'));
    }
    expect(checkVersions(root).errors).toEqual([]);
    expect(JSON.parse(read('extension/src/moddle/clinical.json')).uri).toContain('/v1');
    expect(read('CITATION.cff')).toContain('cff-version: 1.2.0');
  });

  it('rejects tags that do not identify the checked package release', () => {
    expect(checkVersions(root, { tag: 'terminology-v0.0.0' }).errors[0]).toContain('release tag');
    expect(checkVersions(root, { tag: `v${version}` }).errors[0]).toContain('release tag');
  });

  it('runs independently of the working directory and returns failure for mismatched tags', () => {
    const command = join(repoRoot, 'tools/check-versions.mjs');
    expect(spawnSync(process.execPath, [command], { cwd: root }).status).toBe(0);
    const failed = spawnSync(process.execPath, [command, '--tag', 'terminology-v0.0.0'], {
      cwd: root, encoding: 'utf8'
    });
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('release tag');
  });
});
