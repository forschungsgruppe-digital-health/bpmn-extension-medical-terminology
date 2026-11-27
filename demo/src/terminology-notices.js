/**
 * Terminology notices for the demo's XML view and download.
 *
 * bpmn-moddle drops XML comments on import, so a diagram exported from the
 * demo would lose the notices that the sample diagrams carry as a comment.
 * `addTerminologyNotices` puts them back: after `saveXML` it inserts one XML
 * comment directly after the XML declaration, with the notice of every code
 * system that the diagram's `mt:coding` elements use and the versions stored
 * with those codings. A diagram without such codings gets no comment.
 *
 * Keep these texts in step with the licence dialog in index.html. Notices
 * prescribed in English (SNOMED CT, LOINC) stay English; the BfArM and WIdO
 * statements stay German.
 */

/**
 * SNOMED CT Affiliate License Agreement, clause 8.3.1, verbatim ("This
 * material" as in the agreement).
 */
export const SNOMED_CT_NOTICE =
  'This material includes SNOMED Clinical Terms® (SNOMED CT®) which is used by permission of the ' +
  'International Health Terminology Standards Development Organisation (IHTSDO). All rights reserved. ' +
  'SNOMED CT®, was originally created by The College of American Pathologists. "SNOMED" and ' +
  '"SNOMED CT" are registered trademarks of the IHTSDO.';

/** LOINC licence, section 10, as in the licence dialog. */
export const LOINC_NOTICE =
  'This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief ' +
  'Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is ' +
  'available at no cost under the license at http://loinc.org/license. LOINC® is a registered United ' +
  'States trademark of Regenstrief Institute, Inc.';

/**
 * BfArM Downloadbedingungen (Stand 01.08.2025), annex for ICD-10-GM, source
 * citation for volume 1 (Systematisches Verzeichnis), verbatim without the
 * items for printed works.
 */
export const ICD_10_GM_NOTICE = Object.freeze([
  'Die vorliegende Ausgabe beruht',
  '(1) auf der vollständigen amtlichen Fassung der Internationalen statistischen Klassifikation der ' +
    'Krankheiten und verwandter Gesundheitsprobleme, 10. Revision, und',
  '(2) auf der australischen ICD-10-AM, First Edition.',
  'Die englischsprachige Originalausgabe zu (1) wurde 1992 von der Weltgesundheitsorganisation (WHO) ' +
    'veröffentlicht als International Statistical Classification of Diseases and Related Health ' +
    'Problems, Tenth Revision, Geneva, WHO, Vol. 1, 1992; die englischsprachige Originalausgabe zu (2) ' +
    'wurde 1998 vom australischen National Centre for Classification in Health veröffentlicht als ' +
    'Volume 1 of The International Statistical Classification of Diseases and Related Health Problems, ' +
    '10th Revision, Australian Modification (ICD-10-AM), First Edition.',
  '© zu (1): Weltgesundheitsorganisation (WHO) 1992',
  '© zu (2): Commonwealth of Australia 1998',
  'Der Generaldirektor der Weltgesundheitsorganisation (WHO) hat die Übersetzungsrechte für eine ' +
    'deutschsprachige Ausgabe an das Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) ' +
    'vergeben, das für die Übersetzung allein verantwortlich ist.',
  'Das Commonwealth of Australia hat die Übersetzungsrechte für eine deutschsprachige Ausgabe an das ' +
    'Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) vergeben, das für die Übersetzung ' +
    'allein verantwortlich ist.',
  'Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag des ' +
    'Bundesministeriums für Gesundheit (BMG)',
  'Die Erstellung bzw. der Druck erfolgt unter Verwendung der maschinenlesbaren Fassung des ' +
    'Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM).'
]);

/**
 * BfArM Downloadbedingungen (Stand 01.08.2025), annex for OPS, verbatim
 * without the items for printed works.
 */
export const OPS_NOTICE = Object.freeze([
  'Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag des ' +
    'Bundesministeriums für Gesundheit (BMG)',
  'Die Erstellung bzw. der Druck erfolgt unter Verwendung der maschinenlesbaren Fassung des ' +
    'Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM).'
]);

/** Source statement required by the ATC-GM terms of use (WIdO, BfArM). */
export const ATC_GM_NOTICE =
  'Das Wissenschaftliche Institut der AOK (WIdO) ist Urheber der ATC-GM mit DDD, die auf dem vom WHO ' +
  'Collaborating Centre for Drug Statistics Methodology herausgegebenen Werk mit dem Titel „ATC Index ' +
  'with DDDs and Guidelines for ATC Classification and DDD Assignment“ beruht. Die amtliche ' +
  'Veröffentlichung erfolgt durch das Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM).';

/** KDL 2026 licence notice (GPL-3.0-or-later, as stated by DVMD e.V.). */
export const KDL_NOTICE =
  'KDL – Klinische Dokumentenklassen-Liste 2026 (FHIR package dvmd.kdl.r4 2026.0.0, CodeSystem ' +
  'http://dvmd.de/fhir/CodeSystem/kdl). Copyright 2013–2018 DMI GmbH & Co. KG; since 2018 DVMD e.V. ' +
  '(Der Fachverband für Dokumentation und Informationsmanagement in der Medizin). DVMD e.V. makes the ' +
  'KDL freely available: you can redistribute and/or modify the code system under the terms of the GNU ' +
  'General Public License as published by the Free Software Foundation, either version 3 of the License ' +
  'or (at your option) any later version (SPDX: GPL-3.0-or-later). The KDL is provided without any ' +
  'warranty; see the GNU General Public License at <https://www.gnu.org/licenses/>. Licence statement: ' +
  'KDL 2026 implementation guide, section "Ansprechpartner, Gültigkeit, Lizenzbedingungen" ' +
  '(<https://gefyra.github.io/KDL-IG-Publisher/>). Unmodified source: ' +
  '<https://packages.simplifier.net/dvmd.kdl.r4/2026.0.0>.';

// Copyright statements of the bundled HL7 Terminology code systems that
// excerpt other standards (tools/generate-hl7-code-systems.mjs,
// REVIEWED_COPYRIGHT_STATEMENTS), unchanged from their CodeSystem.copyright.
const DICOM_PS3_16_COPYRIGHT =
  'These codes are excerpted from Digital Imaging and Communications in Medicine (DICOM) Standard, ' +
  'Part 16: Content Mapping Resource, Copyright © 2011 by the National Electrical Manufacturers ' +
  'Association.';

export const HL7_EXCERPT_COPYRIGHTS = Object.freeze({
  'http://terminology.hl7.org/CodeSystem/audit-event-type': DICOM_PS3_16_COPYRIGHT,
  'http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle': DICOM_PS3_16_COPYRIGHT,
  'http://terminology.hl7.org/CodeSystem/iso-21089-lifecycle':
    'These codes are excerpted from ISO Standard, TS 21089-2017 - Health Informatics - Trusted ' +
    'End-to-End Information Flows, Copyright by ISO International. Copies of this standard are ' +
    'available through the ISO Web Site at www.iso.org.',
  'http://terminology.hl7.org/CodeSystem/contractsignertypecodes':
    'This is an example set based on ASTM Standard, E1762-95 (2013) HL7 RoleClass OID ' +
    '2.16.840.1.113883.5.110, HL7 Role Code 2.16.840.1.113883.5.111, HL7 ParticipationType OID: ' +
    '2.16.840.1.113883.5.90, HL7 ParticipationFunction codes at OID: 2.16.840.1.113883.5.88, and HL7 ' +
    'Security and Privacy Domain Analysis Model roles classes.',
  'http://terminology.hl7.org/CodeSystem/endpoint-connection-type':
    'This material derives from the HL7 Terminology (THO). THO is copyright ©1989+ Health Level Seven ' +
    'International and is made available under the CC0 designation. For more licensing information ' +
    'see: https://terminology.hl7.org/license.html Some content from IHE® Copyright © 2015 IHE ' +
    'International, Inc. The IHE concepts are from the IHE Technical Frameworks and Supplements, ' +
    'available for free download and use at http://www.ihe.net/Technical_Frameworks/',
  'http://terminology.hl7.org/CodeSystem/time-period-ranges':
    'Adapted from content published by IHE Copyright (c) 2015 [IHE ' +
    'International, Inc](http://www.ihe.net/Governance/#Intellectual_Property). Used here according to ' +
    'the terms of the [CC BY 4 License](https://creativecommons.org/licenses/by/4.0/). This CodeSystem ' +
    'constitutes a profile on [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html), ' +
    'specifying use of its duration definitions for expressing time period ranges.'
});

/**
 * Notices by code system, in the order they appear in the comment.
 *
 * @type {ReadonlyArray<{ title: string, systems: readonly string[], lines: readonly string[] }>}
 */
export const TERMINOLOGY_NOTICES = Object.freeze([
  {
    title: 'SNOMED CT',
    systems: [ 'http://snomed.info/sct' ],
    lines: [
      SNOMED_CT_NOTICE,
      'The IHTSDO trades as SNOMED International. Any use of SNOMED CT requires an Affiliate License ' +
        '(in Germany administered via BfArM / MLDS).'
    ]
  },
  {
    title: 'LOINC',
    systems: [ 'http://loinc.org' ],
    lines: [ LOINC_NOTICE ]
  },
  {
    title: 'ICD-10-GM',
    systems: [ 'http://fhir.de/CodeSystem/bfarm/icd-10-gm' ],
    lines: ICD_10_GM_NOTICE
  },
  {
    title: 'OPS',
    systems: [ 'http://fhir.de/CodeSystem/bfarm/ops' ],
    lines: OPS_NOTICE
  },
  {
    title: 'ATC-GM',
    systems: [ 'http://fhir.de/CodeSystem/bfarm/atc' ],
    lines: [ ATC_GM_NOTICE ]
  },
  {
    title: 'KDL',
    systems: [ 'http://dvmd.de/fhir/CodeSystem/kdl' ],
    lines: [ KDL_NOTICE ]
  },
  ...Object.entries(HL7_EXCERPT_COPYRIGHTS).map(([ system, copyright ]) => ({
    title: 'HL7 Terminology',
    systems: [ system ],
    lines: [ copyright ]
  }))
].map(notice => Object.freeze({
  ...notice,
  systems: Object.freeze([ ...notice.systems ]),
  lines: Object.freeze([ ...notice.lines ])
})));

const CODING_TYPE = 'mt:Coding';
const XML_DECLARATION = /^﻿?<\?xml\b[\s\S]*?\?>/;

/**
 * Collect the code systems of every `mt:coding` below `definitions`, with the
 * versions stored with them, in document order.
 *
 * @param {object | null | undefined} definitions - `modeler.getDefinitions()`.
 * @returns {Map<string, string[]>} System URI → distinct non-empty versions.
 */
export function collectCodingSystems(definitions) {
  const systems = new Map();
  const seen = new Set();
  const stack = [ definitions ];

  while (stack.length) {
    const node = stack.pop();

    if (!node || typeof node !== 'object' || seen.has(node)) {
      continue;
    }

    seen.add(node);

    if (Array.isArray(node)) {
      stack.push(...[ ...node ].reverse());
      continue;
    }

    if (node.$type === CODING_TYPE && typeof node.system === 'string' && node.system.trim()) {
      const system = node.system.trim();
      const versions = systems.get(system) ?? [];
      const version = typeof node.version === 'string' ? node.version.trim() : '';

      if (version && !versions.includes(version)) {
        versions.push(version);
      }

      systems.set(system, versions);
    }

    // Own properties only; `$parent`, `$attrs` and the like are skipped. A
    // reference to another element (for example `bpmnElement`) is visited
    // once at most.
    const children = Object.keys(node)
      .filter(key => !key.startsWith('$'))
      .map(key => node[key])
      .filter(value => value && typeof value === 'object');

    stack.push(...children.reverse());
  }

  return systems;
}

/**
 * Make `text` safe inside an XML comment: `--` must not occur there.
 *
 * @param {string} text
 * @returns {string}
 */
export function toCommentText(text) {
  return String(text).replace(/-(?=-)/g, '- ');
}

/**
 * Build the notice comment for the given code systems, or `null` when none of
 * them needs a notice.
 *
 * @param {Map<string, string[]>} systems - From `collectCodingSystems`.
 * @returns {string | null}
 */
export function createTerminologyNoticeComment(systems) {
  const blocks = [];

  for (const notice of TERMINOLOGY_NOTICES) {
    const used = notice.systems.filter(system => systems.has(system));

    if (!used.length) {
      continue;
    }

    const versions = [ ...new Set(used.flatMap(system => systems.get(system))) ];
    const heading = `${notice.title} (${used.join(', ')})` +
      (versions.length ? `, version(s) in this file: ${versions.join(', ')}` : '');

    blocks.push([ heading, ...notice.lines ].map(line => `  ${toCommentText(line)}`).join('\n'));
  }

  if (!blocks.length) {
    return null;
  }

  const intro = '  Terminology notices for the code systems used in this file (added on export by the ' +
    'Medical Terminology BPMN demo).';

  return `<!--\n${intro}\n\n${blocks.join('\n\n')}\n-->`;
}

/**
 * Insert the notice comment for the codings in `definitions` directly after
 * the XML declaration of `xml` (or at the start when there is none). Returns
 * `xml` unchanged when the diagram uses no code system that needs a notice.
 *
 * @param {string} xml - Output of `modeler.saveXML()`.
 * @param {object | null | undefined} definitions - `modeler.getDefinitions()`.
 * @returns {string}
 */
export function addTerminologyNotices(xml, definitions) {
  const comment = createTerminologyNoticeComment(collectCodingSystems(definitions));

  if (!comment || typeof xml !== 'string') {
    return xml;
  }

  const declaration = XML_DECLARATION.exec(xml);

  if (!declaration) {
    return `${comment}\n${xml}`;
  }

  const end = declaration[0].length;

  return `${xml.slice(0, end)}\n${comment}${xml.slice(end)}`;
}
