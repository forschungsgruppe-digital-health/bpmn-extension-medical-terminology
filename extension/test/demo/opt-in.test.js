// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_SEARCH_DELAY_MS } from '../../../demo/src/live-search.js';
import { setupOptIn } from '../../../demo/src/opt-in.js';
import { TerminologyRegistry } from '../../src/core/TerminologyRegistry.js';
import { FhirProvider } from '../../src/providers/FhirProvider.js';

// setupOptIn takes the provider factories as arguments, so this test needs no
// import of the package root (and no vi.mock for it).

const DEMO_HTML = readFileSync(resolve(import.meta.dirname, '../../../demo/index.html'), 'utf8');
const SERVER = { fhirBaseUrl: 'https://tx.fhir.de/fhir', fhirHost: 'tx.fhir.de' };
const SNOMED = { edition: '11000274103', editionVersion: null };
const EMPTY = { concepts: [], total: 0 };

const $ = id => document.getElementById(id);

function expansion(code) {
  return new Response(JSON.stringify({
    resourceType: 'ValueSet',
    expansion: { total: 1, contains: [ { system: 'http://example.test', code, display: code } ] }
  }), { status: 200, headers: { 'content-type': 'application/fhir+json' } });
}

function memoryStorage() {
  const map = new Map();

  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: key => { map.delete(key); }
  };
}

function fhirProvider(id, server, fetchFn) {
  return new FhirProvider({
    id,
    displayName: id,
    systemUri: `http://example.test/${id}`,
    baseUrl: server.fhirBaseUrl,
    fetchFn
  });
}

describe('setupOptIn with the demo page', () => {
  let registry;
  let fetchFn;
  let createProviders;
  let createSnomedProvider;

  function setup() {
    return setupOptIn({
      doc: document,
      storage: memoryStorage(),
      server: SERVER,
      snomed: SNOMED,
      registry,
      createProviders,
      createSnomedProvider,
      fetchFn
    });
  }

  async function switchOnLiveSearch(liveSearch) {
    $('btn-live-search-open').click();
    $('btn-live-search-enable').click();
    await expect(liveSearch.enable()).resolves.toBe(true);
  }

  async function unlockSnomed(snomedUnlock) {
    $('btn-snomed-open').click();

    for (const input of document.querySelectorAll('#snomed-unlock-overlay [data-snomed-statement]')) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    $('btn-snomed-unlock').click();
    await expect(snomedUnlock.unlock()).resolves.toBe(true);
  }

  // Start a search and let the throttle's delay pass.
  async function searchAfterDelay(term, providerId) {
    const result = registry.search(term, providerId, {});

    await vi.advanceTimersByTimeAsync(LIVE_SEARCH_DELAY_MS);

    return result;
  }

  beforeEach(() => {
    // Only the throttle's delay is faked; response bodies are read as usual.
    vi.useFakeTimers({ toFake: [ 'setTimeout', 'clearTimeout' ] });
    document.documentElement.innerHTML = DEMO_HTML;
    registry = new TerminologyRegistry();
    fetchFn = vi.fn(async url => expansion(new URL(url).searchParams.get('filter')));
    createProviders = vi.fn((server, { fetchFn: wrapper }) => [
      fhirProvider('loinc', server, wrapper),
      fhirProvider('ops', server, wrapper)
    ]);
    createSnomedProvider = vi.fn((server, snomed, { fetchFn: wrapper }) =>
      fhirProvider('snomed-ct', server, wrapper));
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('No request may leave the test.');
    }));
  });

  afterEach(() => {
    for (const node of document.querySelectorAll('[role="dialog"]')) {
      node.hidden = true;
      node.classList.add('license-overlay--hidden');
    }

    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('drops a FHIR search still waiting in the delay after Turn off live search', async () => {
    const { liveSearch } = setup();

    await switchOnLiveSearch(liveSearch);

    // Control: while the live search is on, a search is sent after the delay.
    await expect(searchAfterDelay('Lobektomie', 'loinc')).resolves.toMatchObject({ total: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toMatch(/^https:\/\/tx\.fhir\.de\/fhir\/ValueSet\/\$expand\?/);

    const waiting = registry.search('Lobektomie rechts', 'loinc', {});

    await vi.advanceTimersByTimeAsync(LIVE_SEARCH_DELAY_MS - 1);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    $('btn-live-search-off').click();
    expect(liveSearch.isActive()).toBe(false);

    await vi.advanceTimersByTimeAsync(LIVE_SEARCH_DELAY_MS);

    await expect(waiting).resolves.toEqual(EMPTY);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('drops a SNOMED CT search still waiting in the delay after Lock SNOMED CT, but keeps the FHIR searches', async () => {
    const { liveSearch, snomedUnlock } = setup();

    await switchOnLiveSearch(liveSearch);
    await unlockSnomed(snomedUnlock);

    // Control: while unlocked, a SNOMED CT search is sent after the delay.
    await expect(searchAfterDelay('Lobektomie', 'snomed-ct')).resolves.toMatchObject({ total: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const waiting = registry.search('Lobektomie rechts', 'snomed-ct', {});

    $('btn-snomed-lock').click();
    expect(snomedUnlock.isUnlocked()).toBe(false);
    expect(liveSearch.isActive()).toBe(true);

    await vi.advanceTimersByTimeAsync(LIVE_SEARCH_DELAY_MS);

    await expect(waiting).resolves.toEqual(EMPTY);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // The FHIR providers use their own wrapper, which locking SNOMED CT does
    // not close.
    await expect(searchAfterDelay('Lobektomie', 'loinc')).resolves.toMatchObject({ total: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('drops a SNOMED CT search still waiting in the delay after Turn off live search', async () => {
    const { liveSearch, snomedUnlock } = setup();

    await switchOnLiveSearch(liveSearch);
    await unlockSnomed(snomedUnlock);

    const waiting = registry.search('Lobektomie', 'snomed-ct', {});

    $('btn-live-search-off').click();
    expect(snomedUnlock.isUnlocked()).toBe(false);

    await vi.advanceTimersByTimeAsync(LIVE_SEARCH_DELAY_MS);

    await expect(waiting).resolves.toEqual(EMPTY);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('passes the FHIR wrapper to the FHIR providers and a different SNOMED CT wrapper to the SNOMED CT provider', async () => {
    const { liveSearch, snomedUnlock } = setup();

    await switchOnLiveSearch(liveSearch);
    await unlockSnomed(snomedUnlock);

    expect(createProviders).toHaveBeenCalledTimes(1);
    expect(createProviders).toHaveBeenCalledWith(SERVER, { fetchFn: expect.any(Function) });
    expect(createSnomedProvider).toHaveBeenCalledTimes(1);
    expect(createSnomedProvider).toHaveBeenCalledWith(SERVER, SNOMED, { fetchFn: expect.any(Function) });

    const fhirFetch = createProviders.mock.calls[0][1].fetchFn;
    const snomedFetch = createSnomedProvider.mock.calls[0][2].fetchFn;

    expect(snomedFetch).not.toBe(fhirFetch);
    expect([ fhirFetch, snomedFetch ]).not.toContain(fetchFn);

    // The registered providers are the ones built with these wrappers.
    expect(registry.getProvider('loinc')).toBe(createProviders.mock.results[0].value[0]);
    expect(registry.getProvider('ops')).toBe(createProviders.mock.results[0].value[1]);
    expect(registry.getProvider('snomed-ct')).toBe(createSnomedProvider.mock.results[0].value);

    // With the live search on and SNOMED CT locked, only the FHIR wrapper
    // sends: it is gated by the live search alone, the SNOMED CT wrapper by
    // the unlock as well.
    $('btn-snomed-lock').click();

    const url = `${SERVER.fhirBaseUrl}/ValueSet/$expand?url=x&filter=Lobektomie`;
    const viaFhir = fhirFetch(url);
    const viaSnomed = snomedFetch(url);

    await vi.advanceTimersByTimeAsync(LIVE_SEARCH_DELAY_MS);

    await expect((await viaFhir).json()).resolves.toMatchObject({ expansion: { total: 1 } });
    await expect((await viaSnomed).json()).resolves.toMatchObject({ expansion: { total: 0, contains: [] } });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(url, {});
  });
});
