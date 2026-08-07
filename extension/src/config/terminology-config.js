import { SnomedCtProvider } from '../providers/SnomedCtProvider.js';
import {
  createPackagePresetProvider,
  DEFAULT_PACKAGE_PROVIDER_IDS
} from '../providers/presets/index.js';
import {
  collectPackageCodeSystemsFromGlob,
  collectPackageCodeSystemsFromModules,
  discoverPackageProviders
} from '../services/PackageProviderDiscovery.js';
import { createTerminologyModule, createTerminologyServices } from '../services/TerminologyServices.js';

const DEFAULT_SERVER_CONFIG = Object.freeze({
  fhirBaseUrl: 'https://r4.ontoserver.csiro.au/fhir',
  snowstormBaseUrl: 'https://snowstorm.snomedtools.org/snowstorm/snomed-ct'
});

const DEFAULT_SNOMED_CONFIG = Object.freeze({
  id: 'snomed-ct',
  displayName: 'SNOMED CT',
  systemUri: 'http://snomed.info/sct',
  branch: 'MAIN',
  languageStrategy: 'header'
});

const DEFAULT_FHIR_PROVIDER_CONFIGS = Object.freeze([
  {
    id: 'loinc',
    displayName: 'LOINC',
    systemUri: 'http://loinc.org',
    valueSetUri: 'http://loinc.org/vs'
  },
  {
    id: 'icd-10-gm',
    displayName: 'ICD-10-GM',
    systemUri: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
    expandParameters: {
      valueSetVersion: '2020'
    }
  },
  {
    id: 'ops',
    displayName: 'OPS',
    systemUri: 'http://fhir.de/CodeSystem/bfarm/ops',
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/ops',
    expandParameters: {
      'system-version': 'http://fhir.de/CodeSystem/bfarm/ops|2021'
    }
  },
  {
    id: 'atc',
    displayName: 'ATC',
    systemUri: 'http://www.whocc.no/atc',
    valueSetUri: 'http://www.whocc.no/atc/vs',
    expandParameters: {
      valueSetVersion: '2025.0.0'
    },
    lookupParameters: {
      version: '2025.0.0'
    }
  }
]);

function mergeById(defaultConfigs, overrides) {
  const configMap = new Map(defaultConfigs.map(config => [config.id, { ...config }]));

  for (const override of overrides || []) {
    if (!override?.id) {
      throw new Error('Provider override requires an id.');
    }

    const current = configMap.get(override.id) || {};
    configMap.set(override.id, { ...current, ...override });
  }

  return [...configMap.values()];
}

function toDisabledSet(disabledProviderIds = []) {
  return new Set(disabledProviderIds.filter(Boolean));
}

function filterDisabled(providers, disabledProviderIds) {
  if (!disabledProviderIds?.size) {
    return providers;
  }

  return providers.filter(provider => !disabledProviderIds.has(provider.id));
}

export function createDefaultServerConfig(serverConfig = {}) {
  return {
    ...DEFAULT_SERVER_CONFIG,
    ...serverConfig
  };
}

export function createDefaultFhirProviderConfigs(config = {}) {
  const {
    fhirBaseUrl,
    fhirProviderOverrides = [],
    additionalFhirProviders = [],
    disabledProviderIds = []
  } = config;

  const mergedDefaults = mergeById(DEFAULT_FHIR_PROVIDER_CONFIGS, fhirProviderOverrides).map(provider => ({
    ...provider,
    baseUrl: provider.baseUrl || fhirBaseUrl
  }));

  const providers = [
    ...mergedDefaults,
    ...additionalFhirProviders
  ];

  return filterDisabled(providers, toDisabledSet(disabledProviderIds));
}

export function createDefaultPackageProviders(config = {}) {
  const {
    packageProviderOptions = {},
    additionalPackageProviders = [],
    packageDiscovery = {},
    packageAutoDiscovery = false,
    disabledProviderIds = [],
    hl7CodeSystems
  } = config;

  const autoDiscoveryOptions = packageAutoDiscovery === true
    ? {}
    : (packageAutoDiscovery || null);
  const autoDiscoveryPackages = autoDiscoveryOptions
    ? (
      autoDiscoveryOptions.packages
      || globalThis?.[autoDiscoveryOptions.globalKey || '__FDH_TERMINOLOGY_PACKAGES__']
      || collectPackageCodeSystemsFromGlob(autoDiscoveryOptions.globFn || import.meta.glob)
    )
    : null;

  const packageCodeSystems = packageDiscovery?.packages
    || (
      packageDiscovery?.packageNames?.length || Object.keys(packageDiscovery?.modules || {}).length
        ? collectPackageCodeSystemsFromModules(
          packageDiscovery?.modules || {},
          packageDiscovery?.packageNames || []
        )
        : (autoDiscoveryPackages || {})
    );
  const discoveryInclude = packageDiscovery?.include
    || packageDiscovery?.packageNames
    || (autoDiscoveryOptions ? ['*'] : undefined);
  const discoveryMode = packageDiscovery?.mode || (packageDiscovery?.packageNames?.length ? 'whitelist' : 'auto');
  const resolvedHl7CodeSystems = hl7CodeSystems || packageCodeSystems['hl7.terminology.r4'];

  const discoveredPackageProviders = (packageDiscovery?.enabled || Boolean(autoDiscoveryOptions))
    ? discoverPackageProviders(packageCodeSystems, {
      ...packageDiscovery,
      ...(discoveryInclude ? { include: discoveryInclude } : {}),
      mode: discoveryMode
    })
    : [];

  const providers = [
    ...DEFAULT_PACKAGE_PROVIDER_IDS.map(providerId => createPackagePresetProvider(providerId, {
      ...(packageProviderOptions[providerId] || {}),
      ...(providerId === 'hl7-terminology-r4-package' && resolvedHl7CodeSystems
        ? { codeSystems: resolvedHl7CodeSystems }
        : {})
    })),
    ...additionalPackageProviders,
    ...discoveredPackageProviders
  ].filter(Boolean);

  return filterDisabled(providers, toDisabledSet(disabledProviderIds));
}

export function createDefaultTerminologyConfig(config = {}) {
  const {
    serverConfig = {},
    loaderConfig = {},
    enableSnomed = true,
    enableFhirDefaults = true,
    enablePackageDefaults = true,
    snomedConfig = {},
    providers = [],
    fhirProviders = [],
    packageProviders = [],
    disabledProviderIds = []
  } = config;

  const resolvedServerConfig = createDefaultServerConfig(serverConfig);
  const disabledProviderIdSet = toDisabledSet(disabledProviderIds);

  const defaultProviders = [
    ...(enableSnomed
      ? [
        new SnomedCtProvider({
          ...DEFAULT_SNOMED_CONFIG,
          ...snomedConfig,
          baseUrl: snomedConfig.baseUrl || resolvedServerConfig.snowstormBaseUrl
        })
      ]
      : []),
  ];

  const defaultPackageProviders = enablePackageDefaults
    ? createDefaultPackageProviders({
      ...config,
      disabledProviderIds
    })
    : [];

  return {
    providers: filterDisabled([...defaultProviders, ...providers], disabledProviderIdSet),
    packageProviders: filterDisabled([...defaultPackageProviders, ...packageProviders], disabledProviderIdSet),
    fhirProviders: enableFhirDefaults
      ? [
        ...createDefaultFhirProviderConfigs({
          ...config,
          fhirBaseUrl: resolvedServerConfig.fhirBaseUrl,
          disabledProviderIds
        }),
        ...filterDisabled(fhirProviders, disabledProviderIdSet)
      ]
      : filterDisabled(fhirProviders, disabledProviderIdSet),
    loaderConfig: loaderConfig === false
      ? false
      : {
        fhirBaseUrl: resolvedServerConfig.fhirBaseUrl,
        ...loaderConfig
      }
  };
}

export function createDefaultTerminologyServices(config = {}) {
  return createTerminologyServices(createDefaultTerminologyConfig(config));
}

export function createDefaultTerminologyModule(config = {}) {
  return createTerminologyModule(createDefaultTerminologyServices(config));
}
