// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BpmnModdle } from 'bpmn-moddle';
import { describe, expect, it } from 'vitest';
import descriptor from '../../src/moddle/medical-terminology.json';
import {
  addTerminologyNotices,
  ATC_GM_NOTICE,
  collectCodingSystems,
  createTerminologyNoticeComment,
  HL7_EXCERPT_COPYRIGHTS,
  ICD_10_GM_NOTICE,
  KDL_NOTICE,
  LOINC_NOTICE,
  OPS_NOTICE,
  SNOMED_CT_NOTICE,
  TERMINOLOGY_NOTICES,
  toCommentText
} from '../../../demo/src/terminology-notices.js';
import { visibleText } from './visible-text.js';

const REPO = resolve(import.meta.dirname, '../../..');
const read = path => readFileSync(resolve(REPO, path), 'utf8');

const SNOMED = 'http://snomed.info/sct';
const LOINC = 'http://loinc.org';
const ICD = 'http://fhir.de/CodeSystem/bfarm/icd-10-gm';
const OPS = 'http://fhir.de/CodeSystem/bfarm/ops';
const ATC_GM = 'http://fhir.de/CodeSystem/bfarm/atc';
const KDL = 'http://dvmd.de/fhir/CodeSystem/kdl';
const IHE_CLASS = 'http://ihe-d.de/CodeSystems/IHEXDSclassCode';
const DICOM = 'http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle';

const collapse = text => text.replace(/\s+/g, ' ').trim();

function createModdle() {
  return new BpmnModdle({ mt: descriptor });
}

/** A process with one task annotated with the given codings (synthetic). */
function diagramXml(codings) {
  const elements = codings
    .map(({ system, version, code = 'X1', display = 'Synthetic example' }) =>
      `<mt:coding system="${system}"${version ? ` version="${version}"` : ''} code="${code}" display="${display}" />`)
    .join('\n            ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:mt="${descriptor.uri}" id="Definitions_1" targetNamespace="https://example.invalid/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:task id="Task_1" name="Synthetic task">
      <bpmn:extensionElements>
        <mt:annotations>
          <mt:annotation id="mt-ann-1" text="Synthetic annotation">
            ${elements}
          </mt:annotation>
        </mt:annotations>
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
</bpmn:definitions>
`;
}

/** Import like the demo does, then export like its XML view and download. */
async function roundTrip(xml) {
  const moddle = createModdle();
  const { rootElement, warnings } = await moddle.fromXML(xml);

  expect(warnings).toEqual([]);

  const { xml: saved } = await moddle.toXML(rootElement, { format: true });

  return { definitions: rootElement, saved, exported: addTerminologyNotices(saved, rootElement) };
}

function commentOf(xml) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');

  expect(document.querySelector('parsererror')).toBeNull();

  const comments = [ ...document.childNodes ].filter(node => node.nodeType === Node.COMMENT_NODE);

  return { document, comments };
}

describe('collectCodingSystems', () => {
  it('reads the systems and versions of the codings in the annotated example', async () => {
    const { definitions } = await roundTrip(read('examples/valid/lung-cancer-staging-annotated.bpmn'));
    const systems = collectCodingSystems(definitions);

    expect([ ...systems.keys() ]).toEqual(expect.arrayContaining([ SNOMED, LOINC, OPS, ATC_GM, KDL, IHE_CLASS ]));
    expect(systems.has(ICD)).toBe(false);
    expect(systems.get(SNOMED)).toEqual([ 'http://snomed.info/sct/11000274103/version/20260815' ]);
    expect(systems.get(OPS)).toEqual([ '2026' ]);
  });

  it('lists each version once, skips empty versions and codings without a system', async () => {
    const { definitions } = await roundTrip(diagramXml([
      { system: LOINC, version: '2.82' },
      { system: LOINC, version: '2.82', code: 'X2' },
      { system: LOINC, version: '2.81', code: 'X3' },
      { system: OPS },
      { system: ' ', version: '1' }
    ]));

    const systems = collectCodingSystems(definitions);

    expect([ ...systems.entries() ]).toEqual([
      [ LOINC, [ '2.82', '2.81' ] ],
      [ OPS, [] ]
    ]);
  });

  it('returns nothing for a missing or plain diagram', async () => {
    const { definitions } = await roundTrip(read('examples/valid/lung-cancer-staging.bpmn'));

    expect(collectCodingSystems(definitions).size).toBe(0);
    expect(collectCodingSystems(null).size).toBe(0);
    expect(collectCodingSystems(undefined).size).toBe(0);
  });
});

describe('addTerminologyNotices', () => {
  it('inserts one comment directly after the XML declaration of the exported annotated example', async () => {
    const { saved, exported } = await roundTrip(read('examples/valid/lung-cancer-staging-annotated.bpmn'));

    expect(saved.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<bpmn2:definitions')).toBe(true);
    expect(exported.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<!--\n')).toBe(true);
    expect(exported.replace(/\n<!--[\s\S]*?-->/, '')).toBe(saved);

    const { comments } = commentOf(exported);
    expect(comments).toHaveLength(1);

    const text = collapse(comments[0].data);
    expect(text).toContain(SNOMED_CT_NOTICE);
    expect(text).toContain('SNOMED CT (http://snomed.info/sct), version(s) in this file: ' +
      'http://snomed.info/sct/11000274103/version/20260815');
    expect(text).toContain(LOINC_NOTICE);
    expect(text).toContain(collapse(OPS_NOTICE.join(' ')));
    expect(text).toContain(ATC_GM_NOTICE);
    expect(text).toContain(KDL_NOTICE);
    expect(text).not.toContain('Die vorliegende Ausgabe beruht');
    expect(text).not.toContain('used by permission of SNOMED International');
    expect(comments[0].data).not.toContain('--');
  });

  it('keeps the exported diagram importable', async () => {
    const { exported } = await roundTrip(read('examples/valid/lung-cancer-staging-annotated.bpmn'));
    const { warnings, rootElement } = await createModdle().fromXML(exported);

    expect(warnings).toEqual([]);
    expect(collectCodingSystems(rootElement).has(SNOMED)).toBe(true);
  });

  it('adds the notices of the demo sample too', async () => {
    const { exported } = await roundTrip(read('demo/public/sample.bpmn'));
    const { comments } = commentOf(exported);

    expect(comments).toHaveLength(1);
    expect(collapse(comments[0].data)).toContain(SNOMED_CT_NOTICE);
  });

  it('adds no comment to a diagram without codings', async () => {
    const { saved, exported } = await roundTrip(read('examples/valid/lung-cancer-staging.bpmn'));

    expect(exported).toBe(saved);
    expect(exported).not.toContain('<!--');
  });

  it('adds no comment when only code systems without a notice are used', async () => {
    const { saved, exported } = await roundTrip(diagramXml([
      { system: IHE_CLASS, version: '2021-06-25T13:44:47', code: 'BEF', display: 'Befundbericht' },
      { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' }
    ]));

    expect(exported).toBe(saved);
  });

  it('names only the code systems used, in a fixed order, with their versions', async () => {
    const { exported } = await roundTrip(diagramXml([
      { system: OPS, version: '2026' },
      { system: ICD, version: '2025', code: 'C34.1' },
      { system: ICD, version: '2026', code: 'C34.1' },
      { system: DICOM, code: 'access' }
    ]));
    const text = collapse(commentOf(exported).comments[0].data);

    expect(text).toContain('ICD-10-GM (http://fhir.de/CodeSystem/bfarm/icd-10-gm), version(s) in this file: 2025, 2026');
    expect(text).toContain(collapse(ICD_10_GM_NOTICE.join(' ')));
    expect(text).toContain('OPS (http://fhir.de/CodeSystem/bfarm/ops), version(s) in this file: 2026');
    expect(text).toContain(`HL7 Terminology (${DICOM}) ${HL7_EXCERPT_COPYRIGHTS[DICOM]}`);
    expect(text.indexOf('ICD-10-GM (')).toBeLessThan(text.indexOf('OPS ('));
    expect(text.indexOf('OPS (')).toBeLessThan(text.indexOf('HL7 Terminology ('));
    expect(text).not.toContain('SNOMED');
    expect(text).not.toContain('LOINC');
    expect(text).not.toContain('KDL');
  });

  it('never lets "--" into the comment, whatever the stored versions contain', async () => {
    const { exported } = await roundTrip(diagramXml([
      { system: LOINC, version: '2.82--rc--->' },
      { system: SNOMED, version: 'a---b-' }
    ]));
    const { comments } = commentOf(exported);

    expect(comments).toHaveLength(1);
    expect(comments[0].data).not.toContain('--');
    expect(comments[0].data.endsWith('-')).toBe(false);
    expect(comments[0].data).toContain('2.82- -rc- - -&gt;'.replace('&gt;', '>'));
    expect(comments[0].data).toContain('a- - -b-');
  });

  it('puts the comment first when there is no XML declaration and leaves other input alone', () => {
    const definitions = { $type: 'bpmn:Definitions', rootElements: [ { $type: 'mt:Coding', system: LOINC } ] };

    expect(addTerminologyNotices('<definitions/>', definitions)).toMatch(/^<!--\n[\s\S]*-->\n<definitions\/>$/);
    expect(addTerminologyNotices('<?xml version="1.0"?><definitions/>', definitions))
      .toMatch(/^<\?xml version="1\.0"\?>\n<!--[\s\S]*--><definitions\/>$/);
    expect(addTerminologyNotices(undefined, definitions)).toBeUndefined();
    expect(addTerminologyNotices('<definitions/>', null)).toBe('<definitions/>');
  });

  it('visits shared and circular references once', () => {
    const coding = { $type: 'mt:Coding', system: LOINC, version: '2.82' };
    const task = { $type: 'bpmn:Task', values: [ coding ] };
    const definitions = { $type: 'bpmn:Definitions', rootElements: [ task ], diagrams: [ { bpmnElement: task } ] };
    task.self = task;

    expect([ ...collectCodingSystems(definitions).entries() ]).toEqual([ [ LOINC, [ '2.82' ] ] ]);
  });
});

describe('toCommentText', () => {
  it.each([
    [ 'a--b', 'a- -b' ],
    [ 'a---b', 'a- - -b' ],
    [ '-->', '- ->' ],
    [ 'a-b', 'a-b' ]
  ])('%s → %s', (input, expected) => {
    expect(toCommentText(input)).toBe(expected);
  });
});

describe('notice texts', () => {
  it('keep the copyright statements of the bundled HL7 excerpts unchanged', () => {
    const bundled = JSON.parse(read('extension/src/providers/presets/hl7-code-systems.json'));

    for (const [ system, copyright ] of Object.entries(HL7_EXCERPT_COPYRIGHTS)) {
      const codeSystem = bundled.find(entry => entry.url === system);

      expect(codeSystem, system).toBeDefined();
      expect(collapse(copyright)).toBe(collapse(codeSystem.copyright));
    }

    expect(Object.keys(HL7_EXCERPT_COPYRIGHTS)).toEqual(expect.arrayContaining([
      'http://terminology.hl7.org/CodeSystem/audit-event-type',
      'http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle',
      'http://terminology.hl7.org/CodeSystem/iso-21089-lifecycle',
      'http://terminology.hl7.org/CodeSystem/contractsignertypecodes'
    ]));
  });

  it('match the licence dialog of the demo page', () => {
    document.documentElement.innerHTML = read('demo/index.html');

    const item = name => document.querySelector(`#license-overlay [data-notice="${name}"]`);

    expect(visibleText(item('snomed-ct'))).toContain(SNOMED_CT_NOTICE);
    expect(visibleText(item('loinc'))).toContain(LOINC_NOTICE);
    expect(visibleText(item('icd-10-gm'))).toContain(ICD_10_GM_NOTICE.join(' '));
    expect(visibleText(item('ops'))).toContain(OPS_NOTICE.join(' '));
    expect(visibleText(item('atc-gm'))).toContain(ATC_GM_NOTICE);
    expect(visibleText(item('kdl'))).toContain(KDL_NOTICE.replace(/[<>]/g, ''));
    // Whether a bundle that inlines the KDL is an aggregate or a combined work
    // (GPL-3.0 section 5) is open, so the demo does not claim the GPL's scope.
    expect(KDL_NOTICE).not.toContain('GPL covers only');
    expect(visibleText(item('kdl'), 'en')).not.toContain('GPL covers only');
    expect(visibleText(item('kdl'), 'de')).not.toContain('GPL erfasst nur');
  });

  it('use the SNOMED CT notice of the Affiliate License Agreement, clause 8.3.1, word for word', () => {
    expect(SNOMED_CT_NOTICE).toBe(
      'This material includes SNOMED Clinical Terms® (SNOMED CT®) which is used by permission of the ' +
      'International Health Terminology Standards Development Organisation (IHTSDO). All rights reserved. ' +
      'SNOMED CT®, was originally created by The College of American Pathologists. "SNOMED" and "SNOMED CT" ' +
      'are registered trademarks of the IHTSDO.'
    );
  });

  it('give every notice a title, systems and text without "--"', () => {
    const systems = TERMINOLOGY_NOTICES.flatMap(notice => notice.systems);

    expect(new Set(systems).size).toBe(systems.length);
    expect(systems).toEqual(expect.arrayContaining([ SNOMED, LOINC, ICD, OPS, ATC_GM, KDL ]));

    for (const notice of TERMINOLOGY_NOTICES) {
      expect(notice.title).toBeTruthy();
      expect(notice.lines.length).toBeGreaterThan(0);
      expect(notice.lines.join('\n')).not.toContain('--');
    }

    expect(createTerminologyNoticeComment(new Map())).toBeNull();
  });
});
