export const ENABLE_PACKAGE_DISCOVERY = true;
export const DISCOVERY_PACKAGES = {
  // Bundled extension defaults:
  // 'de.ihe-d.terminology': {
  //   include: ['*']
  // },
  // 'dvmd.kdl.r4': {
  //   include: ['*']
  // },
  // 'hl7.terminology.r4': {
  //   include: ['*']
  // },
  'hl7.fhir.r4.core': {
    include: ['http://hl7.org/fhir/abstract-types']
  }
};

// The extension supplies Ontoserver/FHIR as its default SNOMED provider.
// Uncomment this block only to override it for the demo.
//
// const DEFAULT_FHIR_BASE_URL = import.meta.env?.VITE_FHIR_BASE_URL
//   || 'https://r4.ontoserver.csiro.au/fhir';
// const DEFAULT_SNOWSTORM_BASE_URL = import.meta.env?.VITE_SNOWSTORM_BASE_URL
//   || '/snowstorm-api';
// const SNOMED_SERVER_PROFILES = {
//   ontoserver: {
//     transport: 'fhir',
//     baseUrl: DEFAULT_FHIR_BASE_URL
//   },
//   snowstorm: {
//     transport: 'snowstorm',
//     baseUrl: DEFAULT_SNOWSTORM_BASE_URL
//   }
// };
//
// const selectedSnomedServer = import.meta.env?.VITE_SNOMED_SERVER || 'ontoserver';
// const SNOMED_SERVER = SNOMED_SERVER_PROFILES[selectedSnomedServer];

export async function createDemoTerminologyServices() {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/terminology');

  // return createDefaultTerminologyServices({
  //   snomedConfig: SNOMED_SERVER
  // });
  return createDefaultTerminologyServices();
}