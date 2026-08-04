/**
 * Adapter for IHTSDO Snowstorm REST API.
 * Translates Snowstorm-specific responses into generic Concept objects.
 *
 * Used by: SnomedCtProvider (and optionally LoincProvider when hosted on Snowstorm)
 */
import languageConfig from '../config/terminology-language-config.js';

function normalizeLanguage(lang) {
  if (!lang) return undefined;
  return String(lang).split(',')[0].split(';')[0].split('-')[0];
}

export class SnowstormAdapter {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - e.g. 'http://localhost:8080/snowstorm/snomed-ct'
   * @param {string} [config.branch='MAIN']
   * @param {import('../core/types').ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   * @param {Record<string, string>} [config.headers]
   */
  constructor(config) {
    this._baseUrl = config.baseUrl;
    this._branch = config.branch || 'MAIN';
    this._auth = config.auth;
    this._fetch = config.fetchFn || globalThis.fetch.bind(globalThis);
    this._extraHeaders = config.headers || {};
    // language config
    this._languageStrategy = config.languageStrategy ?? languageConfig.languageStrategy ?? 'param';
    this._configuredLanguage = config.language ?? languageConfig.language;
  }

  /**
   * @param {Object} params
   * @param {string} params.term
   * @param {number} params.limit
   * @param {number} params.offset
   * @param {string} [params.language]
   * @param {Record<string, string>} [params.additionalParams]
   * @returns {Promise<{ items: import('../core/types').Concept[], total: number }>}
   */
  async search(params) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts`);
    url.searchParams.set('term', params.term);
    url.searchParams.set('limit', String(params.limit));
    url.searchParams.set('offset', String(params.offset));
    url.searchParams.set('activeFilter', 'true');

    // Resolve language and apply according to strategy
    const resolvedLanguage = this._resolveLanguage();
    if (resolvedLanguage) {
      if (this._languageStrategy === 'param') {
        url.searchParams.set('language', resolvedLanguage);
      } else if (this._languageStrategy === 'header') {
        this._extraHeaders['Accept-Language'] = resolvedLanguage;
      }
    }

    if (params.additionalParams) {
      for (const [k, v] of Object.entries(params.additionalParams)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await this._request(url);
    const data = await res.json();

    return {
      items: (data.items || []).map(item => this._mapConcept(item)),
      total: data.total ?? 0
    };
  }

  /**
   * @param {string} code
   * @returns {Promise<import('../core/types').Concept | null>}
   */
  async lookup(code) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts/${code}`);
    const res = await this._request(url);
    if (!res.ok) return null;
    const item = await res.json();
    return this._mapConcept(item);
  }

  /**
   * @param {string} code
   * @returns {Promise<import('../core/types').Concept[]>}
   */
  async getParents(code) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts/${code}/parents`);
    const res = await this._request(url);
    if (!res.ok) return [];
    const items = await res.json();
    return (Array.isArray(items) ? items : []).map(i => this._mapConcept(i));
  }

  /**
   * @param {string} code
   * @returns {Promise<import('../core/types').Concept[]>}
   */
  async getChildren(code) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts/${code}/children`);
    url.searchParams.set('limit', '50');
    const res = await this._request(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || data;
    return (Array.isArray(items) ? items : []).map(i => this._mapConcept(i));
  }

  _resolveLanguage() {
    if (this._configuredLanguage) return normalizeLanguage(this._configuredLanguage);
    const nav = typeof globalThis !== 'undefined' ? globalThis.navigator : undefined;
    const browserLang = nav?.languages?.[0] || nav?.language || nav?.userLanguage;
    if (browserLang) return normalizeLanguage(browserLang);
    return 'en';
  }

/** @private */
  _mapConcept(item) {
    const fsnTerm = item.fsn?.term || '';
    const semanticTag = fsnTerm.match(/\(([^)]+)\)$/)?.[1] || undefined;
    
    const effectiveTime = item.releasedEffectiveTime ?? item.effectiveTime ?? item.version;
    const moduleId = item.moduleId;

    // Wenn beides da ist: Baue die offizielle FHIR Canonical URI. Ansonsten Fallback auf effectiveTime.
    const versionUri = (moduleId && effectiveTime)
      ? `http://snomed.info/sct/${moduleId}/version/${effectiveTime}`
      : (effectiveTime !== undefined && effectiveTime !== null ? String(effectiveTime) : undefined);

    return {
      code: item.conceptId,
      display: item.pt?.term || fsnTerm,
      system: 'http://snomed.info/sct',
      version: versionUri, 
      active: item.active,
      properties: {
        fsn: fsnTerm,
        semanticTag,
        definitionStatus: item.definitionStatus
      }
    };
  }

  /** @private */
  async _request(url) {
    const headers = { ...this._extraHeaders };
    if (this._auth?.type === 'Bearer') headers['Authorization'] = `Bearer ${this._auth.token}`;
    if (this._auth?.type === 'Basic') headers['Authorization'] = `Basic ${this._auth.credentials}`;
    if (this._auth?.type === 'ApiKey') headers[this._auth.headerName || 'X-Api-Key'] = this._auth.apiKey;
    return this._fetch(url.toString(), { headers });
  }
}