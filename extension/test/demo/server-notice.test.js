// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyServerNotice } from '../../../demo/src/server-notice.js';
import { describeDemoTerminologyServer } from '../../../demo/src/terminology-config.js';
import { visibleText } from './visible-text.js';

const DEMO_HTML_PATH = resolve(import.meta.dirname, '../../../demo/index.html');
const DEMO_HTML = readFileSync(DEMO_HTML_PATH, 'utf8');

function loadDemoDocument() {
  document.documentElement.innerHTML = DEMO_HTML;
}

function all(selector) {
  return [ ...document.querySelectorAll(selector) ];
}

function isShown(node) {
  for (let current = node; current; current = current.parentElement) {
    if (current.hidden) {
      return false;
    }
  }

  return true;
}

function privacySection() {
  return document.querySelector('[data-section="privacy"] [data-server-mode="configured"]');
}

function hostingNotice() {
  return document.querySelector('[data-section="privacy"] [data-demo-hosting]');
}

function hostsIn(language) {
  return all(`[data-i18n][lang="${language}"] [data-demo-server-host]`);
}

describe('demo terminology server notice', () => {
  beforeEach(() => {
    loadDemoDocument();
  });

  it('marks both variants in the banner, section 1 and the privacy section', () => {
    const banner = document.querySelector('aside.demo-notice');
    const sections = all('.license-dialog__section');
    const sectionOne = sections[0];
    const privacy = document.querySelector('[data-section="privacy"]');

    for (const container of [ banner, sectionOne, privacy ]) {
      expect(container.querySelectorAll('[data-server-mode="none"]').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('[data-server-mode="configured"]').length).toBeGreaterThan(0);
    }

    // The page defaults to the serverless variant before any script runs.
    expect(all('[data-server-mode="none"]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-server-mode="configured"]').every(node => node.hidden)).toBe(true);
  });

  it('keeps the serverless variant when no server is configured', () => {
    applyServerNotice(document, describeDemoTerminologyServer({}));

    expect(all('[data-server-mode="none"]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-server-mode="configured"]').every(node => node.hidden)).toBe(true);
    expect(visibleText(document.querySelector('aside.demo-notice'))).toContain('this demo contacts no terminology server');
    expect(visibleText(document.querySelector('.license-dialog__section h3'))).toBe('1. No terminology server, no licence granted');
  });

  it('shows the configured variant with the FHIR host and the tx.fhir.de operator block', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir'
    }));

    expect(all('[data-server-mode="none"]').every(node => node.hidden)).toBe(true);
    expect(all('[data-server-mode="configured"]').every(node => !node.hidden)).toBe(true);
    expect(visibleText(document.querySelector('.license-dialog__section h3'))).toBe('1. Terminology server and licences');

    const hosts = all('[data-demo-server-host]');
    expect(hosts.length).toBeGreaterThanOrEqual(3);
    expect(hosts.every(node => node.textContent === 'tx.fhir.de')).toBe(true);

    const banner = visibleText(document.querySelector('aside.demo-notice'));
    expect(banner).toContain('sends your search terms (and, as with any web request, your IP address) to tx.fhir.de.');
    expect(banner).not.toContain('contacts no terminology server');

    const fhir = document.querySelector('[data-demo-fhir]');
    expect(isShown(fhir)).toBe(true);
    expect(visibleText(fhir)).toBe('LOINC®, ICD-10-GM, OPS, and ATC (ATC-GM) are searched on tx.fhir.de.');

    expect(isShown(document.querySelector('[data-demo-snomed]'))).toBe(false);

    const operators = all('[data-demo-operator="tx.fhir.de"]');
    expect(operators.length).toBeGreaterThan(0);
    expect(operators.every(isShown)).toBe(true);

    const operatorLinks = operators.flatMap(node => [ ...node.querySelectorAll('a') ].map(link => link.href));
    expect(operatorLinks).toEqual(expect.arrayContaining([
      'https://tx.fhir.de/de/terms',
      'https://tx.fhir.de/de/licenses',
      'https://hl7.de/datenschutz/'
    ]));
    expect(visibleText(operators[0])).toContain('Operated by HL7 Deutschland e.V. for development and non-commercial research');
  });

  it('hides the tx.fhir.de operator block for other hosts', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir'
    }));

    expect(all('[data-demo-server-host]').every(node => node.textContent === 'fhir.example.test')).toBe(true);
    expect(all('[data-demo-operator]').some(isShown)).toBe(false);
  });

  it('shows the SNOMED CT element with the edition only when SNOMED CT is configured', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOMED_EDITION: '11000274103',
      VITE_SNOMED_EDITION_VERSION: '20260815'
    }));

    const snomed = document.querySelector('[data-demo-snomed]');
    expect(isShown(snomed)).toBe(true);
    expect(visibleText(snomed)).toContain('SNOMED CT® is searched on tx.fhir.de (edition 11000274103, release 20260815).');
    expect(visibleText(snomed)).not.toContain('Snowstorm');
    expect(all('[data-demo-server-host]').every(node => node.textContent === 'tx.fhir.de')).toBe(true);

    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOMED_EDITION: '11000274103'
    }));

    expect(visibleText(snomed)).toContain('SNOMED CT® is searched on tx.fhir.de (edition 11000274103).');
    expect(visibleText(snomed)).not.toContain('release');
  });

  it('describes Snowstorm with its own host next to the FHIR host', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    }));

    const snomed = document.querySelector('[data-demo-snomed]');
    expect(isShown(snomed)).toBe(true);
    expect(visibleText(snomed)).toContain('SNOMED CT® is searched on snowstorm.example.test via Snowstorm.');
    expect(visibleText(snomed)).not.toContain('edition 1');
    expect(hostsIn('en').every(
      node => node.textContent === 'tx.fhir.de and snowstorm.example.test'
    )).toBe(true);
    expect(all('[data-demo-operator="tx.fhir.de"]').every(isShown)).toBe(true);

    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    }));

    expect(isShown(document.querySelector('[data-demo-fhir]'))).toBe(false);
    expect(isShown(snomed)).toBe(true);
    expect(all('[data-demo-operator]').some(isShown)).toBe(false);
    expect(all('[data-server-mode="configured"]').every(node => !node.hidden)).toBe(true);
  });

  it('joins several hosts with "und" in the German text and "and" in the English text', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    }));

    expect(hostsIn('de').length).toBeGreaterThanOrEqual(3);
    expect(hostsIn('en').length).toBe(hostsIn('de').length);
    expect(all('[data-demo-server-host]').length).toBe(hostsIn('de').length + hostsIn('en').length);
    expect(hostsIn('de').every(node => node.textContent === 'tx.fhir.de und snowstorm.example.test')).toBe(true);
    expect(hostsIn('en').every(node => node.textContent === 'tx.fhir.de and snowstorm.example.test')).toBe(true);

    const banner = document.querySelector('aside.demo-notice');
    expect(visibleText(banner, 'de')).toContain('an tx.fhir.de und snowstorm.example.test.');
    expect(visibleText(banner, 'en')).toContain('to tx.fhir.de and snowstorm.example.test.');
  });

  describe('GitHub Pages hosting notice', () => {
    const OPT_IN = { fhirBaseUrl: 'https://tx.fhir.de/fhir', fhirHost: 'tx.fhir.de', snomed: null, optIn: true };

    it('is shown, in both languages, without a server', () => {
      applyServerNotice(document, null);

      expect(isShown(hostingNotice())).toBe(true);
      expect(visibleText(hostingNotice())).toContain('The page is hosted on GitHub Pages');
      expect(visibleText(hostingNotice(), 'de')).toContain('Die Seite wird auf GitHub Pages bereitgestellt');
      expect([ ...hostingNotice().querySelectorAll('a') ].map(link => link.href)).toContain(
        'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'
      );
    });

    it('stays shown while the live search is on and after it is switched off again', () => {
      applyServerNotice(document, OPT_IN);

      expect(all('[data-section="privacy"] [data-server-mode="none"]').every(node => node.hidden)).toBe(true);
      expect(isShown(hostingNotice())).toBe(true);
      expect(visibleText(hostingNotice())).toContain('GitHub processes technical data such as your IP address');

      applyServerNotice(document, { ...OPT_IN, snomed: { transport: 'fhir', edition: '11000274103', host: 'tx.fhir.de' } });
      expect(isShown(hostingNotice())).toBe(true);

      applyServerNotice(document, null);
      expect(isShown(hostingNotice())).toBe(true);
    });

    it('is hidden only for a local build with a server configured at build time', () => {
      applyServerNotice(document, describeDemoTerminologyServer({
        VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir'
      }));

      expect(isShown(hostingNotice())).toBe(false);
    });
  });

  it('switches back to the serverless variant', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOMED_EDITION: '11000274103'
    }));
    applyServerNotice(document, null);

    expect(all('[data-server-mode="none"]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-server-mode="configured"]').every(node => node.hidden)).toBe(true);
    expect(all('[data-demo-operator]').some(isShown)).toBe(false);
    expect(isShown(document.querySelector('[data-demo-snomed]'))).toBe(false);
  });

  it('shows the local variant for a server configured at build time', () => {
    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir'
    }));

    expect(all('[data-demo-mode="local"]').length).toBeGreaterThanOrEqual(3);
    expect(all('[data-demo-mode="local"]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-demo-mode="opt-in"]').every(node => node.hidden)).toBe(true);

    const banner = visibleText(document.querySelector('aside.demo-notice'));
    expect(banner).toContain('Local preview with a terminology server:');
    expect(banner).not.toContain('Live search is on');

    const privacy = visibleText(privacySection());
    expect(privacy).toContain('This local build runs in your browser;');
    expect(privacy).toContain('The software is provided by Technische Universität Dresden');
    expect(privacy).not.toContain('Art. 6(1)(a) GDPR');
  });

  it('shows the opt-in variant once the visitor has switched on the live search', () => {
    applyServerNotice(document, {
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de',
      snomed: null,
      optIn: true
    });

    expect(all('[data-server-mode="configured"]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-demo-mode="opt-in"]').length).toBeGreaterThanOrEqual(3);
    expect(all('[data-demo-mode="opt-in"]').every(node => !node.hidden)).toBe(true);
    expect(all('[data-demo-mode="local"]').every(node => node.hidden)).toBe(true);

    const banner = visibleText(document.querySelector('aside.demo-notice'));
    expect(banner).toContain('Live search is on:');
    expect(banner).toContain('LOINC®, ICD-10-GM, OPS, and ATC from three characters on');
    expect(banner).toContain('to tx.fhir.de.');
    expect(banner).not.toContain('Local preview');
    expect(banner).not.toContain('SNOMED');

    const sectionOne = visibleText(document.querySelector('.license-dialog__section div[data-server-mode="configured"]'));
    expect(sectionOne).toContain('You have switched on the live search');
    expect(sectionOne).toContain('A search is sent only from three characters on, after you pause typing.');
    expect(sectionOne).toContain('Searches in the code systems bundled with the package');
    expect(sectionOne).not.toContain('local build');

    const privacy = visibleText(privacySection());
    expect(privacy).toContain('Art. 6(1)(a) GDPR');
    expect(privacy).toContain('Responsible for this demo and for asking your consent: Technische Universität Dresden');
    expect(privacy).not.toContain('The software is provided by');

    expect(isShown(document.querySelector('[data-demo-snomed]'))).toBe(false);

    // The German variant says the same.
    const bannerDe = visibleText(document.querySelector('aside.demo-notice'), 'de');
    expect(bannerDe).toContain('Live-Suche ist an:');
    expect(bannerDe).toContain('LOINC®, ICD-10-GM, OPS und ATC ab drei Zeichen');
    expect(bannerDe).toContain('an tx.fhir.de.');
    expect(bannerDe).not.toContain('Lokale Vorschau');
    expect(bannerDe).not.toContain('SNOMED');

    const privacyDe = visibleText(privacySection(), 'de');
    expect(privacyDe).toContain('Art. 6 Abs. 1 lit. a DSGVO');
    expect(privacyDe).toContain('Verantwortlich für diese Demo und für die Einholung Ihrer Einwilligung: Technische Universität Dresden');
    expect(privacyDe).not.toContain('Die Software wird bereitgestellt von');
  });

  it('mentions the SNOMED CT self-declaration only in the opt-in variant', () => {
    const snomed = {
      transport: 'fhir',
      edition: '11000274103',
      editionVersion: '20260815',
      host: 'tx.fhir.de'
    };
    const snomedItem = document.querySelector('[data-demo-snomed]');

    applyServerNotice(document, { fhirBaseUrl: 'https://tx.fhir.de/fhir', fhirHost: 'tx.fhir.de', snomed, optIn: true });

    expect(isShown(snomedItem)).toBe(true);
    expect(visibleText(snomedItem)).toContain('(edition 11000274103, release 20260815)');
    expect(visibleText(snomedItem)).toContain('You unlocked it with a self-declaration');
    expect(visibleText(snomedItem, 'de')).toContain('(Edition 11000274103, Release 20260815)');
    expect(visibleText(snomedItem, 'de')).toContain('Sie haben es mit einer Selbstauskunft freigeschaltet');

    applyServerNotice(document, describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOMED_EDITION: '11000274103',
      VITE_SNOMED_EDITION_VERSION: '20260815'
    }));

    expect(isShown(snomedItem)).toBe(true);
    expect(visibleText(snomedItem)).not.toContain('self-declaration');
  });

  it('hides both mode variants again without a server', () => {
    applyServerNotice(document, {
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de',
      snomed: null,
      optIn: true
    });
    applyServerNotice(document, null);

    expect(all('[data-demo-mode]').every(node => node.hidden)).toBe(true);
    expect(all('[data-server-mode="none"]').every(node => !node.hidden)).toBe(true);
  });

  it('writes hosts as text, not markup', () => {
    applyServerNotice(document, {
      fhirBaseUrl: '<img src=x onerror=alert(1)>',
      fhirHost: '<img src=x onerror=alert(1)>',
      snomed: null
    });

    expect(document.querySelector('[data-demo-server-host] img')).toBeNull();
    expect(document.querySelector('[data-demo-server-host]').textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
