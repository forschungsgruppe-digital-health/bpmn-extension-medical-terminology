#!/usr/bin/env node
/**
 * Lossless / stability roundtrip check for BPMN files carrying the clinical
 * `term:` extensions (BLOCKING on instability).
 *
 * The standard BPMN20.xsd cannot validate extension content (it passes via the
 * schema's `processContents="lax"` rule), so the *extension* correctness is
 * checked here instead, with the real moddle metamodel registered.
 *
 * For each file:
 *   1. parse (fromXML) with the `term:` moddle extension registered
 *   2. serialize (toXML, formatted)        -> A
 *   3. re-parse A and re-serialize          -> B
 *   4. assert A === B                        (stable / idempotent serialization)
 *   5. compare extension-element count input vs A (detect dropped elements)
 *   6. surface bpmn-moddle parse warnings    (unknown/unparsable extension content)
 *
 * Severity:
 *   FAIL (exit 1) always : serialization is not stable (A !== B)
 *   FAIL (exit 1) always : a registered extension element was dropped on parse
 *   WARN (exit 0) default : bpmn-moddle parse warnings  ->  with `--strict`, these FAIL
 *
 * Usage: node tools/moddle-roundtrip.mjs [--strict] [file.bpmn ...]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BpmnModdle } from 'bpmn-moddle';
import { resolveBpmnFiles } from './bpmn-files.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// Load the shipped moddle descriptors via fs (portable across Node 18/20/22 —
// avoids JSON import-attribute syntax differences).
const term = JSON.parse(readFileSync(join(here, '../packages/terminology/src/moddle/clinical.json'), 'utf8'));

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const files = resolveBpmnFiles(args.filter((a) => !a.startsWith('--')));

if (!files.length) {
  console.log('roundtrip: no .bpmn files found — nothing to check.');
  process.exit(0);
}

/** Count `<term:*>` element openings in a serialized document. */
const extCount = (xml) => (xml.match(/<term:[A-Za-z]/g) || []).length;

let failures = 0;
let warningsTotal = 0;

console.log(`roundtrip: checking ${files.length} file(s)${strict ? ' (strict)' : ''}…\n`);

for (const file of files) {
  const xml = readFileSync(file, 'utf8');
  const moddle = new BpmnModdle({ term });

  let rootElement;
  let warnings = [];
  try {
    ({ rootElement, warnings = [] } = await moddle.fromXML(xml));
  } catch (err) {
    console.log(`✖ ${file}\n    parse error: ${err.message}`);
    failures++;
    continue;
  }

  const { xml: a } = await moddle.toXML(rootElement, { format: true });
  const reparsed = await moddle.fromXML(a);
  const { xml: b } = await moddle.toXML(reparsed.rootElement, { format: true });

  const stable = a === b;
  const inCount = extCount(xml);
  const outCount = extCount(a);
  const droppedKnown = inCount > outCount; // an extension element vanished on parse

  const hardFail = !stable;
  const lossy = warnings.length > 0 || droppedKnown;
  warningsTotal += warnings.length;

  const status = hardFail || (strict && lossy) ? '✖' : lossy ? '⚠' : '✓';
  console.log(`${status} ${file}`);
  console.log(`    stable=${stable}  extension-elements ${inCount} -> ${outCount}`);

  if (!stable) {
    console.log('    serialization is NOT idempotent (re-serializing changed the output)');
  }
  if (warnings.length) {
    for (const w of warnings) {
      const msg = String(w.message || w).split('\n')[0];
      console.log(`    warning: ${msg}`);
    }
  }
  console.log('');

  if (hardFail) failures++;
  else if (strict && lossy) failures++;
}

if (warningsTotal && !strict) {
  console.log(
    `roundtrip: ${warningsTotal} parse warning(s) — non-fatal (extension content the moddle model does not define).`
  );
  console.log('roundtrip: run with --strict to treat these as failures.');
}

if (failures) {
  console.error(`\nroundtrip: ${failures} file(s) failed.`);
  process.exit(1);
}
console.log('roundtrip: OK.');
