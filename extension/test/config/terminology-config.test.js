import { afterEach, describe, expect, it, vi } from 'vitest';
import { FhirProvider } from '../../src/providers/FhirProvider.js';
import { SnomedCtProvider } from '../../src/providers/SnomedCtProvider.js';
import { TerminologyRequestError } from '../../src/core/TerminologyRequestError.js';
import {
  createDefaultPackageProviders,
  createDefaultTerminologyConfig,
  createDefaultTerminologyServices,
  createSnomedEditionUri
} from '../../src/config/terminology-config.js';

const DEFAULT_PROVIDER_IDS = [
  'snomed-ct',
  'loinc',
  'icd-10-gm',
  'ops',
  'atc',
  'hl7-terminology-r4-package',
  'ihe-xds-class',
  'ihe-xds-type',
  'kdl'
];

const SYNTHETIC_PACKAGE_CODE_SYSTEM = {
  resourceType: 'CodeSystem',
  id: 'example-codes',
  url: 'https://example.test/CodeSystem/example-codes',
  concept: [
    {
      code: 'EXAMPLE-1',
      display: 'Example concept'
    }
  ]
};

function createSuccessfulFhirFetch() {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      expansion: {
        contains: [],
        total: 0
      }
    })
  }));
}

const BUNDLED_PROVIDER_IDS = [
  'hl7-terminology-r4-package',
  'ihe-xds-class',
  'ihe-xds-type',
  'kdl'
];

// A server and an edition chosen by the integrator; nothing is preconfigured.
const LICENSED_SERVER_CONFIG = Object.freeze({
  serverConfig: { fhirBaseUrl: 'https://fhir.example.test/fhir' },
  snomedConfig: { edition: '11000274103' }
});

function getProviderIds(config = {}) {
  return createDefaultTerminologyServices({
    loaderConfig: false,
    packageAutoDiscovery: false,
    ...LICENSED_SERVER_CONFIG,
    ...config
  }).terminologyRegistry.listProviders().map(provider => provider.id);
}

describe('default terminology configuration matrix', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('standard configuration registers only bundled providers and contacts no server', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = createDefaultTerminologyConfig();
    const providerIds = createDefaultTerminologyServices({
      loaderConfig: false
    }).terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).toEqual(BUNDLED_PROVIDER_IDS);
    expect(config.providers).toEqual([]);
    expect(config.fhirProviders).toEqual([]);
    expect(config.loaderConfig).toBe(false);
  });

  it('a configured server and SNOMED CT edition register every default provider', () => {
    expect(getProviderIds()).toEqual(DEFAULT_PROVIDER_IDS);
  });

  it('warns once when licensed providers are disabled for lack of a server', async () => {
    vi.resetModules();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const freshConfigModule = await import('../../src/config/terminology-config.js');

    freshConfigModule.createDefaultTerminologyConfig({ enablePackageDefaults: false });
    freshConfigModule.createDefaultTerminologyConfig({ enablePackageDefaults: false });

    const messages = warn.mock.calls.map(([message]) => message);
    expect(messages.filter(message => message.includes('SNOMED CT is disabled'))).toHaveLength(1);
    expect(messages.filter(message => message.includes('LOINC, ICD-10-GM, OPS, ATC are disabled')))
      .toHaveLength(1);
  });

  it('keeps SNOMED CT disabled when a server but no edition is configured', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getProviderIds({
      enablePackageDefaults: false,
      snomedConfig: {}
    })).toEqual([
      'loinc',
      'icd-10-gm',
      'ops',
      'atc'
    ]);
  });

  it('snomedConfig.edition pins search, lookup and stored version to that edition', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        expansion: { contains: [{ code: '1', display: 'Example', system: 'http://snomed.info/sct' }], total: 1 },
        parameter: [{ name: 'display', valueString: 'Example' }]
      })
    }));
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      snomedConfig: { edition: '11000274103', editionVersion: '20260815' }
    });
    const provider = config.providers[0];

    const result = await provider.search('example');
    await provider.lookup('1');

    const searchUrl = new URL(fetchFn.mock.calls[0][0]);
    const lookupUrl = new URL(fetchFn.mock.calls[1][0]);
    expect(searchUrl.searchParams.get('url'))
      .toBe('http://snomed.info/sct/11000274103/version/20260815?fhir_vs');
    expect(lookupUrl.searchParams.get('version'))
      .toBe('http://snomed.info/sct/11000274103/version/20260815');
    expect(result.concepts[0].version).toBe('http://snomed.info/sct/11000274103/version/20260815');
  });

  it('snomedConfig.edition without editionVersion leaves the version to the server', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        expansion: {
          parameter: [{
            name: 'used-codesystem',
            valueUri: 'http://snomed.info/sct|http://snomed.info/sct/11000274103/version/20260815'
          }],
          contains: [{ code: '1', display: 'Example', system: 'http://snomed.info/sct' }],
          total: 1
        }
      })
    }));
    const services = createDefaultTerminologyServices({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      packageAutoDiscovery: false,
      loaderConfig: false,
      fetchFn
    });
    const registry = services.terminologyRegistry;
    const provider = registry.getProvider('snomed-ct');

    expect(provider.version).toBeUndefined();

    const result = await provider.search('example');
    await provider.lookup('1');

    const lookupUrl = new URL(fetchFn.mock.calls[1][0]);
    expect(lookupUrl.searchParams.get('version')).toBe('http://snomed.info/sct/11000274103');
    expect(result.concepts[0].version)
      .toBe('http://snomed.info/sct/11000274103/version/20260815');
    expect(registry.isCodeSystemVersionOutdated(
      'http://snomed.info/sct',
      'http://snomed.info/sct/11000274103/version/20260815'
    )).toBe(false);
  });

  it('snomedConfig.editionVersion makes the pinned release the version label', () => {
    const registry = createDefaultTerminologyServices({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      packageAutoDiscovery: false,
      loaderConfig: false,
      snomedConfig: { edition: '11000274103', editionVersion: '20260815' }
    }).terminologyRegistry;

    expect(registry.getProvider('snomed-ct').version)
      .toBe('http://snomed.info/sct/11000274103/version/20260815');
    expect(registry.isCodeSystemVersionOutdated(
      'http://snomed.info/sct',
      'http://snomed.info/sct/11000274103/version/20260815'
    )).toBe(false);
    expect(registry.isCodeSystemVersionOutdated(
      'http://snomed.info/sct',
      'http://snomed.info/sct/11000274103/version/20251115'
    )).toBe(true);
  });

  it('default FHIR providers pin no release and ATC uses the BfArM ATC-GM', () => {
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enableSnomed: false,
      enablePackageDefaults: false,
      loaderConfig: false
    });

    expect(config.fhirProviders.map(({ id, systemUri, valueSetUri }) => ({
      id,
      systemUri,
      valueSetUri
    }))).toEqual([
      { id: 'loinc', systemUri: 'http://loinc.org', valueSetUri: 'http://loinc.org/vs' },
      {
        id: 'icd-10-gm',
        systemUri: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
        valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm'
      },
      {
        id: 'ops',
        systemUri: 'http://fhir.de/CodeSystem/bfarm/ops',
        valueSetUri: 'http://fhir.de/ValueSet/bfarm/ops'
      },
      {
        id: 'atc',
        systemUri: 'http://fhir.de/CodeSystem/bfarm/atc',
        valueSetUri: 'http://fhir.de/ValueSet/bfarm/atc'
      }
    ]);
    expect(config.fhirProviders.find(provider => provider.id === 'atc').displayName).toBe('ATC');

    for (const provider of config.fhirProviders) {
      expect(provider).not.toHaveProperty('expandParameters');
      expect(provider).not.toHaveProperty('lookupParameters');
      expect(provider).not.toHaveProperty('version');
    }
  });

  it('default FHIR providers store the release the server reports', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        expansion: {
          parameter: [{
            name: 'used-codesystem',
            valueUri: 'http://fhir.de/CodeSystem/bfarm/ops|2026'
          }],
          contains: [{ code: '5-324', display: 'Example procedure' }],
          total: 1
        }
      })
    }));
    const registry = createDefaultTerminologyServices({
      ...LICENSED_SERVER_CONFIG,
      enableSnomed: false,
      enablePackageDefaults: false,
      packageAutoDiscovery: false,
      loaderConfig: false,
      fetchFn
    }).terminologyRegistry;

    const result = await registry.search('example', 'ops');
    const requestUrl = new URL(fetchFn.mock.calls[0][0]);

    expect(requestUrl.searchParams.get('url')).toBe('http://fhir.de/ValueSet/bfarm/ops');
    expect(requestUrl.searchParams.has('valueSetVersion')).toBe(false);
    expect(requestUrl.searchParams.has('system-version')).toBe(false);
    expect(registry.getProvider('ops').version).toBeUndefined();
    expect(result.concepts[0]).toMatchObject({
      system: 'http://fhir.de/CodeSystem/bfarm/ops',
      version: '2026'
    });
    expect(registry.isCodeSystemVersionOutdated('http://fhir.de/CodeSystem/bfarm/ops', '2026'))
      .toBe(false);
  });

  it('fhirProviderOverrides can pin a release with valueSetVersion', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const registry = createDefaultTerminologyServices({
      ...LICENSED_SERVER_CONFIG,
      enableSnomed: false,
      enablePackageDefaults: false,
      packageAutoDiscovery: false,
      loaderConfig: false,
      fetchFn,
      fhirProviderOverrides: [{ id: 'icd-10-gm', expandParameters: { valueSetVersion: '2026' } }]
    }).terminologyRegistry;

    await registry.search('example', 'icd-10-gm');

    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('valueSetVersion')).toBe('2026');
    expect(registry.getProvider('icd-10-gm').version).toBe('2026');
    expect(registry.isCodeSystemVersionOutdated('http://fhir.de/CodeSystem/bfarm/icd-10-gm', '2025'))
      .toBe(true);
  });

  it('rejects a SNOMED CT edition that is not a module id', () => {
    expect(() => createSnomedEditionUri('german')).toThrow(/not a module id/);
    expect(() => createSnomedEditionUri('11000274103', '2026-08-15')).toThrow(/YYYYMMDD/);
    expect(createSnomedEditionUri('900000000000207008'))
      .toBe('http://snomed.info/sct/900000000000207008');
  });

  it('accepts an explicit SNOMED CT value set instead of an edition', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      snomedConfig: { valueSetUri: 'http://snomed.info/sct/11000274103?fhir_vs=isa/404684003' }
    });

    await config.providers[0].search('example');
    await config.providers[0].lookup('1');

    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('url'))
      .toBe('http://snomed.info/sct/11000274103?fhir_vs=isa/404684003');
    // The implicit value set names the edition, so $lookup is scoped to it too.
    expect(new URL(fetchFn.mock.calls[1][0]).searchParams.get('version'))
      .toBe('http://snomed.info/sct/11000274103');
    expect(config.providers[0].version).toBeUndefined();
  });

  it('takes the version label from a release-specific SNOMED CT value set', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      snomedConfig: { valueSetUri: 'http://snomed.info/sct/11000274103/version/20260815?fhir_vs' }
    });

    await config.providers[0].lookup('1');

    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('version'))
      .toBe('http://snomed.info/sct/11000274103/version/20260815');
    expect(config.providers[0].version)
      .toBe('http://snomed.info/sct/11000274103/version/20260815');
  });

  it('keeps an explicit lookupParameters.version over the value set edition', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      snomedConfig: {
        valueSetUri: 'http://snomed.info/sct/11000274103?fhir_vs=isa/404684003',
        lookupParameters: { version: 'http://snomed.info/sct/900000000000207008' }
      }
    });

    await config.providers[0].lookup('1');

    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('version'))
      .toBe('http://snomed.info/sct/900000000000207008');
  });

  it('leaves $lookup unscoped for a SNOMED CT value set that names no edition', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      snomedConfig: { valueSetUri: 'https://example.test/ValueSet/snomed-subset' }
    });

    await config.providers[0].lookup('1');

    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.has('version')).toBe(false);
    expect(config.providers[0].version).toBeUndefined();
  });

  it('enableSnomed: false disables the complete SNOMED provider group', () => {
    expect(getProviderIds({
      enableSnomed: false,
      enablePackageDefaults: false
    })).toEqual([
      'loinc',
      'icd-10-gm',
      'ops',
      'atc'
    ]);
  });

  it('enableFhirDefaults: false disables the complete FHIR default provider group', () => {
    expect(getProviderIds({
      enableFhirDefaults: false,
      enablePackageDefaults: false
    })).toEqual([
      'snomed-ct'
    ]);
  });

  it('enablePackageDefaults: false disables bundled package providers without discovery', () => {
    expect(getProviderIds({
      enablePackageDefaults: false
    })).toEqual([
      'snomed-ct',
      'loinc',
      'icd-10-gm',
      'ops',
      'atc'
    ]);
  });

  it('disabledProviderIds disables an individual default provider', () => {
    const providerIds = getProviderIds({
      disabledProviderIds: ['ops']
    });

    expect(providerIds).toEqual(DEFAULT_PROVIDER_IDS.filter(id => id !== 'ops'));
  });

  it('serverConfig.fhirBaseUrl configures the default FHIR provider endpoint', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const services = createDefaultTerminologyServices({
      enableSnomed: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      serverConfig: {
        fhirBaseUrl: 'https://fhir-config.example.test/r4'
      }
    });

    await services.terminologyRegistry.search('example', 'loinc');

    const requestUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(requestUrl.origin).toBe('https://fhir-config.example.test');
    expect(requestUrl.pathname).toBe('/r4/ValueSet/$expand');
  });

  it('uses FHIR for the default SNOMED provider', () => {
    const config = createDefaultTerminologyConfig({
      ...LICENSED_SERVER_CONFIG,
      enablePackageDefaults: false,
      loaderConfig: false
    });

    expect(config.providers[0]).toBeInstanceOf(FhirProvider);
  });

  it('fhirProviderOverrides applies an override to the matching provider ID', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const services = createDefaultTerminologyServices({
      enableSnomed: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      fhirProviderOverrides: [{
        id: 'loinc',
        displayName: 'Example LOINC',
        baseUrl: 'https://loinc-override.example.test/fhir',
        valueSetUri: 'https://example.test/ValueSet/loinc'
      }]
    });

    const provider = services.terminologyRegistry.getProvider('loinc');
    await services.terminologyRegistry.search('example', 'loinc');

    expect(provider.displayName).toBe('Example LOINC');
    const requestUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(requestUrl.origin).toBe('https://loinc-override.example.test');
    expect(requestUrl.searchParams.get('url')).toBe('https://example.test/ValueSet/loinc');
  });

  it('snomedConfig.transport: fhir creates an FHIR-backed SNOMED provider', async () => {
    const fetchFn = createSuccessfulFhirFetch();
    const config = createDefaultTerminologyConfig({
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      snomedConfig: {
        transport: 'fhir',
        baseUrl: 'https://snomed-fhir.example.test/r4',
        edition: '11000274103',
        fetchFn
      }
    });
    const provider = config.providers[0];

    expect(provider).toBeInstanceOf(FhirProvider);
    await provider.search('example');

    const requestUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(requestUrl.origin).toBe('https://snomed-fhir.example.test');
    expect(requestUrl.pathname).toBe('/r4/ValueSet/$expand');
  });

  it('snomedConfig.transport: snowstorm creates a Snowstorm-backed SNOMED provider', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [],
        total: 0
      })
    }));
    const config = createDefaultTerminologyConfig({
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      snomedConfig: {
        transport: 'snowstorm',
        baseUrl: 'https://snowstorm.example.test/snomed-ct',
        fetchFn
      }
    });
    const provider = config.providers[0];

    expect(provider).toBeInstanceOf(SnomedCtProvider);
    await provider.search('example');

    expect(fetchFn.mock.calls[0][0]).toContain(
      'https://snowstorm.example.test/snomed-ct/MAIN/concepts'
    );
  });

  it('requires an explicit base URL for the optional Snowstorm transport', () => {
    expect(() => createDefaultTerminologyConfig({
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      snomedConfig: {
        transport: 'snowstorm'
      }
    })).toThrow(
      'SNOMED Snowstorm transport requires snomedConfig.baseUrl, ' +
      'serverConfig.snomedBaseUrl, or serverConfig.snowstormBaseUrl.'
    );
  });

  it('rejects an unsupported SNOMED transport during configuration', () => {
    expect(() => createDefaultTerminologyConfig({
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      snomedConfig: {
        transport: 'snowstom'
      }
    })).toThrow('Unsupported SNOMED transport "snowstom". Expected "fhir" or "snowstorm".');
  });

  it('enablePackageDefaults: false registers explicit packageDiscovery.packages', async () => {
    const services = createDefaultTerminologyServices({
      enablePackageDefaults: false,
      loaderConfig: false,
      packageAutoDiscovery: false,
      packageDiscovery: {
        packages: {
          'example.terminology': [SYNTHETIC_PACKAGE_CODE_SYSTEM]
        }
      }
    });

    const provider = services.terminologyRegistry.getProvider('pkg-example-terminology');

    expect(provider).toBeDefined();
    expect(services.terminologyRegistry.listProviders().map(item => item.id))
      .not.toContain('hl7-terminology-r4-package');
    await expect(services.terminologyRegistry.search('example', provider.id))
      .resolves.toMatchObject({
        total: 1,
        concepts: [{
          code: 'EXAMPLE-1',
          system: 'https://example.test/CodeSystem/example-codes'
        }]
      });
  });

  it('enablePackageDefaults: false keeps packageDiscovery.mode: whitelist filters', () => {
    const providerIds = getProviderIds({
      enableSnomed: false,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      packageDiscovery: {
        mode: 'whitelist',
        include: ['example.allowed'],
        packages: {
          'example.allowed': [SYNTHETIC_PACKAGE_CODE_SYSTEM],
          'example.blocked': [SYNTHETIC_PACKAGE_CODE_SYSTEM]
        }
      }
    });

    expect(providerIds).toEqual(['pkg-example-allowed']);
  });

  it('enablePackageDefaults: false keeps packageDiscovery.include and exclude filters', () => {
    const providerIds = getProviderIds({
      enableSnomed: false,
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      packageDiscovery: {
        include: ['*'],
        exclude: ['example.excluded'],
        packages: {
          'example.included': [SYNTHETIC_PACKAGE_CODE_SYSTEM],
          'example.excluded': [SYNTHETIC_PACKAGE_CODE_SYSTEM]
        }
      }
    });

    expect(providerIds).toEqual(['pkg-example-included']);
  });

  it('enablePackageDefaults: false with empty packageDiscovery registers no package providers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = createDefaultTerminologyConfig({
      enablePackageDefaults: false,
      packageAutoDiscovery: false,
      packageDiscovery: {
        packages: {}
      }
    });

    expect(config.packageProviders).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No terminology packages were discovered')
    );
  });

  it('enablePackageDefaults: false dedupes packageDiscovery CodeSystem URIs', () => {
    const config = createDefaultTerminologyConfig({
      enablePackageDefaults: false,
      packageAutoDiscovery: false,
      packageDiscovery: {
        packages: {
          'example.terminology': [
            SYNTHETIC_PACKAGE_CODE_SYSTEM,
            {
              ...SYNTHETIC_PACKAGE_CODE_SYSTEM,
              id: 'example-codes-duplicate'
            }
          ]
        }
      }
    });

    expect(config.packageProviders).toHaveLength(1);
    expect(config.packageProviders[0].getAll()).toHaveLength(1);
  });

  it('packageAutoDiscovery: false ignores globally exposed package providers', () => {
    const globalKey = '__FDH_TERMINOLOGY_PACKAGES__';
    const previousPackages = globalThis[globalKey];
    globalThis[globalKey] = {
      'example.global': [SYNTHETIC_PACKAGE_CODE_SYSTEM]
    };

    try {
      const providerIds = getProviderIds({
        packageAutoDiscovery: false
      });

      expect(providerIds).not.toContain('pkg-example-global');
    } finally {
      if (previousPackages === undefined) {
        delete globalThis[globalKey];
      } else {
        globalThis[globalKey] = previousPackages;
      }
    }
  });

  it('loaderConfig: false omits the dynamic terminology provider loader', () => {
    const services = createDefaultTerminologyServices({
      loaderConfig: false,
      packageAutoDiscovery: false
    });

    expect(services).not.toHaveProperty('terminologyProviderLoader');
  });

  it('server errors propagate a descriptive terminology request error', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 503
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const services = createDefaultTerminologyServices({
      enableSnomed: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn,
      serverConfig: {
        fhirBaseUrl: 'https://fhir-errors.example.test/r4'
      }
    });

    await expect(services.terminologyRegistry.search('example', 'loinc'))
      .rejects.toSatisfy(error =>
        error instanceof TerminologyRequestError
        && error.kind === 'server'
        && error.status === 503
        && error.message === 'Terminology server fhir-errors.example.test returned HTTP 503.'
      );
    expect(warn).toHaveBeenCalled();
  });
});
