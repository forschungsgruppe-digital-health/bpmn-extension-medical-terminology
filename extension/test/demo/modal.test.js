// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyUiLanguage } from '../../../demo/src/i18n.js';
import { findLanguageCounterpart, isShown, restoreFocus } from '../../../demo/src/modal.js';

const DEMO_HTML = readFileSync(resolve(import.meta.dirname, '../../../demo/index.html'), 'utf8');
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

const $ = id => document.getElementById(id);
const all = (selector, root = document) => [ ...root.querySelectorAll(selector) ];

function hooksOf(node) {
  return [
    node.localName,
    ...[ ...node.attributes ]
      .filter(attribute => attribute.name.startsWith('data-') || attribute.name === 'href')
      .map(attribute => `${attribute.name}=${attribute.value}`)
      .sort()
  ];
}

function variantControls(language) {
  return all(`[data-i18n][lang="${language}"]`)
    .flatMap(variant => all(FOCUSABLE, variant))
    .filter((node, index, nodes) => nodes.indexOf(node) === index);
}

describe('demo dialog focus helpers with the bilingual page', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('data-ui-lang');
    document.documentElement.innerHTML = DEMO_HTML;

    // As when the live search is offered (src/live-search.js).
    for (const node of all('[data-live-search-available]')) {
      node.hidden = false;
    }
  });

  it('treats the language variant the stylesheet hides as not shown', () => {
    const german = document.querySelector('#license-overlay [data-i18n][lang="de"] [data-live-search-open]');
    const english = document.querySelector('#license-overlay [data-i18n][lang="en"] [data-live-search-open]');

    // Without data-ui-lang the stylesheet hides no variant.
    expect(isShown(german)).toBe(true);
    expect(isShown(english)).toBe(true);

    applyUiLanguage(document, 'de');
    expect(isShown(german)).toBe(true);
    expect(isShown(english)).toBe(false);

    applyUiLanguage(document, 'en');
    expect(isShown(german)).toBe(false);
    expect(isShown(english)).toBe(true);

    // Controls outside the variants do not depend on the language.
    expect(isShown($('btn-license-accept'))).toBe(true);
    expect(isShown(null)).toBe(false);
  });

  it('maps every control in a language variant to the same control in the other language', () => {
    const german = variantControls('de');
    const english = variantControls('en');

    expect(german.length).toBeGreaterThanOrEqual(8);
    expect(english).toHaveLength(german.length);

    for (const [ index, node ] of german.entries()) {
      const counterpart = findLanguageCounterpart(node);

      expect(counterpart, node.outerHTML.slice(0, 120)).toBe(english[index]);
      expect(hooksOf(counterpart)).toEqual(hooksOf(node));
      expect(findLanguageCounterpart(counterpart)).toBe(node);
    }
  });

  it('finds no counterpart for a control outside the language variants', () => {
    expect(findLanguageCounterpart($('btn-license-accept'))).toBeNull();
    expect(findLanguageCounterpart($('btn-live-search-open'))).toBeNull();
    expect(findLanguageCounterpart(null)).toBeNull();
  });

  it('restores focus to the opener, its counterpart in the shown language, or a fallback', () => {
    const licence = $('license-overlay');
    const german = document.querySelector('#license-overlay [data-i18n][lang="de"] [data-live-search-open]');
    const english = findLanguageCounterpart(german);

    licence.classList.remove('license-overlay--hidden');
    applyUiLanguage(document, 'de');

    restoreFocus(document, german, [ 'btn-license-notice' ]);
    expect(document.activeElement).toBe(german);

    applyUiLanguage(document, 'en');
    restoreFocus(document, german, [ 'btn-license-notice' ]);
    expect(document.activeElement).toBe(english);

    // Neither variant shown: the open licence dialog keeps focus.
    english.closest('[data-server-mode]').hidden = true;
    restoreFocus(document, german, [ 'btn-license-notice' ]);
    expect(document.activeElement).toBe($('btn-license-accept'));

    // Without the licence dialog the first shown fallback gets focus.
    licence.classList.add('license-overlay--hidden');
    restoreFocus(document, null, [ 'btn-live-search-details', 'btn-live-search-open', 'btn-license-notice' ]);
    expect(document.activeElement).toBe($('btn-live-search-open'));
  });
});
