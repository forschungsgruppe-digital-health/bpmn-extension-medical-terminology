import { FhirProvider } from '../providers/FhirProvider.js';

/**
 * Load any CodeSystem dynamically from a FHIR R4 server.
 * Ideal for integrating dynamic hl7.terminology.r4 resources.
 *
 * @param {string} systemUrl - The URI of the CodeSystem (e.g. 'http://terminology.hl7.org/CodeSystem/v3-ActCode')
 * @param {string} fhirBaseUrl - FHIR R4 server base URL
 * @param {typeof fetch} [fetchFn] - Custom fetch function
 * @returns {Promise<FhirProvider>}
 */
export async function loadCodeSystemFromFhir(systemUrl, fhirBaseUrl, fetchFn) {
  const _fetch = fetchFn || globalThis.fetch.bind(globalThis);
  let displayName = systemUrl.split('/').pop();
  let version;

  try {
    const res = await _fetch(
      `${fhirBaseUrl}/CodeSystem?url=${encodeURIComponent(systemUrl)}`,
      { headers: { Accept: 'application/fhir+json' } }
    );
    if (!res.ok) {
      throw new Error(`Failed to load CodeSystem metadata for ${systemUrl} from ${fhirBaseUrl}`);
    }
    const bundle = await res.json();
    const cs = bundle.entry?.[0]?.resource;
    if (!cs) {
      throw new Error(`CodeSystem ${systemUrl} is not available on ${fhirBaseUrl}`);
    }
    if (cs.title || cs.name) {
      displayName = cs.title || cs.name;
    }
    version = cs.version;
  } catch (err) {
    throw new Error(`Failed to load CodeSystem ${systemUrl} from ${fhirBaseUrl}: ${err.message}`);
  }

  let valueSetUri = systemUrl;
  if (systemUrl.startsWith('http://terminology.hl7.org/CodeSystem/')) {
    valueSetUri = systemUrl.replace('/CodeSystem/', '/ValueSet/');
  }

  return new FhirProvider({
    id: `dyn-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    displayName,
    systemUri: systemUrl,
    valueSetUri,
    baseUrl: fhirBaseUrl,
    version
  });
}
