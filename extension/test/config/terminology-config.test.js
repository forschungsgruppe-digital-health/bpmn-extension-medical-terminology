import { afterEach, describe, expect, it, vi } from 'vitest';
import { FhirProvider } from '../../src/providers/FhirProvider.js';
import { SnomedCtProvider } from '../../src/providers/SnomedCtProvider.js';
import { TerminologyRequestError } from '../../src/core/TerminologyRequestError.js';
import {
  createDefaultPackageProviders,
  createDefaultTerminologyConfig,
  createDefaultTerminologyServices
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

function getProviderIds(config = {}) {
  return createDefaultTerminologyServices({
    loaderConfig: false,
    packageAutoDiscovery: false,
    ...config
  }).terminologyRegistry.listProviders().map(provider => provider.id);
}

describe('default terminology configuration matrix', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('standard configuration registers the expected provider IDs', () => {
    const providerIds = createDefaultTerminologyServices({
      loaderConfig: false
    }).terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).toEqual(DEFAULT_PROVIDER_IDS);
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
