import { describe, expect, it, vi } from 'vitest';
import { FhirProvider } from '../../src/providers/FhirProvider.js';
import { SnomedCtProvider } from '../../src/providers/SnomedCtProvider.js';
import {
  createPackageCollectionProvider,
  createPackageFallbackProvider,
  createPackageTerminologyProvider,
  createTerminologyModule,
  createTerminologyServices
} from '../../src/services/TerminologyServices.js';
import {
  createDefaultPackageProviders,
  createDefaultTerminologyConfig,
  createDefaultTerminologyServices
} from '../../src/config/terminology-config.js';

const actCodeCodeSystem = {
  resourceType: 'CodeSystem',
  id: 'v3-ActCode',
  url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  title: 'HL7 v3 ActCode',
  concept: [
    { code: 'AA', display: 'Adjudicated with adjustments' }
  ]
};

describe('TerminologyServices', () => {
  it('should create a package-backed static provider', async () => {
    const provider = createPackageTerminologyProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      codeSystem: actCodeCodeSystem
    });

    expect(provider.id).toBe('hl7-v3-actcode');
    await expect(provider.lookup('AA')).resolves.toMatchObject({
      code: 'AA',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
    });
  });

  it('should create a dual-track package/fhir fallback provider', async () => {
    const provider = createPackageFallbackProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      codeSystem: actCodeCodeSystem,
      fallbackFhirConfig: {
        id: 'hl7-v3-actcode-fhir',
        displayName: 'HL7 v3 ActCode (FHIR)',
        systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
        baseUrl: 'https://fhir.example.com'
      }
    });

    expect(provider.id).toBe('hl7-v3-actcode');
    await expect(provider.lookup('AA')).resolves.toMatchObject({
      code: 'AA',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
    });
  });

  it('should create one aggregate provider from many package CodeSystems', async () => {
    const provider = createPackageCollectionProvider({
      id: 'hl7-package',
      displayName: 'HL7 Terminology (Package)',
      codeSystems: [
        actCodeCodeSystem,
        {
          resourceType: 'CodeSystem',
          id: 'v2-0203',
          url: 'http://terminology.hl7.org/CodeSystem/v2-0203',
          concept: [
            { code: 'MR', display: 'Medical record number' }
          ]
        }
      ]
    });

    const result = await provider.search('medical');

    expect(provider.systemUri).toBe('package:hl7-package');
    expect(result.total).toBe(1);
    expect(result.concepts[0]).toMatchObject({
      code: 'MR',
      system: 'http://terminology.hl7.org/CodeSystem/v2-0203'
    });
  });

  it('should preserve CodeSystem versions independently in an aggregate provider', async () => {
    const provider = createPackageCollectionProvider({
      id: 'mixed-package',
      displayName: 'Mixed Package',
      codeSystems: [
        {
          resourceType: 'CodeSystem',
          id: 'versioned',
          url: 'https://example.org/CodeSystem/versioned',
          version: '1.0.0',
          concept: [
            { code: 'V1', display: 'Versioned concept' }
          ]
        },
        {
          resourceType: 'CodeSystem',
          id: 'unversioned',
          url: 'https://example.org/CodeSystem/unversioned',
          concept: [
            { code: 'U1', display: 'Unversioned concept' }
          ]
        }
      ]
    });

    const result = await provider.search('');
    const versioned = result.concepts.find(concept => concept.code === 'V1');
    const unversioned = result.concepts.find(concept => concept.code === 'U1');

    expect(versioned.version).toBe('1.0.0');
    expect(unversioned.version).toBeUndefined();
  });

  it('should create registry and loader services from configuration', () => {
    const services = createTerminologyServices({
      packageProviders: [
        {
          id: 'hl7-v3-actcode',
          displayName: 'HL7 v3 ActCode',
          systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          codeSystem: actCodeCodeSystem,
          fallbackFhirConfig: {
            systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
            baseUrl: 'https://fhir.example.com'
          }
        }
      ],
      loaderConfig: {
        fhirBaseUrl: 'https://fhir.example.com'
      }
    });

    expect(services.terminologyRegistry.getProvider('hl7-v3-actcode')).toBeDefined();
    expect(services.terminologyProviderLoader).toBeDefined();
  });

  it('should expose terminology services as a bpmn-js module', () => {
    const services = createTerminologyServices({
      loaderConfig: false
    });

    expect(createTerminologyModule(services)).toEqual({
      terminologyRegistry: ['value', services.terminologyRegistry]
    });
  });

  it('should create default services with built-in providers', () => {
    const services = createDefaultTerminologyServices({
      enablePackageDefaults: false,
      loaderConfig: false
    });

    const providerIds = services.terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).toEqual(expect.arrayContaining([
      'snomed-ct',
      'loinc',
      'icd-10-gm',
      'ops',
      'atc'
    ]));
  });

  it('should include bundled package providers by default', async () => {
    const services = createDefaultTerminologyServices({
      packageAutoDiscovery: false,
      loaderConfig: false
    });
    const providerIds = services.terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).toEqual(expect.arrayContaining([
      'hl7-terminology-r4-package',
      'ihe-xds-class',
      'ihe-xds-type',
      'kdl'
    ]));
    await expect(
      services.terminologyRegistry.getProvider('kdl').lookup('AD010101')
    ).resolves.toMatchObject({
      code: 'AD010101',
      system: 'http://dvmd.de/fhir/CodeSystem/kdl'
    });
  });

  it('should warn when explicitly requested package discovery finds no packages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      createDefaultPackageProviders({
        packageAutoDiscovery: true
      });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('No terminology packages were discovered')
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('should not warn when package discovery is disabled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      createDefaultPackageProviders({
        packageAutoDiscovery: false
      });

      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('should combine package metadata with a component label for bundled providers', () => {
    const providers = createDefaultPackageProviders({
      packageAutoDiscovery: false
    });

    expect(providers.find(provider => provider.id === 'hl7-terminology-r4-package').displayName)
      .toBe('hl7.terminology.r4 (7.1.0)');
    expect(providers.find(provider => provider.id === 'ihe-xds-class').displayName)
      .toBe('de.ihe-d.terminology (3.0.1) — IHE XDS Document Class');
    expect(providers.find(provider => provider.id === 'ihe-xds-type').displayName)
      .toBe('de.ihe-d.terminology (3.0.1) — IHE XDS Document Type');
    expect(providers.find(provider => provider.id === 'kdl').displayName)
      .toBe('dvmd.kdl.r4 (2025.0.1) — CodeSystem Klinische Dokumentenklassen-Liste (Version 2025)');
  });

  it('should allow overriding a bundled provider component label', () => {
    const providers = createDefaultPackageProviders({
      packageAutoDiscovery: false,
      packageProviderOptions: {
        'ihe-xds-class': {
          componentLabel: 'XDS class'
        }
      }
    });

    expect(providers.find(provider => provider.id === 'ihe-xds-class').displayName)
      .toBe('de.ihe-d.terminology (3.0.1) — XDS class');
  });

  it('should use the Ontoserver FHIR transport for default SNOMED search', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({ expansion: { contains: [], total: 0 } })
    }));
    const config = createDefaultTerminologyConfig({
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      snomedConfig: { fetchFn }
    });
    const provider = config.providers.find(item => item.id === 'snomed-ct');

    expect(provider).toBeInstanceOf(FhirProvider);

    await provider.search('pneumonia');

    const requestUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(requestUrl.origin).toBe('https://r4.ontoserver.csiro.au');
    expect(requestUrl.pathname).toBe('/fhir/ValueSet/$expand');
    expect(requestUrl.searchParams.get('url')).toBe('http://snomed.info/sct?fhir_vs');
  });

  it('should allow switching the SNOMED transport to Snowstorm', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [], total: 0 })
    }));
    const config = createDefaultTerminologyConfig({
      enableFhirDefaults: false,
      enablePackageDefaults: false,
      loaderConfig: false,
      serverConfig: {
        snomedBaseUrl: 'https://snowstorm.example.com/snowstorm/snomed-ct'
      },
      snomedConfig: {
        transport: 'snowstorm',
        fetchFn
      }
    });
    const provider = config.providers.find(item => item.id === 'snomed-ct');

    expect(provider).toBeInstanceOf(SnomedCtProvider);
    expect(provider.id).toBe('snomed-ct');

    await expect(provider.search('pneumonia')).resolves.toMatchObject({
      concepts: [],
      total: 0
    });
    expect(fetchFn.mock.calls[0][0]).toContain(
      'https://snowstorm.example.com/snowstorm/snomed-ct/MAIN/concepts'
    );
  });

  it('should allow overriding the default fetch function from the public config API', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({ expansion: { contains: [], total: 0 } })
    }));
    const config = createDefaultTerminologyConfig({
      enablePackageDefaults: false,
      loaderConfig: false,
      fetchFn
    });

    const snomedProvider = config.providers.find(item => item.id === 'snomed-ct');
    const loincConfig = config.fhirProviders.find(item => item.id === 'loinc');

    expect(snomedProvider._adapter._fetch).toBe(fetchFn);
    expect(loincConfig).toBeDefined();
    expect(loincConfig.fetchFn).toBe(fetchFn);

    await snomedProvider.search('pneumonia');
    expect(fetchFn).toHaveBeenCalled();
  });

  it('should allow disabling defaults by provider id', () => {
    const services = createDefaultTerminologyServices({
      enablePackageDefaults: false,
      loaderConfig: false,
      disabledProviderIds: ['atc', 'snomed-ct']
    });

    const providerIds = services.terminologyRegistry.listProviders().map(provider => provider.id);

    expect(providerIds).not.toContain('atc');
    expect(providerIds).not.toContain('snomed-ct');
    expect(providerIds).toContain('loinc');
  });

  it('should discover additional package providers via packageDiscovery config', () => {
    const customCodeSystem = {
      resourceType: 'CodeSystem',
      id: 'custom-cs',
      url: 'https://example.org/CodeSystem/custom',
      concept: [
        { code: 'C1', display: 'Custom One' }
      ]
    };

    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        packages: {
          'acme.terminology': [customCodeSystem]
        }
      }
    });

    expect(providers.map(provider => provider.id)).toContain(
      'pkg-acme-terminology'
    );
  });

  it('should create one searchable provider per discovered package by default', async () => {
    const codeSystems = [
      {
        resourceType: 'CodeSystem',
        id: 'first',
        url: 'https://example.org/CodeSystem/first',
        version: '7.1.0',
        concept: [
          { code: 'AA', display: 'Adjudicated with adjustments' }
        ]
      },
      {
        resourceType: 'CodeSystem',
        id: 'second',
        url: 'https://example.org/CodeSystem/second',
        version: '7.1.0',
        concept: [
          { code: 'MR', display: 'Medical record number' }
        ]
      }
    ];

    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        packages: {
          'acme.terminology': codeSystems
        }
      }
    });

    const discoveredProvider = providers.find(
      provider => provider.id === 'pkg-acme-terminology'
    );

    expect(providers.filter(provider => provider.id.startsWith('pkg-'))).toHaveLength(1);
    expect(discoveredProvider).toBeDefined();
    expect(discoveredProvider.displayName).toBe('acme.terminology');
    await expect(discoveredProvider.search('medical')).resolves.toMatchObject({
      total: 1,
      concepts: [{
        code: 'MR',
        version: '7.1.0'
      }]
    });
  });

  it('should resolve package discovery from modules + packageNames', () => {
    const customCodeSystem = {
      resourceType: 'CodeSystem',
      id: 'custom-cs',
      url: 'https://example.org/CodeSystem/custom',
      concept: [
        { code: 'AFFL', display: 'affiliate' }
      ]
    };

    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        packageNames: ['acme.terminology'],
        modules: {
          '/node_modules/acme.terminology/CodeSystem-custom.json': customCodeSystem
        }
      }
    });

    const providerIds = providers.map(provider => provider.id);

    expect(providerIds).toContain('pkg-acme-terminology');
  });

  it('should combine package metadata with a single discovered CodeSystem name', () => {
    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        metadata: {
          'acme.terminology': {
            title: 'ACME Terminology',
            version: '1.2.3'
          }
        },
        packages: {
          'acme.terminology': [{
            resourceType: 'CodeSystem',
            id: 'custom-cs',
            url: 'https://example.org/CodeSystem/custom'
          }]
        }
      }
    });

    const provider = providers.find(item => item.id === 'pkg-acme-terminology');

    expect(provider.displayName).toBe('ACME Terminology (1.2.3) — custom-cs');
  });

  it('should use the canonical package name for generated discovery metadata', () => {
    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        metadata: {
          'acme.terminology': {
            packageName: 'acme.terminology',
            title: 'ACME Terminology',
            version: '1.2.3'
          }
        },
        packages: {
          'acme.terminology': [{
            resourceType: 'CodeSystem',
            id: 'custom-cs',
            url: 'https://example.org/CodeSystem/custom'
          }]
        }
      }
    });

    expect(providers.find(provider => provider.id === 'pkg-acme-terminology').displayName)
      .toBe('acme.terminology (1.2.3) — custom-cs');
  });

  it('should allow overriding a discovered CodeSystem component label', () => {
    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        metadata: {
          'acme.terminology': {
            title: 'ACME Terminology',
            version: '1.2.3'
          }
        },
        componentLabels: {
          'acme.terminology': {
            'https://example.org/CodeSystem/custom': 'Custom code system'
          }
        },
        packages: {
          'acme.terminology': [{
            resourceType: 'CodeSystem',
            id: 'custom-cs',
            url: 'https://example.org/CodeSystem/custom'
          }]
        }
      }
    });

    expect(providers.find(provider => provider.id === 'pkg-acme-terminology').displayName)
      .toBe('ACME Terminology (1.2.3) — Custom code system');
  });

  it('should keep multiple discovered CodeSystems in one package provider', () => {
    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        packages: {
          'acme.terminology': [
            {
              resourceType: 'CodeSystem',
              id: 'first',
              url: 'https://example.org/CodeSystem/first',
              concept: [{ code: 'F1', display: 'First' }]
            },
            {
              resourceType: 'CodeSystem',
              id: 'second',
              url: 'https://example.org/CodeSystem/second',
              concept: [{ code: 'S1', display: 'Second' }]
            }
          ]
        }
      }
    });

    const provider = providers.find(provider => provider.id === 'pkg-acme-terminology');

    expect(provider.displayName).toBe('acme.terminology');
    expect(provider.getAll()).toHaveLength(2);
  });

  it('should exclude preset-covered CodeSystems from discovered providers', () => {
    const classCodeSystem = {
      resourceType: 'CodeSystem',
      id: 'IHEXDSclassCode',
      url: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode',
      concept: [
        { code: 'ADM', display: 'Administrative document' }
      ]
    };
    const additionalCodeSystem = {
      resourceType: 'CodeSystem',
      id: 'additional',
      url: 'https://example.org/CodeSystem/additional',
      concept: [
        { code: 'A1', display: 'Additional' }
      ]
    };

    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['de.ihe-d.terminology'],
        mode: 'whitelist',
        packages: {
          'de.ihe-d.terminology': [classCodeSystem, additionalCodeSystem]
        }
      }
    });

    const discoveredProvider = providers.find(
      provider => provider.id === 'pkg-de-ihe-d-terminology'
    );

    expect(discoveredProvider).toBeDefined();
    expect(discoveredProvider.getAll()).toHaveLength(1);
    expect(discoveredProvider.getAll()[0].system)
      .toBe('https://example.org/CodeSystem/additional');
  });

  it('should exclude preset-covered CodeSystems without concepts from discovery', () => {
    const emptyCodeSystem = {
      resourceType: 'CodeSystem',
      id: 'time-period-ranges',
      url: 'http://terminology.hl7.org/CodeSystem/time-period-ranges'
    };

    const providers = createDefaultPackageProviders({
      packageAutoDiscovery: false,
      hl7CodeSystems: [emptyCodeSystem],
      packageDiscovery: {
        enabled: true,
        include: ['hl7.terminology.r4'],
        mode: 'whitelist',
        packages: {
          'hl7.terminology.r4': [emptyCodeSystem]
        }
      }
    });

    expect(providers.some(provider => provider.id === 'pkg-hl7-terminology-r4'))
      .toBe(false);
  });

  it('should reject invalid package provider overrides', () => {
    expect(() => createDefaultPackageProviders({
      packageAutoDiscovery: false,
      packageProviderOptions: {
        'ihe-xds-clas': {}
      }
    })).toThrow('Unknown bundled package provider "ihe-xds-clas".');
  });

  it('should reject invalid discovered package configuration', () => {
    const baseDiscovery = {
      enabled: true,
      include: ['acme.terminology'],
      mode: 'whitelist',
      packages: {
        'acme.terminology': [{
          resourceType: 'CodeSystem',
          id: 'custom-cs',
          url: 'https://example.org/CodeSystem/custom'
        }]
      }
    };

    expect(() => createDefaultPackageProviders({
      packageDiscovery: {
        ...baseDiscovery,
        componentLabels: {
          'unknown.terminology': {}
        }
      }
    })).toThrow('Component labels reference unknown package "unknown.terminology".');

    expect(() => createDefaultPackageProviders({
      packageDiscovery: {
        ...baseDiscovery,
        componentLabels: {
          'acme.terminology': {
            'https://example.org/CodeSystem/missing': 'Missing'
          }
        }
      }
    })).toThrow('Component label references unknown CodeSystem');
  });

  it('should search all CodeSystems through a package provider', async () => {
    const services = createDefaultTerminologyServices({
      loaderConfig: false,
      packageDiscovery: {
        enabled: true,
        packages: {
          'acme.terminology': [
            {
              resourceType: 'CodeSystem',
              id: 'first',
              url: 'https://example.org/CodeSystem/first',
              concept: [
                { code: 'AA', display: 'Adjudicated with adjustments' }
              ]
            },
            {
              resourceType: 'CodeSystem',
              id: 'second',
              url: 'https://example.org/CodeSystem/second',
              concept: [
                { code: 'MR', display: 'Medical record number' }
              ]
            }
          ]
        }
      }
    });

    const providers = services.terminologyRegistry.listProviders();
    const hl7Provider = providers.find(
      provider => provider.id === 'pkg-acme-terminology'
    );

    expect(hl7Provider).toBeDefined();

    await expect(
      services.terminologyRegistry.search('medical', hl7Provider.id)
    ).resolves.toMatchObject({
      total: 1
    });
  });

  it('should dedupe discovered package code systems by system url', async () => {
    const duplicatedCodeSystem = {
      resourceType: 'CodeSystem',
      id: 'custom-cs',
      url: 'https://example.org/CodeSystem/custom',
      concept: [
        { code: 'C1', display: 'Custom One' }
      ]
    };

    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        packages: {
          'acme.terminology': [duplicatedCodeSystem, duplicatedCodeSystem]
        }
      }
    });

    const acmeProvider = providers.find(
      provider => provider.id === 'pkg-acme-terminology'
    );
    const searchResult = await acmeProvider.search('custom');

    expect(searchResult.total).toBe(1);
  });

  it('should auto-discover package providers by default when packages are exposed', async () => {
    const globalKey = '__FDH_TERMINOLOGY_PACKAGES__';
    const previousValue = globalThis[globalKey];
    globalThis[globalKey] = {
      'acme.custom': [
        {
          resourceType: 'CodeSystem',
          id: 'acme-cs',
          url: 'https://example.org/CodeSystem/acme',
          concept: [
            { code: 'A1', display: 'Acme One' }
          ]
        }
      ]
    };

    try {
      const services = createDefaultTerminologyServices({
        loaderConfig: false
      });

      const provider = services.terminologyRegistry.getProvider(
        'pkg-acme-custom'
      );
      expect(provider).toBeDefined();

      await expect(
        services.terminologyRegistry.search('acme', 'pkg-acme-custom')
      ).resolves.toMatchObject({ total: 1 });
    } finally {
      if (previousValue === undefined) {
        delete globalThis[globalKey];
      } else {
        globalThis[globalKey] = previousValue;
      }
    }
  });

  it('should support packageAutoDiscovery shortcut via global discovered packages', async () => {
    const globalKey = '__FDH_TERMINOLOGY_PACKAGES__';
    const previousValue = globalThis[globalKey];
    globalThis[globalKey] = {
      'acme.custom': [
        {
          resourceType: 'CodeSystem',
          id: 'acme-cs',
          url: 'https://example.org/CodeSystem/acme',
          concept: [
            { code: 'A1', display: 'Acme One' }
          ]
        }
      ]
    };

    try {
      const services = createDefaultTerminologyServices({
        loaderConfig: false,
        packageAutoDiscovery: true
      });

      const provider = services.terminologyRegistry.getProvider(
        'pkg-acme-custom'
      );
      expect(provider).toBeDefined();

      await expect(
        services.terminologyRegistry.search('acme', 'pkg-acme-custom')
      ).resolves.toMatchObject({ total: 1 });
    } finally {
      if (previousValue === undefined) {
        delete globalThis[globalKey];
      } else {
        globalThis[globalKey] = previousValue;
      }
    }
  });
});
