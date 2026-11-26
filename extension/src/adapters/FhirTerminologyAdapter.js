/**
 * Adapter for FHIR Terminology Services API.
 * Uses CodeSystem/$lookup and ValueSet/$expand (FHIR R4).
 *
 * Reusable for any code system hosted on a FHIR-compliant terminology server
 * (Snowstorm FHIR endpoint, HAPI FHIR, Ontoserver, BfArM FHIR, etc.).
 *
 * FHIR R4 types from @types/fhir are used for JSDoc annotations.
 * When migrating to R5, update fhir4.* references to fhir5.*.
 *
 * @module FhirTerminologyAdapter
 */

import { FHIR_MIME_TYPE } from '../core/fhir-version.js';
import {
  createDataError,
  createRequestError,
  TerminologyRequestError
} from '../core/TerminologyRequestError.js';
import {
  createRequestSignal,
  DEFAULT_REQUEST_TIMEOUT_MS
} from '../core/request-signal.js';
import languageConfig from '../config/terminology-language-config.js';

/**
 * Resolve a FHIR base URL to an absolute URL without a trailing slash.
 *
 * Only a string with a URL scheme (`https:`, `http:`, `data:`, `blob:`, ...)
 * is absolute. Anything else, including a protocol-relative `//host/path` or
 * a same-origin route such as `/api/terminology`, is resolved like `fetch`
 * resolves it: against the document base URL, which honours `<base href>` and
 * which `about:blank` and `about:srcdoc` documents inherit from their
 * creator. Workers have no document, so `location.href` follows, then
 * `location.origin` (the string `'null'` on opaque origins, hence each
 * candidate is tried in turn).
 *
 * @param {string} baseUrl
 * @returns {string | null} The absolute base URL, or `null` when a relative
 *   URL cannot be resolved because there is no web page to resolve it against.
 */
export function resolveFhirBaseUrl(baseUrl) {
  const rawBaseUrl = String(baseUrl || '').trim();

  if (!rawBaseUrl) {
    throw new Error('FhirTerminologyAdapter requires a baseUrl.');
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(rawBaseUrl)) {
    return rawBaseUrl.replace(/\/$/, '');
  }

  const candidates = [
    globalThis.document?.baseURI,
    globalThis.location?.href,
    globalThis.location?.origin
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(rawBaseUrl, candidate).toString().replace(/\/$/, '');
    } catch {
      // Try the next candidate.
    }
  }

  // There is no hard-coded fallback such as http://localhost: requests would
  // silently go to whatever listens there. Every request fails instead.
  return null;
}

/**
 * @typedef {fhir4.ValueSet} FhirValueSet
 * @typedef {fhir4.ValueSetExpansionContains} FhirValueSetExpansionContains
 * @typedef {fhir4.Parameters} FhirParameters
 * @typedef {fhir4.ParametersParameter} FhirParametersParameter
 * @typedef {import('../core/types.js').Concept} Concept
 * @typedef {import('../core/types.js').ConnectionConfig} ConnectionConfig
 * @category Extensibility
 */

export class FhirTerminologyAdapter {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - FHIR base URL (e.g. 'https://fhir.bfarm.de/fhir'); a
   *   relative URL resolves against the current page, and every request fails
   *   when there is no page to resolve it against
   * @param {string} config.systemUri - CodeSystem URI (e.g. 'http://fhir.de/CodeSystem/bfarm/icd-10-gm')
   * @param {string} [config.valueSetUri] - Explicit ValueSet URI for $expand
   * @param {ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   * @param {Record<string, string>} [config.headers]
   * @param {Record<string, string>} [config.expandParameters]
   * @param {Record<string, string>} [config.lookupParameters]
   * @param {number} [config.requestTimeoutMs=15000]
   */
  constructor(config) {
    /** @internal */
    this._rawBaseUrl = String(config.baseUrl || '').trim();
    /** @internal */
    this._baseUrl = resolveFhirBaseUrl(config.baseUrl);
    /** @internal */
    this._systemUri = config.systemUri;
    /** @internal */
    this._valueSetUri = config.valueSetUri || null;
    /** @internal */
    this._auth = config.auth;
    /** @internal */
    this._fetch = config.fetchFn || globalThis.fetch.bind(globalThis);
    /** @internal */
    this._extraHeaders = config.headers || {};
    /** @internal */
    this._expandParameters = config.expandParameters || {};
    /** @internal */
    this._lookupParameters = config.lookupParameters || {};
    /** @internal */
    this._requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    // Language configuration:
    // languageStrategy: 'param' (use displayLanguage query param) or 'header' (use Accept-Language header)
    /** @internal */
    this._languageStrategy = config.languageStrategy ?? languageConfig.languageStrategy ?? 'param';
    // configured language comes from constructor config or central language config file
    /** @internal */
    this._configuredLanguage = config.language ?? languageConfig.language;
  }

  /**
   * Search via ValueSet/$expand with filter parameter.
   *
   * The response is a FHIR R4 ValueSet with an expansion containing
   * matching concepts. Each entry in expansion.contains is a
   * {@link FhirValueSetExpansionContains} which we map to our internal
   * {@link Concept} type.
   *
   * @param {{ term: string, limit: number, offset: number, signal?: AbortSignal }} params
   * @returns {Promise<{ items: Concept[], total?: number }>}
   */
  async search(params) {
    const url = this._createRequestUrl('/ValueSet/$expand');

    const targetUrl = this._valueSetUri || getImplicitValueSetUri(this._systemUri);
    url.searchParams.set('url', targetUrl);
    url.searchParams.set('filter', params.term || '');
    url.searchParams.set('count', String(params.limit));
    url.searchParams.set('offset', String(params.offset));

    // Resolve language: priority -> configured language -> browser -> 'en'
    const resolvedLanguage = this._resolveLanguage();

    // Apply language according to strategy
    let extraRequestHeaders = {};
    if (resolvedLanguage) {
      if (this._languageStrategy === 'param') {
        url.searchParams.set('displayLanguage', resolvedLanguage);
      } else if (this._languageStrategy === 'header') {
        extraRequestHeaders['Accept-Language'] = resolvedLanguage;
      }
    }

    Object.entries(this._expandParameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    
    // Some FHIR Servers need this flag for text return
    url.searchParams.set('includeDesignations', 'true');

    const request = createRequestSignal(params.signal, this._requestTimeoutMs);
    let res;

    try {
      res = await this._request(url, extraRequestHeaders, request.signal);
    } catch (error) {
      throw createRequestError(null, url, { cause: error, kind: request.getAbortKind() });
    } finally {
      request.cleanup();
    }

    if (!res.ok) {
      throw createRequestError(res, url);
    }

    /** @type {FhirValueSet} */
    let data;

    try {
      data = await res.json();
    } catch (error) {
      throw createDataError(url, error);
    }

    const contains = data?.expansion?.contains;

    if (
      !data ||
      typeof data !== 'object' ||
      !data.expansion ||
      typeof data.expansion !== 'object' ||
      (contains !== undefined && !Array.isArray(contains))
    ) {
      throw createDataError(url);
    }

    /** @type {FhirValueSetExpansionContains[]} */
    const expansionContains = contains || [];
    const total = data.expansion.total;

    if (
      (total !== undefined && typeof total !== 'number') ||
      expansionContains.some(entry =>
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.code !== 'string' ||
        !entry.code.trim()
      )
    ) {
      throw createDataError(url);
    }

    const expansionVersion = getExpansionVersion(data.expansion, this._systemUri);

    try {
      return {
        items: expansionContains.map(c => {
          const concept = this._mapExpandContainsToConcept(c, resolvedLanguage);

          if (concept.version || !expansionVersion) {
            return concept;
          }

          return { ...concept, version: expansionVersion };
        }),
        total
      };
    } catch (error) {
      throw createDataError(url, error);
    }
  }

  /**
   * Lookup via CodeSystem/$lookup.
   *
   * The response is a FHIR R4 Parameters resource containing the
   * display name and other properties of the requested code. The display
   * language is requested the same way as for `search`: the `displayLanguage`
   * input parameter, or the `Accept-Language` header with the `'header'`
   * strategy.
   *
   * @param {string} code
   * @returns {Promise<Concept | null>}
   */
  async lookup(code) {
    const url = this._createRequestUrl('/CodeSystem/$lookup');
    url.searchParams.set('system', this._systemUri);
    url.searchParams.set('code', code);

    // Apply the language strategy as for search; without it the display
    // depends on whatever Accept-Language the client happens to send.
    const lookupResolvedLanguage = this._resolveLanguage();
    const lookupExtraHeaders = {};
    if (lookupResolvedLanguage) {
      if (this._languageStrategy === 'param') {
        url.searchParams.set('displayLanguage', lookupResolvedLanguage);
      } else if (this._languageStrategy === 'header') {
        lookupExtraHeaders['Accept-Language'] = lookupResolvedLanguage;
      }
    }

    Object.entries(this._lookupParameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    let res;
    try {
      res = await this._request(url, lookupExtraHeaders);
    } catch (error) {
      throw createRequestError(null, url, { cause: error });
    }

    if (res.status === 404) return null;
    if (res.redirected || res.type === 'opaqueredirect' || !res.ok) {
      throw createRequestError(res, url);
    }

    try {
      /** @type {FhirParameters} */
      const data = await res.json();

      const display = this._getParameterValue(data, 'display');
      const name = this._getParameterValue(data, 'name');
      const version = this._getParameterValue(data, 'version');

      return {
        code,
        display: display || name || code,
        system: this._systemUri,
        version,
        active: true
      };
    } catch (error) {
      throw error instanceof TerminologyRequestError
        ? error
        : createDataError(url, error);
    }
  }

  /**
   * Map a FHIR ValueSet expansion entry to our internal Concept type.
   *
   * @param {FhirValueSetExpansionContains} entry
   * @returns {Concept}
   * @private
   */
  _mapExpandContainsToConcept(entry, lang) {
    // Try display first; otherwise pick a designation matching the requested language
    const normalizedLang = normalizeLanguage(lang);
    let designation = null;
    if (entry.designation && entry.designation.length > 0) {
      // prefer designation with matching language
      const matched = entry.designation.find(d => d.language && normalizeLanguage(d.language) === normalizedLang);
      designation = matched ? matched.value : entry.designation[0].value;
    }

    return {
      code: entry.code || '',
      display: entry.display || designation || entry.code || '',
      system: entry.system || this._systemUri,
      version: entry.version,
      active: !entry.inactive
    };
  }

  /**
   * Extract a string value from a FHIR Parameters resource by parameter name.
   *
   * @param {FhirParameters} params - The Parameters resource
   * @param {string} name - Parameter name to find
   * @returns {string | undefined}
   * @private
   */
  _getParameterValue(params, name) {
    /** @type {FhirParametersParameter | undefined} */
    const param = params.parameter?.find(p => p.name === name);
    return param?.valueString;
  }

  /**
   * Resolve the language tag to request from the terminology server.
   *
   * Precedence: the explicitly configured language, then the first language
   * advertised by the browser, then `'en'`. The result is always narrowed to
   * the primary subtag, so `de-DE` becomes `de`.
   *
   * @returns {string} A primary language subtag such as `'de'` or `'en'`.
   * @private
   */
  _resolveLanguage() {
    // Use configured language first, then browser, then 'en'
    if (this._configuredLanguage) return normalizeLanguage(this._configuredLanguage);
    const nav = typeof globalThis !== 'undefined' ? globalThis.navigator : undefined;
    const browserLang = nav?.languages?.[0] || nav?.language || nav?.userLanguage;
    if (browserLang) return normalizeLanguage(browserLang);
    return 'en';
  }

  /**
   * Build the URL of a FHIR operation below the base URL.
   *
   * Throws a `TerminologyRequestError` of kind `'network'`, never a raw
   * `TypeError`, when the base URL is relative and could not be resolved or
   * does not form a valid URL, so the failure reaches the panel and the
   * error event like any other unreachable server.
   *
   * @param {string} path - Operation path such as `/ValueSet/$expand`.
   * @returns {URL}
   * @private
   */
  _createRequestUrl(path) {
    if (!this._baseUrl) {
      throw new TerminologyRequestError(
        `Cannot resolve the relative terminology server URL "${this._rawBaseUrl}" outside a web page.`,
        { kind: 'network' }
      );
    }

    try {
      return new URL(`${this._baseUrl}${path}`);
    } catch (error) {
      throw new TerminologyRequestError(
        `The terminology server URL "${this._rawBaseUrl}" is not a valid URL.`,
        { kind: 'network', cause: error }
      );
    }
  }

  /**
   * Perform an authenticated FHIR HTTP request.
   *
   * Applies the configured `Accept` header, any headers supplied to the
   * constructor, and Bearer or Basic credentials when configured.
   *
   * @param {URL} url - Fully resolved request URL.
   * @param {Record<string, string>} [additionalHeaders] - Merged over the configured headers.
   * @param {AbortSignal} [signal] - Cancels the request when aborted.
   * @returns {Promise<Response>}
   * @private
   */
  async _request(url, additionalHeaders = {}, signal) {
    const headers = { Accept: FHIR_MIME_TYPE, ...this._extraHeaders, ...additionalHeaders };
    if (this._auth?.type === 'Bearer') headers['Authorization'] = `Bearer ${this._auth.token}`;
    if (this._auth?.type === 'Basic') headers['Authorization'] = `Basic ${this._auth.credentials}`;
    return this._fetch(url.toString(), { headers, signal });
  }
}

function normalizeLanguage(lang) {
  if (!lang) return undefined;
  return String(lang).split(',')[0].split(';')[0].split('-')[0];
}

/**
 * FHIR implicit value set containing every concept of a code system,
 * `<systemUri>?fhir_vs`. URIs that already name a value set are kept.
 *
 * @param {string} systemUri
 * @returns {string}
 */
function getImplicitValueSetUri(systemUri) {
  const isValueSet = systemUri.includes('/ValueSet/') || systemUri.includes('?');

  return isValueSet ? systemUri : `${systemUri}?fhir_vs`;
}

function getParameterCanonical(parameter) {
  return parameter?.valueUri
    || parameter?.valueCanonical
    || parameter?.valueString;
}

/**
 * Release of the code system the server used for an expansion.
 *
 * Prefers the `used-codesystem` parameter for the provider's own code system,
 * so a value set that draws on several code systems cannot attach another
 * system's release. Otherwise the first `version`, `system-version` or
 * `used-codesystem` parameter is used. A plain `version` value is the release
 * itself; a `used-codesystem` or `system-version` canonical without a
 * `|version` part reports no release, so it yields no version.
 *
 * @param {fhir4.ValueSetExpansion | undefined} expansion
 * @param {string} [systemUri]
 * @returns {string | undefined}
 */
function getExpansionVersion(expansion, systemUri) {
  const parameters = Array.isArray(expansion?.parameter) ? expansion.parameter : [];
  const ownUsedCodeSystem = systemUri
    ? parameters.find(parameter => {
      const canonical = getParameterCanonical(parameter);

      return parameter?.name === 'used-codesystem'
        && typeof canonical === 'string'
        && canonical.split('|')[0] === systemUri;
    })
    : undefined;
  const versionParameter = ownUsedCodeSystem || parameters.find(parameter =>
    parameter?.name === 'version'
    || parameter?.name === 'system-version'
    || parameter?.name === 'used-codesystem'
  );
  const rawVersion = getParameterCanonical(versionParameter);

  if (!rawVersion || typeof rawVersion !== 'string') {
    return undefined;
  }

  const separatorIndex = rawVersion.lastIndexOf('|');

  if (separatorIndex === -1) {
    return versionParameter.name === 'version' ? rawVersion : undefined;
  }

  return rawVersion.slice(separatorIndex + 1) || undefined;
}
