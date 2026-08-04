import { describe, expect, it } from 'vitest';
import {
  createPackageCollectionProvider,
  createPackageFallbackProvider,
  createPackageTerminologyProvider,
  createTerminologyModule,
  createTerminologyServices
} from '../../src/services/TerminologyServices.js';
import {
  createDefaultPackageProviders,
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

  it('should apply package provider overrides by id', () => {
    const providers = createDefaultPackageProviders({
      packageProviderOptions: {
        kdl: {
          displayName: 'KDL Custom'
        }
      }
    });

    const providerIds = providers.map(provider => provider.id);
    const kdlProvider = providers.find(provider => provider.id === 'kdl');

    expect(providerIds).toContain('kdl');
    expect(kdlProvider.displayName).toBe('KDL Custom');
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

    expect(providers.map(provider => provider.id)).toContain('pkg-acme-terminology');
  });

  it('should resolve HL7 package CodeSystems from packageDiscovery.packages', () => {
    const hl7CodeSystem = {
      resourceType: 'CodeSystem',
      id: 'v3-ActCode',
      url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      concept: [
        { code: 'AA', display: 'Adjudicated with adjustments' }
      ]
    };

    const providers = createDefaultPackageProviders({
      packageDiscovery: {
        enabled: true,
        include: ['acme.terminology'],
        mode: 'whitelist',
        packages: {
          'hl7.terminology.r4': [hl7CodeSystem]
        }
      }
    });

    expect(providers.map(provider => provider.id)).toContain('hl7-terminology-r4-package');
  });

  it('should resolve package discovery from modules + packageNames', () => {
    const hl7CodeSystem = {
      resourceType: 'CodeSystem',
      id: 'v3-RoleCode',
      url: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
      concept: [
        { code: 'AFFL', display: 'affiliate' }
      ]
    };

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
        packageNames: ['hl7.terminology.r4', 'acme.terminology'],
        modules: {
          '/node_modules/hl7.terminology.r4/CodeSystem-v3-RoleCode.json': hl7CodeSystem,
          '/node_modules/acme.terminology/CodeSystem-custom.json': customCodeSystem
        }
      }
    });

    const providerIds = providers.map(provider => provider.id);

    expect(providerIds).toContain('hl7-terminology-r4-package');
    expect(providerIds).toContain('pkg-acme-terminology');
  });

  it('should register hl7 preset as searchable provider from full package code systems', async () => {
    const services = createDefaultTerminologyServices({
      loaderConfig: false,
      packageDiscovery: {
        enabled: true,
        packages: {
          'hl7.terminology.r4': [
            {
              resourceType: 'CodeSystem',
              id: 'v3-ActCode',
              url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              concept: [
                { code: 'AA', display: 'Adjudicated with adjustments' }
              ]
            },
            {
              resourceType: 'CodeSystem',
              id: 'v2-0203',
              url: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              concept: [
                { code: 'MR', display: 'Medical record number' }
              ]
            }
          ]
        }
      }
    });

    const providers = services.terminologyRegistry.listProviders();
    const hl7Provider = providers.find(provider => provider.id === 'hl7-terminology-r4-package');

    expect(hl7Provider).toBeDefined();
    expect(hl7Provider.capabilities.search).toBe(true);

    await expect(
      services.terminologyRegistry.search('medical', 'hl7-terminology-r4-package')
    ).resolves.toMatchObject({
      total: 1
    });
  });

  it('should prefer explicit hl7CodeSystems over packageDiscovery hl7 data', async () => {
    const preferredCodeSystems = [
      {
        resourceType: 'CodeSystem',
        id: 'preferred',
        url: 'https://example.org/CodeSystem/preferred',
        concept: [
          { code: 'P1', display: 'Preferred term' }
        ]
      }
    ];

    const discoveredCodeSystems = [
      {
        resourceType: 'CodeSystem',
        id: 'discovered',
        url: 'https://example.org/CodeSystem/discovered',
        concept: [
          { code: 'D1', display: 'Discovered term' }
        ]
      }
    ];

    const services = createDefaultTerminologyServices({
      loaderConfig: false,
      hl7CodeSystems: preferredCodeSystems,
      packageDiscovery: {
        enabled: true,
        packages: {
          'hl7.terminology.r4': discoveredCodeSystems
        }
      }
    });

    await expect(
      services.terminologyRegistry.search('preferred', 'hl7-terminology-r4-package')
    ).resolves.toMatchObject({ total: 1 });

    await expect(
      services.terminologyRegistry.search('discovered', 'hl7-terminology-r4-package')
    ).resolves.toMatchObject({ total: 0 });
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

    const acmeProvider = providers.find(provider => provider.id === 'pkg-acme-terminology');
    const searchResult = await acmeProvider.search('custom');

    expect(searchResult.total).toBe(1);
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

      const provider = services.terminologyRegistry.getProvider('pkg-acme-custom');
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
