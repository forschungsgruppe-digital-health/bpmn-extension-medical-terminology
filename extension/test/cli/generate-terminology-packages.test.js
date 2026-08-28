import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const cliPath = resolve(
  dirname(new URL(import.meta.url).pathname),
  '../../src/cli/generate-terminology-packages.js'
);

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
}

function createPackage(root, packageName, packageJson, files) {
  const packageDir = join(root, 'node_modules', ...packageName.split('/'));
  mkdirSync(packageDir, { recursive: true });
  writeJson(join(packageDir, 'package.json'), { name: packageName, ...packageJson });

  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = join(packageDir, relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content, 'utf-8');
  }
}

describe('fdh-terminology-discover', () => {
  const temporaryRoots = [];

  afterEach(() => {
    temporaryRoots.splice(0).forEach(root => {
      rmSync(root, { recursive: true, force: true });
    });
  });

  it('generates a plain ESM registry without a bundler', async () => {
    const root = mkdtempSync(join('/tmp', 'fdh-terminology-cli-'));
    temporaryRoots.push(root);
    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        'example.terminology': '1.2.3'
      }
    });
    createPackage(root, 'example.terminology', {
      title: 'Example Terminology',
      version: '1.2.3',
      exports: './index.js'
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-example.json': JSON.stringify({
        resourceType: 'CodeSystem',
        id: 'example',
        url: 'https://example.org/CodeSystem/example',
        concept: [{ code: 'E1', display: 'Example concept' }]
      })
    });

    const output = join(root, 'generated', 'terminology-packages.js');
    const result = spawnSync(process.execPath, [
      cliPath,
      '--root',
      root,
      '--out',
      output,
      '--package',
      'example.terminology'
    ], {
      encoding: 'utf-8'
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Generated 1 CodeSystem(s) from 1 package(s)');

    const registry = await import(`${pathToFileURL(output).href}?test=${Date.now()}`);

    expect(registry.default['example.terminology'][0]).toMatchObject({
      resourceType: 'CodeSystem',
      url: 'https://example.org/CodeSystem/example'
    });
    expect(registry.packageMetadata['example.terminology']).toEqual({
      packageName: 'example.terminology',
      title: 'Example Terminology',
      version: '1.2.3'
    });
  });
});
