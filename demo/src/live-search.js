import { inertBackground, refocus } from './modal.js';
import { applyServerNotice } from './server-notice.js';

/**
 * Optional live terminology search for the public demo.
 *
 * The public build can name one FHIR terminology server
 * (`VITE_OPT_IN_FHIR_BASE_URL`). Its providers stay unregistered until the
 * visitor gives separate consent in the live-search dialog, so the demo sends
 * nothing to that server by default. Consent is kept for the browser tab only
 * (sessionStorage), is bound to the server host and can be withdrawn at any
 * time from the banner or the consent dialog. A request still waiting in the
 * throttle when consent is withdrawn is not sent (see `isAllowed`).
 */
export const LIVE_SEARCH_CONSENT_KEY = 'fdh-demo-live-search-consent-v1';

/** Minimum number of characters before a search reaches the server. */
export const LIVE_SEARCH_MIN_TERM_LENGTH = 3;

/** Pause after the last keystroke before a search reaches the server. */
export const LIVE_SEARCH_DELAY_MS = 300;

function resolveDefaultStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Read the stored live-search consent for `host`.
 *
 * @param {Storage | null | undefined} storage
 * @param {string} host
 * @returns {{ granted: true, host: string, at: string } | null}
 */
export function readLiveSearchConsent(storage, host) {
  try {
    const raw = storage?.getItem(LIVE_SEARCH_CONSENT_KEY);
    const value = raw ? JSON.parse(raw) : null;

    return value?.granted === true && value.host === host ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} host
 * @param {Date} [now]
 */
export function storeLiveSearchConsent(storage, host, now = new Date()) {
  try {
    storage?.setItem(
      LIVE_SEARCH_CONSENT_KEY,
      JSON.stringify({ granted: true, host, at: now.toISOString() })
    );
  } catch {
    // Without storage the consent lasts until the page is reloaded.
  }
}

/** @param {Storage | null | undefined} storage */
export function clearLiveSearchConsent(storage) {
  try {
    storage?.removeItem(LIVE_SEARCH_CONSENT_KEY);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

function createAbortError(signal) {
  return signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError');
}

function waitFor(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError(signal));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function getExpandFilter(url) {
  try {
    const parsed = new URL(url, 'http://localhost');

    return parsed.pathname.endsWith('/ValueSet/$expand')
      ? parsed.searchParams.get('filter')
      : null;
  } catch {
    return null;
  }
}

function createEmptyExpansionResponse() {
  return new Response(JSON.stringify({
    resourceType: 'ValueSet',
    status: 'active',
    expansion: { total: 0, contains: [] }
  }), {
    status: 200,
    headers: { 'content-type': 'application/fhir+json' }
  });
}

/**
 * Wrap `fetch` so that a demo sends fewer requests to a public terminology
 * server.
 *
 * - A `ValueSet/$expand` search shorter than `minTermLength` characters is
 *   answered locally with an empty result (`0` turns this off).
 * - Every request waits `delayMs` first. The properties panel aborts the
 *   previous search on each keystroke, so only the search after the last
 *   keystroke is sent.
 * - `isAllowed` is checked after that delay, right before sending: when it
 *   returns `false` (for example because the visitor has withdrawn consent
 *   meanwhile), nothing is sent. A `$expand` search is then answered with an
 *   empty result, any other request fails with an `AbortError`.
 * - Successful, non-redirected responses are cached by URL (at most
 *   `cacheSize` entries). The cache key ignores request headers, so share one
 *   wrapper only between providers whose requests to the same URL carry the
 *   same headers (for example `Accept-Language` or `Authorization`).
 *
 * @param {{
 *   fetchFn?: typeof fetch,
 *   delayMs?: number,
 *   minTermLength?: number,
 *   cacheSize?: number,
 *   wait?: (ms: number, signal?: AbortSignal) => Promise<void>,
 *   isAllowed?: () => boolean
 * }} [options]
 * @returns {typeof fetch}
 */
export function createThrottledFetch({
  fetchFn = (...args) => globalThis.fetch(...args),
  delayMs = LIVE_SEARCH_DELAY_MS,
  minTermLength = LIVE_SEARCH_MIN_TERM_LENGTH,
  cacheSize = 50,
  wait = waitFor,
  isAllowed = () => true
} = {}) {
  const cache = new Map();

  return async function throttledFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);
    const filter = getExpandFilter(url);

    if (filter !== null && filter.trim().length < minTermLength) {
      return createEmptyExpansionResponse();
    }

    const cached = cache.get(url);

    if (cached) {
      cache.delete(url);
      cache.set(url, cached);

      return new Response(cached.body, { status: 200, headers: cached.headers });
    }

    await wait(delayMs, init.signal);

    // Withdrawn while this request was waiting: send nothing.
    if (!isAllowed()) {
      if (filter !== null) {
        return createEmptyExpansionResponse();
      }

      throw new DOMException('Live search is off.', 'AbortError');
    }

    const response = await fetchFn(input, init);

    // A redirected response is never cached: a cache hit would rebuild it as
    // a plain 200 and bypass the adapters' redirect checks.
    if (response.ok && !response.redirected && cacheSize > 0) {
      const body = await response.clone().text();

      cache.set(url, {
        body,
        headers: { 'content-type': response.headers.get('content-type') || 'application/fhir+json' }
      });

      if (cache.size > cacheSize) {
        cache.delete(cache.keys().next().value);
      }
    }

    return response;
  };
}

function setHidden(root, selector, hidden) {
  for (const node of root.querySelectorAll(selector)) {
    node.hidden = hidden;
  }
}

function setText(root, selector, text) {
  for (const node of root.querySelectorAll(selector)) {
    node.textContent = text;
  }
}

/**
 * Wire the live-search consent dialog, the banner switch and the provider
 * registration.
 *
 * The live search is offered only when the page names the server's operator
 * in a `[data-live-search-operator="<host>"]` block (fail closed): without a
 * named recipient the consent dialog would be incomplete.
 *
 * Page hooks:
 * - `#live-search-overlay`: the consent dialog. While the live search is off
 *   it offers `#btn-live-search-cancel` and `#btn-live-search-enable`; while
 *   it is on, `#btn-live-search-dialog-off` and `#btn-live-search-close`;
 * - `[data-live-search-state="off"]` / `[data-live-search-state="on"]`:
 *   dialog parts shown while the live search is off / on;
 * - `[data-live-search-open]`: opens the dialog;
 * - `[data-live-search-disable]`: withdraws consent (shown while active);
 * - `[data-live-search-available]` / `[data-live-search-unavailable]`: shown
 *   while live search is offered but off / when it is not offered;
 * - `[data-live-search-on]`: shown while the live search is on;
 * - `[data-live-search-host]`: receives the server host;
 * - `[data-live-search-operator="<host>"]`: shown only for that host.
 *
 * @param {{
 *   doc?: Document,
 *   storage?: Storage | null,
 *   server: { fhirBaseUrl: string, fhirHost: string } | null,
 *   registry: { register: Function, unregister: Function, listProviders: Function } | null,
 *   createProviders: (server: { fhirBaseUrl: string, fhirHost: string }) => Promise<Array<{ id: string }>> | Array<{ id: string }>,
 *   applyNotice?: typeof applyServerNotice,
 *   now?: () => Date
 * }} options
 * @returns {null | { enable: () => Promise<boolean>, disable: () => void, isActive: () => boolean, subscribe: (listener: (active: boolean) => void) => () => void, setSnomed: (description: object | null) => void }}
 */
export function setupLiveSearch({
  doc = document,
  storage = resolveDefaultStorage(),
  server,
  registry,
  createProviders,
  applyNotice = applyServerNotice,
  now = () => new Date()
}) {
  // Fail closed: offer the live search only for a host whose operator
  // (recipient, address, privacy policy) the consent dialog names.
  const hasOperator = Boolean(server) && [ ...doc.querySelectorAll('[data-live-search-operator]') ]
    .some(node => node.getAttribute('data-live-search-operator') === server.fhirHost);
  const offered = Boolean(server && registry && typeof createProviders === 'function' && hasOperator);

  setHidden(doc, '[data-live-search-unavailable]', offered);

  if (!offered) {
    if (server && !hasOperator) {
      console.warn(
        `[demo] Live search on ${server.fhirHost} is not offered: index.html has no ` +
        `[data-live-search-operator="${server.fhirHost}"] block naming its operator.`
      );
    }

    setHidden(doc, '[data-live-search-available]', true);
    setHidden(doc, '[data-live-search-on]', true);
    setHidden(doc, '[data-live-search-disable]', true);
    return null;
  }

  const overlay = doc.getElementById('live-search-overlay');
  const confirmButton = doc.getElementById('btn-live-search-enable');
  const cancelButton = doc.getElementById('btn-live-search-cancel');
  const closeButton = doc.getElementById('btn-live-search-close');
  let registeredIds = [];
  let active = false;
  let pending = null;
  let generation = 0;
  let lastFocus = null;
  let restoreBackground = null;
  let snomedDescription = null;
  const listeners = new Set();

  function describe() {
    return {
      fhirBaseUrl: server.fhirBaseUrl,
      fhirHost: server.fhirHost,
      snomed: snomedDescription,
      optIn: true
    };
  }

  // A failing listener must not turn a completed switch-on or switch-off
  // into a reported failure.
  function notify() {
    for (const listener of listeners) {
      try {
        listener(active);
      } catch (error) {
        console.error('[demo] Live-search listener failed.', error);
      }
    }
  }

  setText(doc, '[data-live-search-host]', server.fhirHost);

  for (const node of doc.querySelectorAll('[data-live-search-operator]')) {
    node.hidden = node.getAttribute('data-live-search-operator') !== server.fhirHost;
  }

  function render() {
    setHidden(doc, '[data-live-search-available]', active);
    setHidden(doc, '[data-live-search-on]', !active);
    setHidden(doc, '[data-live-search-disable]', !active);
    setHidden(doc, '[data-live-search-state="off"]', active);
    setHidden(doc, '[data-live-search-state="on"]', !active);
  }

  function openDialog() {
    if (!overlay || !overlay.hidden) {
      return;
    }

    lastFocus = doc.activeElement;
    restoreBackground = inertBackground(doc, overlay);
    overlay.hidden = false;
    overlay.classList.remove('license-overlay--hidden');
    (active ? closeButton : cancelButton)?.focus();
  }

  function closeDialog() {
    if (!overlay || overlay.hidden) {
      return;
    }

    overlay.classList.add('license-overlay--hidden');
    overlay.hidden = true;
    restoreBackground?.();
    restoreBackground = null;
    lastFocus?.focus?.();
    lastFocus = null;
  }

  function enable({ persist = true } = {}) {
    if (active) {
      return Promise.resolve(true);
    }

    if (!pending) {
      const startedGeneration = generation;

      pending = (async () => {
        try {
          const providers = await createProviders(server);

          // Switched off while the providers were being created.
          if (generation !== startedGeneration) {
            return false;
          }

          const knownIds = new Set(registry.listProviders().map(provider => provider.id));

          registeredIds = [];

          for (const provider of providers) {
            if (!knownIds.has(provider.id)) {
              registry.register(provider);
              registeredIds.push(provider.id);
            }
          }

          active = true;

          if (persist) {
            storeLiveSearchConsent(storage, server.fhirHost, now());
          }

          applyNotice(doc, describe());
          render();
          notify();

          return true;
        } catch (error) {
          console.error('[demo] Live search could not be switched on.', error);
          return false;
        } finally {
          pending = null;
        }
      })();
    }

    return pending;
  }

  function disable() {
    generation += 1;

    for (const id of registeredIds) {
      registry.unregister(id);
    }

    registeredIds = [];
    active = false;
    clearLiveSearchConsent(storage);
    applyNotice(doc, null);
    render();
    notify();
  }

  for (const button of doc.querySelectorAll('[data-live-search-open]')) {
    button.addEventListener('click', openDialog);
  }

  // The control that triggered the change hides itself (or sits in a notice
  // variant that is hidden now): keep focus on a visible control.
  for (const button of doc.querySelectorAll('[data-live-search-disable]')) {
    button.addEventListener('click', () => {
      closeDialog();
      disable();
      refocus(doc, [ 'btn-live-search-open', 'btn-license-notice' ]);
    });
  }

  confirmButton?.addEventListener('click', async () => {
    closeDialog();
    await enable();
    refocus(doc, active
      ? [ 'btn-live-search-details', 'btn-live-search-off', 'btn-license-notice' ]
      : [ 'btn-live-search-open', 'btn-license-notice' ]);
  });

  cancelButton?.addEventListener('click', closeDialog);
  closeButton?.addEventListener('click', closeDialog);

  overlay?.addEventListener('click', event => {
    if (event.target === overlay) {
      closeDialog();
    }
  });

  // Capture phase: Escape closes only this dialog, not the licence dialog
  // underneath, whose handler listens on the document in the bubble phase.
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay && !overlay.hidden) {
      event.stopPropagation();
      closeDialog();
    }
  }, { capture: true });

  render();

  const controller = {
    enable: () => enable(),
    disable,
    isActive: () => active,
    /**
     * Listen for the live search being switched on (`true`) or off (`false`).
     * @param {(active: boolean) => void} listener
     * @returns {() => void} Removes the listener.
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /**
     * Add (or remove with `null`) the SNOMED CT part of the notice shown while
     * the live search is on.
     * @param {object | null} description
     */
    setSnomed(description) {
      snomedDescription = description;

      if (active) {
        applyNotice(doc, describe());
      }
    }
  };

  if (readLiveSearchConsent(storage, server.fhirHost)) {
    void enable({ persist: false });
  }

  return controller;
}
