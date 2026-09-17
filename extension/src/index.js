/**
 * Medical terminology for BPMN process models.
 *
 * This package is a bpmn.io extension. It adds a `term:` namespace to the BPMN
 * model so that coded concepts from clinical code systems can be bound to BPMN
 * elements, and it ships a properties-panel group for doing so interactively.
 *
 * The public surface has four layers:
 *
 * 1. **Composition roots** such as {@link createDefaultTerminologyModule} wire
 *    everything together with one call and are where most integrations start.
 * 2. **Providers** such as {@link SnomedCtProvider} answer terminology queries
 *    for one code system each.
 * 3. **Extension points** such as {@link TerminologyProvider} and
 *    {@link FhirTerminologyAdapter} are what you build on to support a code
 *    system or a server this package does not ship.
 * 4. **Model access** such as {@link getAnnotations} and {@link addAnnotation}
 *    reads and writes the annotations themselves.
 *
 * The package is consumed through a bundler. A plain Node `import` of this
 * entry point fails, because two upstream bpmn.io packages are not resolvable
 * outside a bundler.
 *
 * @packageDocumentation
 *
 * @categoryDescription Getting started
 * One-call wiring for a bpmn-js modeler, and the service container behind it.
 *
 * @categoryDescription Configuration
 * Building and adjusting the terminology configuration, including the shipped
 * defaults and the FHIR version constants.
 *
 * @categoryDescription Providers
 * The terminology providers that ship with the package, and the factories that
 * build providers from FHIR CodeSystem resources or npm packages.
 *
 * @categoryDescription Extensibility
 * The seams you implement or reuse to support a code system or a terminology
 * server that is not shipped: the provider base class, the transport adapters
 * and the lazy provider loader.
 *
 * @categoryDescription Annotations
 * Reading and writing `term:Annotations` on a BPMN business object.
 *
 * @categoryDescription Properties panel
 * The bpmn-js properties-panel integration and its configuration.
 *
 * @categoryDescription XML schema
 * The moddle descriptor that defines the `term:` namespace.
 *
 * @categoryDescription Discovery
 * Finding terminology packages at build time, and labelling what was found.
 *
 * @categoryDescription Internal helpers
 * Exported because the properties panel needs them across module boundaries.
 * They are not part of the supported surface and may change without a major
 * version.
 */

/**
 * A single concept returned by a provider.
 *
 * @typedef {import('./core/types.js').Concept} Concept
 */

/**
 * One page of provider search results.
 *
 * @typedef {import('./core/types.js').SearchResult} SearchResult
 */

/**
 * Options accepted by {@link TerminologyProvider.search}.
 *
 * @typedef {import('./core/types.js').SearchOptions} SearchOptions
 */

/**
 * What a provider is able to do, as advertised to the properties panel.
 *
 * @typedef {import('./core/types.js').TerminologyCapabilities} TerminologyCapabilities
 */

/**
 * Connection details for a terminology server.
 *
 * @typedef {import('./core/types.js').ConnectionConfig} ConnectionConfig
 */

/**
 * A FHIR R4 ValueSet expansion entry, as returned by `$expand`.
 *
 * @typedef {import('./core/types.js').FhirValueSetExpansionContains} FhirValueSetExpansionContains
 */

/** @category Configuration */
export {
  ACTIVE_FHIR_VERSION,
  FHIR_R4,
  FHIR_R5,
  FHIR_MIME_TYPE
} from './core/fhir-version.js';

/** @category Extensibility */
export { TerminologyProvider } from './core/TerminologyProvider.js';
/** @category Extensibility */
export { TerminologyRegistry } from './core/TerminologyRegistry.js';

/** @category Extensibility */
export { SnowstormAdapter } from './adapters/SnowstormAdapter.js';
/** @category Extensibility */
export { FhirTerminologyAdapter } from './adapters/FhirTerminologyAdapter.js';

/** @category Providers */
export { SnomedCtProvider } from './providers/SnomedCtProvider.js';
/** @category Providers */
export { FhirProvider } from './providers/FhirProvider.js';
/** @category Providers */
export { StaticProvider } from './providers/StaticProvider.js';
/** @category Providers */
export { FallbackProvider } from './providers/FallbackProvider.js';

/** @category XML schema */
export { default as TerminologyModdleDescriptor } from './moddle/clinical.json' with { type: 'json' };

/** @category Properties panel */
export { default as TerminologyPropertiesPanelModule } from './properties-panel/index.js';
/** @category Properties panel */
export { createTerminologyPropertiesPanelModule } from './properties-panel/index.js';
/** @category Properties panel */
export { DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG } from './properties-panel/config.js';

/** @category Annotations */
export {
  getAnnotations,
  addAnnotation,
  createId,
  getUsedIds,
  getCodingKey,
  getUsedCodingKeys,
  isValidId,
  removeAnnotation,
  getAnnotationsContainer,
  ensureAnnotationsContainer,
  ensureExtensionElements
} from './services/AnnotationHelper.js';

/** @category Providers */
export { createStaticProviderFromCodeSystem } from './services/CodeSystemProviderFactory.js';
/** @category Providers */
export { loadCodeSystemFromFhir } from './services/FhirCodeSystemLoader.js';
/** @category Extensibility */
export { createFhirTerminologyProviderLoader } from './services/TerminologyProviderLoader.js';
/** @category Discovery */
export {
  DEFAULT_DISCOVERY_INCLUDE,
  DEFAULT_DISCOVERY_EXCLUDE,
  collectPackageCodeSystemsFromGlob,
  collectPackageCodeSystemsFromModules,
  discoverPackageProviders
} from './services/PackageProviderDiscovery.js';
/** @category Discovery */
export {
  formatPackageDisplayName,
  formatPackageProviderDisplayName
} from './services/PackageMetadata.js';
/** @category Getting started */
export {
  createPackageTerminologyProvider,
  createPackageCollectionProvider,
  createPackageFallbackProvider,
  createTerminologyServices,
  createTerminologyModule
} from './services/TerminologyServices.js';
/** @category Providers */
export {
  DEFAULT_PACKAGE_PROVIDER_IDS,
  createPackagePresetProvider,
  createHl7TerminologyR4PackageProvider,
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider
} from './providers/presets/index.js';
/** @category Configuration */
export {
  createDefaultServerConfig,
  createDefaultFhirProviderConfigs,
  createDefaultPackageProviders,
  createDefaultTerminologyConfig,
  createDefaultTerminologyServices,
  createDefaultTerminologyModule
} from './config/terminology-config.js';
