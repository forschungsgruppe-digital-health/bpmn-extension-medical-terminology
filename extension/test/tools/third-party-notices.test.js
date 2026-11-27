import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EXCLUDED_HL7_CODE_SYSTEMS, getHl7ExclusionReason } from '../../src/providers/presets/hl7-exclusions.js';

// Keeps THIRD_PARTY_NOTICES.md, and the figures the READMEs and the licensing
// page repeat from it, in step with what the package actually ships.
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const read = file => readFileSync(join(repoRoot, file), 'utf8');

const notices = read('extension/THIRD_PARTY_NOTICES.md');
const packageJson = JSON.parse(read('extension/package.json'));
const hl7CodeSystems = JSON.parse(read('extension/src/providers/presets/hl7-code-systems.json'));
const generatorSource = read('tools/generate-hl7-code-systems.mjs');

/** Documents that repeat figures or duties from THIRD_PARTY_NOTICES.md. */
const DOCUMENTS = [
  'README.md',
  'extension/README.md',
  'docs-site/src/content/docs/licensing.md'
];

const HL7_CODE_SYSTEM_PREFIX = 'http://terminology.hl7.org/CodeSystem/';
const SNOMED_SYNONYM = '900000000000013009';
const KDL_BUNDLE_DUTY =
  'If you ship a bundle that contains it, include the GPL text, the DVMD copyright and ' +
  'no-warranty notice, and a pointer to the source';

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty'
];
const toNumber = word => (/^\d+$/.test(word) ? Number(word) : NUMBER_WORDS.indexOf(word.toLowerCase()));

/** Text from a Markdown heading up to the next heading of the same or a higher level. */
function section(markdown, title) {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => /^#{1,6} /.test(line) && line.replace(/^#+ /, '') === title);
  if (start === -1) throw new Error(`THIRD_PARTY_NOTICES.md has no heading "${title}".`);

  const level = lines[start].match(/^#+/)[0].length;
  const end = lines.findIndex((line, index) => {
    const heading = line.match(/^(#{1,6}) /);
    return index > start && heading && heading[1].length <= level;
  });
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

/** Text of the top-level list item that starts with the given bold label. */
function listItem(markdown, label) {
  const start = markdown.indexOf(`- **${label}**`);
  if (start === -1) throw new Error(`No list item "${label}".`);
  const end = markdown.indexOf('\n- ', start + 1);
  return markdown.slice(start, end === -1 ? undefined : end);
}

const normalize = text => text.replace(/\s+/g, ' ');
const backticked = text => [...text.matchAll(/`([^`]+)`/g)].map(match => match[1]);
const sorted = values => [...new Set(values)].sort();

/** Version of a dependency, also when it is a Simplifier tarball URL. */
function dependencyVersion(name) {
  const spec = packageJson.dependencies[name];
  return spec.startsWith('https://') ? spec.split('/').pop() : spec;
}

function allConcepts(concepts = []) {
  return concepts.flatMap(concept => [concept, ...allConcepts(concept.concept)]);
}

/** Code systems of the installed hl7.terminology.r4 package, read as the generator reads them. */
function packageCodeSystems() {
  const directory = join(repoRoot, 'node_modules', 'hl7.terminology.r4');
  return readdirSync(directory)
    .filter(fileName => /^CodeSystem-.*\.json$/i.test(fileName))
    .map(fileName => JSON.parse(readFileSync(join(directory, fileName), 'utf8')));
}

/** Number of SNOMED CT synonym designations per bundled code system URL. */
function snomedSynonymUsage() {
  const usage = new Map();
  for (const codeSystem of hl7CodeSystems) {
    for (const concept of allConcepts(codeSystem.concept)) {
      for (const designation of concept.designation || []) {
        if (designation.use?.system === 'http://snomed.info/sct' && designation.use.code === SNOMED_SYNONYM) {
          usage.set(codeSystem.url, (usage.get(codeSystem.url) || 0) + 1);
        }
      }
    }
  }
  return usage;
}

/** LOINC codes that v3-ActCode carries as concepts. */
function actCodeLoincCodes() {
  const actCode = hl7CodeSystems.find(codeSystem => codeSystem.url === `${HL7_CODE_SYSTEM_PREFIX}v3-ActCode`);
  return allConcepts(actCode.concept)
    .filter(concept => (concept.property || []).some(property =>
      property.code === 'subsumedBy' && property.valueCode === '_LOINCObservationActContextAgeType'))
    .map(concept => concept.code);
}

const SNOMED_FIGURES =
  /(\d+) (?:bundled |HL7 )?code systems use the SNOMED CT concept `?900000000000013009`? \(Synonym\) (\d+) times as `designation\.use`/;
const LOINC_FIGURES = /\b(\w+) LOINC codes\b/g;

/** Every count the text gives for the LOINC codes ("five LOINC codes"). */
function loincFigures(text) {
  return [...text.matchAll(LOINC_FIGURES)].map(match => toNumber(match[1])).filter(count => count >= 0);
}

function reviewedCopyrightStatements() {
  const block = generatorSource.match(/const REVIEWED_COPYRIGHT_STATEMENTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  if (!block) throw new Error('REVIEWED_COPYRIGHT_STATEMENTS not found in tools/generate-hl7-code-systems.mjs.');
  return [...block[1].matchAll(/^\s*'([^']+)':/gm)].map(match => match[1]);
}

describe('THIRD_PARTY_NOTICES.md', () => {
  const hl7 = section(notices, 'HL7 Terminology (THO)');

  it('names the hl7.terminology.r4 release the package depends on', () => {
    expect(hl7).toMatch(/`hl7\.terminology\.r4` (\S+),/);
    expect(hl7.match(/`hl7\.terminology\.r4` (\S+),/)[1]).toBe(dependencyVersion('hl7.terminology.r4'));
  });

  it('states how many HL7 code systems are bundled', () => {
    const match = hl7.match(/\*\*Content:\*\* (\d+) `CodeSystem` resources/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBe(hl7CodeSystems.length);
  });

  it('lists exactly the excluded third-party code systems', () => {
    const listed = backticked(section(notices, 'Code systems left out of the bundle'))
      .filter(value => /^https?:\/\//.test(value));
    const bundledUrls = new Set(hl7CodeSystems.map(codeSystem => codeSystem.url));

    // The generator leaves out the listed URLs and anything marked "Third Party IP".
    const excluded = packageCodeSystems()
      .filter(codeSystem => getHl7ExclusionReason(codeSystem))
      .map(codeSystem => codeSystem.url);

    expect(excluded.length).toBeGreaterThan(0);
    expect(sorted(listed)).toEqual(sorted(excluded));
    expect(listed, 'every URL in hl7-exclusions.js').toEqual(
      expect.arrayContaining(Object.keys(EXCLUDED_HL7_CODE_SYSTEMS)));
    expect(listed.filter(url => bundledUrls.has(url))).toEqual([]);
  });

  it('lists exactly the copyright statements the generator has reviewed', () => {
    const table = section(notices, 'Copyright statements other than the THO CC0 notice');
    const listed = [...table.matchAll(/^\| `(https?:\/\/[^`]+)` \|/gm)].map(match => match[1]);
    const reviewed = reviewedCopyrightStatements();

    expect(reviewed.length).toBeGreaterThan(0);
    expect(sorted(listed)).toEqual(sorted(reviewed));

    for (const url of listed) {
      const codeSystem = hl7CodeSystems.find(candidate => candidate.url === url);
      expect(codeSystem, url).toBeDefined();
      expect(codeSystem.copyright, url).toBeTruthy();
    }
  });

  describe('SNOMED CT and LOINC identifiers in HL7 concepts', () => {
    const identifiers = section(notices, 'SNOMED CT and LOINC identifiers in HL7 concepts');

    it('counts the SNOMED CT synonym designations precisely', () => {
      const usage = snomedSynonymUsage();
      const total = [...usage.values()].reduce((sum, count) => sum + count, 0);

      const snomed = normalize(listItem(identifiers, 'SNOMED CT:'));
      const match = snomed.match(SNOMED_FIGURES);
      expect(match).not.toBeNull();
      expect(Number(match[1])).toBe(usage.size);
      expect(Number(match[2])).toBe(total);

      const listed = backticked(snomed)
        .filter(value => /^[\w-]+$/.test(value) && value !== SNOMED_SYNONYM)
        .map(id => `${HL7_CODE_SYSTEM_PREFIX}${id}`);
      expect(sorted(listed)).toEqual(sorted(usage.keys()));
    });

    it('lists the LOINC codes in v3-ActCode', () => {
      const loincCodes = actCodeLoincCodes();

      const listed = backticked(listItem(identifiers, 'LOINC:')).filter(value => /^\d+-\d$/.test(value));
      expect(loincCodes.length).toBeGreaterThan(0);
      expect(sorted(listed)).toEqual(sorted(loincCodes));

      const counts = loincFigures(normalize(notices));
      expect(counts.length).toBeGreaterThan(0);
      expect(counts.every(count => count === loincCodes.length), String(counts)).toBe(true);
    });
  });

  describe('IHE Deutschland and KDL', () => {
    const dependencies = section(notices, 'IHE Deutschland XDS value sets and KDL');
    const kdlLicence = section(notices, 'KDL licence');

    it('names the IHE Deutschland and KDL package versions the package depends on', () => {
      expect(dependencies.match(/`de\.ihe-d\.terminology` (\S+) \|/)?.[1]).toBe(dependencyVersion('de.ihe-d.terminology'));
      expect(dependencies.match(/`dvmd\.kdl\.r4` (\S+) \|/)?.[1]).toBe(dependencyVersion('dvmd.kdl.r4'));
      expect(kdlLicence.match(/`dvmd\.kdl\.r4` (\S+),/)?.[1]).toBe(dependencyVersion('dvmd.kdl.r4'));
    });

    it('points to the unmodified KDL source the package installs', () => {
      expect(kdlLicence).toContain(`<${packageJson.dependencies['dvmd.kdl.r4']}>`);
    });

    it('states the GPL licence of the KDL and the MIT licence of the package code', () => {
      const kdlRow = dependencies.split('\n').find(line => line.includes('`dvmd.kdl.r4`'));
      expect(kdlRow).toContain('GPL-3.0-or-later');

      const text = normalize(kdlLicence);
      expect(text).toContain('GPL-3.0-or-later');
      expect(text).toContain('https://www.gnu.org/licenses/gpl-3.0.html');
      expect(text).toContain('The GPL covers only the KDL content.');
      expect(text).toContain('MIT License');
    });

    it('tells integrators what to ship with a bundle that contains the KDL', () => {
      expect(normalize(kdlLicence)).toContain(`${KDL_BUNDLE_DUTY}.`);
    });
  });
});

describe.each(DOCUMENTS)('%s', file => {
  const text = normalize(read(file));

  it('repeats the SNOMED CT figures of the bundled HL7 code systems correctly', () => {
    const usage = snomedSynonymUsage();
    const total = [...usage.values()].reduce((sum, count) => sum + count, 0);

    const match = text.match(SNOMED_FIGURES);
    expect(match, 'SNOMED CT figures').not.toBeNull();
    expect(Number(match[1])).toBe(usage.size);
    expect(Number(match[2])).toBe(total);
  });

  it('repeats the number of LOINC codes in v3-ActCode correctly', () => {
    const counts = loincFigures(text);
    expect(counts.length, 'LOINC figures').toBeGreaterThan(0);
    expect(counts.every(count => count === actCodeLoincCodes().length), String(counts)).toBe(true);
  });

  it('states what to ship with a bundle that contains the KDL', () => {
    expect(text).toContain(KDL_BUNDLE_DUTY);
  });
});
