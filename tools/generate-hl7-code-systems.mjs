import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHl7ExclusionReason } from '../extension/src/providers/presets/hl7-exclusions.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageName = 'hl7.terminology.r4';
const packageDirectory = resolve(repositoryRoot, 'node_modules', packageName);
const targetPath = resolve(
  repositoryRoot,
  'extension/src/providers/presets/hl7-code-systems.json'
);
const checkOnly = process.argv.includes('--check');

const resourceFiles = readdirSync(packageDirectory)
  .filter(fileName => /^CodeSystem-.*\.json$/i.test(fileName))
  .sort();

if (resourceFiles.length === 0) {
  throw new Error(`No CodeSystem resources found in ${packageDirectory}.`);
}

// hl7.terminology.r4 also carries a few code systems owned by third parties.
// They are not redistributed in the bundled preset. The list and the
// "Third Party IP" check live in hl7-exclusions.js, which build-time and
// runtime package discovery share.
const allCodeSystems = resourceFiles.map(fileName =>
  JSON.parse(readFileSync(resolve(packageDirectory, fileName), 'utf8'))
);
const excludedCodeSystems = allCodeSystems
  .map(codeSystem => ({ url: codeSystem.url, reason: getHl7ExclusionReason(codeSystem) }))
  .filter(entry => entry.reason);
const codeSystems = allCodeSystems.filter(codeSystem => !getHl7ExclusionReason(codeSystem));

// Guards for package updates. A new THO release can bring content that HL7
// does not own. The generator stops until someone has reviewed it and either
// excluded it in hl7-exclusions.js or recorded the review below.
//
// 1. Publisher: every kept code system must have an HL7 publisher, or be listed
//    by canonical URL in REVIEWED_NON_HL7_CODE_SYSTEMS.
// 2. Copyright: every kept code system must have no copyright statement or the
//    THO CC0 boilerplate, or be listed in REVIEWED_COPYRIGHT_STATEMENTS.
const HL7_PUBLISHER_PATTERN = /\bHL7\b|Health Level Seven|Health Level 7/i;
const THO_CC0_BOILERPLATE = /^This material derives from the HL7 Terminology \(?THO\)?\. THO is copyright \S*\s*1989\+ Health Level Seven International and is made available under the CC0 designation\. For more licensing information see: https:\/\/terminology\.hl7\.org\/license(\.html)?\s*$/;

const REVIEWED_NON_HL7_CODE_SYSTEMS = Object.freeze({
  'http://terminology.hl7.org/CodeSystem/ILRSpeakingSkillScale':
    'Interagency Language Roundtable; public domain per CodeSystem.copyright',
  'https://www.cms.gov/Medicare/Coding/place-of-service-codes/Place_of_Service_Code_Set':
    'CMS place of service codes; US government work, public domain',
  'https://www.cms.gov/Medicare/Medicare-Fee-for-Service-Payment/HospitalAcqCond/Coding':
    'CMS POA indicator codes; public domain per CodeSystem.copyright',
  'http://terminology.hl7.org/CodeSystem/v2-0005':
    'HL7 v2 table 0005 fragment (publisher CDC); CodeSystem.copyright: HL7, public domain',
  'http://terminology.hl7.org/CodeSystem/v3-ISO3166-1retired': 'Retired placeholder without concepts',
  'http://terminology.hl7.org/CodeSystem/v3-ISO3166-2retired': 'Retired placeholder without concepts',
  'http://terminology.hl7.org/CodeSystem/v3-ISO3166-3retired': 'Retired placeholder without concepts',
  'http://terminology.hl7.org/CodeSystem/v3-iso4217-HL7': 'HL7 code system without publisher or concepts',
  'http://terminology.hl7.org/CodeSystem/deviceassociation-relationship': 'HL7 code system without publisher',
  'http://terminology.hl7.org/CodeSystem/deviceassociation-relationship-status': 'HL7 code system without publisher',
  'http://terminology.hl7.org/CodeSystem/deviceassociation-status-reason': 'HL7 code system without publisher',
  'http://terminology.hl7.org/CodeSystem/nutritionintake-status-reason': 'HL7 code system without publisher'
});

// Excerpts from other standards; THIRD_PARTY_NOTICES.md names them.
const REVIEWED_COPYRIGHT_STATEMENTS = Object.freeze({
  'http://terminology.hl7.org/CodeSystem/audit-event-type': 'DICOM PS3.16 excerpt',
  'http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle': 'DICOM PS3.16 excerpt',
  'http://terminology.hl7.org/CodeSystem/iso-21089-lifecycle': 'ISO TS 21089-2017 excerpt',
  'http://terminology.hl7.org/CodeSystem/contractsignertypecodes': 'Example set based on ASTM E1762-95',
  'http://terminology.hl7.org/CodeSystem/endpoint-connection-type': 'THO boilerplate plus some IHE content',
  'http://terminology.hl7.org/CodeSystem/time-period-ranges': 'Adapted from IHE content, CC BY 4.0',
  'http://terminology.hl7.org/CodeSystem/ILRSpeakingSkillScale': 'Public domain',
  'https://www.cms.gov/Medicare/Medicare-Fee-for-Service-Payment/HospitalAcqCond/Coding': 'Public domain',
  'http://terminology.hl7.org/CodeSystem/v2-0005': 'HL7, public domain',
  'http://terminology.hl7.org/CodeSystem/v2-tables': 'HL7, public domain'
});

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function getUnreviewedReason(codeSystem) {
  const publisher = typeof codeSystem.publisher === 'string' ? codeSystem.publisher.trim() : '';
  const copyright = typeof codeSystem.copyright === 'string' ? codeSystem.copyright.trim() : '';

  if (!HL7_PUBLISHER_PATTERN.test(publisher) && !hasOwn(REVIEWED_NON_HL7_CODE_SYSTEMS, codeSystem.url)) {
    return `publisher "${publisher || 'none'}"`;
  }

  if (copyright && !THO_CC0_BOILERPLATE.test(copyright) && !hasOwn(REVIEWED_COPYRIGHT_STATEMENTS, codeSystem.url)) {
    return 'a copyright statement other than the THO CC0 boilerplate';
  }

  return null;
}

const unreviewedCodeSystems = codeSystems
  .map(codeSystem => ({ url: codeSystem.url, reason: getUnreviewedReason(codeSystem) }))
  .filter(entry => entry.reason);

if (unreviewedCodeSystems.length > 0) {
  throw new Error(
    'hl7.terminology.r4 contains code systems that have not been reviewed for third-party rights: ' +
    unreviewedCodeSystems.map(entry => `${entry.url} (${entry.reason})`).join('; ') +
    '. Exclude them in extension/src/providers/presets/hl7-exclusions.js, or review their licence ' +
    'and record it in REVIEWED_NON_HL7_CODE_SYSTEMS or REVIEWED_COPYRIGHT_STATEMENTS in ' +
    'tools/generate-hl7-code-systems.mjs (and in THIRD_PARTY_NOTICES.md if a notice is needed).'
  );
}
const source = `${JSON.stringify(codeSystems)}\n`;
const exclusionSummary = excludedCodeSystems.length
  ? ` Excluded ${excludedCodeSystems.length} third-party code systems: ` +
    excludedCodeSystems.map(entry => `${entry.url} (${entry.reason})`).join('; ') + '.'
  : '';

if (checkOnly) {
  if (!existsSync(targetPath) || readFileSync(targetPath, 'utf8') !== source) {
    throw new Error(`${targetPath} is out of date. Run npm run generate:hl7.`);
  }

  console.log(`HL7 CodeSystem data is up to date (${codeSystems.length} resources).${exclusionSummary}`);
} else {
  writeFileSync(targetPath, source);
  console.log(`Generated ${codeSystems.length} HL7 CodeSystems.${exclusionSummary}`);
}
