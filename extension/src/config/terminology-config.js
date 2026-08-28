import { SnomedCtProvider } from '../providers/SnomedCtProvider.js';
import { FhirProvider } from '../providers/FhirProvider.js';
import {
  DEFAULT_PACKAGE_PROVIDER_IDS,
  createPackagePresetProvider
} from '../providers/presets/index.js';
import {
  collectPackageCodeSystemsFromGlob,
  collectPackageCodeSystemsFromModules,
  discoverPackageProviders
} from '../services/PackageProviderDiscovery.js';
import { DEFAULT_PACKAGE_METADATA_GLOBAL_KEY } from '../services/PackageMetadata.js';
import { createTerminologyModule, createTerminologyServices } from '../services/TerminologyServices.js';

const DEFAULT_SERVER_CONFIG = Object.freeze({
  fhirBaseUrl: 'https://r4.ontoserver.csiro.au/fhir',
  snowstormBaseUrl: 'https://snowstorm.snomedtools.org/snowstorm/snomed-ct'
});

const DEFAULT_SNOMED_CONFIG = Object.freeze({
  id: 'snomed-ct',
  displayName: 'SNOMED CT',
  systemUri: 'http://snomed.info/sct',
  transport: 'fhir',
  valueSetUri: 'http://snomed.info/sct?fhir_vs',
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

function createDefaultSnomedProvider(snomedConfig, serverConfig, fetchFn) {
  const resolvedConfig = {
    ...DEFAULT_SNOMED_CONFIG,
    ...snomedConfig
  };
  const transport = resolvedConfig.transport || 'fhir';
  const requestFetchFn = resolvedConfig.fetchFn || fetchFn;

  if (transport === 'fhir') {
    return new FhirProvider({
      ...resolvedConfig,
      baseUrl: resolvedConfig.baseUrl
        || serverConfig.snomedBaseUrl
        || serverConfig.fhirBaseUrl,
      fetchFn: requestFetchFn
    });
  }

  if (transport === 'snowstorm') {
    return new SnomedCtProvider({
      ...resolvedConfig,
      baseUrl: resolvedConfig.baseUrl
        || serverConfig.snomedBaseUrl
        || serverConfig.snowstormBaseUrl,
      fetchFn: requestFetchFn
    });
  }

  throw new Error(
    `Unsupported SNOMED transport "${transport}". Expected "fhir" or "snowstorm".`
  );
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
    fetchFn,
    fhirProviderOverrides = [],
    additionalFhirProviders = [],
    disabledProviderIds = []
  } = config;

  const mergedDefaults = mergeById(DEFAULT_FHIR_PROVIDER_CONFIGS, fhirProviderOverrides).map(provider => ({
    ...provider,
    baseUrl: provider.baseUrl || fhirBaseUrl,
    ...(fetchFn ? { fetchFn: provider.fetchFn || fetchFn } : {})
  }));

  const providers = [
    ...mergedDefaults,
    ...additionalFhirProviders
  ];

  return filterDisabled(providers, toDisabledSet(disabledProviderIds));
}

function validatePackageProviderOptions(packageProviderOptions) {
  const knownProviderIds = new Set(DEFAULT_PACKAGE_PROVIDER_IDS);
  const unknownProviderId = Object.keys(packageProviderOptions)
    .find(providerId => !knownProviderIds.has(providerId));

  if (unknownProviderId) {
    throw new Error(`Unknown bundled package provider "${unknownProviderId}".`);
  }
}

function getCoveredSystemUris(providers) {
  return new Set(providers.flatMap(provider =>
    typeof provider.getAll === 'function'
      ? provider.getAll().map(concept => concept.system)
      : []
  ));
}

export function createDefaultPackageProviders(config = {}) {
  const autoDiscoveryRequested = Object.prototype.hasOwnProperty.call(
    config,
    'packageAutoDiscovery'
  ) && config.packageAutoDiscovery !== false;
  const {
    packageProviderOptions = {},
    additionalPackageProviders = [],
    packageDiscovery = {},
    packageAutoDiscovery = true,
    packageMetadata: configuredPackageMetadata = {},
    disabledProviderIds = [],
    hl7CodeSystems
  } = config;

  validatePackageProviderOptions(packageProviderOptions);

  const autoDiscoveryOptions = packageAutoDiscovery === false
    ? null
    : (packageAutoDiscovery || {});
  const autoDiscoveryPackages = autoDiscoveryOptions
    ? (
      autoDiscoveryOptions.packages
      || globalThis?.[autoDiscoveryOptions.globalKey || '__FDH_TERMINOLOGY_PACKAGES__']
      || collectPackageCodeSystemsFromGlob(autoDiscoveryOptions.globFn)
    )
    : null;
  const autoDiscoveryMetadata = autoDiscoveryOptions
    ? (
      autoDiscoveryOptions.metadata
      || globalThis?.[
        autoDiscoveryOptions.metadataGlobalKey || DEFAULT_PACKAGE_METADATA_GLOBAL_KEY
      ]
      || null
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
  const packageDiscoveryRequested = Boolean(
    packageDiscovery?.enabled
    || packageDiscovery?.packages
    || packageDiscovery?.packageNames?.length
    || Object.keys(packageDiscovery?.modules || {}).length
  );

  if (
    (autoDiscoveryRequested || packageDiscoveryRequested)
    && Object.keys(packageCodeSystems || {}).length === 0
  ) {
    console.warn(
      '[terminology] No terminology packages were discovered for automatic package discovery. ' +
      'If additional package-backed providers are expected, configure `packageDiscovery.packages`, ' +
      'provide `packageAutoDiscovery.globFn`, or expose ' +
      '`globalThis.__FDH_TERMINOLOGY_PACKAGES__`. Built-in providers remain available.'
    );
  }

  const packageMetadata = packageDiscovery?.metadata
    || autoDiscoveryMetadata
    || configuredPackageMetadata;
  const discoveryInclude = packageDiscovery?.include
    || packageDiscovery?.packageNames
    || (autoDiscoveryOptions ? ['*'] : undefined);
  const discoveryMode = packageDiscovery?.mode || (packageDiscovery?.packageNames?.length ? 'whitelist' : 'auto');
  const resolvedHl7CodeSystems = hl7CodeSystems || packageCodeSystems['hl7.terminology.r4'];

  const presetProviders = DEFAULT_PACKAGE_PROVIDER_IDS.map(providerId => createPackagePresetProvider(providerId, {
    ...(packageProviderOptions[providerId] || {}),
    packageMetadata: packageProviderOptions[providerId]?.packageMetadata || packageMetadata,
    ...(providerId === 'hl7-terminology-r4-package' && resolvedHl7CodeSystems
      ? { codeSystems: resolvedHl7CodeSystems }
      : {})
  })).filter(Boolean);

  const discoveredPackageProviders = (packageDiscovery?.enabled || Boolean(autoDiscoveryOptions))
    ? discoverPackageProviders(packageCodeSystems, {
      ...packageDiscovery,
      ...(discoveryInclude ? { include: discoveryInclude } : {}),
      metadata: packageMetadata,
      mode: discoveryMode,
      excludeSystemUris: getCoveredSystemUris(presetProviders)
    })
    : [];

  const providers = [
    ...presetProviders,
    ...additionalPackageProviders,
    ...discoveredPackageProviders
  ];

  return filterDisabled(providers, toDisabledSet(disabledProviderIds));
}

export function createDefaultTerminologyConfig(config = {}) {
  const {
    serverConfig = {},
    loaderConfig = {},
    fetchFn,
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
      ? [ createDefaultSnomedProvider(snomedConfig, resolvedServerConfig, fetchFn) ]
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
          fetchFn,
          disabledProviderIds
        }),
        ...filterDisabled(fhirProviders, disabledProviderIdSet)
      ]
      : filterDisabled(fhirProviders, disabledProviderIdSet),
    loaderConfig: loaderConfig === false
      ? false
      : {
        fhirBaseUrl: resolvedServerConfig.fhirBaseUrl,
        ...(fetchFn ? { fetchFn } : {}),
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
