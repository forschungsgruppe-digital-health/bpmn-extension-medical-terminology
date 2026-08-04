export const ENABLE_PACKAGE_DISCOVERY = true;
export const DISCOVERY_PACKAGES = {
  'hl7.fhir.r4.core': {
    include: ['*']
  }
};

const DEFAULT_FHIR_BASE_URL = import.meta.env?.VITE_FHIR_BASE_URL || 'https://r4.ontoserver.csiro.au/fhir';
const DEFAULT_SNOWSTORM_BASE_URL = import.meta.env?.VITE_SNOWSTORM_BASE_URL || 'https://snowstorm-training.snomedtools.org/snowstorm/snomed-ct';
export async function createDemoTerminologyServices() {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/terminology');

  return createDefaultTerminologyServices({
    serverConfig: {
      fhirBaseUrl: DEFAULT_FHIR_BASE_URL,
      snowstormBaseUrl: DEFAULT_SNOWSTORM_BASE_URL
    },
    packageAutoDiscovery: ENABLE_PACKAGE_DISCOVERY
  });
}
