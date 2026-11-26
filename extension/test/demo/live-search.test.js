// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LIVE_SEARCH_CONSENT_KEY,
  LIVE_SEARCH_DELAY_MS,
  LIVE_SEARCH_MIN_TERM_LENGTH,
  clearLiveSearchConsent,
  createThrottledFetch,
  readLiveSearchConsent,
  setupLiveSearch,
  storeLiveSearchConsent
} from '../../../demo/src/live-search.js';
import { LICENSE_NOTICE_ACK_KEY, setupLicenseNotice } from '../../../demo/src/license-notice.js';
import { applyServerNotice } from '../../../demo/src/server-notice.js';
import { createDemoOptInProviders } from '../../../demo/src/terminology-config.js';
import { FhirTerminologyAdapter } from '../../src/adapters/FhirTerminologyAdapter.js';
import { TerminologyRegistry } from '../../src/core/TerminologyRegistry.js';
import { FhirProvider } from '../../src/providers/FhirProvider.js';

// The package root pulls in the properties panel, which Node cannot load
// without bundling; the opt-in path needs only the config helpers.
vi.mock('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology', async () => ({
  ...(await import('../../src/config/terminology-config.js')),
  FhirProvider: (await import('../../src/providers/FhirProvider.js')).FhirProvider
}));

// The demo factories import the mocked package root lazily. Its first, cold
// import (the mock factory loads the config helpers and their dependencies)
// can take longer than `vi.waitFor`'s default 1000 ms under full-suite load,
// so load it once before any test instead of inside the first one.
beforeAll(async () => {
  await import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology');
}, 30000);

const DEMO_HTML = readFileSync(resolve(import.meta.dirname, '../../../demo/index.html'), 'utf8');
const SERVER = { fhirBaseUrl: 'https://tx.fhir.de/fhir', fhirHost: 'tx.fhir.de' };
const OTHER_SERVER = { fhirBaseUrl: 'https://fhir.example.test/fhir', fhirHost: 'fhir.example.test' };
const OPT_IN_IDS = [ 'loinc', 'icd-10-gm', 'ops', 'atc' ];
const NOW = '2026-01-02T03:04:05.000Z';
const noWait = async () => {};

function okJson(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/fhir+json' }
  });
}

function expansion(code = '1-8') {
  return okJson({
    resourceType: 'ValueSet',
    expansion: { total: 1, contains: [ { system: 'http://loinc.org', code, display: 'x' } ] }
  });
}

function expandUrl(filter) {
  return `https://tx.example.test/fhir/ValueSet/$expand?url=x&filter=${encodeURIComponent(filter)}`;
}

function provider(fetchFn, extra = {}) {
  return new FhirProvider({
    id: 'loinc',
    displayName: 'LOINC',
    systemUri: 'http://loinc.org',
    valueSetUri: 'http://loinc.org/vs',
    baseUrl: 'https://tx.example.test/fhir',
    fetchFn,
    ...extra
  });
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));

  return {
    getItem: vi.fn(key => (map.has(key) ? map.get(key) : null)),
    setItem: vi.fn((key, value) => { map.set(key, String(value)); }),
    removeItem: vi.fn(key => { map.delete(key); }),
    map
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error('storage blocked');
  };

  return { getItem: vi.fn(fail), setItem: vi.fn(fail), removeItem: vi.fn(fail) };
}

function ids(registry) {
  return registry.listProviders().map(entry => entry.id);
}

function isShown(node) {
  for (let current = node; current; current = current.parentElement) {
    if (current.hidden || current.classList.contains('license-overlay--hidden')) {
      return false;
    }
  }

  return true;
}

function visibleText(node) {
  const clone = node.cloneNode(true);

  for (const hidden of clone.querySelectorAll('[hidden]')) {
    hidden.remove();
  }

  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function all(selector) {
  return [ ...document.querySelectorAll(selector) ];
}

const $ = id => document.getElementById(id);
const overlay = () => $('live-search-overlay');
const licence = () => $('license-overlay');
const banner = () => document.querySelector('aside.demo-notice');
const flush = () => new Promise(resolveFlush => setTimeout(resolveFlush, 0));

function pressEscape(target = document.body) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

afterEach(() => {
  // Dialog modules keep their document-level Escape handlers. Close every
  // overlay of this test's page so those handlers stay inactive afterwards.
  for (const node of document.querySelectorAll('[role="dialog"]')) {
    node.hidden = true;
    node.classList.add('license-overlay--hidden');
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createThrottledFetch', () => {
  it('documents the three-character minimum and the 300 ms pause shown on the page', async () => {
    const fetchFn = vi.fn(async () => expansion());
    const wait = vi.fn(noWait);
    const controller = new AbortController();

    expect(LIVE_SEARCH_MIN_TERM_LENGTH).toBe(3);
    expect(LIVE_SEARCH_DELAY_MS).toBe(300);

    await createThrottledFetch({ fetchFn, wait })(expandUrl('Lob'), { signal: controller.signal });

    expect(wait).toHaveBeenCalledWith(300, controller.signal);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('answers a search shorter than 3 characters locally with an empty expansion', async () => {
    const fetchFn = vi.fn();
    const wait = vi.fn(noWait);
    const throttled = createThrottledFetch({ fetchFn, wait });

    const result = await provider(throttled).search('Lo', {});
    const direct = await throttled(expandUrl('  Lo  '));

    expect(result).toEqual({ concepts: [], total: 0 });
    expect(direct.status).toBe(200);
    expect(await direct.json()).toMatchObject({ resourceType: 'ValueSet', expansion: { total: 0, contains: [] } });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });

  it('does not apply the minimum to requests other than ValueSet/$expand', async () => {
    const fetchFn = vi.fn(async () => okJson({ resourceType: 'Parameters', parameter: [] }));

    await createThrottledFetch({ fetchFn, wait: noWait })('https://tx.example.test/fhir/CodeSystem/$lookup?code=A');

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('passes short terms when minTermLength is 0 (local previews)', async () => {
    const fetchFn = vi.fn(async () => expansion());
    const throttled = createThrottledFetch({ fetchFn, wait: noWait, minTermLength: 0 });

    const result = await provider(throttled).search('A', {});

    expect(result.total).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('filter')).toBe('A');
  });

  it('reports an abort during the delay as aborted, without sending or warning', async () => {
    const fetchFn = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const controller = new AbortController();

    const pending = provider(createThrottledFetch({ fetchFn, delayMs: 50 }))
      .search('Lobek', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('reports a timeout during the delay as timeout, without sending', async () => {
    const fetchFn = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      provider(createThrottledFetch({ fetchFn, delayMs: 200 }), { requestTimeoutMs: 20 }).search('Lobek', {})
    ).rejects.toMatchObject({ kind: 'timeout' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sends only the last of several searches that abort each other', async () => {
    const fetchFn = vi.fn(async () => expansion());
    const search = provider(createThrottledFetch({ fetchFn, delayMs: 20 }));
    let controller = null;
    const type = term => {
      controller?.abort();
      controller = new AbortController();
      return search.search(term, { signal: controller.signal }).catch(error => error);
    };

    const first = type('Lob');
    const second = type('Lobe');
    const third = type('Lobek');
    const last = await type('Lobektomie');

    expect((await first).kind).toBe('aborted');
    expect((await second).kind).toBe('aborted');
    expect((await third).kind).toBe('aborted');
    expect(last.total).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('filter')).toBe('Lobektomie');
  });

  it('answers a repeated search from the cache without waiting', async () => {
    const fetchFn = vi.fn(async () => expansion());
    const wait = vi.fn(noWait);
    const search = provider(createThrottledFetch({ fetchFn, wait }));

    await search.search('Lobek', {});
    const again = await search.search('Lobek', {});

    expect(again.concepts[0].code).toBe('1-8');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it('evicts the least recently used entry at cacheSize', async () => {
    const fetchFn = vi.fn(async () => expansion());
    const throttled = createThrottledFetch({ fetchFn, wait: noWait, cacheSize: 2 });

    for (const filter of [ 'aaa', 'bbb', 'aaa', 'ccc' ]) {
      await throttled(expandUrl(filter));
    }
    expect(fetchFn).toHaveBeenCalledTimes(3);

    // 'aaa' was used after 'bbb', so 'bbb' was evicted when 'ccc' arrived.
    await throttled(expandUrl('aaa'));
    expect(fetchFn).toHaveBeenCalledTimes(3);

    await throttled(expandUrl('bbb'));
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('caches nothing when cacheSize is 0, and never caches failed responses', async () => {
    const okFetch = vi.fn(async () => expansion());
    const uncached = createThrottledFetch({ fetchFn: okFetch, wait: noWait, cacheSize: 0 });

    await uncached(expandUrl('Lobek'));
    await uncached(expandUrl('Lobek'));
    expect(okFetch).toHaveBeenCalledTimes(2);

    const failingFetch = vi.fn(async () => new Response('down', { status: 503 }));
    const throttled = createThrottledFetch({ fetchFn: failingFetch, wait: noWait });

    expect((await throttled(expandUrl('Lobek'))).status).toBe(503);
    expect((await throttled(expandUrl('Lobek'))).status).toBe(503);
    expect(failingFetch).toHaveBeenCalledTimes(2);
  });

  it('never caches a redirected response, so the adapter redirect guard keeps working', async () => {
    const fetchFn = vi.fn(async () => {
      const response = okJson({
        resourceType: 'Parameters',
        parameter: [ { name: 'display', valueString: 'X' } ]
      });

      Object.defineProperty(response, 'redirected', { value: true });
      return response;
    });
    const adapter = new FhirTerminologyAdapter({
      baseUrl: 'https://tx.fhir.de/fhir',
      systemUri: 'http://loinc.org',
      valueSetUri: 'http://loinc.org/vs',
      fetchFn: createThrottledFetch({ fetchFn, wait: noWait })
    });

    await expect(adapter.lookup('1')).rejects.toMatchObject({ kind: 'redirect' });
    await expect(adapter.lookup('1')).rejects.toMatchObject({ kind: 'redirect' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('sends nothing when isAllowed turns false during the delay', async () => {
    const fetchFn = vi.fn(async () => expansion());
    let allowed = true;
    const isAllowed = vi.fn(() => allowed);
    const throttled = createThrottledFetch({
      fetchFn,
      wait: async () => { allowed = false; },
      isAllowed
    });

    const search = await throttled(expandUrl('Lobek'));

    expect(await search.json()).toMatchObject({ expansion: { total: 0, contains: [] } });
    await expect(throttled('https://tx.example.test/fhir/CodeSystem/$lookup?code=1'))
      .rejects.toMatchObject({ name: 'AbortError' });
    await expect(provider(throttled).search('Lobektomie', {})).resolves.toEqual({ concepts: [], total: 0 });
    expect(isAllowed).toHaveBeenCalledTimes(3);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('checks isAllowed after the delay, not before', async () => {
    const fetchFn = vi.fn(async () => expansion());
    let allowed = false;
    const throttled = createThrottledFetch({
      fetchFn,
      wait: async () => { allowed = true; },
      isAllowed: () => allowed
    });

    await throttled(expandUrl('Lobek'));

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('live-search consent storage', () => {
  it('binds the stored consent to the host', () => {
    const storage = memoryStorage();

    storeLiveSearchConsent(storage, 'tx.fhir.de', new Date(NOW));

    expect(JSON.parse(storage.map.get(LIVE_SEARCH_CONSENT_KEY))).toEqual({
      granted: true,
      host: 'tx.fhir.de',
      at: NOW
    });
    expect(readLiveSearchConsent(storage, 'tx.fhir.de')).toEqual({ granted: true, host: 'tx.fhir.de', at: NOW });
    expect(readLiveSearchConsent(storage, 'fhir.example.test')).toBeNull();

    clearLiveSearchConsent(storage);

    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
    expect(readLiveSearchConsent(storage, 'tx.fhir.de')).toBeNull();
  });

  it('accepts only an explicit granted: true', () => {
    for (const value of [
      { granted: 'true', host: 'tx.fhir.de' },
      { granted: false, host: 'tx.fhir.de' },
      { host: 'tx.fhir.de' },
      null,
      'granted'
    ]) {
      const storage = memoryStorage({ [LIVE_SEARCH_CONSENT_KEY]: JSON.stringify(value) });

      expect(readLiveSearchConsent(storage, 'tx.fhir.de')).toBeNull();
    }
  });

  it('treats malformed JSON as no consent', () => {
    const storage = memoryStorage({ [LIVE_SEARCH_CONSENT_KEY]: '{"granted": true, host' });

    expect(readLiveSearchConsent(storage, 'tx.fhir.de')).toBeNull();
  });

  it('survives storage that throws or is missing', () => {
    const storage = throwingStorage();

    expect(readLiveSearchConsent(storage, 'tx.fhir.de')).toBeNull();
    expect(() => storeLiveSearchConsent(storage, 'tx.fhir.de')).not.toThrow();
    expect(() => clearLiveSearchConsent(storage)).not.toThrow();

    expect(readLiveSearchConsent(null, 'tx.fhir.de')).toBeNull();
    expect(() => storeLiveSearchConsent(null, 'tx.fhir.de')).not.toThrow();
    expect(() => clearLiveSearchConsent(undefined)).not.toThrow();
  });
});

describe('setupLiveSearch with the demo page', () => {
  let registry;
  let storage;
  let applyNotice;
  let createProviders;
  let networkFetch;

  function setup(options = {}) {
    return setupLiveSearch({
      doc: document,
      storage,
      server: SERVER,
      registry,
      createProviders,
      applyNotice,
      now: () => new Date(NOW),
      ...options
    });
  }

  function setupAcknowledgedLicence() {
    storage.setItem(LICENSE_NOTICE_ACK_KEY, 'true');
    storage.setItem.mockClear();
    setupLicenseNotice({ doc: document, storage, navigate: vi.fn() });
  }

  async function switchOn(controller) {
    $('btn-live-search-open').click();
    $('btn-live-search-enable').click();
    await vi.waitFor(() => expect(controller.isActive()).toBe(true), { timeout: 5000 });
    await flush();
  }

  beforeEach(() => {
    document.documentElement.innerHTML = DEMO_HTML;
    registry = new TerminologyRegistry();
    storage = memoryStorage();
    applyNotice = vi.fn(applyServerNotice);
    createProviders = vi.fn(async () => OPT_IN_IDS.map(id => ({ id, displayName: id })));
    networkFetch = vi.fn(async () => {
      throw new Error('No request may leave the test.');
    });
    vi.stubGlobal('fetch', networkFetch);
  });

  it('offers the live search but registers and stores nothing before consent', async () => {
    setup();

    expect(all('[data-live-search-available]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-live-search-unavailable]').every(node => node.hidden)).toBe(true);
    expect(all('[data-live-search-on], [data-live-search-disable]').every(node => node.hidden)).toBe(true);
    expect(all('[data-live-search-host]').every(node => node.textContent === 'tx.fhir.de')).toBe(true);
    expect(all('[data-live-search-operator="tx.fhir.de"]').every(node => !node.hidden)).toBe(true);

    $('btn-live-search-open').click();
    await flush();

    expect(isShown(overlay())).toBe(true);
    expect(createProviders).not.toHaveBeenCalled();
    expect(ids(registry)).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(applyNotice).not.toHaveBeenCalled();
    expect(networkFetch).not.toHaveBeenCalled();
  });

  it('does not switch on when the licence notice is accepted', async () => {
    setupLicenseNotice({ doc: document, storage, navigate: vi.fn() });
    const controller = setup();

    expect(isShown(licence())).toBe(true);
    $('btn-license-accept').click();
    await flush();

    expect(isShown(licence())).toBe(false);
    expect(controller.isActive()).toBe(false);
    expect(createProviders).not.toHaveBeenCalled();
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
    expect(networkFetch).not.toHaveBeenCalled();
  });

  it('closes only the consent dialog with Not now, Escape or a backdrop click', async () => {
    setupAcknowledgedLicence();
    const controller = setup();

    $('btn-license-notice').click();
    expect(isShown(licence())).toBe(true);

    const link = document.querySelector('#license-overlay [data-server-mode="none"] [data-live-search-open]');
    const open = () => {
      link.focus();
      link.click();
      expect(isShown(overlay())).toBe(true);
    };

    open();
    expect(licence().hasAttribute('inert')).toBe(true);
    expect(banner().hasAttribute('inert')).toBe(true);
    expect(overlay().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe($('btn-live-search-cancel'));

    $('btn-live-search-cancel').click();
    expect(isShown(overlay())).toBe(false);
    expect(isShown(licence())).toBe(true);
    expect(licence().hasAttribute('inert')).toBe(false);
    expect(banner().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(link);

    open();
    pressEscape($('btn-live-search-cancel'));
    expect(isShown(overlay())).toBe(false);
    expect(isShown(licence())).toBe(true);

    open();
    overlay().querySelector('.license-dialog__body').click();
    expect(isShown(overlay())).toBe(true);
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(isShown(overlay())).toBe(false);
    expect(isShown(licence())).toBe(true);

    // With the consent dialog closed, Escape reaches the licence dialog again.
    pressEscape();
    expect(isShown(licence())).toBe(false);

    await flush();
    expect(controller.isActive()).toBe(false);
    expect(createProviders).not.toHaveBeenCalled();
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
  });

  it('switches on after confirm, registers the FHIR providers and stores host-bound consent', async () => {
    setupAcknowledgedLicence();
    const controller = setup();
    const listener = vi.fn();

    controller.subscribe(listener);
    await switchOn(controller);

    expect(createProviders).toHaveBeenCalledTimes(1);
    expect(createProviders).toHaveBeenCalledWith(SERVER);
    expect(ids(registry)).toEqual(OPT_IN_IDS);
    expect(JSON.parse(storage.map.get(LIVE_SEARCH_CONSENT_KEY))).toEqual({
      granted: true,
      host: 'tx.fhir.de',
      at: NOW
    });
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed: null, optIn: true });
    expect(listener).toHaveBeenCalledWith(true);

    expect(isShown(overlay())).toBe(false);
    expect(banner().hasAttribute('inert')).toBe(false);
    expect(isShown($('btn-live-search-off'))).toBe(true);
    expect(isShown($('btn-live-search-details'))).toBe(true);
    expect(isShown($('btn-live-search-open'))).toBe(false);
    expect(document.activeElement).toBe($('btn-live-search-details'));
    expect(visibleText(banner())).toContain('Live search is on:');
    expect(visibleText(banner())).toContain('from three characters on');
    expect(visibleText(banner())).toContain('tx.fhir.de');
  });

  it('moves focus to the licence dialog when consent is given from its link', async () => {
    setupLicenseNotice({ doc: document, storage, navigate: vi.fn() });
    const controller = setup();
    const link = document.querySelector('#license-overlay [data-server-mode="none"] [data-live-search-open]');

    link.focus();
    link.click();
    $('btn-live-search-enable').click();
    await vi.waitFor(() => expect(controller.isActive()).toBe(true));
    await flush();

    expect(isShown(link)).toBe(false);
    expect(isShown(licence())).toBe(true);
    expect(licence().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe($('btn-license-accept'));
  });

  it('leaves providers that were already registered alone', async () => {
    const local = { id: 'loinc', displayName: 'Local LOINC' };

    registry.register(local);
    const controller = setup();

    await expect(controller.enable()).resolves.toBe(true);
    expect(ids(registry)).toEqual(OPT_IN_IDS);
    expect(registry.getProvider('loinc')).toBe(local);

    controller.disable();
    expect(ids(registry)).toEqual([ 'loinc' ]);
  });

  it('ignores a stored consent for another host', async () => {
    const stored = JSON.stringify({ granted: true, host: 'fhir.example.test', at: 'x' });

    storage = memoryStorage({ [LIVE_SEARCH_CONSENT_KEY]: stored });
    const controller = setup();
    await flush();

    expect(controller.isActive()).toBe(false);
    expect(createProviders).not.toHaveBeenCalled();
    expect(ids(registry)).toEqual([]);
    expect(all('[data-live-search-available]').every(node => !node.hidden)).toBe(true);
  });

  it('re-enables from a stored consent for the same host without storing it again', async () => {
    const stored = JSON.stringify({ granted: true, host: 'tx.fhir.de', at: 'earlier' });

    storage = memoryStorage({ [LIVE_SEARCH_CONSENT_KEY]: stored });
    const controller = setup();

    await vi.waitFor(() => expect(controller.isActive()).toBe(true));

    expect(ids(registry)).toEqual(OPT_IN_IDS);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.map.get(LIVE_SEARCH_CONSENT_KEY)).toBe(stored);
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed: null, optIn: true });
    expect(isShown(overlay())).toBe(false);
  });

  it('turning off unregisters the providers, clears the consent and resets the notice', async () => {
    setupAcknowledgedLicence();
    const controller = setup();
    const listener = vi.fn();

    await switchOn(controller);
    controller.subscribe(listener);
    $('btn-live-search-off').focus();
    $('btn-live-search-off').click();

    expect(controller.isActive()).toBe(false);
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith(LIVE_SEARCH_CONSENT_KEY);
    expect(applyNotice).toHaveBeenLastCalledWith(document, null);
    expect(listener).toHaveBeenCalledWith(false);
    expect(all('[data-server-mode="configured"]').every(node => node.hidden)).toBe(true);
    expect(isShown($('btn-live-search-open'))).toBe(true);
    expect(isShown($('btn-live-search-off'))).toBe(false);
    expect(isShown($('btn-live-search-details'))).toBe(false);
    expect(document.activeElement).toBe($('btn-live-search-open'));
  });

  it('opens the dialog from the details button in the active state, without a Switch on choice', async () => {
    setupAcknowledgedLicence();
    const controller = setup();

    await switchOn(controller);
    $('btn-live-search-details').focus();
    $('btn-live-search-details').click();

    const footer = overlay().querySelector('.license-dialog__footer');

    expect(isShown(overlay())).toBe(true);
    expect(isShown($('btn-live-search-enable'))).toBe(false);
    expect(isShown($('btn-live-search-cancel'))).toBe(false);
    expect(isShown($('btn-live-search-close'))).toBe(true);
    expect(isShown($('btn-live-search-dialog-off'))).toBe(true);
    expect(visibleText(footer)).not.toContain('Switch on');
    expect(visibleText(footer)).toContain('Turn off live search');
    expect(all('#live-search-overlay [data-live-search-state="on"]').every(isShown)).toBe(true);
    expect(document.activeElement).toBe($('btn-live-search-close'));

    $('btn-live-search-close').click();
    expect(isShown(overlay())).toBe(false);
    expect(controller.isActive()).toBe(true);
    expect(document.activeElement).toBe($('btn-live-search-details'));

    $('btn-live-search-details').click();
    $('btn-live-search-dialog-off').click();

    expect(isShown(overlay())).toBe(false);
    expect(controller.isActive()).toBe(false);
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
    expect(banner().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe($('btn-live-search-open'));

    // Opened again while off, the dialog offers the consent choices.
    $('btn-live-search-open').click();
    expect(isShown($('btn-live-search-enable'))).toBe(true);
    expect(isShown($('btn-live-search-close'))).toBe(false);
  });

  it('links the licence dialog opt-in texts to the live-search notice', async () => {
    setupAcknowledgedLicence();
    const controller = setup();

    await switchOn(controller);
    $('btn-license-notice').click();

    const links = all('#license-overlay [data-demo-mode="opt-in"] [data-live-search-open]');

    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.every(isShown)).toBe(true);

    links[0].click();
    expect(isShown(overlay())).toBe(true);
    expect(isShown($('btn-live-search-close'))).toBe(true);
    expect(isShown($('btn-live-search-enable'))).toBe(false);
  });

  it('fails closed for a host without an operator block', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const controller = setup({ server: OTHER_SERVER });

    expect(controller).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[data-live-search-operator="fhir.example.test"]');
    expect(all('[data-live-search-unavailable]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-live-search-available], [data-live-search-on], [data-live-search-disable]')
      .every(node => node.hidden)).toBe(true);

    for (const trigger of all('[data-live-search-open]')) {
      trigger.click();
    }
    await flush();

    expect(isShown(overlay())).toBe(false);
    expect(createProviders).not.toHaveBeenCalled();
    expect(ids(registry)).toEqual([]);
  });

  it('is not offered without a server, a registry or a provider factory', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    for (const options of [ { server: null }, { registry: null }, { createProviders: undefined } ]) {
      document.documentElement.innerHTML = DEMO_HTML;

      expect(setup(options)).toBeNull();
      expect(all('[data-live-search-unavailable]').every(node => !node.hidden)).toBe(true);
      expect(all('[data-live-search-available], [data-live-search-on], [data-live-search-disable]')
        .every(node => node.hidden)).toBe(true);
    }

    expect(warn).not.toHaveBeenCalled();
  });

  it('a throwing subscriber does not break switching on', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const controller = setup();
    const second = vi.fn();

    controller.subscribe(() => {
      throw new Error('boom');
    });
    controller.subscribe(second);

    await expect(controller.enable()).resolves.toBe(true);
    expect(controller.isActive()).toBe(true);
    expect(ids(registry)).toEqual(OPT_IN_IDS);
    expect(second).toHaveBeenCalledWith(true);
    expect(error).toHaveBeenCalledWith('[demo] Live-search listener failed.', expect.any(Error));
    expect(error).not.toHaveBeenCalledWith('[demo] Live search could not be switched on.', expect.anything());
  });

  it('stops notifying a listener after it unsubscribes', async () => {
    const controller = setup();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    unsubscribe();
    await controller.enable();
    controller.disable();

    expect(listener).not.toHaveBeenCalled();
  });

  it('stays off and logs when the providers cannot be created', async () => {
    setupAcknowledgedLicence();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    createProviders = vi.fn(async () => {
      throw new Error('import failed');
    });
    const controller = setup();

    $('btn-live-search-open').click();
    $('btn-live-search-enable').click();
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    await flush();

    expect(error).toHaveBeenCalledWith('[demo] Live search could not be switched on.', expect.any(Error));
    expect(controller.isActive()).toBe(false);
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
    expect(applyNotice).not.toHaveBeenCalled();
    expect(isShown($('btn-live-search-open'))).toBe(true);
    expect(document.activeElement).toBe($('btn-live-search-open'));
  });

  it('creates the providers once for concurrent enables', async () => {
    const controller = setup();
    const results = await Promise.all([ controller.enable(), controller.enable() ]);

    expect(results).toEqual([ true, true ]);
    expect(createProviders).toHaveBeenCalledTimes(1);
    expect(ids(registry)).toEqual(OPT_IN_IDS);
    await expect(controller.enable()).resolves.toBe(true);
    expect(createProviders).toHaveBeenCalledTimes(1);
  });

  it('stays off when turned off while the providers are being created', async () => {
    let finish;

    createProviders = vi.fn(() => new Promise(resolveProviders => { finish = resolveProviders; }));
    const controller = setup();
    const pending = controller.enable();

    controller.disable();
    finish(OPT_IN_IDS.map(id => ({ id })));

    expect(await pending).toBe(false);
    expect(controller.isActive()).toBe(false);
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
  });

  it('adds the SNOMED CT description to the notice only while on', async () => {
    const snomed = { transport: 'fhir', edition: '11000274103', editionVersion: null, host: 'tx.fhir.de' };
    const controller = setup();

    controller.setSnomed(snomed);
    expect(applyNotice).not.toHaveBeenCalled();

    await controller.enable();
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed, optIn: true });

    controller.setSnomed(null);
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed: null, optIn: true });
  });

  it('drops a search still waiting in the delay when the live search is turned off', async () => {
    setupAcknowledgedLicence();
    const fetchFn = vi.fn(async () => expansion());
    let controller = null;
    const throttled = createThrottledFetch({
      fetchFn,
      delayMs: 30,
      isAllowed: () => Boolean(controller?.isActive())
    });

    controller = setup({
      createProviders: server => createDemoOptInProviders(server, { fetchFn: throttled })
    });
    await switchOn(controller);
    expect(ids(registry)).toEqual(OPT_IN_IDS);

    const sent = await registry.search('Lobektomie', 'loinc', {});

    expect(sent.total).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toMatch(/^https:\/\/tx\.fhir\.de\/fhir\/ValueSet\/\$expand\?/);

    const waiting = registry.search('Lobektomie rechts', 'loinc', {});

    $('btn-live-search-off').click();

    await expect(waiting).resolves.toEqual({ concepts: [], total: 0 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(networkFetch).not.toHaveBeenCalled();
  });
});

describe('createDemoOptInProviders', () => {
  it('creates LOINC, ICD-10-GM, OPS and ATC providers on the opt-in server, without SNOMED CT', async () => {
    const fetchFn = vi.fn(async () => expansion());
    const providers = await createDemoOptInProviders(SERVER, { fetchFn });

    expect(providers.map(entry => entry.id)).toEqual(OPT_IN_IDS);
    expect(providers.every(entry => entry.sourceLabel === 'tx.fhir.de')).toBe(true);

    await providers[0].search('Lobek', {});

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toMatch(/^https:\/\/tx\.fhir\.de\/fhir\/ValueSet\/\$expand\?/);
  });
});
