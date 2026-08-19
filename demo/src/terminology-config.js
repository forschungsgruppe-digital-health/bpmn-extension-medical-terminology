export const ENABLE_PACKAGE_DISCOVERY = true;
export const DISCOVERY_PACKAGES = {
  'de.ihe-d.terminology': {
    include: ['*']
  },
  'dvmd.kdl.r4': {
    include: ['*']
  },
  'hl7.terminology.r4': {
    include: ['*']
  },
  'hl7.fhir.r4.core': {
    include: ['http://hl7.org/fhir/abstract-types']
  },
  'hl7.fhir.uv.extensions.r4': {
    include: ['*']
  }
};

const DEFAULT_FHIR_BASE_URL = import.meta.env?.VITE_FHIR_BASE_URL || 'https://r4.ontoserver.csiro.au/fhir';
const DEFAULT_SNOWSTORM_BASE_URL = import.meta.env?.VITE_SNOWSTORM_BASE_URL || 'https://snowstorm-training.snomedtools.org/snowstorm/snomed-ct';
export async function createDemoTerminologyServices(packageModules = {}, packageMetadata = {}) {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/terminology');

  return createDefaultTerminologyServices({
    serverConfig: {
      fhirBaseUrl: DEFAULT_FHIR_BASE_URL,
      snowstormBaseUrl: DEFAULT_SNOWSTORM_BASE_URL
    },
    packageMetadata,
    packageAutoDiscovery: ENABLE_PACKAGE_DISCOVERY
      ? { packages: packageModules, metadata: packageMetadata }
      : false
  });
}
