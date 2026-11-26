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
import {
  DEFAULT_PACKAGE_METADATA_GLOBAL_KEY,
  resolvePackageMetadata
} from '../services/PackageMetadata.js';
import {
  filterDefaultPackageRegistry
} from '../services/PackageDiscoveryDefaults.js';
import { createTerminologyModule, createTerminologyServices } from '../services/TerminologyServices.js';

// No terminology server is preconfigured. SNOMED CT, LOINC, ICD-10-GM, OPS and
// ATC are licensed content; the integrator chooses a server they are licensed
// to use and sets `serverConfig.fhirBaseUrl` explicitly.
const DEFAULT_SERVER_CONFIG = Object.freeze({
  fhirBaseUrl: undefined
});

const DEFAULT_SNOMED_CONFIG = Object.freeze({
  id: 'snomed-ct',
  displayName: 'SNOMED CT',
  systemUri: 'http://snomed.info/sct',
  transport: 'fhir',
  branch: 'MAIN',
  // Applies to the Snowstorm transport only. The FHIR transport ignores it and
  // uses the package language setting (displayLanguage=de).
  languageStrategy: 'header'
});

const SNOMED_SYSTEM_URI = 'http://snomed.info/sct';
const SNOMED_MODULE_ID_PATTERN = /^\d{6,18}$/;
const SNOMED_RELEASE_VERSION_PATTERN = /^\d{8}$/;
// Implicit SNOMED CT value set of one edition, optionally of one release:
// http://snomed.info/sct/<moduleId>[/version/<YYYYMMDD>]?fhir_vs[=...].
// Group 1 is the edition URI.
const SNOMED_IMPLICIT_VALUE_SET_PATTERN =
  /^(http:\/\/snomed\.info\/sct\/\d{6,18}(?:\/version\/\d{8})?)\?fhir_vs(?:=|$)/;

const warnedMessages = new Set();

function warnOnce(message) {
  if (warnedMessages.has(message)) {
    return;
  }

  warnedMessages.add(message);
  console.warn(message);
}

// The default FHIR providers pin no release: no `expandParameters` and no
// `lookupParameters`. The server answers from its current release, and each
// stored coding carries the release the server reports (`used-codesystem` in
// `$expand`, the `version` output of `$lookup`). A hard-coded year would break
// as soon as a server drops that release. To pin one, override the provider:
// `fhirProviderOverrides: [{ id: 'icd-10-gm', expandParameters: { valueSetVersion: '2026' } }]`
// (a server that does not hold that release then answers HTTP 404).
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
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm'
  },
  {
    id: 'ops',
    displayName: 'OPS',
    systemUri: 'http://fhir.de/CodeSystem/bfarm/ops',
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/ops'
  },
  {
    // ATC-GM, the German ATC classification published by BfArM.
    id: 'atc',
    displayName: 'ATC',
    systemUri: 'http://fhir.de/CodeSystem/bfarm/atc',
    valueSetUri: 'http://fhir.de/ValueSet/bfarm/atc'
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

/**
 * Build the FHIR edition URI for a SNOMED CT edition, for example
 * `http://snomed.info/sct/11000274103` for the German National Edition or
 * `http://snomed.info/sct/11000274103/version/20260815` for one release.
 *
 * @param {string} edition - Module id of the edition.
 * @param {string} [editionVersion] - Release date as `YYYYMMDD`.
 * @returns {string}
 */
export function createSnomedEditionUri(edition, editionVersion) {
  const moduleId = String(edition ?? '').trim();

  if (!SNOMED_MODULE_ID_PATTERN.test(moduleId)) {
    throw new Error(
      `SNOMED CT edition "${edition}" is not a module id. ` +
      'Use for example "11000274103" (German National Edition) or ' +
      '"900000000000207008" (International Edition).'
    );
  }

  if (editionVersion === undefined || editionVersion === null || editionVersion === '') {
    return `${SNOMED_SYSTEM_URI}/${moduleId}`;
  }

  const releaseVersion = String(editionVersion).trim();

  if (!SNOMED_RELEASE_VERSION_PATTERN.test(releaseVersion)) {
    throw new Error(
      `SNOMED CT edition version "${editionVersion}" must be a release date in the form YYYYMMDD.`
    );
  }

  return `${SNOMED_SYSTEM_URI}/${moduleId}/version/${releaseVersion}`;
}

function hasSnomedEditionVersion(editionVersion) {
  return editionVersion !== undefined && editionVersion !== null && editionVersion !== '';
}

function resolveSnomedFhirEdition(resolvedConfig) {
  if (resolvedConfig.edition) {
    const editionUri = createSnomedEditionUri(
      resolvedConfig.edition,
      resolvedConfig.editionVersion
    );

    return {
      valueSetUri: resolvedConfig.valueSetUri || `${editionUri}?fhir_vs`,
      // Without `editionVersion` the server answers from its latest release of
      // the edition and reports it per coding (`…/version/YYYYMMDD`). The bare
      // edition URI never equals such a stored version, so it is no version
      // label; only a pinned release is.
      version: resolvedConfig.version
        || (hasSnomedEditionVersion(resolvedConfig.editionVersion) ? editionUri : undefined),
      lookupParameters: {
        version: editionUri,
        ...(resolvedConfig.lookupParameters || {})
      }
    };
  }

  if (resolvedConfig.valueSetUri) {
    // An implicit value set such as http://snomed.info/sct/11000274103?fhir_vs=isa/404684003
    // names the edition, and maybe the release; scope `$lookup` to it as well,
    // so lookups cannot answer from the server's default edition. Only a
    // release URI (`…/version/YYYYMMDD`) is a version label.
    const editionUri = SNOMED_IMPLICIT_VALUE_SET_PATTERN.exec(resolvedConfig.valueSetUri)?.[1];

    if (!editionUri) {
      return {
        valueSetUri: resolvedConfig.valueSetUri,
        version: resolvedConfig.version,
        lookupParameters: resolvedConfig.lookupParameters
      };
    }

    return {
      valueSetUri: resolvedConfig.valueSetUri,
      version: resolvedConfig.version
        || (editionUri.includes('/version/') ? editionUri : undefined),
      lookupParameters: {
        version: editionUri,
        ...(resolvedConfig.lookupParameters || {})
      }
    };
  }

  return null;
}

function createDefaultSnomedProvider(snomedConfig, serverConfig, fetchFn) {
  const resolvedConfig = {
    ...DEFAULT_SNOMED_CONFIG,
    ...snomedConfig
  };
  const transport = resolvedConfig.transport || 'fhir';
  const requestFetchFn = resolvedConfig.fetchFn || fetchFn;

  if (transport === 'fhir') {
    const baseUrl = resolvedConfig.baseUrl
      || serverConfig.snomedBaseUrl
      || serverConfig.fhirBaseUrl;

    if (!baseUrl) {
      warnOnce(
        '[terminology] SNOMED CT is disabled: no terminology server is configured. ' +
        'Set serverConfig.fhirBaseUrl (or snomedConfig.baseUrl) to a server you are ' +
        'licensed to use, and snomedConfig.edition to the SNOMED CT edition covered by your licence.'
      );
      return null;
    }

    const edition = resolveSnomedFhirEdition(resolvedConfig);

    if (!edition) {
      warnOnce(
        '[terminology] SNOMED CT is disabled: no edition is configured. ' +
        'Set snomedConfig.edition to the module id of the edition covered by your licence, ' +
        'for example "11000274103" (German National Edition). Without it the server would ' +
        'answer from whatever edition it defaults to.'
      );
      return null;
    }

    return new FhirProvider({
      ...resolvedConfig,
      ...edition,
      baseUrl,
      fetchFn: requestFetchFn
    });
  }

  if (transport === 'snowstorm') {
    const baseUrl = resolvedConfig.baseUrl
      || serverConfig.snomedBaseUrl
      || serverConfig.snowstormBaseUrl;

    if (!baseUrl) {
      throw new Error(
        'SNOMED Snowstorm transport requires snomedConfig.baseUrl, ' +
        'serverConfig.snomedBaseUrl, or serverConfig.snowstormBaseUrl.'
      );
    }

    return new SnomedCtProvider({
      ...resolvedConfig,
      baseUrl,
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

  const disabledProviderIdSet = toDisabledSet(disabledProviderIds);
  const mergedDefaults = filterDisabled(
    mergeById(DEFAULT_FHIR_PROVIDER_CONFIGS, fhirProviderOverrides).map(provider => ({
      ...provider,
      baseUrl: provider.baseUrl || fhirBaseUrl,
      ...(fetchFn ? { fetchFn: provider.fetchFn || fetchFn } : {})
    })),
    disabledProviderIdSet
  );
  const serverlessDefaults = mergedDefaults.filter(provider => !provider.baseUrl);

  if (serverlessDefaults.length > 0) {
    warnOnce(
      `[terminology] ${serverlessDefaults.map(provider => provider.displayName).join(', ')} ` +
      `${serverlessDefaults.length === 1 ? 'is' : 'are'} disabled: no terminology server is configured. ` +
      'Set serverConfig.fhirBaseUrl to a FHIR terminology server you are licensed to use.'
    );
  }

  const providers = [
    ...mergedDefaults.filter(provider => provider.baseUrl),
    ...additionalFhirProviders
  ];

  return filterDisabled(providers, disabledProviderIdSet);
}

function validatePackageProviderOptions(packageProviderOptions) {
  const knownProviderIds = new Set(DEFAULT_PACKAGE_PROVIDER_IDS);
  const unknownProviderId = Object.keys(packageProviderOptions)
    .find(providerId => !knownProviderIds.has(providerId));

  if (unknownProviderId) {
    throw new Error(`Unknown bundled package provider "${unknownProviderId}".`);
  }
}

function getCoveredPackageCodeSystems(providers) {
  return providers.flatMap(provider => {
    if (
      !provider.packageName
      || typeof provider.getCodeSystemUris !== 'function'
    ) {
      return [];
    }

    return provider.getCodeSystemUris().map(systemUri => ({
      packageName: provider.packageName,
      version: provider.packageVersion,
      systemUri
    }));
  });
}

function findPackageCodeSystemsForPreset(
  packageCodeSystems,
  packageMetadata,
  packageName,
  packageVersion
) {
  const matchingEntries = Object.entries(packageCodeSystems || {})
    .map(([packageKey, codeSystems]) => ({
      packageKey,
      codeSystems,
      ...resolvePackageMetadata(packageKey, packageMetadata)
    }))
    .filter(entry =>
      entry.packageName === packageName
      && (!entry.version || !packageVersion || entry.version === packageVersion)
    );

  const exactVersionEntry = matchingEntries.find(entry => entry.version === packageVersion);

  return (exactVersionEntry || matchingEntries[0])?.codeSystems;
}

export function createDefaultPackageProviders(config = {}) {
  const autoDiscoveryRequested = Object.prototype.hasOwnProperty.call(
    config,
    'packageAutoDiscovery'
  ) && config.packageAutoDiscovery !== false;
  const {
    enablePackageDefaults = true,
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
  const autoDiscoveryMetadata = autoDiscoveryOptions
    ? (
      autoDiscoveryOptions.metadata
      || globalThis?.[
        autoDiscoveryOptions.metadataGlobalKey || DEFAULT_PACKAGE_METADATA_GLOBAL_KEY
      ]
      || null
    )
    : null;
  const autoDiscoveryPackages = autoDiscoveryOptions
    ? (
      autoDiscoveryOptions.packages
      || globalThis?.[autoDiscoveryOptions.globalKey || '__FDH_TERMINOLOGY_PACKAGES__']
      || collectPackageCodeSystemsFromGlob(autoDiscoveryOptions.globFn, {
        metadata: packageDiscovery?.metadata
          || autoDiscoveryMetadata
          || configuredPackageMetadata
      })
    )
    : null;
  const packageMetadata = packageDiscovery?.metadata
    || autoDiscoveryMetadata
    || configuredPackageMetadata;
  const resolvedAutoDiscoveryPackages = autoDiscoveryOptions?.packages
    ? autoDiscoveryPackages
    : filterDefaultPackageRegistry(
      autoDiscoveryPackages || {},
      packageDiscovery?.metadata
        || autoDiscoveryMetadata
        || configuredPackageMetadata
    );

  const packageCodeSystems = packageDiscovery?.packages
    || (
      packageDiscovery?.packageNames?.length || Object.keys(packageDiscovery?.modules || {}).length
        ? collectPackageCodeSystemsFromModules(
          packageDiscovery?.modules || {},
          packageDiscovery?.packageNames || [],
          packageMetadata
        )
        : (resolvedAutoDiscoveryPackages || {})
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

  const discoveryInclude = packageDiscovery?.include
    || packageDiscovery?.packageNames
    || (autoDiscoveryOptions ? ['*'] : undefined);
  const discoveryMode = packageDiscovery?.mode || (packageDiscovery?.packageNames?.length ? 'whitelist' : 'auto');
  const hl7Preset = enablePackageDefaults
    ? createPackagePresetProvider('hl7-terminology-r4-package', {
      ...(packageProviderOptions['hl7-terminology-r4-package'] || {}),
      packageMetadata: packageProviderOptions['hl7-terminology-r4-package']?.packageMetadata
        || packageMetadata
    })
    : null;
  const resolvedHl7CodeSystems = hl7CodeSystems || findPackageCodeSystemsForPreset(
    packageCodeSystems,
    packageMetadata,
    'hl7.terminology.r4',
    hl7Preset?.packageVersion
  );

  const presetProviders = enablePackageDefaults
    ? DEFAULT_PACKAGE_PROVIDER_IDS.map(providerId => createPackagePresetProvider(providerId, {
      ...(packageProviderOptions[providerId] || {}),
      packageMetadata: packageProviderOptions[providerId]?.packageMetadata || packageMetadata,
      ...(providerId === 'hl7-terminology-r4-package' && resolvedHl7CodeSystems
        ? { codeSystems: resolvedHl7CodeSystems }
        : {})
    })).filter(Boolean)
    : [];

  const discoveredPackageProviders = (packageDiscoveryRequested || Boolean(autoDiscoveryOptions))
    ? discoverPackageProviders(packageCodeSystems, {
      ...packageDiscovery,
      ...(discoveryInclude ? { include: discoveryInclude } : {}),
      metadata: packageMetadata,
      mode: discoveryMode,
      excludePackageCodeSystems: getCoveredPackageCodeSystems(presetProviders)
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

  const defaultProviders = enableSnomed && !disabledProviderIdSet.has(DEFAULT_SNOMED_CONFIG.id)
    ? [ createDefaultSnomedProvider(snomedConfig, resolvedServerConfig, fetchFn) ].filter(Boolean)
    : [];

  const defaultPackageProviders = createDefaultPackageProviders({
    ...config,
    enablePackageDefaults,
    disabledProviderIds
  });

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
      || (!resolvedServerConfig.fhirBaseUrl && !loaderConfig?.fhirBaseUrl)
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
