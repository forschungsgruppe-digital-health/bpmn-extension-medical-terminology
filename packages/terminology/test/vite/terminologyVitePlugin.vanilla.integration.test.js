import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { terminologyVitePlugin } from '../../src/vite/plugin.js';

describe('terminologyVitePlugin (vanilla integration)', () => {
  it('discovers hl7.terminology.r4 for the vanilla example', () => {
    const vanillaRoot = resolve(process.cwd(), '../../examples/vanilla');
    const plugin = terminologyVitePlugin();

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);

    expect(code).toContain('"hl7.terminology.r4": [');
  });

  it('loads another real terminology package via explicit plugin packages', () => {
    const vanillaRoot = resolve(process.cwd(), '../../examples/vanilla');
    const plugin = terminologyVitePlugin({
      packages: ['de.ihe-d.terminology']
    });

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);

    expect(code).toContain('"de.ihe-d.terminology": [');
    expect(code).toContain('CodeSystem-IHEXDSclassCode.json');
  });

  it('includes every CodeSystem resource from the installed terminology package', () => {
    const vanillaRoot = resolve(process.cwd(), '../../examples/vanilla');
    const packageRoot = resolve(vanillaRoot, '../../node_modules/hl7.fhir.r4.core');
    const codeSystemFiles = readdirSync(packageRoot)
      .filter(fileName => /^CodeSystem-.*\.json$/i.test(fileName));
    const plugin = terminologyVitePlugin({
      packages: {
        'hl7.fhir.r4.core': {
          include: ['*']
        }
      }
    });

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);
    const importedCodeSystemFiles = code.match(/CodeSystem-[^"]+\.json/g) || [];

    expect(importedCodeSystemFiles).toHaveLength(codeSystemFiles.length);
    expect(code).toContain(codeSystemFiles.at(-1));
  });
});
