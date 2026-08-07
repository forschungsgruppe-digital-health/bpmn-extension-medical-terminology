export const ENABLE_PACKAGE_DISCOVERY = false;
export const DISCOVERY_PACKAGES = {};

const DEFAULT_FHIR_BASE_URL = import.meta.env?.VITE_FHIR_BASE_URL || 'https://r4.ontoserver.csiro.au/fhir';
const DEFAULT_SNOWSTORM_BASE_URL = import.meta.env?.VITE_SNOWSTORM_BASE_URL || '/snowstorm-api';
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
