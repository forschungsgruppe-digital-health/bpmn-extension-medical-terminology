import { describe, expect, it, vi } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { terminologyVitePlugin } from '../../src/vite/plugin.js';
import {
  discoverTerminologyPackageFiles,
  readPackageResource
} from '../../src/build-time/package-discovery.js';
import {
  EXCLUDED_HL7_CODE_SYSTEMS,
  THIRD_PARTY_IP_MARKER
} from '../../src/providers/presets/hl7-exclusions.js';

describe('terminologyVitePlugin (vanilla integration)', () => {
  it('discovers hl7.terminology.r4 for the vanilla example', () => {
    const vanillaRoot = resolve(process.cwd(), '../demo');
    const plugin = terminologyVitePlugin();

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);

    expect(code).toContain('"hl7.terminology.r4": [');
  });

  it('does not import technical FHIR dependencies during default discovery', () => {
    const vanillaRoot = resolve(process.cwd(), '../demo');
    const plugin = terminologyVitePlugin();

    plugin.configResolved({
      root: vanillaRoot
    });

    const resolvedId = plugin.resolveId('virtual:fdh-terminology-packages');
    const code = plugin.load(resolvedId);

    expect(code).not.toContain('hl7.fhir.r4.core');
    expect(code).not.toContain('hl7.fhir.uv.extensions.r4');
    expect(code.match(/CodeSystem-IHEXDS(class|type)Code\.json/g)).toHaveLength(2);
    expect(code).toContain('CodeSystem-kdl-2026-0-0.json');
  });

  it('leaves the third-party code systems of the installed hl7.terminology.r4 out', () => {
    const vanillaRoot = resolve(process.cwd(), '../demo');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    try {
      const hl7Entry = discoverTerminologyPackageFiles({ root: vanillaRoot })
        .find(entry => entry.packageName === 'hl7.terminology.r4');
      const resources = hl7Entry.resourceFiles
        .map(filename => readPackageResource(hl7Entry.packageDir, filename));
      const urls = new Set(resources.map(resource => resource.url));

      expect(urls.has('http://www.ada.org/snodent')).toBe(false);
      for (const excludedUrl of Object.keys(EXCLUDED_HL7_CODE_SYSTEMS)) {
        expect(urls.has(excludedUrl)).toBe(false);
      }
      expect(resources.some(resource =>
        String(resource.copyright || '').includes(THIRD_PARTY_IP_MARKER)
      )).toBe(false);
      // The installed package really carries them; discovery left them out.
      expect(info).toHaveBeenCalledWith(expect.stringMatching(
        /^\[fdh-terminology\] Left out \d+ third-party CodeSystem resource\(s\) of "hl7\.terminology\.r4/
      ));

      const plugin = terminologyVitePlugin();
      plugin.configResolved({ root: vanillaRoot });
      const code = plugin.load(plugin.resolveId('virtual:fdh-terminology-packages'));

      expect(code).not.toContain('CodeSystem-v3-ada-snodent.json');
      expect(code).not.toContain('CodeSystem-ADAToothSurfaceCodes.json');
      expect(code).not.toContain('CodeSystem-color-names.json');
      expect(code).not.toContain('CodeSystem-color-rgb.json');
    } finally {
      info.mockRestore();
    }
  });

  it('loads another real terminology package via explicit plugin packages', () => {
    const vanillaRoot = resolve(process.cwd(), '../demo');
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
    const vanillaRoot = resolve(process.cwd(), '../demo');
    const packageRoot = resolve(vanillaRoot, '../node_modules/hl7.fhir.r4.core');
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
    expect(code).toContain('"title": "FHIR R4 package : Core"');
    expect(code).toContain('"version": "4.0.1"');
  });
});
