// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_SEARCH_CONSENT_KEY, setupLiveSearch } from '../../../demo/src/live-search.js';
import { LICENSE_NOTICE_ACK_KEY, setupLicenseNotice } from '../../../demo/src/license-notice.js';
import { applyServerNotice } from '../../../demo/src/server-notice.js';
import {
  SNOMED_DECLARATION_KEY,
  clearSnomedDeclaration,
  readSnomedDeclaration,
  setupSnomedUnlock,
  storeSnomedDeclaration
} from '../../../demo/src/snomed-unlock.js';
import { createDemoOptInSnomedProvider } from '../../../demo/src/terminology-config.js';
import { TerminologyRegistry } from '../../src/core/TerminologyRegistry.js';
import { visibleText } from './visible-text.js';

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
const SNOMED = { edition: '11000274103', editionVersion: '20260815' };
const SNOMED_DESCRIPTION = {
  transport: 'fhir',
  edition: '11000274103',
  editionVersion: '20260815',
  host: 'tx.fhir.de'
};
const OPT_IN_IDS = [ 'loinc', 'icd-10-gm', 'ops', 'atc' ];
const NOW = '2026-01-02T03:04:05.000Z';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));

  return {
    getItem: vi.fn(key => (map.has(key) ? map.get(key) : null)),
    setItem: vi.fn((key, value) => { map.set(key, String(value)); }),
    removeItem: vi.fn(key => { map.delete(key); }),
    map
  };
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

function all(selector) {
  return [ ...document.querySelectorAll(selector) ];
}

const $ = id => document.getElementById(id);
const overlay = () => $('snomed-unlock-overlay');
const banner = () => document.querySelector('aside.demo-notice');
const statements = () => [ ...overlay().querySelectorAll('[data-snomed-statement]') ];
const flush = () => new Promise(resolveFlush => setTimeout(resolveFlush, 0));

function tick(input, checked = true) {
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

afterEach(() => {
  // Dialog modules keep their document-level Escape handlers. Close every
  // overlay of this test's page so those handlers stay inactive afterwards.
  for (const node of document.querySelectorAll('[role="dialog"]')) {
    node.hidden = true;
    node.classList.add('license-overlay--hidden');
  }

  vi.restoreAllMocks();
});

describe('SNOMED CT self-declaration storage', () => {
  it('binds the declaration to host and edition', () => {
    const storage = memoryStorage();
    const scope = { host: 'tx.fhir.de', edition: '11000274103' };

    storeSnomedDeclaration(storage, scope, new Date(NOW));

    expect(JSON.parse(storage.map.get(SNOMED_DECLARATION_KEY))).toEqual({
      declared: true,
      host: 'tx.fhir.de',
      edition: '11000274103',
      at: NOW
    });
    expect(readSnomedDeclaration(storage, scope)).toMatchObject({ declared: true });
    expect(readSnomedDeclaration(storage, { ...scope, host: 'fhir.example.test' })).toBeNull();
    expect(readSnomedDeclaration(storage, { ...scope, edition: '900000000000207008' })).toBeNull();

    clearSnomedDeclaration(storage);
    expect(readSnomedDeclaration(storage, scope)).toBeNull();
  });

  it('treats malformed or throwing storage as no declaration', () => {
    const scope = { host: 'tx.fhir.de', edition: '11000274103' };
    const malformed = memoryStorage({ [SNOMED_DECLARATION_KEY]: '{"declared": tru' });
    const fail = () => {
      throw new Error('storage blocked');
    };
    const throwing = { getItem: fail, setItem: fail, removeItem: fail };

    expect(readSnomedDeclaration(malformed, scope)).toBeNull();
    expect(readSnomedDeclaration(throwing, scope)).toBeNull();
    expect(() => storeSnomedDeclaration(throwing, scope)).not.toThrow();
    expect(() => clearSnomedDeclaration(throwing)).not.toThrow();
  });
});

describe('setupSnomedUnlock with the demo page', () => {
  let registry;
  let storage;
  let applyNotice;
  let createProvider;
  let liveSearch;

  function setupLive(options = {}) {
    liveSearch = setupLiveSearch({
      doc: document,
      storage,
      server: SERVER,
      registry,
      createProviders: async () => OPT_IN_IDS.map(id => ({ id, displayName: id })),
      applyNotice,
      now: () => new Date(NOW),
      ...options
    });

    if (liveSearch) {
      vi.spyOn(liveSearch, 'setSnomed');
    }

    return liveSearch;
  }

  function setup(options = {}) {
    return setupSnomedUnlock({
      doc: document,
      storage,
      server: SERVER,
      snomed: SNOMED,
      registry,
      liveSearch,
      createProvider,
      now: () => new Date(NOW),
      ...options
    });
  }

  function setupAcknowledgedLicence() {
    storage.setItem(LICENSE_NOTICE_ACK_KEY, 'true');
    storage.setItem.mockClear();
    setupLicenseNotice({ doc: document, storage, navigate: vi.fn() });
  }

  async function unlockFromDialog(unlock) {
    $('btn-snomed-open').click();
    statements().forEach(input => tick(input));
    $('btn-snomed-unlock').click();
    await vi.waitFor(() => expect(unlock.isUnlocked()).toBe(true));
    await flush();
  }

  beforeEach(() => {
    document.documentElement.innerHTML = DEMO_HTML;
    registry = new TerminologyRegistry();
    storage = memoryStorage();
    applyNotice = vi.fn(applyServerNotice);
    createProvider = vi.fn(async () => ({ id: 'snomed-ct', displayName: 'SNOMED CT' }));
    liveSearch = null;
  });

  it('is not offered without an edition, a server, a live search, a registry or a provider factory', async () => {
    const cases = [
      { snomed: null },
      { snomed: { edition: '' } },
      { server: null },
      { liveSearch: null },
      { registry: null },
      { createProvider: undefined }
    ];

    for (const options of cases) {
      document.documentElement.innerHTML = DEMO_HTML;
      setupLive();

      expect(setup(options)).toBeNull();
      expect(all('[data-snomed-offered]').every(node => node.hidden)).toBe(true);
      expect(all('[data-snomed-offered-none]').every(node => !node.hidden)).toBe(true);

      await liveSearch.enable();

      expect(isShown($('btn-snomed-open'))).toBe(false);
      expect(isShown($('btn-snomed-lock'))).toBe(false);
      expect(all('[data-snomed-unlocked]').every(node => node.hidden)).toBe(true);
    }

    expect(createProvider).not.toHaveBeenCalled();
    expect(ids(registry)).not.toContain('snomed-ct');
  });

  it('shows SNOMED CT… only while the live search is on', async () => {
    setupLive();
    setup();

    expect(all('[data-snomed-offered]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-snomed-offered-none]').every(node => node.hidden)).toBe(true);
    expect(all('[data-snomed-optin-edition]').every(node => node.textContent === '11000274103')).toBe(true);
    expect(all('[data-snomed-optin-release]').every(node => node.textContent === '20260815')).toBe(true);
    expect(all('[data-snomed-optin-release-info]').every(node => !node.hidden)).toBe(true);
    expect(isShown($('btn-snomed-open'))).toBe(false);

    // A hidden trigger opens nothing while the live search is off.
    $('btn-snomed-open').click();
    expect(isShown(overlay())).toBe(false);

    await liveSearch.enable();
    expect(isShown($('btn-snomed-open'))).toBe(true);
    expect(isShown($('btn-snomed-lock'))).toBe(false);

    liveSearch.disable();
    expect(isShown($('btn-snomed-open'))).toBe(false);
    expect(createProvider).not.toHaveBeenCalled();
  });

  it('hides the release when the build pins none', () => {
    setupLive();
    setup({ snomed: { edition: '11000274103' } });

    expect(all('[data-snomed-optin-release-info]').every(node => node.hidden)).toBe(true);
  });

  it('enables Unlock only when all three unticked statements are confirmed', async () => {
    setupLive();
    setup();
    await liveSearch.enable();

    expect(all('[data-snomed-statement]').every(input => !input.hasAttribute('checked'))).toBe(true);

    $('btn-snomed-open').click();

    const inputs = statements();
    const unlockButton = $('btn-snomed-unlock');

    expect(isShown(overlay())).toBe(true);
    expect(inputs).toHaveLength(3);
    expect(inputs.every(input => !input.checked)).toBe(true);
    expect(unlockButton.disabled).toBe(true);

    tick(inputs[0]);
    tick(inputs[1]);
    expect(unlockButton.disabled).toBe(true);

    tick(inputs[2]);
    expect(unlockButton.disabled).toBe(false);

    tick(inputs[1], false);
    expect(unlockButton.disabled).toBe(true);

    unlockButton.click();
    await flush();
    expect(createProvider).not.toHaveBeenCalled();

    // Cancelling forgets the ticks: the dialog opens unticked again.
    tick(inputs[1]);
    $('btn-snomed-cancel').click();
    expect(isShown(overlay())).toBe(false);

    $('btn-snomed-open').click();
    expect(statements().every(input => !input.checked)).toBe(true);
    expect($('btn-snomed-unlock').disabled).toBe(true);
    expect(createProvider).not.toHaveBeenCalled();
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
  });

  it('unlocks once, stores the declaration and adds SNOMED CT to the notice', async () => {
    setupAcknowledgedLicence();
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    await unlockFromDialog(unlock);

    expect(createProvider).toHaveBeenCalledTimes(1);
    expect(createProvider).toHaveBeenCalledWith(SERVER, SNOMED);
    expect(ids(registry)).toEqual([ ...OPT_IN_IDS, 'snomed-ct' ]);
    expect(JSON.parse(storage.map.get(SNOMED_DECLARATION_KEY))).toEqual({
      declared: true,
      host: 'tx.fhir.de',
      edition: '11000274103',
      at: NOW
    });
    expect(liveSearch.setSnomed).toHaveBeenCalledTimes(1);
    expect(liveSearch.setSnomed).toHaveBeenCalledWith(SNOMED_DESCRIPTION);
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed: SNOMED_DESCRIPTION, optIn: true });

    expect(isShown(overlay())).toBe(false);
    expect(banner().hasAttribute('inert')).toBe(false);
    expect(isShown($('btn-snomed-open'))).toBe(false);
    expect(isShown($('btn-snomed-lock'))).toBe(true);
    expect(all('aside.demo-notice [data-snomed-unlocked]').every(isShown)).toBe(true);
    expect(document.activeElement).toBe($('btn-snomed-lock'));
    expect(visibleText(banner())).toContain('SNOMED CT® is unlocked on your licence self-declaration.');

    $('btn-license-notice').click();
    const snomedItem = document.querySelector('[data-demo-snomed]');
    expect(isShown(snomedItem)).toBe(true);
    expect(visibleText(snomedItem)).toContain('edition 11000274103, release 20260815');
    expect(visibleText(snomedItem)).toContain('You unlocked it with a self-declaration');

    await expect(unlock.unlock()).resolves.toBe(true);
    expect(createProvider).toHaveBeenCalledTimes(1);
  });

  it('creates the provider once for concurrent unlocks', async () => {
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    const results = await Promise.all([ unlock.unlock(), unlock.unlock() ]);

    expect(results).toEqual([ true, true ]);
    expect(createProvider).toHaveBeenCalledTimes(1);
    expect(ids(registry).filter(id => id === 'snomed-ct')).toHaveLength(1);
  });

  it('does not unlock while the live search is off', async () => {
    setupLive();
    const unlock = setup();

    await expect(unlock.unlock()).resolves.toBe(false);
    expect(createProvider).not.toHaveBeenCalled();
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
  });

  it('Lock SNOMED CT unregisters the provider and clears the declaration', async () => {
    setupAcknowledgedLicence();
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    await unlockFromDialog(unlock);
    $('btn-snomed-lock').click();

    expect(unlock.isUnlocked()).toBe(false);
    expect(liveSearch.isActive()).toBe(true);
    expect(ids(registry)).toEqual(OPT_IN_IDS);
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
    expect(liveSearch.setSnomed).toHaveBeenLastCalledWith(null);
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed: null, optIn: true });
    expect(isShown($('btn-snomed-open'))).toBe(true);
    expect(isShown($('btn-snomed-lock'))).toBe(false);
    expect(all('[data-snomed-unlocked]').every(node => node.hidden)).toBe(true);
    expect(document.activeElement).toBe($('btn-snomed-open'));
  });

  it('switching off the live search locks SNOMED CT and clears both choices', async () => {
    setupAcknowledgedLicence();
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    await unlockFromDialog(unlock);
    $('btn-live-search-off').click();

    expect(liveSearch.isActive()).toBe(false);
    expect(unlock.isUnlocked()).toBe(false);
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
    expect(storage.map.has(LIVE_SEARCH_CONSENT_KEY)).toBe(false);
    expect(liveSearch.setSnomed).toHaveBeenLastCalledWith(null);
    expect(applyNotice).toHaveBeenLastCalledWith(document, null);
    expect(isShown($('btn-snomed-open'))).toBe(false);
    expect(isShown($('btn-snomed-lock'))).toBe(false);
    expect(all('[data-snomed-unlocked]').every(node => node.hidden)).toBe(true);

    // Switching the live search on again does not unlock SNOMED CT by itself.
    await liveSearch.enable();
    await flush();
    expect(unlock.isUnlocked()).toBe(false);
    expect(isShown($('btn-snomed-open'))).toBe(true);
    expect(createProvider).toHaveBeenCalledTimes(1);
  });

  it('switching off the live search also clears a declaration that was not in use', async () => {
    const other = JSON.stringify({ declared: true, host: 'tx.fhir.de', edition: '900000000000207008', at: 'x' });

    storage = memoryStorage({ [SNOMED_DECLARATION_KEY]: other });
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    await flush();
    expect(unlock.isUnlocked()).toBe(false);

    liveSearch.disable();
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
  });

  it('re-unlocks from a stored declaration for the same host and edition once the live search is on', async () => {
    const stored = JSON.stringify({ declared: true, host: 'tx.fhir.de', edition: '11000274103', at: 'earlier' });

    storage = memoryStorage({ [SNOMED_DECLARATION_KEY]: stored });
    setupLive();
    const unlock = setup();
    await flush();

    expect(unlock.isUnlocked()).toBe(false);
    expect(createProvider).not.toHaveBeenCalled();

    await liveSearch.enable();
    await vi.waitFor(() => expect(unlock.isUnlocked()).toBe(true));

    expect(ids(registry)).toContain('snomed-ct');
    expect(storage.map.get(SNOMED_DECLARATION_KEY)).toBe(stored);
    expect(storage.setItem).not.toHaveBeenCalledWith(SNOMED_DECLARATION_KEY, expect.anything());
    expect(liveSearch.setSnomed).toHaveBeenCalledWith(SNOMED_DESCRIPTION);
    expect(isShown(overlay())).toBe(false);
  });

  it('restores both choices after a reload in the same tab', async () => {
    storage = memoryStorage({
      [LIVE_SEARCH_CONSENT_KEY]: JSON.stringify({ granted: true, host: 'tx.fhir.de', at: 'earlier' }),
      [SNOMED_DECLARATION_KEY]: JSON.stringify({ declared: true, host: 'tx.fhir.de', edition: '11000274103', at: 'earlier' })
    });
    setupLive();
    const unlock = setup();

    await vi.waitFor(() => expect(unlock.isUnlocked()).toBe(true));

    expect(liveSearch.isActive()).toBe(true);
    expect(ids(registry)).toEqual([ ...OPT_IN_IDS, 'snomed-ct' ]);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(applyNotice).toHaveBeenLastCalledWith(document, { ...SERVER, snomed: SNOMED_DESCRIPTION, optIn: true });
  });

  it('does not re-unlock from a declaration for another edition or host', async () => {
    for (const declaration of [
      { declared: true, host: 'tx.fhir.de', edition: '900000000000207008', at: 'x' },
      { declared: true, host: 'fhir.example.test', edition: '11000274103', at: 'x' },
      { declared: 'true', host: 'tx.fhir.de', edition: '11000274103', at: 'x' }
    ]) {
      document.documentElement.innerHTML = DEMO_HTML;
      registry = new TerminologyRegistry();
      storage = memoryStorage({ [SNOMED_DECLARATION_KEY]: JSON.stringify(declaration) });
      setupLive();
      const unlock = setup();

      await liveSearch.enable();
      await flush();

      expect(unlock.isUnlocked()).toBe(false);
      expect(ids(registry)).not.toContain('snomed-ct');
      expect(isShown($('btn-snomed-open'))).toBe(true);
    }

    expect(createProvider).not.toHaveBeenCalled();
  });

  it('stays locked and logs when the provider cannot be created', async () => {
    setupAcknowledgedLicence();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    createProvider = vi.fn(async () => {
      throw new Error('bad edition');
    });
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    $('btn-snomed-open').click();
    statements().forEach(input => tick(input));
    $('btn-snomed-unlock').click();
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    await flush();

    expect(error).toHaveBeenCalledWith('[demo] SNOMED CT could not be unlocked.', expect.any(Error));
    expect(unlock.isUnlocked()).toBe(false);
    expect(ids(registry)).toEqual(OPT_IN_IDS);
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
    expect(liveSearch.setSnomed).not.toHaveBeenCalled();
    expect(isShown($('btn-snomed-open'))).toBe(true);
    expect(isShown($('btn-snomed-lock'))).toBe(false);
    expect(document.activeElement).toBe($('btn-snomed-open'));
  });

  it('stays locked when the live search is turned off while the provider is being created', async () => {
    let finish;

    createProvider = vi.fn(() => new Promise(resolveProvider => { finish = resolveProvider; }));
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    const pending = unlock.unlock();

    liveSearch.disable();
    finish({ id: 'snomed-ct' });

    await expect(pending).resolves.toBe(false);
    expect(unlock.isUnlocked()).toBe(false);
    expect(ids(registry)).toEqual([]);
    expect(storage.map.has(SNOMED_DECLARATION_KEY)).toBe(false);
    expect(liveSearch.setSnomed).not.toHaveBeenCalled();
  });

  it('leaves an already registered SNOMED CT provider alone', async () => {
    const local = { id: 'snomed-ct', displayName: 'Local SNOMED CT' };

    registry.register(local);
    setupLive();
    const unlock = setup();

    await liveSearch.enable();
    await expect(unlock.unlock()).resolves.toBe(true);
    expect(registry.getProvider('snomed-ct')).toBe(local);

    unlock.lock();
    expect(registry.getProvider('snomed-ct')).toBe(local);
  });

  it('makes the background inert and closes only its own dialog with Cancel, Escape or the backdrop', async () => {
    setupAcknowledgedLicence();
    setupLive();
    const unlock = setup();

    await liveSearch.enable();

    const open = () => {
      $('btn-snomed-open').focus();
      $('btn-snomed-open').click();
      expect(isShown(overlay())).toBe(true);
    };

    open();
    expect(banner().hasAttribute('inert')).toBe(true);
    expect($('license-overlay').hasAttribute('inert')).toBe(true);
    expect(overlay().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe($('btn-snomed-cancel'));

    $('btn-snomed-cancel').click();
    expect(isShown(overlay())).toBe(false);
    expect(banner().hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe($('btn-snomed-open'));

    open();
    $('btn-snomed-cancel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isShown(overlay())).toBe(false);

    open();
    overlay().querySelector('.license-dialog__body').click();
    expect(isShown(overlay())).toBe(true);
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(isShown(overlay())).toBe(false);

    expect(liveSearch.isActive()).toBe(true);
    expect(isShown($('live-search-overlay'))).toBe(false);
    expect(unlock.isUnlocked()).toBe(false);
    expect(createProvider).not.toHaveBeenCalled();
  });
});

describe('createDemoOptInSnomedProvider', () => {
  it('creates the SNOMED CT provider for the pinned edition on the opt-in server', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      resourceType: 'ValueSet',
      expansion: { total: 0, contains: [] }
    }), { status: 200, headers: { 'content-type': 'application/fhir+json' } }));
    const provider = await createDemoOptInSnomedProvider(SERVER, SNOMED, { fetchFn });

    expect(provider.id).toBe('snomed-ct');
    expect(provider.sourceLabel).toBe('tx.fhir.de');

    await provider.search('Lobektomie', {});

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(fetchFn.mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/tx\.fhir\.de\/fhir\/ValueSet\/\$expand\?/);
    expect(url).toContain('http://snomed.info/sct/11000274103/version/20260815');
  });
});
