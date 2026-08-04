import { loadCodeSystemFromFhir } from './FhirCodeSystemLoader.js';

/**
 * Create a loader that can register FHIR-hosted code systems on demand.
 *
 * The UI can depend on this abstraction instead of knowing any concrete
 * terminology server URL.
 *
 * @param {Object} config
 * @param {import('../core/TerminologyRegistry').TerminologyRegistry} config.terminologyRegistry
 * @param {string} config.fhirBaseUrl
 * @param {typeof fetch} [config.fetchFn]
 * @param {(systemUri: string, fhirBaseUrl: string, fetchFn?: typeof fetch) => Promise<import('../core/TerminologyProvider').TerminologyProvider>} [config.loadProvider]
 */
export function createFhirTerminologyProviderLoader(config) {
  const {
    terminologyRegistry,
    fhirBaseUrl,
    fetchFn,
    loadProvider = loadCodeSystemFromFhir
  } = config;

  const pendingLoads = new Map();

  async function ensureProvider(systemUri) {
    const existingProvider = terminologyRegistry.findProviderBySystem(systemUri);
    if (existingProvider) {
      return existingProvider;
    }

    if (!fhirBaseUrl) {
      throw new Error('No FHIR terminology base URL configured for dynamic provider loading.');
    }

    if (pendingLoads.has(systemUri)) {
      return pendingLoads.get(systemUri);
    }

    const loadPromise = loadProvider(systemUri, fhirBaseUrl, fetchFn)
      .then(provider => {
        const alreadyRegistered = terminologyRegistry.findProviderBySystem(systemUri);
        if (alreadyRegistered) {
          return alreadyRegistered;
        }

        terminologyRegistry.register(provider);
        return provider;
      })
      .finally(() => {
        pendingLoads.delete(systemUri);
      });

    pendingLoads.set(systemUri, loadPromise);

    return loadPromise;
  }

  async function preload(systemUris, options = {}) {
    const onError = options.onError || (() => {});

    return Promise.allSettled(
      systemUris.map(systemUri =>
        ensureProvider(systemUri).catch(error => {
          onError(systemUri, error);
          throw error;
        })
      )
    );
  }

  return {
    ensureProvider,
    preload,
    baseUrl: fhirBaseUrl
  };
}
