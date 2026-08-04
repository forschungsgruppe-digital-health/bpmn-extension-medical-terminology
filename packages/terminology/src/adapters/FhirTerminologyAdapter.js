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
import languageConfig from '../config/terminology-language-config.js';

/**
 * @typedef {import('@types/fhir').fhir4.ValueSet} FhirValueSet
 * @typedef {import('@types/fhir').fhir4.ValueSetExpansionContains} FhirValueSetExpansionContains
 * @typedef {import('@types/fhir').fhir4.Parameters} FhirParameters
 * @typedef {import('@types/fhir').fhir4.ParametersParameter} FhirParametersParameter
 * @typedef {import('../core/types').Concept} Concept
 * @typedef {import('../core/types').ConnectionConfig} ConnectionConfig
 */

export class FhirTerminologyAdapter {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - FHIR base URL (e.g. 'https://fhir.bfarm.de/fhir')
   * @param {string} config.systemUri - CodeSystem URI (e.g. 'http://fhir.de/CodeSystem/bfarm/icd-10-gm')
   * @param {string} [config.valueSetUri] - Explicit ValueSet URI for $expand
   * @param {ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   * @param {Record<string, string>} [config.headers]
   * @param {Record<string, string>} [config.expandParameters]
   * @param {Record<string, string>} [config.lookupParameters]
   */
  constructor(config) {
    this._baseUrl = config.baseUrl.replace(/\/$/, '');
    this._systemUri = config.systemUri;
    this._valueSetUri = config.valueSetUri || null;
    this._auth = config.auth;
    this._fetch = config.fetchFn || globalThis.fetch.bind(globalThis);
    this._extraHeaders = config.headers || {};
    this._expandParameters = config.expandParameters || {};
    this._lookupParameters = config.lookupParameters || {};
    // Language configuration:
    // languageStrategy: 'param' (use displayLanguage query param) or 'header' (use Accept-Language header)
    this._languageStrategy = config.languageStrategy ?? languageConfig.languageStrategy ?? 'param';
    // configured language comes from constructor config or central language config file
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
   * @param {{ term: string, limit: number, offset: number }} params
   * @returns {Promise<{ items: Concept[], total: number }>}
   */
  async search(params) {
    const url = new URL(`${this._baseUrl}/ValueSet/$expand`);

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
    
    // Manche FHIR-Server (wie Snowstorm) benötigen dieses Flag für die Text-Rückgabe
    url.searchParams.set('includeDesignations', 'true');

    try {
      const res = await this._request(url, extraRequestHeaders);
      if (!res.ok) {
        return {
          items: [],
          total: 0
        };
      }

      /** @type {FhirValueSet} */
      const data = await res.json();

      /** @type {FhirValueSetExpansionContains[]} */
      const contains = data.expansion?.contains || [];

      return {
        items: contains.map(c => this._mapExpandContainsToConcept(c, resolvedLanguage)),
        total: data.expansion?.total ?? contains.length
      };
    } catch (e) {
      return {
        items: [],
        total: 0
      };
    }
  }

  /**
   * Lookup via CodeSystem/$lookup.
   *
   * The response is a FHIR R4 Parameters resource containing the
   * display name and other properties of the requested code.
   *
   * @param {string} code
   * @returns {Promise<Concept | null>}
   */
  async lookup(code) {
    const url = new URL(`${this._baseUrl}/CodeSystem/$lookup`);
    url.searchParams.set('system', this._systemUri);
    url.searchParams.set('code', code);

    Object.entries(this._lookupParameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    // apply language strategy to lookup as well
    const lookupResolvedLanguage = this._resolveLanguage();
    const lookupExtraHeaders = {};
    if (lookupResolvedLanguage && this._languageStrategy === 'header') {
      lookupExtraHeaders['Accept-Language'] = lookupResolvedLanguage;
    }

    try {
      const res = await this._request(url, lookupExtraHeaders);
      if (!res.ok) return null;

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
    } catch {
      return null;
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
   * Perform an authenticated FHIR HTTP request.
   *
   * @param {URL} url
   * @param {Record<string,string>} [additionalHeaders]
   * @returns {Promise<Response>}
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

  async _request(url, additionalHeaders = {}) {
    const headers = { Accept: FHIR_MIME_TYPE, ...this._extraHeaders, ...additionalHeaders };
    if (this._auth?.type === 'Bearer') headers['Authorization'] = `Bearer ${this._auth.token}`;
    if (this._auth?.type === 'Basic') headers['Authorization'] = `Basic ${this._auth.credentials}`;
    return this._fetch(url.toString(), { headers });
  }
}

function normalizeLanguage(lang) {
  if (!lang) return undefined;
  return String(lang).split(',')[0].split(';')[0].split('-')[0];
}

function getImplicitValueSetUri(systemUri) {
  const isValueSet = systemUri.includes('/ValueSet/') || systemUri.includes('?');

  return isValueSet ? systemUri : `${systemUri}?vs`;
}
