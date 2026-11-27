/**
 * Shared helpers for the demo page tests. jsdom does not load the demo
 * stylesheet, which hides the variants of the language not shown
 * (`[data-i18n]` elements whose `lang` differs from `<html data-ui-lang>`),
 * so the tests drop those variants themselves.
 */

/**
 * Text of `node` as a visitor reading `language` sees it: elements with the
 * `hidden` attribute and the other language's `[data-i18n]` variants are
 * left out, and whitespace is collapsed.
 *
 * @param {Element} node
 * @param {'de' | 'en'} [language]
 * @returns {string}
 */
export function visibleText(node, language = 'en') {
  const clone = node.cloneNode(true);

  for (const hidden of clone.querySelectorAll(`[hidden], [data-i18n]:not([lang="${language}"])`)) {
    hidden.remove();
  }

  return clone.textContent.replace(/\s+/g, ' ').trim();
}
