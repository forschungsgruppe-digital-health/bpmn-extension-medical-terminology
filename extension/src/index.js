// ─── FHIR Version Configuration ─────────────────────────────
export {
  ACTIVE_FHIR_VERSION,
  FHIR_R4,
  FHIR_R5,
  FHIR_MIME_TYPE
} from './core/fhir-version.js';

// ─── Core ────────────────────────────────────────────────────
export { TerminologyProvider } from './core/TerminologyProvider.js';
export { TerminologyRegistry } from './core/TerminologyRegistry.js';
export { ASPECTS, MODES, TRANSFORMS, CLINICAL_DOMAINS } from './core/types.js';

// ─── Adapters ────────────────────────────────────────────────
export { SnowstormAdapter } from './adapters/SnowstormAdapter.js';
export { FhirTerminologyAdapter } from './adapters/FhirTerminologyAdapter.js';

// ─── Providers ───────────────────────────────────────────────
export { SnomedCtProvider } from './providers/SnomedCtProvider.js';
export { FhirProvider } from './providers/FhirProvider.js';
export { StaticProvider } from './providers/StaticProvider.js';
export { FallbackProvider } from './providers/FallbackProvider.js';

// ─── moddle descriptor ───────────────────────────────────────
export { default as TerminologyModdleDescriptor } from './moddle/clinical.json';

// ─── Properties Panel module (for bpmn-js additionalModules) ─
export { default as TerminologyPropertiesPanelModule } from './properties-panel/index.js';
export { createTerminologyPropertiesPanelModule } from './properties-panel/index.js';
export { DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG } from './properties-panel/config.js';

// ─── Helpers ─────────────────────────────────────────────────
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

export { createStaticProviderFromCodeSystem } from './services/CodeSystemProviderFactory.js';
export { loadCodeSystemFromFhir } from './services/FhirCodeSystemLoader.js';
export { createFhirTerminologyProviderLoader } from './services/TerminologyProviderLoader.js';
export {
  DEFAULT_DISCOVERY_INCLUDE,
  DEFAULT_DISCOVERY_EXCLUDE,
  collectPackageCodeSystemsFromGlob,
  collectPackageCodeSystemsFromModules,
  discoverPackageProviders
} from './services/PackageProviderDiscovery.js';
export {
  createPackageTerminologyProvider,
  createPackageCollectionProvider,
  createPackageFallbackProvider,
  createTerminologyServices,
  createTerminologyModule
} from './services/TerminologyServices.js';
export {
  createDefaultServerConfig,
  createDefaultFhirProviderConfigs,
  createDefaultPackageProviders,
  createDefaultTerminologyConfig,
  createDefaultTerminologyServices,
  createDefaultTerminologyModule
} from './config/terminology-config.js';
