import { UI_LANGUAGES } from './i18n.js';

/**
 * Focus and modality helpers shared by the demo's consent dialogs (live
 * search, SNOMED CT unlock).
 */

// Controls that can hold keyboard focus inside a language variant.
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

/**
 * The language whose `[data-i18n]` variants the stylesheet shows, or null
 * while `<html>` names none (then it hides no variant).
 *
 * @param {Document | null | undefined} doc
 * @returns {string | null}
 */
function shownLanguage(doc) {
  const language = doc?.documentElement?.getAttribute('data-ui-lang');

  return UI_LANGUAGES.includes(language) ? language : null;
}

/**
 * Make every other top-level element of the page inert while `overlay` is
 * open, so keyboard focus and pointer input stay inside the dialog. This also
 * covers a licence dialog that is open underneath.
 *
 * @param {Document} doc
 * @param {Element} overlay
 * @returns {() => void} Restores the elements this call made inert.
 */
export function inertBackground(doc, overlay) {
  const nodes = [ ...(doc.body?.children ?? []) ]
    .filter(node => node !== overlay && !node.hasAttribute('inert'));

  for (const node of nodes) {
    node.setAttribute('inert', '');
  }

  return () => {
    for (const node of nodes) {
      node.removeAttribute('inert');
    }
  };
}

/**
 * Whether `node` is attached and neither it nor an ancestor is hidden, inert,
 * a closed overlay or a language variant the stylesheet hides (a
 * `[data-i18n]` element whose `lang` differs from `<html data-ui-lang>`).
 *
 * @param {Element | null | undefined} node
 * @returns {boolean}
 */
export function isShown(node) {
  if (!node?.isConnected) {
    return false;
  }

  const language = shownLanguage(node.ownerDocument);

  for (let current = node; current; current = current.parentElement) {
    if (
      current.hidden ||
      current.hasAttribute('inert') ||
      current.classList.contains('license-overlay--hidden') ||
      (language && current.hasAttribute('data-i18n') && current.getAttribute('lang') !== language)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * The control at the same position in the other language's variant: the
 * page pairs each `[data-i18n][lang="de"]` element with the
 * `[data-i18n][lang="en"]` element that follows it, both with the same
 * controls in the same order (src/i18n.js).
 *
 * @param {Element | null | undefined} node
 * @returns {Element | null}
 */
export function findLanguageCounterpart(node) {
  const variant = node?.closest?.('[data-i18n]');

  if (!variant) {
    return null;
  }

  const sibling = variant.getAttribute('lang') === 'de'
    ? variant.nextElementSibling
    : variant.previousElementSibling;

  if (!sibling?.matches('[data-i18n]') || sibling.getAttribute('lang') === variant.getAttribute('lang')) {
    return null;
  }

  const index = [ ...variant.querySelectorAll(FOCUSABLE) ].indexOf(node);

  return index === -1 ? null : sibling.querySelectorAll(FOCUSABLE)[index] ?? null;
}

/**
 * Give focus back to `node`, the control that opened a dialog. When the
 * visitor switched the language meanwhile, `node` sits in the variant that
 * is hidden now, so its counterpart in the shown variant gets focus instead.
 * When neither is shown, `refocus` picks a visible control.
 *
 * @param {Document} doc
 * @param {Element | null | undefined} node
 * @param {string[]} fallbackIds
 */
export function restoreFocus(doc, node, fallbackIds) {
  const target = [ node, findLanguageCounterpart(node) ]
    .find(candidate => candidate && candidate !== doc.body && isShown(candidate));

  target?.focus?.();
  refocus(doc, fallbackIds);
}

/**
 * After a user action hid the focused control, move focus to a visible one:
 * the licence dialog's accept button while that dialog is open, otherwise the
 * first shown element of `fallbackIds`. Leaves focus alone when it is still on
 * a shown control.
 *
 * @param {Document} doc
 * @param {string[]} fallbackIds
 */
export function refocus(doc, fallbackIds) {
  const active = doc.activeElement;

  if (active && active !== doc.body && isShown(active)) {
    return;
  }

  const licence = doc.getElementById('license-overlay');
  const ids = isShown(licence) ? [ 'btn-license-accept' ] : fallbackIds;
  const target = ids
    .map(id => doc.getElementById(id))
    .find(isShown);

  target?.focus();
}
