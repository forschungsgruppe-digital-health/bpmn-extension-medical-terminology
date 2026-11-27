import { inertBackground, refocus, restoreFocus } from './modal.js';

/**
 * Optional SNOMED CT unlock for the public demo's live search.
 *
 * SNOMED CT is licensed content: in Germany every user needs an Affiliate
 * Licence (or must be an end user under one), administered by BfArM via MLDS,
 * and the German licence covers use in Germany only. The demo therefore never
 * offers SNOMED CT by default. If the build names the German National Edition
 * (`VITE_OPT_IN_SNOMED_EDITION=11000274103`, the only edition accepted, see
 * `describeDemoOptInSnomed`), a visitor who has switched on the live search
 * can unlock it with a self-declaration: three statements that are not
 * pre-selected and must all be confirmed. The declaration is not verified,
 * is kept for the browser tab only (sessionStorage), is bound to the server
 * host and the edition, and ends when the visitor locks SNOMED CT again or
 * switches off the live search.
 */
export const SNOMED_DECLARATION_KEY = 'fdh-demo-snomed-self-declaration-v1';

function resolveDefaultStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {{ host: string, edition: string }} scope
 * @returns {{ declared: true, host: string, edition: string, at: string } | null}
 */
export function readSnomedDeclaration(storage, { host, edition }) {
  try {
    const raw = storage?.getItem(SNOMED_DECLARATION_KEY);
    const value = raw ? JSON.parse(raw) : null;

    return value?.declared === true && value.host === host && value.edition === edition
      ? value
      : null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {{ host: string, edition: string }} scope
 * @param {Date} [now]
 */
export function storeSnomedDeclaration(storage, { host, edition }, now = new Date()) {
  try {
    storage?.setItem(
      SNOMED_DECLARATION_KEY,
      JSON.stringify({ declared: true, host, edition, at: now.toISOString() })
    );
  } catch {
    // Without storage the declaration lasts until the page is reloaded.
  }
}

/** @param {Storage | null | undefined} storage */
export function clearSnomedDeclaration(storage) {
  try {
    storage?.removeItem(SNOMED_DECLARATION_KEY);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
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
 * Wire the SNOMED CT self-declaration dialog and the banner switches.
 *
 * Page hooks:
 * - `#snomed-unlock-overlay` with the checkboxes `[data-snomed-statement]`,
 *   `#btn-snomed-unlock` (enabled only when every statement is checked) and
 *   `#btn-snomed-cancel`: the self-declaration dialog;
 * - `[data-snomed-open]`: opens the dialog (shown while the live search is on
 *   and SNOMED CT is locked);
 * - `[data-snomed-lock]`: locks SNOMED CT again (shown while unlocked);
 * - `[data-snomed-unlocked]`: shown while unlocked;
 * - `[data-snomed-offered]` / `[data-snomed-offered-none]`: shown when the
 *   build offers the unlock / does not offer it;
 * - `[data-snomed-optin-edition]`, `[data-snomed-optin-release]` and
 *   `[data-snomed-optin-release-info]`: edition details.
 *
 * @param {{
 *   doc?: Document,
 *   storage?: Storage | null,
 *   server: { fhirBaseUrl: string, fhirHost: string } | null,
 *   snomed: { edition: string, editionVersion?: string | null } | null,
 *   registry: { register: Function, unregister: Function, listProviders: Function } | null,
 *   liveSearch: null | { isActive: () => boolean, subscribe: (listener: (active: boolean) => void) => () => void, setSnomed: (description: object | null) => void },
 *   createProvider: (server: object, snomed: object) => Promise<{ id: string }> | { id: string },
 *   now?: () => Date
 * }} options
 * @returns {null | { unlock: () => Promise<boolean>, lock: () => void, isUnlocked: () => boolean }}
 */
export function setupSnomedUnlock({
  doc = document,
  storage = resolveDefaultStorage(),
  server,
  snomed,
  registry,
  liveSearch,
  createProvider,
  now = () => new Date()
}) {
  const offered = Boolean(server && snomed?.edition && registry && liveSearch && typeof createProvider === 'function');

  setHidden(doc, '[data-snomed-offered]', !offered);
  setHidden(doc, '[data-snomed-offered-none]', offered);

  if (!offered) {
    setHidden(doc, '[data-snomed-open]', true);
    setHidden(doc, '[data-snomed-lock]', true);
    setHidden(doc, '[data-snomed-unlocked]', true);
    return null;
  }

  const scope = { host: server.fhirHost, edition: snomed.edition };
  const description = {
    transport: 'fhir',
    edition: snomed.edition,
    editionVersion: snomed.editionVersion ?? null,
    host: server.fhirHost
  };
  const overlay = doc.getElementById('snomed-unlock-overlay');
  const unlockButton = doc.getElementById('btn-snomed-unlock');
  const cancelButton = doc.getElementById('btn-snomed-cancel');
  const statements = [ ...(overlay?.querySelectorAll('[data-snomed-statement]') ?? []) ];
  let providerId = null;
  let unlocked = false;
  let pending = null;
  let lastFocus = null;
  let restoreBackground = null;

  setText(doc, '[data-snomed-optin-edition]', snomed.edition);
  setText(doc, '[data-snomed-optin-release]', snomed.editionVersion ?? '');
  setHidden(doc, '[data-snomed-optin-release-info]', !snomed.editionVersion);

  function render() {
    const active = liveSearch.isActive();

    setHidden(doc, '[data-snomed-open]', !active || unlocked);
    setHidden(doc, '[data-snomed-lock]', !unlocked);
    setHidden(doc, '[data-snomed-unlocked]', !unlocked);
  }

  function updateUnlockButton() {
    if (unlockButton) {
      unlockButton.disabled = !statements.length || !statements.every(input => input.checked);
    }
  }

  function openDialog() {
    if (!overlay || !overlay.hidden || !liveSearch.isActive() || unlocked) {
      return;
    }

    for (const input of statements) {
      input.checked = false;
    }

    updateUnlockButton();
    lastFocus = doc.activeElement;
    restoreBackground = inertBackground(doc, overlay);
    overlay.hidden = false;
    overlay.classList.remove('license-overlay--hidden');
    cancelButton?.focus();
  }

  function closeDialog() {
    if (!overlay || overlay.hidden) {
      return;
    }

    overlay.classList.add('license-overlay--hidden');
    overlay.hidden = true;
    restoreBackground?.();
    restoreBackground = null;
    restoreFocus(doc, lastFocus, [
      'btn-snomed-open', 'btn-snomed-lock', 'btn-live-search-details', 'btn-license-notice'
    ]);
    lastFocus = null;
  }

  function unlock({ persist = true } = {}) {
    if (unlocked || !liveSearch.isActive()) {
      return Promise.resolve(unlocked);
    }

    if (!pending) {
      pending = (async () => {
        try {
          const provider = await createProvider(server, snomed);
          const known = new Set(registry.listProviders().map(entry => entry.id));

          // The live search may have been switched off meanwhile.
          if (!liveSearch.isActive()) {
            return false;
          }

          if (!known.has(provider.id)) {
            registry.register(provider);
            providerId = provider.id;
          }

          unlocked = true;

          if (persist) {
            storeSnomedDeclaration(storage, scope, now());
          }

          liveSearch.setSnomed(description);
          render();

          return true;
        } catch (error) {
          console.error('[demo] SNOMED CT could not be unlocked.', error);
          return false;
        } finally {
          pending = null;
        }
      })();
    }

    return pending;
  }

  function lock() {
    if (providerId) {
      registry.unregister(providerId);
    }

    providerId = null;
    unlocked = false;
    clearSnomedDeclaration(storage);

    liveSearch.setSnomed(null);
    render();
  }

  for (const input of statements) {
    input.addEventListener('change', updateUnlockButton);
  }

  for (const button of doc.querySelectorAll('[data-snomed-open]')) {
    button.addEventListener('click', openDialog);
  }

  // The clicked control hides itself: keep focus on a visible control.
  for (const button of doc.querySelectorAll('[data-snomed-lock]')) {
    button.addEventListener('click', () => {
      lock();
      refocus(doc, [ 'btn-snomed-open', 'btn-live-search-details', 'btn-license-notice' ]);
    });
  }

  unlockButton?.addEventListener('click', async () => {
    if (!statements.length || !statements.every(input => input.checked)) {
      return;
    }

    closeDialog();
    await unlock();
    refocus(doc, unlocked
      ? [ 'btn-snomed-lock', 'btn-live-search-details', 'btn-license-notice' ]
      : [ 'btn-snomed-open', 'btn-live-search-details', 'btn-license-notice' ]);
  });

  cancelButton?.addEventListener('click', closeDialog);

  overlay?.addEventListener('click', event => {
    if (event.target === overlay) {
      closeDialog();
    }
  });

  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay && !overlay.hidden) {
      event.stopPropagation();
      closeDialog();
    }
  }, { capture: true });

  liveSearch.subscribe(active => {
    if (!active) {
      // Switching off the live search also ends the SNOMED CT unlock.
      if (unlocked || providerId) {
        lock();
      } else {
        clearSnomedDeclaration(storage);
        render();
      }

      return;
    }

    render();

    if (readSnomedDeclaration(storage, scope)) {
      void unlock({ persist: false });
    }
  });

  updateUnlockButton();
  render();

  if (liveSearch.isActive() && readSnomedDeclaration(storage, scope)) {
    void unlock({ persist: false });
  }

  return {
    unlock: () => unlock(),
    lock: () => lock(),
    isUnlocked: () => unlocked
  };
}
