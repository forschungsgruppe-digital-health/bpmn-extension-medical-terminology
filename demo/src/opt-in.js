import { createThrottledFetch, setupLiveSearch } from './live-search.js';
import { setupSnomedUnlock } from './snomed-unlock.js';

/**
 * Wire the public demo's opt-in features: the live search on the opt-in
 * server after separate consent, and on top of it the SNOMED CT unlock after a
 * licence self-declaration.
 *
 * Each feature gets its own throttled `fetch`, and each checks its consent
 * again right before a request is sent, so a search still waiting in the
 * delay is dropped once that consent is withdrawn:
 * - the FHIR providers (LOINC, ICD-10-GM, OPS, ATC) send only while the live
 *   search is on;
 * - the SNOMED CT provider sends only while the live search is on and
 *   SNOMED CT is unlocked.
 *
 * The provider factories are passed in (in the demo `createDemoOptInProviders`
 * and `createDemoOptInSnomedProvider`), so this module does not import the
 * package. Each factory receives its wrapper as `options.fetchFn`.
 *
 * @param {{
 *   doc?: Document,
 *   storage?: Storage | null,
 *   server: { fhirBaseUrl: string, fhirHost: string } | null,
 *   snomed: { edition: string, editionVersion?: string | null } | null,
 *   registry: { register: Function, unregister: Function, listProviders: Function } | null,
 *   createProviders: (server: { fhirBaseUrl: string, fhirHost: string }, options: { fetchFn: typeof fetch }) => Promise<Array<{ id: string }>> | Array<{ id: string }>,
 *   createSnomedProvider: (server: { fhirBaseUrl: string, fhirHost: string }, snomed: { edition: string, editionVersion?: string | null }, options: { fetchFn: typeof fetch }) => Promise<{ id: string }> | { id: string },
 *   fetchFn?: typeof fetch
 * }} options
 * @returns {{
 *   liveSearch: ReturnType<typeof setupLiveSearch>,
 *   snomedUnlock: ReturnType<typeof setupSnomedUnlock>
 * }}
 */
export function setupOptIn({
  doc,
  storage,
  server,
  snomed,
  registry,
  createProviders,
  createSnomedProvider,
  fetchFn
}) {
  let liveSearch = null;
  let snomedUnlock = null;

  const liveSearchFetch = createThrottledFetch({
    fetchFn,
    isAllowed: () => Boolean(liveSearch?.isActive())
  });
  const snomedFetch = createThrottledFetch({
    fetchFn,
    isAllowed: () => Boolean(liveSearch?.isActive() && snomedUnlock?.isUnlocked())
  });

  liveSearch = setupLiveSearch({
    doc,
    storage,
    server,
    registry,
    createProviders: typeof createProviders === 'function'
      ? liveServer => createProviders(liveServer, { fetchFn: liveSearchFetch })
      : undefined
  });

  snomedUnlock = setupSnomedUnlock({
    doc,
    storage,
    server: liveSearch ? server : null,
    snomed,
    registry,
    liveSearch,
    createProvider: typeof createSnomedProvider === 'function'
      ? (snomedServer, edition) => createSnomedProvider(snomedServer, edition, { fetchFn: snomedFetch })
      : undefined
  });

  return { liveSearch, snomedUnlock };
}
