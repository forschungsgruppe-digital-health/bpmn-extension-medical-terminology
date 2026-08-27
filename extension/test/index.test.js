import { describe, it, expect } from 'vitest';

/**
 * Tests that the core (non-UI) exports of the terminology package are
 * importable and well-defined. Properties-panel modules are excluded
 * because they depend on bpmn-js peer dependencies that may not be
 * resolved in a pure unit-test environment.
 */

describe('@forschungsgruppe-digital-health/terminology – core exports', () => {
  it('should export FHIR version configuration', async () => {
    const mod = await import('../src/core/fhir-version.js');
    expect(mod.ACTIVE_FHIR_VERSION).toBeDefined();
    expect(mod.FHIR_R4).toBeDefined();
    expect(mod.FHIR_R5).toBeDefined();
    expect(mod.FHIR_MIME_TYPE).toBeDefined();
    expect(mod.ACTIVE_FHIR_VERSION.version).toBe('R4');
    expect(mod.FHIR_MIME_TYPE).toBe('application/fhir+json');
  });

  it('should export TerminologyProvider', async () => {
    const mod = await import('../src/core/TerminologyProvider.js');
    expect(mod.TerminologyProvider).toBeDefined();
    expect(typeof mod.TerminologyProvider).toBe('function');
  });

  it('should export TerminologyRegistry', async () => {
    const mod = await import('../src/core/TerminologyRegistry.js');
    expect(mod.TerminologyRegistry).toBeDefined();
    expect(typeof mod.TerminologyRegistry).toBe('function');
  });

  it('should export type constants', async () => {
    const mod = await import('../src/core/types.js');
    expect(mod.ASPECTS).toBeDefined();
    expect(mod.MODES).toBeDefined();
    expect(mod.TRANSFORMS).toBeDefined();
    expect(mod.CLINICAL_DOMAINS).toBeDefined();
  });

  it('should export SnowstormAdapter', async () => {
    const mod = await import('../src/adapters/SnowstormAdapter.js');
    expect(mod.SnowstormAdapter).toBeDefined();
  });

  it('should export FhirTerminologyAdapter', async () => {
    const mod = await import('../src/adapters/FhirTerminologyAdapter.js');
    expect(mod.FhirTerminologyAdapter).toBeDefined();
  });

  it('should export SnomedCtProvider', async () => {
    const mod = await import('../src/providers/SnomedCtProvider.js');
    expect(mod.SnomedCtProvider).toBeDefined();
  });

  it('should export FhirProvider', async () => {
    const mod = await import('../src/providers/FhirProvider.js');
    expect(mod.FhirProvider).toBeDefined();
  });

  it('should export StaticProvider', async () => {
    const mod = await import('../src/providers/StaticProvider.js');
    expect(mod.StaticProvider).toBeDefined();
  });

  it('should export FallbackProvider', async () => {
    const mod = await import('../src/providers/FallbackProvider.js');
    expect(mod.FallbackProvider).toBeDefined();
  });


  it('should export AnnotationHelper functions', async () => {
    const mod = await import('../src/services/AnnotationHelper.js');
    expect(mod.getAnnotations).toBeDefined();
    expect(mod.addAnnotation).toBeDefined();
    expect(mod.createId).toBeDefined();
    expect(mod.getUsedIds).toBeDefined();
    expect(mod.getCodingKey).toBeDefined();
    expect(mod.getUsedCodingKeys).toBeDefined();
    expect(mod.isValidId).toBeDefined();
    expect(mod.removeAnnotation).toBeDefined();
    expect(mod.getAnnotationsContainer).toBeDefined();
    expect(mod.ensureAnnotationsContainer).toBeDefined();
    expect(mod.ensureExtensionElements).toBeDefined();
  });

  it('should export TerminologyProviderLoader helpers', async () => {
    const mod = await import('../src/services/TerminologyProviderLoader.js');
    expect(mod.createFhirTerminologyProviderLoader).toBeDefined();
  });

  it('should export CodeSystemProviderFactory helpers', async () => {
    const mod = await import('../src/services/CodeSystemProviderFactory.js');
    expect(mod.createStaticProviderFromCodeSystem).toBeDefined();
  });

  it('should export TerminologyServices helpers', async () => {
    const mod = await import('../src/services/TerminologyServices.js');
    expect(mod.createPackageTerminologyProvider).toBeDefined();
    expect(mod.createPackageCollectionProvider).toBeDefined();
    expect(mod.createPackageFallbackProvider).toBeDefined();
    expect(mod.createTerminologyServices).toBeDefined();
    expect(mod.createTerminologyModule).toBeDefined();
  });

  it('should export package discovery helpers', async () => {
    const mod = await import('../src/services/PackageProviderDiscovery.js');
    expect(mod.DEFAULT_DISCOVERY_INCLUDE).toBeDefined();
    expect(mod.DEFAULT_DISCOVERY_EXCLUDE).toBeDefined();
    expect(mod.collectPackageCodeSystemsFromModules).toBeDefined();
    expect(mod.discoverPackageProviders).toBeDefined();
  });

  it('should export configurable properties panel helpers', async () => {
    const mod = await import('../src/properties-panel/config.js');
    expect(mod.DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG).toBeDefined();
    expect(mod.resolveTerminologyPropertiesConfig).toBeDefined();

    const panelConfig = mod.resolveTerminologyPropertiesConfig({
      showMappingTarget: false
    });

    expect(panelConfig.showClinicalDomain).toBe(true);
    expect(panelConfig.showAnnotations).toBe(true);
    expect(panelConfig.showMappingTarget).toBeUndefined();
  });

  it('should export moddle descriptor as JSON', async () => {
    const { default: descriptor } = await import('../src/moddle/clinical.json');
    expect(descriptor.name).toBe('ClinicalTerminology');
    expect(descriptor.prefix).toBe('term');
    expect(descriptor.uri).toBe('https://clinical-bpmn.org/terminology/v1');
    expect(descriptor.types.length).toBeGreaterThan(0);
  });
});
