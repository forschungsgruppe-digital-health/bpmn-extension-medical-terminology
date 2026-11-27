/**
 * German and English texts for the demo's banner, header, footer and dialogs.
 *
 * The page carries both languages side by side: each text sits in a pair of
 * elements, `[data-i18n][lang="de"]` followed by `[data-i18n][lang="en"]`.
 * The stylesheet shows only the language named by `data-ui-lang` on `<html>`,
 * so the controls and their ids exist once and the scripts that show, hide
 * or fill parts of the notices work the same in both languages.
 *
 * Page hooks:
 * - `[data-lang-switch="de"]` / `[data-lang-switch="en"]`: buttons that switch
 *   the language (`aria-pressed` marks the current one);
 * - `data-aria-label-de` / `data-aria-label-en` and `data-title-de` /
 *   `data-title-en`: the `aria-label` and `title` for each language.
 *
 * Notices whose wording is prescribed in one language (SNOMED CT and LOINC in
 * English, the BfArM and WIdO statements in German) carry their own `lang`
 * without `data-i18n` and show in both languages.
 *
 * The choice is not stored: every page load starts from the browser's
 * preferred languages. The inline script in index.html applies the same rule
 * before the first paint.
 */
export const UI_LANGUAGES = Object.freeze([ 'de', 'en' ]);

export const DEFAULT_UI_LANGUAGE = 'en';

const LOCALIZED_ATTRIBUTES = Object.freeze([ 'aria-label', 'title' ]);

/**
 * Pick the UI language from the browser's preferred languages: the first of
 * them that is German or English wins (`de-CH` counts as German), otherwise
 * English.
 *
 * @param {readonly string[] | null | undefined} languages - For example
 *   `navigator.languages`.
 * @returns {'de' | 'en'}
 */
export function detectUiLanguage(languages) {
  for (const tag of languages ?? []) {
    const primary = String(tag ?? '').trim().toLowerCase().split(/[-_]/)[0];

    if (UI_LANGUAGES.includes(primary)) {
      return primary;
    }
  }

  return DEFAULT_UI_LANGUAGE;
}

function resolveBrowserLanguages() {
  try {
    const { languages, language } = globalThis.navigator ?? {};

    return languages?.length ? languages : [ language ];
  } catch {
    return [];
  }
}

/**
 * Show the page in `language`: set `lang` and `data-ui-lang` on `<html>`,
 * the localized `aria-label` and `title` attributes and the pressed state of
 * the language switches.
 *
 * @param {Document} doc
 * @param {string} language - `de` or `en`; anything else falls back to English.
 * @returns {'de' | 'en'} The language applied.
 */
export function applyUiLanguage(doc, language) {
  const applied = UI_LANGUAGES.includes(language) ? language : DEFAULT_UI_LANGUAGE;
  const root = doc.documentElement;

  root.setAttribute('lang', applied);
  root.setAttribute('data-ui-lang', applied);

  for (const attribute of LOCALIZED_ATTRIBUTES) {
    const source = `data-${attribute}-${applied}`;

    for (const node of doc.querySelectorAll(`[${source}]`)) {
      node.setAttribute(attribute, node.getAttribute(source));
    }
  }

  for (const button of doc.querySelectorAll('[data-lang-switch]')) {
    button.setAttribute('aria-pressed', String(button.getAttribute('data-lang-switch') === applied));
  }

  return applied;
}

/**
 * Apply the browser's preferred language and wire the DE | EN switches.
 *
 * @param {{
 *   doc?: Document,
 *   languages?: readonly string[],
 *   onChange?: (language: 'de' | 'en') => void
 * }} [options]
 * @returns {{ getLanguage: () => 'de' | 'en', setLanguage: (language: string) => 'de' | 'en' }}
 */
export function setupLanguageSwitch({
  doc = document,
  languages = resolveBrowserLanguages(),
  onChange
} = {}) {
  let current = null;

  function setLanguage(language) {
    const applied = applyUiLanguage(doc, language);

    if (applied !== current) {
      current = applied;
      onChange?.(applied);
    }

    return applied;
  }

  for (const button of doc.querySelectorAll('[data-lang-switch]')) {
    button.addEventListener('click', () => {
      setLanguage(button.getAttribute('data-lang-switch'));
    });
  }

  setLanguage(detectUiLanguage(languages));

  return {
    getLanguage: () => current,
    setLanguage
  };
}
