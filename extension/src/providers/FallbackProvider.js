import { TerminologyProvider } from '../core/TerminologyProvider.js';

function getResultItems(result) {
  const items = result?.concepts || result?.items || [];
  return Array.isArray(items) ? items : [];
}

/**
 * @category Providers
 */
export class FallbackProvider extends TerminologyProvider {

  /**
   * @param {Object} config
   * @param {string} config.id
   * @param {string} [config.displayName]
   * @param {string} [config.systemUri]
   * @param {TerminologyProvider} config.primaryProvider
   * @param {TerminologyProvider} config.fallbackProvider
   */
  constructor(config) {
    super();

    const { id, displayName, systemUri, primaryProvider, fallbackProvider } = config;

    if (!primaryProvider || !fallbackProvider) {
      throw new Error('FallbackProvider requires both primaryProvider and fallbackProvider.');
    }

    const resolvedSystemUri = systemUri || primaryProvider.systemUri || fallbackProvider.systemUri;

    if (
      primaryProvider.systemUri &&
      fallbackProvider.systemUri &&
      primaryProvider.systemUri !== fallbackProvider.systemUri
    ) {
      throw new Error('FallbackProvider requires both providers to use the same systemUri.');
    }

    /** @internal */
    this._id = id;
    /** @internal */
    this._displayName = displayName || primaryProvider.displayName || fallbackProvider.displayName;
    /** @internal */
    this._systemUri = resolvedSystemUri;
    /** @internal */
    this._primaryProvider = primaryProvider;
    /** @internal */
    this._fallbackProvider = fallbackProvider;
  }

  get id() { return this._id; }
  get displayName() { return this._displayName; }
  get systemUri() { return this._systemUri; }
  get version() { return this._primaryProvider.version || this._fallbackProvider.version; }
  get capabilities() {
    return {
      search: Boolean(this._primaryProvider.capabilities?.search || this._fallbackProvider.capabilities?.search),
      lookup: Boolean(this._primaryProvider.capabilities?.lookup || this._fallbackProvider.capabilities?.lookup),
      hierarchy: Boolean(this._primaryProvider.capabilities?.hierarchy || this._fallbackProvider.capabilities?.hierarchy),
      validate: Boolean(this._primaryProvider.capabilities?.validate || this._fallbackProvider.capabilities?.validate)
    };
  }

  async search(term, options) {
    let primaryResult = null;

    try {
      primaryResult = await this._primaryProvider.search(term, options);
      if (getResultItems(primaryResult).length > 0) {
        return primaryResult;
      }
    } catch (error) {
      this._warnFallback('search', error);
      primaryResult = null;
    }

    const fallbackResult = await this._fallbackProvider.search(term, options);
    const fallbackItems = getResultItems(fallbackResult);

    if (fallbackItems.length > 0 || primaryResult === null) {
      return fallbackResult;
    }

    return primaryResult;
  }

  async lookup(code) {
    try {
      const primaryConcept = await this._primaryProvider.lookup(code);
      if (primaryConcept) {
        return primaryConcept;
      }
    } catch (error) {
      this._warnFallback('lookup', error);
    }

    return this._fallbackProvider.lookup(code);
  }

  async validate(code) {
    try {
      const primaryResult = await this._primaryProvider.validate(code);
      if (primaryResult.valid) {
        return primaryResult;
      }
    } catch (error) {
      this._warnFallback('validation', error);
    }

    return this._fallbackProvider.validate(code);
  }

  async getHierarchy(code) {
    try {
      const primaryHierarchy = await this._primaryProvider.getHierarchy(code);
      if ((primaryHierarchy.parents?.length || 0) > 0 || (primaryHierarchy.children?.length || 0) > 0) {
        return primaryHierarchy;
      }
    } catch (error) {
      this._warnFallback('hierarchy lookup', error);
    }

    return this._fallbackProvider.getHierarchy(code);
  }

  /** @internal */
  _warnFallback(operation, error) {
    console.warn(
      `[terminology] Primary provider "${this._primaryProvider.id}" failed during ${operation}; using fallback provider "${this._fallbackProvider.id}".`,
      error
    );
  }
}
