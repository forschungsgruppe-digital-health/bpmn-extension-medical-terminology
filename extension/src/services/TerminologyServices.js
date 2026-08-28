import { TerminologyRegistry } from '../core/TerminologyRegistry.js';
import { FhirProvider } from '../providers/FhirProvider.js';
import { FallbackProvider } from '../providers/FallbackProvider.js';
import { StaticProvider } from '../providers/StaticProvider.js';
import {
  createStaticProviderFromCodeSystem
} from './CodeSystemProviderFactory.js';
import { formatPackageProviderDisplayName } from './PackageMetadata.js';
import { createFhirTerminologyProviderLoader } from './TerminologyProviderLoader.js';

function createPackageProviderId(id) {
  return `${id}-package`;
}

function createFallbackProviderId(id) {
  return `${id}-fhir`;
}

function isProviderInstance(value) {
  return Boolean(value)
    && typeof value.search === 'function'
    && typeof value.lookup === 'function'
    && typeof value.validate === 'function';
}

/**
 * Create a static terminology provider from an installed/package-backed FHIR
 * CodeSystem JSON resource.
 *
 * @param {{
 *   id: string,
 *   displayName?: string,
 *   systemUri?: string,
 *   codeSystem: import('@types/fhir').fhir4.CodeSystem
 * }} config
 * @returns {import('../providers/StaticProvider').StaticProvider}
 */
export function createPackageTerminologyProvider(config) {
  return createStaticProviderFromCodeSystem(config.codeSystem, {
    id: config.id,
    displayName: config.displayName,
    systemUri: config.systemUri,
    packageName: config.packageName,
    packageMetadata: config.packageMetadata,
    componentLabel: config.componentLabel
  });
}

/**
 * Create one searchable provider from many package-backed FHIR CodeSystem JSON
 * resources. Each search result keeps its original `system` URI so the chosen
 * coding still points to the concrete CodeSystem entry from the package.
 *
 * @param {{
 *   id: string,
 *   displayName?: string,
 *   packageName?: string,
 *   packageMetadata?: { packageName?: string, title?: string, version?: string },
 *   componentLabel?: string,
 *   includeCodeSystemName?: boolean,
 *   codeSystems: import('@types/fhir').fhir4.CodeSystem[],
 *   systemUri?: string
 * }} config
 * @returns {StaticProvider}
 */
export function createPackageCollectionProvider(config) {
  const codeSystems = config.codeSystems || [];
  const concepts = codeSystems.flatMap((codeSystem, index) =>
    createStaticProviderFromCodeSystem(codeSystem, {
      id: `${config.id}-${index}`,
      systemUri: codeSystem.url
    }).getAll()
  );
  const displayName = config.displayName
    || formatPackageProviderDisplayName({
      packageName: config.packageName,
      packageMetadata: config.packageMetadata,
      componentLabel: config.componentLabel,
      codeSystems,
      includeCodeSystemName: config.includeCodeSystemName
    })
    || config.id;

  const provider = new StaticProvider(
    config.id,
    displayName,
    config.systemUri || `package:${config.id}`,
    concepts
  );

  const codeSystemUris = codeSystems
    .map(codeSystem => codeSystem?.url)
    .filter(Boolean);

  provider.getCodeSystemUris = () => [...codeSystemUris];

  return provider;
}

/**
 * Create a provider that prefers a package-backed CodeSystem snapshot and falls
 * back to a live FHIR terminology server when needed.
 *
 * @param {{
 *   id: string,
 *   displayName: string,
 *   systemUri: string,
 *   codeSystem: import('@types/fhir').fhir4.CodeSystem,
 *   fallbackProvider?: import('../core/TerminologyProvider').TerminologyProvider,
 *   fallbackFhirConfig?: ConstructorParameters<typeof FhirProvider>[0]
 * }} config
 * @returns {FallbackProvider}
 */
export function createPackageFallbackProvider(config) {
  const fallbackProvider = config.fallbackProvider
    || (config.fallbackFhirConfig
      ? new FhirProvider({
        ...config.fallbackFhirConfig,
        id: config.fallbackFhirConfig.id || createFallbackProviderId(config.id),
        displayName: config.fallbackFhirConfig.displayName || `${config.displayName} (FHIR)`
      })
      : null);

  if (!fallbackProvider || !isProviderInstance(fallbackProvider)) {
    throw new Error('createPackageFallbackProvider requires fallbackProvider or fallbackFhirConfig.');
  }

  return new FallbackProvider({
    id: config.id,
    displayName: config.displayName,
    systemUri: config.systemUri,
    primaryProvider: createStaticProviderFromCodeSystem(config.codeSystem, {
      id: createPackageProviderId(config.id),
      displayName: `${config.displayName} (Package)`,
      systemUri: config.systemUri
    }),
    fallbackProvider
  });
}

function normalizeFhirProvider(providerOrConfig) {
  return isProviderInstance(providerOrConfig)
    ? providerOrConfig
    : new FhirProvider(providerOrConfig);
}

function normalizePackageProvider(providerOrConfig) {
  if (isProviderInstance(providerOrConfig)) {
    return providerOrConfig;
  }

  if (Array.isArray(providerOrConfig.codeSystems)) {
    return createPackageCollectionProvider(providerOrConfig);
  }

  if (providerOrConfig.fallbackProvider || providerOrConfig.fallbackFhirConfig) {
    return createPackageFallbackProvider(providerOrConfig);
  }

  return createPackageTerminologyProvider(providerOrConfig);
}

/**
 * Create the terminology services needed by the properties panel from a
 * consumer-owned configuration object.
 *
 * @param {{
 *   terminologyRegistry?: TerminologyRegistry,
 *   staticProviderFactories?: Array<() => import('../core/TerminologyProvider').TerminologyProvider>,
 *   providers?: import('../core/TerminologyProvider').TerminologyProvider[],
 *   fhirProviders?: Array<import('../core/TerminologyProvider').TerminologyProvider | ConstructorParameters<typeof FhirProvider>[0]>,
 *   packageProviders?: Array<import('../core/TerminologyProvider').TerminologyProvider | {
 *     id: string,
 *     displayName?: string,
 *     systemUri?: string,
 *     codeSystem: import('@types/fhir').fhir4.CodeSystem,
 *     fallbackProvider?: import('../core/TerminologyProvider').TerminologyProvider,
 *     fallbackFhirConfig?: ConstructorParameters<typeof FhirProvider>[0]
 *   }>,
 *   loaderConfig?: false | Omit<Parameters<typeof createFhirTerminologyProviderLoader>[0], 'terminologyRegistry'>
 * }} [config]
 * @returns {{ terminologyRegistry: TerminologyRegistry, terminologyProviderLoader?: ReturnType<typeof createFhirTerminologyProviderLoader> }}
 */
export function createTerminologyServices(config = {}) {
  const terminologyRegistry = config.terminologyRegistry || new TerminologyRegistry();

  [
    ...(config.staticProviderFactories || []).map(createProvider => createProvider()),
    ...(config.providers || []),
    ...(config.fhirProviders || []).map(normalizeFhirProvider),
    ...(config.packageProviders || []).map(normalizePackageProvider)
  ].forEach(provider => terminologyRegistry.register(provider));

  if (config.loaderConfig === false) {
    return {
      terminologyRegistry
    };
  }

  return {
    terminologyRegistry,
    terminologyProviderLoader: createFhirTerminologyProviderLoader({
      terminologyRegistry,
      ...(config.loaderConfig || {})
    })
  };
}

/**
 * Expose terminology services as a bpmn-js module that can be passed into
 * `additionalModules`.
 *
 * @param {{ terminologyRegistry: TerminologyRegistry, terminologyProviderLoader?: any }} services
 * @returns {Record<string, [string, any]>}
 */
export function createTerminologyModule(services) {
  return {
    terminologyRegistry: ['value', services.terminologyRegistry],
    ...(services.terminologyProviderLoader
      ? { terminologyProviderLoader: ['value', services.terminologyProviderLoader] }
      : {})
  };
}
