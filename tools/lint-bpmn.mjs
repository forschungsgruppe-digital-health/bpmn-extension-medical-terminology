#!/usr/bin/env node
/**
 * BPMN 2.0 and terminology conformance gate (BLOCKING).
 *
 * Runs `bpmnlint` (the bpmn.io linter) over the project's `.bpmn` files using the
 * repo-level `.bpmnlintrc` (standard BPMN rules plus the terminology plugin).
 * bpmnlint checks BPMN structure/correctness — disconnected nodes, missing
 * start/end events, implicit splits, dangling references, etc. — and the
 * configured terminology rules. Extension serialization is checked separately
 * by `tools/moddle-roundtrip.mjs`. See `skills/bpmn-conformance/SKILL.md` for
 * the division of labour.
 *
 * Usage: node tools/lint-bpmn.mjs [file.bpmn ...]   (no args -> discover all)
 * Exit:  0 = clean, non-zero = lint errors (or bpmnlint failure).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolveBpmnFiles } from './bpmn-files.mjs';

const require = createRequire(import.meta.url);
const files = resolveBpmnFiles(process.argv.slice(2));

if (!files.length) {
  console.log('bpmnlint: no .bpmn files found — nothing to lint.');
  process.exit(0);
}

let bpmnlintBin;
try {
  bpmnlintBin = require.resolve('bpmnlint/bin/bpmnlint.js');
} catch {
  console.error('bpmnlint is not installed. Run `npm install --legacy-peer-deps` first.');
  process.exit(1);
}

console.log(`bpmnlint: linting ${files.length} file(s)…`);
// Run the JS entry point with the current node binary so this works cross-platform
// (no reliance on a `.bin` shim being on PATH).
const result = spawnSync(process.execPath, [bpmnlintBin, ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
