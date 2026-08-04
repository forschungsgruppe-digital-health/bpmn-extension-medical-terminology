import { describe, expect, it, vi } from 'vitest';

describe('package presets', () => {
  it('should load and deduplicate HL7 package CodeSystems from a glob function', async () => {
    const duplicateCodeSystem = {
      id: 'v3-ActCode-copy',
      url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
    };
    const uniqueCodeSystem = {
      id: 'v3-RoleCode',
      url: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode'
    };

    const globFn = vi.fn((pattern) => {
      if (pattern === '/node_modules/hl7.terminology.r4/CodeSystem-*.json') {
        return {
          a: duplicateCodeSystem
        };
      }

      if (pattern === '../../../node_modules/hl7.terminology.r4/CodeSystem-*.json') {
        return {
          b: duplicateCodeSystem
        };
      }

      if (pattern === '../../../../../node_modules/hl7.terminology.r4/CodeSystem-*.json') {
        return {
          c: uniqueCodeSystem
        };
      }

      return {};
    });

    const { loadHl7TerminologyR4CodeSystemsFromGlob } = await import('../../src/providers/presets/index.js');
    const codeSystems = loadHl7TerminologyR4CodeSystemsFromGlob(globFn);

    expect(codeSystems).toHaveLength(2);
    expect(codeSystems).toEqual([
      duplicateCodeSystem,
      uniqueCodeSystem
    ]);
  });

  it('should warn and skip hl7 preset when no package CodeSystems are available', async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { createPackagePresetProvider } = await import('../../src/providers/presets/index.js');

    const provider = createPackagePresetProvider('hl7-terminology-r4-package', {
      codeSystems: []
    });

    expect(provider).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No CodeSystem JSON resources were found for "hl7.terminology.r4"')
    );

    warnSpy.mockRestore();
  });

  it('should provide generated HL7 CodeSystems when glob-based discovery is empty', async () => {
    const { loadHl7TerminologyR4CodeSystems } = await import('../../src/providers/presets/index.js');
    const codeSystems = loadHl7TerminologyR4CodeSystems();

    expect(codeSystems.length).toBeGreaterThan(100);
    expect(codeSystems.some((cs) => cs.url === 'http://terminology.hl7.org/CodeSystem/v3-ActCode')).toBe(true);
  });
});
