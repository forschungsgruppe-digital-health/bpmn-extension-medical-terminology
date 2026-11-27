// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyUiLanguage,
  DEFAULT_UI_LANGUAGE,
  detectUiLanguage,
  setupLanguageSwitch
} from '../../../demo/src/i18n.js';
import { setupLicenseNotice } from '../../../demo/src/license-notice.js';
import {
  ATC_GM_NOTICE,
  ICD_10_GM_NOTICE,
  LOINC_NOTICE,
  OPS_NOTICE,
  SNOMED_CT_NOTICE
} from '../../../demo/src/terminology-notices.js';
import { visibleText } from './visible-text.js';

const DEMO_HTML = readFileSync(resolve(import.meta.dirname, '../../../demo/index.html'), 'utf8');
const DIALOG_IDS = [ 'license-overlay', 'live-search-overlay', 'snomed-unlock-overlay' ];

// Text that reads the same in both languages: names, symbols, code.
const LANGUAGE_NEUTRAL = new Set([
  '⚕',
  'Medical Terminology BPMN',
  '↓ XML',
  '{ }',
  '×',
  '·',
  '|',
  'DE',
  'EN',
  'SNOMED CT…',
  'SNOMED CT®:',
  'LOINC®:',
  'ICD-10-GM:',
  'OPS:',
  'ATC (ATC-GM):',
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology'
]);

const $ = id => document.getElementById(id);
const all = (selector, root = document) => [ ...root.querySelectorAll(selector) ];
const banner = () => document.querySelector('aside.demo-notice');
const collapse = text => text.replace(/\s+/g, ' ').trim();

function loadDemoDocument() {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('data-ui-lang');
  document.documentElement.innerHTML = DEMO_HTML;
}

/** The parts of the page whose texts the demo translates. */
function translatedRoots() {
  return [
    document.querySelector('header.app-header'),
    banner(),
    $('xml-overlay'),
    ...DIALOG_IDS.map($),
    document.querySelector('footer.app-footer')
  ];
}

/** Text nodes outside a language variant and outside a text with its own `lang`. */
function untranslatedTexts(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = collapse(node.textContent);
    const owner = node.parentElement.closest('[data-i18n], [lang]');

    if (text && (!owner || owner === document.documentElement) && !LANGUAGE_NEUTRAL.has(text)) {
      found.push(text);
    }
  }

  return found;
}

/** The page hooks inside a language variant, so both variants can be compared. */
function hooksOf(variant) {
  return all('*', variant)
    .flatMap(node => [
      node.localName,
      ...[ ...node.attributes ]
        .filter(attribute => attribute.name.startsWith('data-') || attribute.name === 'href')
        .map(attribute => `${attribute.name}=${attribute.value}`)
    ])
    .sort();
}

function runBootScript({ languages, language }) {
  const source = /<script>([\s\S]*?)<\/script>/.exec(DEMO_HTML)[1];
  const attributes = {};
  const fakeDocument = {
    documentElement: {
      setAttribute: (name, value) => {
        attributes[name] = value;
      }
    }
  };

  new Function('navigator', 'document', source)({ languages, language }, fakeDocument);

  return attributes;
}

describe('detectUiLanguage', () => {
  it.each([
    [ [ 'de-DE', 'en' ], 'de' ],
    [ [ 'de' ], 'de' ],
    [ [ 'DE-ch' ], 'de' ],
    [ [ 'de_AT' ], 'de' ],
    [ [ 'fr-FR', 'de-DE', 'en' ], 'de' ],
    [ [ 'en-US', 'de-DE' ], 'en' ],
    [ [ 'fr-FR', 'en-GB', 'de' ], 'en' ],
    [ [ 'fr-FR', 'it' ], 'en' ],
    [ [ 'dE', 'en' ], 'de' ],
    [ [ 'deu' ], 'en' ],
    [ [], 'en' ],
    [ [ '', null, undefined ], 'en' ],
    [ undefined, 'en' ]
  ])('picks %j → %s', (languages, expected) => {
    expect(detectUiLanguage(languages)).toBe(expected);
  });

  it('defaults to English', () => {
    expect(DEFAULT_UI_LANGUAGE).toBe('en');
  });
});

describe('inline language script in index.html', () => {
  it.each([
    [ [ 'de-DE', 'en' ], 'en-US' ],
    [ [ 'en-GB', 'de' ], 'de-DE' ],
    [ [ 'fr-FR', 'de-CH' ], 'fr-FR' ],
    [ [ 'fr-FR' ], 'de-DE' ],
    [ [], 'de-DE' ],
    [ [], 'fr' ],
    [ undefined, 'de' ],
    [ undefined, undefined ]
  ])('applies the same rule as detectUiLanguage for languages %j, language %j', (languages, language) => {
    const expected = detectUiLanguage(languages?.length ? languages : [ language ]);

    expect(runBootScript({ languages, language })).toEqual({ lang: expected, 'data-ui-lang': expected });
  });

  it('starts in English in the static markup', () => {
    expect(/<html lang="en" data-ui-lang="en">/.test(DEMO_HTML)).toBe(true);
  });
});

describe('bilingual demo page', () => {
  beforeEach(() => {
    loadDemoDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pairs every German variant with an English variant that carries the same hooks and links', () => {
    const variants = all('[data-i18n]');

    expect(variants.length).toBeGreaterThan(100);
    expect(variants.every(node => [ 'de', 'en' ].includes(node.getAttribute('lang')))).toBe(true);

    for (const german of all('[data-i18n][lang="de"]')) {
      const english = german.nextElementSibling;

      expect(english?.matches('[data-i18n][lang="en"]'), german.outerHTML.slice(0, 120)).toBe(true);
      expect(hooksOf(english), collapse(german.textContent).slice(0, 80)).toEqual(hooksOf(german));
      expect(collapse(german.textContent)).not.toBe(collapse(english.textContent));
    }

    for (const english of all('[data-i18n][lang="en"]')) {
      expect(english.previousElementSibling?.matches('[data-i18n][lang="de"]')).toBe(true);
    }
  });

  it('keeps every control and id outside the language variants', () => {
    expect(all('[data-i18n] [id], [data-i18n][id]')).toEqual([]);
    expect(all('[data-i18n] [data-lang-switch]')).toEqual([]);
    expect(all('[data-i18n] input, [data-i18n] select')).toEqual([]);
  });

  it('leaves no text of the header, banner, dialogs or footer untranslated', () => {
    for (const root of translatedRoots()) {
      expect(untranslatedTexts(root), root.id || root.className).toEqual([]);
    }
  });

  it('inherits the language from <html> in the banner and the dialogs', () => {
    for (const container of [ banner(), ...DIALOG_IDS.map($) ]) {
      expect(container.hasAttribute('lang')).toBe(false);
    }
  });

  it('has a DE | EN switch in the banner and in each dialog', () => {
    for (const container of [ banner(), ...DIALOG_IDS.map($) ]) {
      const buttons = all('[data-lang-switch]', container);

      expect(buttons.map(button => button.getAttribute('data-lang-switch'))).toEqual([ 'de', 'en' ]);
      expect(buttons.map(button => button.textContent.trim())).toEqual([ 'DE', 'EN' ]);
      expect(buttons.map(button => button.getAttribute('lang'))).toEqual([ 'de', 'en' ]);
      expect(buttons.every(button => button.type === 'button' && button.hasAttribute('aria-pressed'))).toBe(true);
      expect(buttons.every(button => !button.closest('[data-i18n], [hidden]:not(.license-overlay)'))).toBe(true);
    }
  });

  it('starts in German when the browser prefers German', () => {
    const onChange = vi.fn();

    const controller = setupLanguageSwitch({ doc: document, languages: [ 'de-DE', 'en' ], onChange });

    expect(controller.getLanguage()).toBe('de');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('de');
    expect(document.documentElement.getAttribute('lang')).toBe('de');
    expect(document.documentElement.getAttribute('data-ui-lang')).toBe('de');
    expect(all('[data-lang-switch="de"]').every(button => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(all('[data-lang-switch="en"]').every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(banner().getAttribute('aria-label')).toBe('Lizenz- und Evaluationshinweis');
    expect($('btn-license-close').getAttribute('aria-label')).toBe('Hinweis schließen');
    expect($('btn-xml-close').getAttribute('aria-label')).toBe('XML-Ansicht schließen');
    expect($('sample-select').getAttribute('aria-label')).toBe('Beispiel wählen');
    expect($('sample-select').getAttribute('title')).toBe('Beispiel wählen');
    expect($('btn-download').getAttribute('title')).toBe('BPMN XML herunterladen');
  });

  it('starts in English otherwise and reads navigator.languages by default', () => {
    vi.spyOn(Object.getPrototypeOf(navigator), 'languages', 'get').mockReturnValue([ 'fr-FR', 'en-GB' ]);

    const controller = setupLanguageSwitch({ doc: document });

    expect(controller.getLanguage()).toBe('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(banner().getAttribute('aria-label')).toBe('Licence and evaluation notice');
    expect($('sample-select').getAttribute('title')).toBe('Choose an example');
  });

  it('switches every part of the page from any switch, without storing the choice', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const onChange = vi.fn();

    setupLanguageSwitch({ doc: document, languages: [ 'en-US' ], onChange });

    $('live-search-overlay').querySelector('[data-lang-switch="de"]').click();

    expect(document.documentElement.getAttribute('lang')).toBe('de');
    expect(document.documentElement.getAttribute('data-ui-lang')).toBe('de');
    expect(all('[data-lang-switch="de"]').every(button => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect($('btn-xml-close').getAttribute('aria-label')).toBe('XML-Ansicht schließen');
    expect(onChange).toHaveBeenLastCalledWith('de');

    // The same language again changes nothing.
    banner().querySelector('[data-lang-switch="de"]').click();
    expect(onChange).toHaveBeenCalledTimes(2);

    $('snomed-unlock-overlay').querySelector('[data-lang-switch="en"]').click();

    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(all('[data-lang-switch="en"]').every(button => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect($('btn-xml-close').getAttribute('aria-label')).toBe('Close XML view');
    expect(onChange).toHaveBeenCalledTimes(3);

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('keeps the licence dialog open and its buttons in place when the language changes', () => {
    setupLicenseNotice({ doc: document, storage: window.sessionStorage, navigate: vi.fn() });
    setupLanguageSwitch({ doc: document, languages: [ 'de' ] });

    const switchEn = $('license-overlay').querySelector('[data-lang-switch="en"]');
    switchEn.focus();
    switchEn.click();

    expect($('license-overlay').classList.contains('license-overlay--hidden')).toBe(false);
    expect(document.activeElement).toBe(switchEn);
    expect(visibleText($('btn-license-accept'), 'en')).toBe('Accept');
    expect(visibleText($('btn-license-reject'), 'en')).toBe('Reject');
  });

  it('falls back to English for an unknown language', () => {
    expect(applyUiLanguage(document, 'fr')).toBe('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  describe('texts', () => {
    it('shows the same dialog headings in German and English', () => {
      const headings = language => DIALOG_IDS.map(id => visibleText($(id).querySelector('h2'), language));

      expect(headings('de')).toEqual([
        'Lizenz- und Nutzungshinweis für medizinische Terminologien',
        'Live-Terminologiesuche über',
        'SNOMED CT® freischalten (Deutsche National Edition)'
      ]);
      expect(headings('en')).toEqual([
        'Licence & usage notice for medical terminologies',
        'Live terminology search via',
        'Unlock SNOMED CT® (German National Edition)'
      ]);
    });

    it('keeps the prescribed English notices English and the BfArM and WIdO statements German in both languages', () => {
      const licence = $('license-overlay');
      const item = name => licence.querySelector(`[data-notice="${name}"]`);

      for (const language of [ 'de', 'en' ]) {
        expect(visibleText(item('snomed-ct'), language)).toContain(SNOMED_CT_NOTICE);
        expect(visibleText(item('loinc'), language)).toContain(LOINC_NOTICE);
        expect(visibleText(item('icd-10-gm'), language)).toContain(ICD_10_GM_NOTICE.join(' '));
        expect(visibleText(item('ops'), language)).toContain(OPS_NOTICE.join(' '));
        expect(visibleText(item('atc-gm'), language)).toContain(ATC_GM_NOTICE);
        expect(visibleText($('snomed-unlock-overlay').querySelector('[data-notice="snomed-ct"]'), language))
          .toContain(SNOMED_CT_NOTICE);
      }

      expect(item('snomed-ct').querySelector('.license-dialog__notice').getAttribute('lang')).toBe('en');
      expect(item('loinc').querySelector('.license-dialog__notice').getAttribute('lang')).toBe('en');
      expect(item('icd-10-gm').querySelector('.license-dialog__notice').getAttribute('lang')).toBe('de');
      expect(item('ops').querySelector('.license-dialog__notice').getAttribute('lang')).toBe('de');
      expect(item('atc-gm').querySelector('.license-dialog__notice').getAttribute('lang')).toBe('de');
      expect(DEMO_HTML).not.toContain('used by permission of SNOMED International');
      expect(DEMO_HTML).not.toContain('© WHO, BfArM');
      expect(DEMO_HTML).not.toContain('© BfArM');
    });

    it('names the KDL licence and the excerpts from DICOM, ISO 21089 and ASTM E1762', () => {
      const licence = $('license-overlay');

      for (const language of [ 'de', 'en' ]) {
        const kdl = visibleText(licence.querySelector('[data-notice="kdl"]'), language);
        const bundled = visibleText(licence.querySelector('[data-notice="bundled"]'), language);

        expect(kdl).toContain('GPL-3.0-or-later');
        expect(kdl).toContain('Copyright 2013–2018 DMI GmbH & Co. KG');
        expect(kdl).toContain('https://packages.simplifier.net/dvmd.kdl.r4/2026.0.0');
        expect(bundled).toContain('DICOM PS3.16');
        expect(bundled).toContain('ISO TS 21089-2017');
        expect(bundled).toContain('ASTM E1762-95');
        expect(bundled).toContain('CC BY 4.0');
        expect(bundled).not.toMatch(/dvmd\.kdl\.r4 \(DVMD e\.V\.\)\. The last two declare no licence/);
      }

      expect(visibleText(licence.querySelector('[data-notice="kdl"]'), 'de')).toContain(
        '„Die KDL ist frei verfügbar. Sie können das CodeSystem unter den Bedingungen der GNU General Public ' +
        'License, wie von der Free Software Foundation, Version 3 der Lizenz oder (nach Ihrer Wahl) jeder ' +
        'neueren veröffentlichten Version, weiter verteilen und/oder modifizieren. Die KDL wird ohne jede ' +
        'Gewähr bereitgestellt. Für weitere Einzelheiten verweisen wir auf die GNU General Public License ' +
        'unter https://www.gnu.org/licenses/“'
      );
    });

    it('gives the Art. 13 information of the live-search consent in German as in English', () => {
      const consent = $('live-search-overlay');

      // As setupLiveSearch does for the server it offers.
      for (const node of all('[data-live-search-operator="tx.fhir.de"]', consent)) {
        node.hidden = false;
      }

      const de = visibleText(consent, 'de');
      const en = visibleText(consent, 'en');

      for (const [ german, english ] of [
        [ 'Art. 6 Abs. 1 lit. a DSGVO', 'Art. 6(1)(a) GDPR' ],
        [ 'Art. 21 DSGVO', 'Art. 21 GDPR' ],
        [ 'HL7 Deutschland e.V., Luisenstraße 65, 10117 Berlin, Deutschland', 'HL7 Deutschland e.V., Luisenstraße 65, 10117 Berlin, Germany' ],
        [ 'als eigener Verantwortlicher', 'as its own controller' ],
        [ 'Technische Universität Dresden, Forschungsgruppe Digital Health, 01062 Dresden', 'Technische Universität Dresden, Forschungsgruppe Digital Health, 01062 Dresden' ],
        [ 'mit Angaben zum Datenschutzbeauftragten', 'including the data protection officer' ],
        [ 'Zweck: Anzeige von Ergebnissen der Live-Suche in dieser Demo.', 'Purpose: showing live search results in this demo.' ],
        [ 'Die Einwilligung ist freiwillig', 'Giving it is voluntary' ],
        [ 'nur im Sitzungsspeicher (Session Storage) dieses Browser-Tabs gespeichert', 'kept only in this browser tab\'s session storage' ],
        [ 'die Rechtmäßigkeit bereits gesendeter Suchen bleibt davon unberührt', 'this does not affect the lawfulness of searches already sent' ],
        [ 'Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit', 'right of access, rectification, erasure, restriction of processing and data portability' ],
        [ 'Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde', 'right to lodge a complaint with a data protection supervisory authority' ],
        [ 'Die TU Dresden erhält und speichert Ihre Suchbegriffe nicht.', 'TU Dresden does not receive or store your search terms.' ],
        [ 'Ihre IP-Adresse, den Zeitpunkt, Angaben zum Browser (User-Agent, bevorzugte Sprachen) und die Adresse dieser Demo', 'your IP address, the time, browser details (user agent, preferred languages) and the address of this demo' ]
      ]) {
        expect(de).toContain(german);
        expect(en).toContain(english);
      }

      const links = language => all(`[data-i18n][lang="${language}"] a`, consent).map(link => link.href);
      expect(links('de')).toEqual(links('en'));
      expect(links('de')).toEqual(expect.arrayContaining([
        'https://hl7.de/datenschutz/',
        'https://tx.fhir.de/de/terms',
        'https://tx.fhir.de/de/licenses',
        'https://tu-dresden.de/impressum'
      ]));
    });

    it('translates the banner and the SNOMED CT self-declaration', () => {
      expect(visibleText(banner(), 'de')).toContain(
        'Nur zur Vorschau und Evaluation: Diese Demo kontaktiert keinen Terminologieserver.'
      );
      expect(visibleText(banner(), 'de')).toContain('Geben Sie keine Patientendaten ein.');
      expect(visibleText(banner(), 'en')).toContain('Preview & evaluation only: this demo contacts no terminology server.');

      const statements = language => all('.license-dialog__checks label', $('snomed-unlock-overlay'))
        .map(label => visibleText(label, language));

      expect(statements('de')).toEqual([
        'Ich besitze eine SNOMED-CT-Affiliate-Lizenz, die diese Edition abdeckt, oder ich nutze SNOMED CT als ' +
          'Endnutzer im Rahmen einer solchen Lizenz.',
        'Ich nutze SNOMED CT in dieser Demo nur in Deutschland.',
        'Ich nutze es nur zur Evaluation dieser Erweiterung, nicht für die Patientenversorgung, und ich gebe ' +
          'keine Patientendaten ein.'
      ]);
      expect(statements('en')).toEqual([
        'I hold a SNOMED CT Affiliate Licence that covers this edition, or I use SNOMED CT as an end user under ' +
          'such a licence.',
        'I use SNOMED CT in this demo only in Germany.',
        'I use it only to evaluate this extension, not for patient care, and I enter no patient data.'
      ]);
    });
  });
});
