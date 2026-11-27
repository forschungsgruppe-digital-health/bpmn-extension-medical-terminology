import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BpmnModdle } from 'bpmn-moddle';
import { beforeAll, describe, expect, it } from 'vitest';
import descriptor from '../../src/moddle/medical-terminology.json';
import { getAnnotations } from '../../src/services/AnnotationHelper.js';
import { createDefaultFhirProviderConfigs } from '../../src/config/terminology-config.js';
import {
  createHl7TerminologyR4PackageProvider,
  createIheXdsClassCodeProvider,
  createIheXdsTypeCodeProvider,
  createKdlProvider
} from '../../src/providers/presets/index.js';

// The example diagrams shown in the repository and loaded by the demo. Their
// codings must be ones a user could actually pick in the extension.
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const EXAMPLE_FILES = [
  'examples/valid/lung-cancer-staging-annotated.bpmn',
  'demo/public/sample.bpmn'
];

// Code systems the extension takes from a terminology server. Their content
// cannot be checked offline, so only the system URI and the format of the
// stored release are asserted here.
const SERVER_SYSTEMS = Object.freeze({
  'http://snomed.info/sct': {
    name: 'SNOMED CT',
    // A release of the German National Edition, as `…/version/YYYYMMDD`.
    version: /^http:\/\/snomed\.info\/sct\/11000274103\/version\/\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/
  },
  'http://loinc.org': { name: 'LOINC', version: /^\d+\.\d+$/ },
  'http://fhir.de/CodeSystem/bfarm/icd-10-gm': { name: 'ICD-10-GM', version: /^\d{4}$/ },
  'http://fhir.de/CodeSystem/bfarm/ops': { name: 'OPS', version: /^\d{4}$/ },
  'http://fhir.de/CodeSystem/bfarm/atc': { name: 'ATC-GM', version: /^\d{4}$/ }
});

// Every server-based coding in the examples, listed explicitly because no
// offline check can confirm its code or display: a change to one of them has
// to change this list, so it shows up in review.
const SERVER_CODINGS = Object.freeze({
  'examples/valid/lung-cancer-staging-annotated.bpmn': [
    ['http://loinc.org', '18748-4', 'Diagnostic imaging study'],
    ['http://snomed.info/sct', '254292007', 'Tumor staging (tumor staging)'],
    ['http://loinc.org', '21908-9', 'Stage group.clinical Cancer'],
    ['http://snomed.info/sct', '359615001', 'Partial lobectomy of lung (procedure)'],
    ['http://fhir.de/CodeSystem/bfarm/ops', '5-324', 'Einfache Lobektomie und Bilobektomie der Lunge'],
    ['http://snomed.info/sct', '367336001', 'Chemotherapy (procedure)'],
    ['http://fhir.de/CodeSystem/bfarm/atc', 'L01XA01', 'Cisplatin'],
    ['http://loinc.org', '18842-5', 'Discharge summary'],
    ['http://snomed.info/sct', '390906007', 'Follow-up encounter (procedure)'],
    ['http://loinc.org', '18776-5', 'Plan of care note']
  ],
  'demo/public/sample.bpmn': [
    ['http://loinc.org', '18748-4', 'Diagnostische Bildgebung - Untersuchung'],
    ['http://snomed.info/sct', '254292007', 'Tumor staging'],
    ['http://loinc.org', '21908-9', 'Stage group.clinical Cancer'],
    ['http://snomed.info/sct', '359615001', 'Partial lobectomy of lung'],
    ['http://fhir.de/CodeSystem/bfarm/ops', '5-324', 'Einfache Lobektomie und Bilobektomie der Lunge'],
    ['http://snomed.info/sct', '367336001', 'Chemotherapy'],
    ['http://fhir.de/CodeSystem/bfarm/atc', 'L01XA01', 'Cisplatin'],
    ['http://loinc.org', '18842-5', 'Discharge summary'],
    ['http://snomed.info/sct', '390906007', 'Follow-up encounter'],
    ['http://loinc.org', '18776-5', 'Behandlungsplan - Dokumentation']
  ]
});

/**
 * Index the code systems the package bundles (HL7 terminology, IHE
 * Deutschland XDS, KDL) through the same presets the extension registers.
 */
function indexBundledCodeSystems() {
  const index = new Map();
  const providers = [
    createHl7TerminologyR4PackageProvider(),
    createIheXdsClassCodeProvider(),
    createIheXdsTypeCodeProvider(),
    createKdlProvider()
  ];

  for (const provider of providers) {
    for (const system of provider.getCodeSystemUris()) {
      index.set(system, {
        provider: provider.id,
        versions: provider.getCodeSystemVersions(system),
        concepts: new Map()
      });
    }
    for (const concept of provider.getAll()) {
      index.get(concept.system)?.concepts.set(concept.code, concept);
    }
  }

  return index;
}

async function readCodings(file) {
  const xml = readFileSync(new URL(file, `file://${repoRoot}`), 'utf8');
  const moddle = new BpmnModdle({ mt: descriptor });
  const { elementsById, warnings } = await moddle.fromXML(xml);
  const codings = [];

  for (const element of Object.values(elementsById)) {
    for (const annotation of getAnnotations(element)) {
      for (const coding of annotation.codings || []) {
        codings.push({
          where: `${file} ${element.id} ${annotation.id}`,
          system: coding.system,
          version: coding.version,
          code: coding.code,
          display: coding.display
        });
      }
    }
  }

  const markup = xml.replace(/<!--[\s\S]*?-->/g, '');
  return { codings, warnings, codingElements: (markup.match(/<mt:coding\b/g) || []).length };
}

describe('example diagram codings', () => {
  let bundled;
  const examples = new Map();

  beforeAll(async () => {
    bundled = indexBundledCodeSystems();
    for (const file of EXAMPLE_FILES) {
      examples.set(file, await readCodings(file));
    }
  });

  it('lists the server-based code systems the package defaults query', () => {
    const fhirSystems = createDefaultFhirProviderConfigs({
      fhirBaseUrl: 'https://terminology.example.org/fhir'
    }).map(provider => provider.systemUri);

    expect(Object.keys(SERVER_SYSTEMS).sort()).toEqual(
      [...fhirSystems, 'http://snomed.info/sct'].sort()
    );
    for (const system of Object.keys(SERVER_SYSTEMS)) {
      expect(bundled.has(system), `${system} is bundled`).toBe(false);
    }
  });

  describe.each(EXAMPLE_FILES)('%s', file => {
    it('parses every mt:coding without moddle warnings', () => {
      const { codings, warnings, codingElements } = examples.get(file);

      expect(warnings).toEqual([]);
      expect(codings.length).toBeGreaterThan(0);
      expect(codings).toHaveLength(codingElements);
    });

    it('uses only bundled or listed server-based code systems', () => {
      const unknown = examples.get(file).codings
        .filter(coding => !bundled.has(coding.system) && !Object.hasOwn(SERVER_SYSTEMS, coding.system))
        .map(coding => `${coding.where}: unknown code system ${coding.system}`);

      expect(unknown).toEqual([]);
    });

    it('matches the bundled code systems in code, display and version', () => {
      const bundledCodings = examples.get(file).codings.filter(coding => bundled.has(coding.system));
      expect(bundledCodings.length).toBeGreaterThan(0);

      const problems = [];
      for (const coding of bundledCodings) {
        const codeSystem = bundled.get(coding.system);
        const concept = codeSystem.concepts.get(coding.code);
        const label = `${coding.where}: ${coding.system}|${coding.code}`;

        if (!concept) {
          problems.push(`${label} is not in the bundled ${codeSystem.provider} code system`);
          continue;
        }
        if (coding.display !== concept.display) {
          problems.push(`${label} has display "${coding.display}", the bundle "${concept.display}"`);
        }
        if (concept.active === false) {
          problems.push(`${label} is retired or deprecated in the bundle`);
        }
        // A version is checked when the coding stores one and the bundle declares one.
        if (coding.version && codeSystem.versions.length && !codeSystem.versions.includes(coding.version)) {
          problems.push(`${label} has version "${coding.version}", the bundle ${codeSystem.versions.join(', ')}`);
        }
      }

      expect(problems).toEqual([]);
    });

    it('stores a release in the expected format for server-based codings', () => {
      const problems = [];
      for (const coding of examples.get(file).codings) {
        const system = Object.hasOwn(SERVER_SYSTEMS, coding.system) ? SERVER_SYSTEMS[coding.system] : null;
        if (!system) continue;

        const label = `${coding.where}: ${system.name} ${coding.code}`;
        if (!system.version.test(coding.version || '')) {
          problems.push(`${label} has release "${coding.version ?? ''}", expected ${system.version}`);
        }
        if (!coding.code || !coding.display) {
          problems.push(`${label} needs a code and a display`);
        }
      }

      expect(problems).toEqual([]);
    });

    it('contains exactly the listed server-based codings', () => {
      const serverCodings = examples.get(file).codings
        .filter(coding => Object.hasOwn(SERVER_SYSTEMS, coding.system))
        .map(coding => [coding.system, coding.code, coding.display]);

      expect(serverCodings).toEqual(SERVER_CODINGS[file]);
    });
  });
});
