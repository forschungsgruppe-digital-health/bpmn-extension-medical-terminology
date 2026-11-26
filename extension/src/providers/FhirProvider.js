import { TerminologyProvider } from '../core/TerminologyProvider.js';
import {
  FhirTerminologyAdapter,
  resolveFhirBaseUrl
} from '../adapters/FhirTerminologyAdapter.js';

// `http://snomed.info/sct/<module id>` names a SNOMED CT edition, not a
// release. Servers report the release they used as `…/version/YYYYMMDD`, so an
// edition URI can never match a stored coding version.
const SNOMED_EDITION_URI_PATTERN = /^http:\/\/snomed\.info\/sct\/\d+$/;

/**
 * Host shown as the provider source: the host the adapter sends requests to.
 * A relative base URL such as `/api/terminology` (a same-origin route) is
 * resolved the same way as by the adapter; when there is no page to resolve
 * it against, or the URL has no host, the configured URL itself is the label.
 *
 * @param {string} baseUrl
 * @returns {string}
 */
function getSourceLabel(baseUrl) {
  const rawBaseUrl = String(baseUrl ?? '').trim();
  const resolvedBaseUrl = rawBaseUrl ? resolveFhirBaseUrl(rawBaseUrl) : null;

  try {
    return (resolvedBaseUrl && new URL(resolvedBaseUrl).host) || rawBaseUrl;
  } catch {
    return rawBaseUrl;
  }
}

/**
 * Release part of a `system|version` canonical, as used by the FHIR
 * `system-version` and `force-system-version` expansion parameters.
 *
 * @param {Record<string, string> | undefined} expandParameters
 * @returns {string | undefined}
 */
function getExpandSystemVersion(expandParameters) {
  for (const name of ['system-version', 'force-system-version']) {
    const value = expandParameters?.[name];

    if (typeof value === 'string' && value.includes('|')) {
      return value.slice(value.indexOf('|') + 1) || undefined;
    }
  }

  return undefined;
}

function deriveVersionLabel(config) {
  if (config.version) {
    return config.version;
  }

  const derivedVersion = config.lookupParameters?.version
    || config.expandParameters?.valueSetVersion
    || config.expandParameters?.version
    || getExpandSystemVersion(config.expandParameters);

  return typeof derivedVersion === 'string' && SNOMED_EDITION_URI_PATTERN.test(derivedVersion)
    ? undefined
    : derivedVersion;
}

/**
 * Generic provider for any code system hosted on a FHIR Terminology Server.
 * Reusable for LOINC, ICD-10-GM, OPS, ATC, ICD-O-3, etc.
 * @category Providers
 */
export class FhirProvider extends TerminologyProvider {

  /**
   * @param {Object} config
   * @param {string} config.id - Provider ID (e.g. 'loinc', 'icd-10-gm')
   * @param {string} config.displayName
   * @param {string} config.systemUri
   * @param {string} [config.valueSetUri] - Override URI for $expand (useful for HL7 ValueSets)
   * @param {string} config.baseUrl - FHIR server base URL; a relative URL such as
   *   `/api/terminology` is resolved against the current page
   * @param {number} [config.maxResults=15]
   * @param {string} [config.version] - Release label used to flag stored codings
   *   of another release; derived from a pinned `expandParameters` or
   *   `lookupParameters` version when omitted
   * @param {Record<string, string>} [config.expandParameters]
   * @param {Record<string, string>} [config.lookupParameters]
   * @param {import('../core/types.js').ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   */
  constructor(config) {
    super();
    /** @internal */
    this._id = config.id;
    /** @internal */
    this._displayName = config.displayName;
    /** @internal */
    this._systemUri = config.systemUri;
    /** @internal */
    this._sourceType = 'api';
    /** @internal */
    this._sourceLabel = getSourceLabel(config.baseUrl);
    /** @internal */
    this._version = deriveVersionLabel(config);
    /** @internal */
    this._maxResults = config.maxResults || 15;
    
    // Use valueSetUri for the adapter if provided, otherwise fallback to systemUri
    /** @internal */
    this._adapter = new FhirTerminologyAdapter({
      baseUrl: config.baseUrl,
      systemUri: config.systemUri,
      valueSetUri: config.valueSetUri,
      expandParameters: config.expandParameters,
      lookupParameters: config.lookupParameters,
      auth: config.auth,
      fetchFn: config.fetchFn,
      headers: config.headers,
      requestTimeoutMs: config.requestTimeoutMs
    });
  }

  get id() { return this._id; }
  get displayName() { return this._displayName; }
  get systemUri() { return this._systemUri; }
  /** Configured CodeSystem or ValueSet version, when known. */
  get version() { return this._version; }
  /** Machine-readable kind of the provider's backing source. */
  get sourceType() { return this._sourceType; }
  /** Host name shown to users as the provider source. */
  get sourceLabel() { return this._sourceLabel; }
  /** Human-readable name of the source represented by this provider. */
  get sourceName() { return this._displayName; }
  /** Operations supported by the FHIR-backed provider. */
  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  async search(term, options = {}) {
    let result;
    try {
      result = await this._adapter.search({
        term,
        limit: options.limit ?? this._maxResults,
        offset: options.offset ?? 0,
        signal: options.signal
      });
    } catch (error) {
      // A cancelled search (the caller aborted it, e.g. on the next
      // keystroke) is not a failure worth a warning.
      if (error?.kind !== 'aborted') {
        console.warn(`[terminology] Search failed for provider "${this.id}" at ${this.sourceLabel}.`, error);
      }
      throw error;
    }
    
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
      total: result.total
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
