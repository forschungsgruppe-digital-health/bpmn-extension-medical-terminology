import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { terminologyVitePlugin } from '../../src/vite/plugin.js';

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
}

function createPackage(root, packageName, packageJson, files = {}) {
  const packageDir = join(root, 'node_modules', ...packageName.split('/'));
  mkdirSync(packageDir, { recursive: true });
  writeJson(join(packageDir, 'package.json'), { name: packageName, ...packageJson });

  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = join(packageDir, relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content, 'utf-8');
  }

  return packageDir;
}

function createNestedPackage(parentPackageDir, packageName, packageJson, files = {}) {
  const packageDir = join(parentPackageDir, 'node_modules', ...packageName.split('/'));
  mkdirSync(packageDir, { recursive: true });
  writeJson(join(packageDir, 'package.json'), { name: packageName, ...packageJson });

  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = join(packageDir, relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content, 'utf-8');
  }

  return packageDir;
}

function createTestRoot() {
  return mkdtempSync(join(tmpdir(), 'fdh-terminology-plugin-'));
}

function runPlugin(root, options) {
  const plugin = terminologyVitePlugin(options);

  plugin.configResolved({
    root
  });

  const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
  return plugin.load(resolvedId);
}

describe('terminologyVitePlugin', () => {
  /** @type {string[]} */
  const tmpRoots = [];

  afterEach(() => {
    for (const dir of tmpRoots) {
      rmSync(dir, { recursive: true, force: true });
    }
    tmpRoots.length = 0;
  });

  it('discovers terminology packages from transitive dependencies by default', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/terminology': '0.1.0'
      }
    });

    createPackage(root, '@forschungsgruppe-digital-health/terminology', {
      exports: './src/index.js',
      dependencies: {
        'hl7.terminology.r4': '7.1.0',
        'hl7.fhir.r4.core': '4.0.1'
      }
    }, {
      'src/index.js': 'export const terminology = true;\n'
    });

    createPackage(root, 'hl7.terminology.r4', {
      exports: {
        '.': './dist/index.js'
      }
    }, {
      'dist/index.js': 'export default {};\n',
      'CodeSystem-v3-ActCode.json': '{"resourceType":"CodeSystem","url":"http://terminology.hl7.org/CodeSystem/v3-ActCode"}\n'
    });

    createPackage(root, 'hl7.fhir.r4.core', {
      exports: {
        '.': './index.js'
      }
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-should-not-load.json': '{"resourceType":"CodeSystem","url":"http://example.org/infra"}\n'
    });

    const code = runPlugin(root);

    expect(code).toContain('"hl7.terminology.r4": [');
    expect(code).toContain('CodeSystem-v3-ActCode.json');
    expect(code).not.toContain('hl7.fhir.r4.core');
  });

  it('supports disabling transitive discovery roots', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/terminology': '0.1.0'
      }
    });

    createPackage(root, '@forschungsgruppe-digital-health/terminology', {
      exports: './src/index.js',
      dependencies: {
        'hl7.terminology.r4': '7.1.0'
      }
    }, {
      'src/index.js': 'export const terminology = true;\n'
    });

    createPackage(root, 'hl7.terminology.r4', {
      exports: {
        '.': './dist/index.js'
      }
    }, {
      'dist/index.js': 'export default {};\n',
      'CodeSystem-v3-ActCode.json': '{"resourceType":"CodeSystem","url":"http://terminology.hl7.org/CodeSystem/v3-ActCode"}\n'
    });

    const code = runPlugin(root, {
      includeTransitiveFrom: []
    });

    expect(code).toContain('export default {');
    expect(code).not.toContain('"hl7.terminology.r4": [');
  });

  it('loads only explicitly selected resources from a package', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        'example-terminology': '1.0.0'
      }
    });

    createPackage(root, 'example-terminology', {
      exports: './index.js'
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-first.json': '{"resourceType":"CodeSystem","url":"http://example.org/first"}\n',
      'CodeSystem-second.json': '{"resourceType":"CodeSystem","url":"http://example.org/second"}\n'
    });

    const code = runPlugin(root, {
      packages: {
        'example-terminology': {
          include: ['http://example.org/second']
        }
      }
    });

    expect(code).toContain('CodeSystem-second.json');
    expect(code).not.toContain('CodeSystem-first.json');
  });

  it('includes every CodeSystem resource from an explicitly selected package', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        'example-terminology': '1.0.0'
      }
    });

    createPackage(root, 'example-terminology', {
      exports: './index.js'
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-first.json': '{"resourceType":"CodeSystem","url":"http://example.org/first"}\n',
      'CodeSystem-middle.json': '{"resourceType":"CodeSystem","url":"http://example.org/middle"}\n',
      'CodeSystem-last.json': '{"resourceType":"CodeSystem","url":"http://example.org/last"}\n'
    });

    const code = runPlugin(root, {
      packages: {
        'example-terminology': {
          include: ['*']
        }
      }
    });
    const importedCodeSystemFiles = code.match(/CodeSystem-[^"]+\.json/g) || [];

    expect(importedCodeSystemFiles).toHaveLength(3);
    expect(code).toContain('CodeSystem-first.json');
    expect(code).toContain('CodeSystem-last.json');
  });

  it('excludes selected resources while loading the rest of a package', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        'example-terminology': '1.0.0'
      }
    });

    createPackage(root, 'example-terminology', {
      exports: './index.js'
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-first.json': '{"resourceType":"CodeSystem","url":"http://example.org/first"}\n',
      'CodeSystem-second.json': '{"resourceType":"CodeSystem","url":"http://example.org/second"}\n'
    });

    const code = runPlugin(root, {
      packages: {
        'example-terminology': {
          exclude: ['http://example.org/second']
        }
      }
    });

    expect(code).toContain('CodeSystem-first.json');
    expect(code).not.toContain('CodeSystem-second.json');
  });

  it('throws when a selected resource URL does not exist in a package', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    createPackage(root, 'example-terminology', {
      exports: './index.js'
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-first.json': '{"resourceType":"CodeSystem","url":"http://example.org/first"}\n'
    });

    expect(() => runPlugin(root, {
      packages: {
        'example-terminology': {
          include: ['http://example.org/missing']
        }
      }
    })).toThrow(
      '[fdh-terminology] Resource selector "http://example.org/missing" not found in package "example-terminology".'
    );
  });

  it('discovers transitive packages from nested node_modules under root packages', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/terminology': '0.1.0'
      }
    });

    const terminologyPackageDir = createPackage(root, '@forschungsgruppe-digital-health/terminology', {
      exports: './src/index.js',
      dependencies: {
        'hl7.terminology.r4': '7.1.0'
      }
    }, {
      'src/index.js': 'export const terminology = true;\n'
    });

    createNestedPackage(terminologyPackageDir, 'hl7.terminology.r4', {
      exports: {
        '.': './dist/index.js'
      }
    }, {
      'dist/index.js': 'export default {};\n',
      'CodeSystem-v3-ActCode.json': '{"resourceType":"CodeSystem","url":"http://terminology.hl7.org/CodeSystem/v3-ActCode"}\n'
    });

    const code = runPlugin(root);

    expect(code).toContain('"hl7.terminology.r4": [');
    expect(code).toContain('CodeSystem-v3-ActCode.json');
  });

  it('injects discovered packages into a global by default', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {}
    });

    const plugin = terminologyVitePlugin();
    plugin.configResolved({ root });

    const transformed = plugin.transformIndexHtml('<html><head></head><body></body></html>');
    const injectedScript = transformed.tags.find(tag => tag.tag === 'script');

    expect(injectedScript.children).toContain("virtual:fdh-terminology-packages");
    expect(injectedScript.children).toContain('__FDH_TERMINOLOGY_PACKAGES__');
  });
});
