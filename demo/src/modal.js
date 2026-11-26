/**
 * Focus and modality helpers shared by the demo's consent dialogs (live
 * search, SNOMED CT unlock).
 */

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
 * Whether `node` is attached and neither it nor an ancestor is hidden, inert
 * or a closed overlay.
 *
 * @param {Element | null | undefined} node
 * @returns {boolean}
 */
export function isShown(node) {
  if (!node?.isConnected) {
    return false;
  }

  for (let current = node; current; current = current.parentElement) {
    if (
      current.hidden ||
      current.hasAttribute('inert') ||
      current.classList.contains('license-overlay--hidden')
    ) {
      return false;
    }
  }

  return true;
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
