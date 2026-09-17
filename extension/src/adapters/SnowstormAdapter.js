/**
 * Adapter for IHTSDO Snowstorm REST API.
 * Translates Snowstorm-specific responses into generic Concept objects.
 *
 * Used by: SnomedCtProvider (and optionally LoincProvider when hosted on Snowstorm)
 */
import languageConfig from '../config/terminology-language-config.js';
import {
  createDataError,
  createRequestError
} from '../core/TerminologyRequestError.js';
import {
  createRequestSignal,
  DEFAULT_REQUEST_TIMEOUT_MS
} from '../core/request-signal.js';

function normalizeLanguage(lang) {
  if (!lang) return undefined;
  return String(lang).split(',')[0].split(';')[0].split('-')[0];
}

export function resolveSnowstormBaseUrl(baseUrl) {
  const rawBaseUrl = String(baseUrl || '').trim();

  if (!rawBaseUrl) {
    throw new Error('SnowstormAdapter requires a baseUrl.');
  }

  if (/^(?:[a-z]+:)?\/\//i.test(rawBaseUrl) || rawBaseUrl.startsWith('data:') || rawBaseUrl.startsWith('blob:')) {
    return rawBaseUrl.replace(/\/$/, '');
  }

  const origin = globalThis.location?.origin || globalThis.location?.href || 'http://localhost';
  return new URL(rawBaseUrl, origin).toString().replace(/\/$/, '');
}

export class SnowstormAdapter {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - e.g. 'http://localhost:8080/snowstorm/snomed-ct'
   * @param {string} [config.branch='MAIN']
   * @param {import('../core/types.js').ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   * @param {Record<string, string>} [config.headers]
   * @param {number} [config.requestTimeoutMs=15000]
   */
  constructor(config) {
    /** @internal */
    this._baseUrl = resolveSnowstormBaseUrl(config.baseUrl);
    /** @internal */
    this._branch = config.branch || 'MAIN';
    /** @internal */
    this._auth = config.auth;
    /** @internal */
    this._fetch = config.fetchFn || globalThis.fetch.bind(globalThis);
    /** @internal */
    this._extraHeaders = config.headers || {};
    /** @internal */
    this._requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    // language config
    /** @internal */
    this._languageStrategy = config.languageStrategy ?? languageConfig.languageStrategy ?? 'param';
    /** @internal */
    this._configuredLanguage = config.language ?? languageConfig.language;
  }

  /**
   * @param {Object} params
   * @param {string} params.term
   * @param {number} params.limit
   * @param {number} params.offset
   * @param {string} [params.language]
   * @param {Record<string, string>} [params.additionalParams]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<{ items: import('../core/types.js').Concept[], total?: number }>}
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

    const request = createRequestSignal(params.signal, this._requestTimeoutMs);
    let res;

    try {
      res = await this._request(url, request.signal);
    } catch (error) {
      throw createRequestError(null, url, { cause: error, kind: request.getAbortKind() });
    } finally {
      request.cleanup();
    }

    if (res.redirected || res.type === 'opaqueredirect' || !res.ok) {
      throw createRequestError(res, url);
    }

    let data;

    try {
      data = await res.json();
    } catch (error) {
      throw createDataError(url, error);
    }

    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray(data.items) ||
      (data.total !== undefined && typeof data.total !== 'number') ||
      data.items.some(item =>
        !item ||
        typeof item !== 'object' ||
        typeof item.conceptId !== 'string' ||
        !item.conceptId.trim()
      )
    ) {
      throw createDataError(url);
    }

    try {
      return {
        items: data.items.map(item => this._mapConcept(item)),
        total: data.total
      };
    } catch (error) {
      throw createDataError(url, error);
    }
  }

  /**
   * @param {string} code
   * @returns {Promise<import('../core/types.js').Concept | null>}
   */
  async lookup(code) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts/${encodeURIComponent(code)}`);
    return this._getConcept(url, { allowNotFound: true });
  }

  /**
   * @param {string} code
   * @returns {Promise<import('../core/types.js').Concept[]>}
   */
  async getParents(code) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts/${encodeURIComponent(code)}/parents`);
    return this._getConceptList(url, { allowNotFound: true });
  }

  /**
   * @param {string} code
   * @returns {Promise<import('../core/types.js').Concept[]>}
   */
  async getChildren(code) {
    const url = new URL(`${this._baseUrl}/${this._branch}/concepts/${encodeURIComponent(code)}/children`);
    url.searchParams.set('limit', '50');
    return this._getConceptList(url, { allowNotFound: true, allowWrappedItems: true });
  }

  /** @internal */
  async _getConcept(url, { allowNotFound = false } = {}) {
    const res = await this._requestOrThrow(url, { allowNotFound });
    if (!res) return null;

    try {
      const item = await res.json();
      if (!isSnowstormConcept(item)) throw new Error('Invalid concept response.');
      return this._mapConcept(item);
    } catch (error) {
      throw createDataError(url, error);
    }
  }

  /** @internal */
  async _getConceptList(url, { allowNotFound = false, allowWrappedItems = false } = {}) {
    const res = await this._requestOrThrow(url, { allowNotFound });
    if (!res) return [];

    try {
      const data = await res.json();
      const items = allowWrappedItems ? (data.items || data) : data;
      if (!Array.isArray(items) || items.some(item => !isSnowstormConcept(item))) {
        throw new Error('Invalid concept list response.');
      }
      return items.map(item => this._mapConcept(item));
    } catch (error) {
      throw createDataError(url, error);
    }
  }

  /** @internal */
  async _requestOrThrow(url, { allowNotFound = false } = {}) {
    let res;
    try {
      res = await this._request(url);
    } catch (error) {
      throw createRequestError(null, url, { cause: error });
    }

    if (allowNotFound && res.status === 404) return null;
    if (res.redirected || res.type === 'opaqueredirect' || !res.ok) {
      throw createRequestError(res, url);
    }
    return res;
  }

  /** @internal */
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
  async _request(url, signal) {
    const headers = { ...this._extraHeaders };
    if (this._auth?.type === 'Bearer') headers['Authorization'] = `Bearer ${this._auth.token}`;
    if (this._auth?.type === 'Basic') headers['Authorization'] = `Basic ${this._auth.credentials}`;
    if (this._auth?.type === 'ApiKey') headers[this._auth.headerName || 'X-Api-Key'] = this._auth.apiKey;
    return this._fetch(url.toString(), { headers, signal });
  }
}

function isSnowstormConcept(item) {
  return item
    && typeof item === 'object'
    && typeof item.conceptId === 'string'
    && Boolean(item.conceptId.trim());
}
