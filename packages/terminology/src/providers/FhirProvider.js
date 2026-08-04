import { TerminologyProvider } from '../core/TerminologyProvider.js';
import { FhirTerminologyAdapter } from '../adapters/FhirTerminologyAdapter.js';

/**
 * Generic provider for any code system hosted on a FHIR Terminology Server.
 * Reusable for LOINC, ICD-10-GM, OPS, ATC, ICD-O-3, etc.
 */
export class FhirProvider extends TerminologyProvider {

  /**
   * @param {Object} config
   * @param {string} config.id - Provider ID (e.g. 'loinc', 'icd-10-gm')
   * @param {string} config.displayName
   * @param {string} config.systemUri
   * @param {string} [config.valueSetUri] - Override URI for $expand (useful for HL7 ValueSets)
   * @param {string} config.baseUrl - FHIR server base URL
   * @param {number} [config.maxResults=15]
   * @param {string} [config.language]
   * @param {Record<string, string>} [config.expandParameters]
   * @param {Record<string, string>} [config.lookupParameters]
   * @param {import('../core/types').ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   */
  constructor(config) {
    super();
    this._id = config.id;
    this._displayName = config.displayName;
    this._systemUri = config.systemUri;
    this._version = config.version
      || config.lookupParameters?.version
      || config.expandParameters?.valueSetVersion
      || config.expandParameters?.version
      || (typeof config.expandParameters?.['system-version'] === 'string'
        ? config.expandParameters['system-version'].split('|')[1]
        : undefined);
    this._maxResults = config.maxResults || 15;
    
    // Use valueSetUri for the adapter if provided, otherwise fallback to systemUri
    this._adapter = new FhirTerminologyAdapter({
      baseUrl: config.baseUrl,
      systemUri: config.systemUri,
      valueSetUri: config.valueSetUri,
      expandParameters: config.expandParameters,
      lookupParameters: config.lookupParameters,
      auth: config.auth,
      fetchFn: config.fetchFn,
      headers: config.headers
    });
  }

  get id() { return this._id; }
  get displayName() { return this._displayName; }
  get systemUri() { return this._systemUri; }
  get version() { return this._version; }
  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  async search(term, options = {}) {
    const result = await this._adapter.search({
      term,
      limit: options.limit ?? this._maxResults,
      offset: options.offset ?? 0
    });
    
    const concepts = result.items || [];

    // Ensure the returned concepts use the correct CodeSystem URI (not the ValueSet URI)
    concepts.forEach(c => {
      c.system = this._systemUri;
      if (!c.version && this._version) {
        c.version = this._version;
      }
    });
    
    return {
      concepts,
      total: result.total ?? 0
    };
  }

  async lookup(code) {
    const concept = await this._adapter.lookup(code);

    if (concept && !concept.version && this._version) {
      concept.version = this._version;
    }

    return concept;
  }
}
