import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { build, createServer as createViteServer } from 'vite';
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

  it('discovers only default preset resources from transitive dependencies', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology': '0.1.0'
      }
    });

    createPackage(root, '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology', {
      exports: './src/index.js',
      dependencies: {
        'hl7.terminology.r4': '7.1.0',
        'de.ihe-d.terminology': '3.0.1'
      }
    }, {
      'src/index.js': 'export const terminology = true;\n'
    });

    createPackage(root, 'hl7.terminology.r4', {
      exports: {
        '.': './dist/index.js'
      },
      dependencies: {
        'hl7.fhir.r4.core': '4.0.1'
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

    createNestedPackage(
      join(root, 'node_modules', '@forschungsgruppe-digital-health', 'bpmn-extension-medical-terminology'),
      'de.ihe-d.terminology',
      {
        version: '3.0.1'
      },
      {
        'CodeSystem-IHEXDSclassCode.json': '{"resourceType":"CodeSystem","url":"http://ihe-d.de/CodeSystems/IHEXDSclassCode"}\n',
        'CodeSystem-IHEXDStypeCode.json': '{"resourceType":"CodeSystem","url":"http://ihe-d.de/CodeSystems/IHEXDStypeCode"}\n',
        'CodeSystem-should-not-load.json': '{"resourceType":"CodeSystem","url":"http://example.org/extra"}\n'
      }
    );

    const code = runPlugin(root);

    expect(code).toContain('"hl7.terminology.r4": [');
    expect(code).toContain('CodeSystem-v3-ActCode.json');
    expect(code).toContain('"de.ihe-d.terminology": [');
    expect(code).toContain('CodeSystem-IHEXDSclassCode.json');
    expect(code).toContain('CodeSystem-IHEXDStypeCode.json');
    expect(code).not.toContain('"hl7.fhir.r4.core": [');
    expect(code).not.toContain('CodeSystem-should-not-load.json');
    expect(code).not.toContain('http://example.org/extra');
  });

  it('supports disabling transitive discovery roots', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology': '0.1.0'
      }
    });

    createPackage(root, '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology', {
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
        '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology': '0.1.0'
      }
    });

    const terminologyPackageDir = createPackage(root, '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology', {
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

  it('keeps different installed versions in separate generated registry entries', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology': '0.1.0',
        'hl7.terminology.r4': '6.0.2',
        'dvmd.kdl.r4': '2024.0.0'
      }
    });

    const terminologyPackageDir = createPackage(root, '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology', {
      exports: './src/index.js',
      dependencies: {
        'hl7.terminology.r4': '7.1.0',
        'dvmd.kdl.r4': '2025.0.1'
      }
    }, {
      'src/index.js': 'export const terminology = true;\n'
    });

    createPackage(root, 'hl7.terminology.r4', {
      version: '6.0.2',
      exports: './dist/index.js'
    }, {
      'dist/index.js': 'export default {};\n',
      'CodeSystem-legacy.json': '{"resourceType":"CodeSystem","url":"https://example.org/CodeSystem/acme","version":"2024.1"}\n'
    });

    createNestedPackage(terminologyPackageDir, 'hl7.terminology.r4', {
      version: '7.1.0',
      exports: './dist/index.js'
    }, {
      'dist/index.js': 'export default {};\n',
      'CodeSystem-current.json': '{"resourceType":"CodeSystem","url":"https://example.org/CodeSystem/acme","version":"2025.1"}\n'
    });
    createPackage(root, 'dvmd.kdl.r4', {
      version: '2024.0.0',
      exports: './dist/index.js'
    }, {
      'dist/index.js': 'export default {};\n',
      'codesystem-kdl.xml.json': '{"resourceType":"CodeSystem","url":"http://dvmd.de/fhir/CodeSystem/kdl","version":"2024"}\n'
    });
    createNestedPackage(terminologyPackageDir, 'dvmd.kdl.r4', {
      version: '2025.0.1',
      exports: './dist/index.js'
    }, {
      'dist/index.js': 'export default {};\n',
      'codesystem-kdl.xml.json': '{"resourceType":"CodeSystem","url":"http://dvmd.de/fhir/CodeSystem/kdl","version":"2025"}\n'
    });

    const code = runPlugin(root);

    expect(code).toContain('"hl7.terminology.r4@6.0.2": [');
    expect(code).toContain('"hl7.terminology.r4@7.1.0": [');
    expect(code).toContain('"dvmd.kdl.r4@2024.0.0": [');
    expect(code).toContain('"dvmd.kdl.r4@2025.0.1": [');
    expect(code).toContain('"version": "6.0.2"');
    expect(code).toContain('"version": "7.1.0"');
    expect(code).toContain('"version": "2024.0.0"');
    expect(code).toContain('"version": "2025.0.1"');
    expect(code).toContain('CodeSystem-legacy.json');
    expect(code).toContain('CodeSystem-current.json');
    expect(code).toContain('codesystem-kdl.xml.json');
  });

  it('marks an identically versioned direct and transitive package as deduplicated', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {
        '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology': '0.1.0',
        'hl7.terminology.r4': '7.1.0'
      }
    });

    createPackage(root, '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology', {
      exports: './src/index.js',
      dependencies: {
        'hl7.terminology.r4': '7.1.0'
      }
    }, {
      'src/index.js': 'export const terminology = true;\n'
    });

    createPackage(root, 'hl7.terminology.r4', {
      version: '7.1.0',
      exports: './dist/index.js'
    }, {
      'dist/index.js': 'export default {};\n',
      'CodeSystem-current.json': '{"resourceType":"CodeSystem","url":"https://example.org/CodeSystem/acme"}\n'
    });

    const code = runPlugin(root);
    const registryEntries = code.match(/"hl7\.terminology\.r4": \[/g) || [];

    expect(registryEntries).toHaveLength(1);
    expect(code).toContain('"directDependency": true');
    expect(code).toContain('"transitiveDependency": true');
    expect(code).toContain('"deduplicated": true');
  });

  it('exports package metadata from package.json', () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      dependencies: {}
    });

    createPackage(root, 'acme.terminology', {
      title: 'ACME Terminology',
      version: '1.2.3',
      exports: './index.js'
    }, {
      'index.js': 'export default {};\n',
      'CodeSystem-custom.json': '{"resourceType":"CodeSystem","url":"https://example.org/CodeSystem/custom"}\n'
    });

    const code = runPlugin(root, {
      packages: ['acme.terminology']
    });

    expect(code).toContain('export const packageMetadata =');
    expect(code).toContain('"title": "ACME Terminology"');
    expect(code).toContain('"version": "1.2.3"');
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

    const transformed = plugin.transformIndexHtml.handler(
      '<html><head></head><body></body></html>'
    );

    expect(plugin.transformIndexHtml.order).toBe('pre');
    expect(transformed).toContain("virtual:fdh-terminology-packages");
    expect(transformed).toContain('__FDH_TERMINOLOGY_PACKAGES__');
    expect(transformed).toContain('__FDH_TERMINOLOGY_PACKAGE_METADATA__');
  });

  it('resolves the injected package registry through Vite in development and production', async () => {
    const root = createTestRoot();
    tmpRoots.push(root);

    writeJson(join(root, 'package.json'), {
      name: 'consumer-app',
      type: 'module'
    });
    writeFileSync(
      join(root, 'index.html'),
      '<!doctype html><html><head></head><body><script type="module" src="/src/app.js"></script></body></html>',
      'utf-8'
    );
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src', 'app.js'), 'document.body.dataset.ready = "true";\n', 'utf-8');
    createPackage(root, 'acme.terminology', {
      version: '1.0.0'
    }, {
      'CodeSystem-custom.json': '{"resourceType":"CodeSystem","url":"https://example.org/CodeSystem/custom"}\n'
    });

    const plugin = terminologyVitePlugin({
      packages: ['acme.terminology']
    });
    const viteServer = await createViteServer({
      root,
      plugins: [plugin],
      configFile: false,
      logLevel: 'error',
      optimizeDeps: {
        noDiscovery: true
      },
      server: {
        host: '127.0.0.1',
        port: 0
      }
    });

    try {
      await viteServer.listen();
      const address = viteServer.httpServer.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected a TCP address for the Vite test server.');
      }

      const registry = await viteServer.ssrLoadModule(
        'virtual:fdh-terminology-packages'
      );
      const response = await fetch(`http://127.0.0.1:${address.port}/`);
      const html = await response.text();
      const htmlProxyPath = html.match(/src="([^"]*html-proxy[^"]*)"/)?.[1];

      expect(registry.default['acme.terminology']).toHaveLength(1);
      expect(registry.packageMetadata['acme.terminology']).toMatchObject({
        version: '1.0.0'
      });
      expect(response.ok).toBe(true);
      expect(html).not.toContain('virtual:fdh-terminology-packages');
      expect(htmlProxyPath, html).toBeTruthy();

      const proxyModuleResponse = await fetch(
        `http://127.0.0.1:${address.port}${htmlProxyPath}`
      );
      const proxyModule = await proxyModuleResponse.text();
      const virtualModulePath = proxyModule.match(/from "([^"]*@id[^"]*)"/)?.[1];

      expect(proxyModuleResponse.ok).toBe(true);
      expect(proxyModule).not.toContain("from 'virtual:fdh-terminology-packages'");
      expect(virtualModulePath, proxyModule).toBeTruthy();

      const virtualModuleResponse = await fetch(
        `http://127.0.0.1:${address.port}${virtualModulePath}`
      );

      expect(virtualModuleResponse.ok).toBe(true);
      await expect(virtualModuleResponse.text()).resolves.toContain('CodeSystem-custom.json');
    } finally {
      await viteServer.close();
    }

    await build({
      root,
      plugins: [terminologyVitePlugin({
        packages: ['acme.terminology']
      })],
      configFile: false,
      logLevel: 'error'
    });

    const builtHtml = readFileSync(join(root, 'dist', 'index.html'), 'utf-8');

    expect(builtHtml).not.toContain('virtual:fdh-terminology-packages');
  });
});
