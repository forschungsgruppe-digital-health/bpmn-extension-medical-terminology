import { TerminologyProvider } from '../core/TerminologyProvider.js';
import { SnowstormAdapter } from '../adapters/SnowstormAdapter.js';

export class SnomedCtProvider extends TerminologyProvider {

  /**
   * @param {Object} config
   * @param {string} config.baseUrl - Snowstorm base URL
   * @param {string} [config.branch='MAIN'] - SNOMED edition branch
   * @param {string} [config.language='en']
   * @param {string} [config.languageStrategy='header']
   * @param {number} [config.maxResults=15]
   * @param {string} [config.defaultEcl] - Default ECL constraint
   * @param {string} [config.version] - Optional SNOMED edition/release version
   * @param {import('../core/types').ConnectionConfig['auth']} [config.auth]
   * @param {typeof fetch} [config.fetchFn]
   */
  constructor(config) {
    super();
    this._id = 'snomed-ct';
    this._displayName = config.displayName || 'SNOMED CT';
    this._branch = config.branch || 'MAIN';
    this._version = config.version;
    this._maxResults = config.maxResults || 15;
    this._defaultEcl = config.defaultEcl;
    this._adapter = new SnowstormAdapter({
      baseUrl: config.baseUrl,
      branch: this._branch,
      language: config.language,
      languageStrategy: config.languageStrategy ?? 'header',
      auth: config.auth,
      fetchFn: config.fetchFn,
      headers: config.headers
    });
  }

  get id() { return this._id; }
  get displayName() { return this._displayName; }
  get systemUri() { return 'http://snomed.info/sct'; }
  get version() { return this._version; }
  get capabilities() {
    return { search: true, lookup: true, hierarchy: true, validate: true };
  }

  async search(term, options = {}) {
    const additionalParams = { ...options.filter };
    if (options.ecl || this._defaultEcl) {
      additionalParams.ecl = options.ecl || this._defaultEcl;
    }
    if (options.semanticTag) {
      additionalParams.semanticTag = options.semanticTag;
    }
    const result = await this._adapter.search({
      term,
      limit: options.limit ?? this._maxResults,
      offset: options.offset ?? 0,
      additionalParams
    });

    return {
      concepts: result.items || [],
      total: result.total ?? 0
    };
  }

  async lookup(code) {
    return this._adapter.lookup(code);
  }

  async getHierarchy(code) {
    const [parents, children] = await Promise.all([
      this._adapter.getParents(code),
      this._adapter.getChildren(code)
    ]);
    return { parents, children };
  }

  /** ECL query (SNOMED-specific). */
  async eclQuery(ecl, term = '') {
    return this.search(term, { ecl });
  }
}
