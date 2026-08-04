/**
 * Interface contract for all terminology providers.
 *
 * Each provider represents one code system (SNOMED CT, LOINC, ICD-10-GM, etc.)
 * and must implement search() and lookup(). Hierarchy and validate are optional.
 *
 * To add a new terminology system:
 *   1. Create a class implementing this interface
 *   2. Optionally reuse an existing adapter (SnowstormAdapter, FhirTerminologyAdapter)
 *   3. Register with TerminologyRegistry via registry.register(new MyProvider(...))
 *
 * No changes to existing code required (Open/Closed Principle).
 *
 * @interface
 * @property {string} id - Unique provider identifier (e.g. 'snomed-ct')
 * @property {string} displayName - Human-readable name
 * @property {string} systemUri - CodeSystem URI (e.g. 'http://snomed.info/sct')
 * @property {import('./types').TerminologyCapabilities} capabilities
 */
export class TerminologyProvider {

  /** @type {string} */
  get id() { throw new Error('Not implemented: id'); }

  /** @type {string} */
  get displayName() { throw new Error('Not implemented: displayName'); }

  /** @type {string} */
  get systemUri() { throw new Error('Not implemented: systemUri'); }

  /** @type {import('./types').TerminologyCapabilities} */
  get capabilities() {
    return { search: false, lookup: false, hierarchy: false, validate: false };
  }

  /**
   * Free-text search for concepts.
   * @param {string} term
   * @param {import('./types').SearchOptions} [options]
   * @returns {Promise<import('./types').SearchResult>}
   */
  async search(term, options) {
    throw new Error('Not implemented: search()');
  }

  /**
   * Look up a single concept by code.
   * @param {string} code
   * @returns {Promise<import('./types').Concept | null>}
   */
  async lookup(code) {
    throw new Error('Not implemented: lookup()');
  }

  /**
   * Validate whether a code exists and is active.
   * @param {string} code
   * @returns {Promise<{ valid: boolean, message?: string }>}
   */
  async validate(code) {
    const concept = await this.lookup(code);
    return {
      valid: concept !== null && concept.active !== false,
      message: concept ? undefined : `Code ${code} not found in ${this.id}`
    };
  }

  /**
   * Navigate the hierarchy (parents/children). Optional.
   * @param {string} code
   * @returns {Promise<{ parents: import('./types').Concept[], children: import('./types').Concept[] }>}
   */
  async getHierarchy(code) {
    return { parents: [], children: [] };
  }
}
