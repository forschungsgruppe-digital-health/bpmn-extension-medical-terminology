import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoverTerminologyPackageFiles,
  loadTerminologyPackageRegistry
} from '../../src/build-time/package-discovery.js';
import { THIRD_PARTY_IP_MARKER } from '../../src/providers/presets/hl7-exclusions.js';

const SNODENT_URL = 'http://www.ada.org/snodent';
const ACT_CODE_URL = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';

// Synthetic stand-ins for the real package files: only the canonical URL and
// the copyright text decide whether a resource is left out.
const HL7_FILES = Object.freeze({
  'CodeSystem-v3-ActCode.json': { resourceType: 'CodeSystem', url: ACT_CODE_URL },
  'CodeSystem-v3-ada-snodent.json': { resourceType: 'CodeSystem', url: SNODENT_URL },
  'CodeSystem-synthetic-third-party.json': {
    resourceType: 'CodeSystem',
    url: 'http://terminology.hl7.org/CodeSystem/synthetic-third-party',
    copyright: `Owned by a synthetic third party ${THIRD_PARTY_IP_MARKER}.`
  }
});

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
}

function createRoot({ files = HL7_FILES, withIndex = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fdh-terminology-discovery-')));
  const packageDir = join(root, 'node_modules', 'hl7.terminology.r4');

  mkdirSync(packageDir, { recursive: true });
  writeJson(join(root, 'package.json'), {
    name: 'consumer-app',
    dependencies: { 'hl7.terminology.r4': '7.1.0' }
  });
  writeJson(join(packageDir, 'package.json'), { name: 'hl7.terminology.r4', version: '7.1.0' });

  for (const [filename, resource] of Object.entries(files)) {
    writeJson(join(packageDir, filename), resource);
  }

  if (withIndex) {
    writeJson(join(packageDir, '.index.json'), {
      'index-version': 1,
      files: Object.entries(files).map(([filename, resource]) => ({
        filename,
        resourceType: resource.resourceType,
        url: resource.url
      }))
    });
  }

  return root;
}

describe('build-time package discovery of hl7.terminology.r4', () => {
  /** @type {string[]} */
  const roots = [];

  afterEach(() => {
    vi.restoreAllMocks();

    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function discover(options = {}) {
    const root = createRoot(options);
    roots.push(root);

    return discoverTerminologyPackageFiles({
      root,
      includeTransitiveFrom: [],
      ...(options.packages ? { packages: options.packages } : {})
    });
  }

  it.each([
    ['CodeSystem-*.json files', false],
    ['a .index.json', true]
  ])('leaves out third-party code systems found through %s', (_label, withIndex) => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    const entries = discover({ withIndex });

    expect(entries).toHaveLength(1);
    expect(entries[0].packageName).toBe('hl7.terminology.r4');
    expect(entries[0].resourceFiles).toEqual(['CodeSystem-v3-ActCode.json']);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toMatch(
      /^\[fdh-terminology\] Left out 2 third-party CodeSystem resource\(s\) of "hl7\.terminology\.r4/
    );
  });

  it('does not fail or log for a release without third-party code systems', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    const entries = discover({
      files: { 'CodeSystem-v3-ActCode.json': HL7_FILES['CodeSystem-v3-ActCode.json'] }
    });

    expect(entries[0].resourceFiles).toEqual(['CodeSystem-v3-ActCode.json']);
    expect(info).not.toHaveBeenCalled();
  });

  it.each([
    ['a package list', ['hl7.terminology.r4']],
    ['an include-all filter', { 'hl7.terminology.r4': { include: ['*'] } }]
  ])('keeps every resource when the package is selected explicitly with %s', (_label, packages) => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    const entries = discover({ packages });

    expect([...entries[0].resourceFiles].sort()).toEqual(Object.keys(HL7_FILES).sort());
    expect(info).not.toHaveBeenCalled();
  });

  it('loads no excluded code system into the registry', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const root = createRoot();
    roots.push(root);

    const registry = loadTerminologyPackageRegistry({ root, includeTransitiveFrom: [] });

    expect(registry.packages['hl7.terminology.r4'].map(codeSystem => codeSystem.url))
      .toEqual([ACT_CODE_URL]);
  });
});
