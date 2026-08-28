/**
 * Central registry and facade for all terminology providers.
 *
 * Usage:
 *   const registry = new TerminologyRegistry();
 *   registry.register(new SnomedCtProvider({ ... }));
 *   registry.register(new SnomedCtProvider({ baseUrl: 'https://snowstorm.example.com' }));
 *
 *   const results = await registry.search('pneumonia', 'snomed-ct');
 *   const concept = await registry.lookup('169069000', 'snomed-ct');
 */
export class TerminologyRegistry {

  constructor() {
    /** @type {Map<string, import('./TerminologyProvider').TerminologyProvider>} */
    this._providers = new Map();
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Register a terminology provider.
   * @param {import('./TerminologyProvider').TerminologyProvider} provider
   */
  register(provider) {
    if (this._providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" is already registered`);
    }
    this._providers.set(provider.id, provider);
    this._emit('provider:registered', { id: provider.id, displayName: provider.displayName });
  }

  /**
   * Unregister a provider by ID.
   * @param {string} id
   */
  unregister(id) {
    this._providers.delete(id);
    this._emit('provider:unregistered', { id });
  }

  /**
   * Get a specific provider.
   * @param {string} id
   * @returns {import('./TerminologyProvider').TerminologyProvider}
   */
  getProvider(id) {
    const provider = this._providers.get(id);
    if (!provider) {
      const available = [...this._providers.keys()].join(', ');
      throw new Error(`No provider registered for "${id}". Available: ${available}`);
    }
    return provider;
  }

  /**
   * Find a provider instance by its CodeSystem URI.
   * @param {string} systemUri
   * @returns {import('./TerminologyProvider').TerminologyProvider | null}
   */
  findProviderBySystem(systemUri) {
    if (!systemUri) return null;

    for (const provider of this._providers.values()) {
      if (provider.systemUri === systemUri) {
        return provider;
      }
    }

    return null;
  }

  /**
   * List all registered providers with metadata.
   * @returns {Array<{ id: string, displayName: string, systemUri: string, capabilities: object }>}
   */
  listProviders() {
    return [...this._providers.values()].map(p => ({
      id: p.id,
      displayName: p.displayName,
      systemUri: p.systemUri,
      version: p.version,
      capabilities: p.capabilities
    }));
  }

  /**
   * Search within a specific terminology system.
   * @param {string} term
   * @param {string} providerId
   * @param {import('./types').SearchOptions} [options]
   * @returns {Promise<import('./types').SearchResult>}
   */
  async search(term, providerId, options) {
    return this.getProvider(providerId).search(term, options);
  }

  /**
   * Look up a single concept.
   * @param {string} code
   * @param {string} providerId
   * @returns {Promise<import('./types').Concept | null>}
   */
  async lookup(code, providerId) {
    return this.getProvider(providerId).lookup(code);
  }

  /**
   * Validate a code.
   * @param {string} code
   * @param {string} providerId
   * @returns {Promise<{ valid: boolean, message?: string }>}
   */
  async validate(code, providerId) {
    return this.getProvider(providerId).validate(code);
  }

  /**
   * Subscribe to registry events.
   * @param {string} event - 'provider:registered' | 'provider:unregistered'
   * @param {Function} listener
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);
  }

  off(event, listener) {
    this._listeners.get(event)?.delete(listener);
  }

  /** @private */
  _emit(event, data) {
    this._listeners.get(event)?.forEach(fn => fn(data));
  }
}
