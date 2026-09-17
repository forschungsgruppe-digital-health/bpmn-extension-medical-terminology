#!/usr/bin/env node
/**
 * Type gate for the documentation toolchain.
 *
 * Runs `tsc --noEmit --checkJs` over the package source and fails on an
 * allowlist of error codes only. The allowlist covers the mistakes that
 * silently degrade the generated API reference — an unresolvable module
 * specifier makes every type from it render as `any`, and a stale JSDoc tag
 * publishes the wrong prose against the wrong symbol.
 *
 * The full strict sweep reports many more findings. Those are a separate
 * workstream, so this gate deliberately ignores them rather than failing the
 * build on work nobody has scheduled.
 *
 * Usage:
 *   node tools/check-doc-types.mjs          fail on any allowlisted error
 *   node tools/check-doc-types.mjs --all    report every error, still gate on the allowlist
 */
import { spawnSync } from 'node:child_process';

/** Error codes that make the generated reference wrong rather than merely incomplete. */
const GATED = [
  { code: 'TS2835', why: 'relative import needs an explicit file extension under NodeNext' },
  { code: 'TS2306', why: 'module is not a module (a dead `import(...)` type expression)' },
  { code: 'TS2307', why: 'module specifier does not resolve' },
  { code: 'TS6137', why: 'type cannot be imported with this syntax' },
  { code: 'TS8024', why: 'JSDoc @param names a parameter that does not exist' },
  { code: 'TS8022', why: 'JSDoc tag is not valid here' },
  { code: 'TS8023', why: 'JSDoc @returns on a symbol that returns nothing' }
];

const reportAll = process.argv.includes('--all');
const gatedCodes = new Set(GATED.map(entry => entry.code));

const result = spawnSync(
  process.execPath,
  [
    new URL('../node_modules/typescript/bin/tsc', import.meta.url).pathname,
    '-p', 'tsconfig.docs.json',
    '--checkJs',
    '--noEmit'
  ],
  { encoding: 'utf8' }
);

const lines = `${result.stdout || ''}${result.stderr || ''}`.split('\n').filter(Boolean);
const failures = lines.filter(line => {
  const match = line.match(/error (TS\d+):/);
  return match && gatedCodes.has(match[1]);
});

if (reportAll) {
  const counts = new Map();
  for (const line of lines) {
    const match = line.match(/error (TS\d+):/);
    if (match) counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  }
  console.log('All diagnostics by code (informational):');
  for (const [code, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${code}${gatedCodes.has(code) ? '  <- gated' : ''}`);
  }
  console.log('');
}

if (failures.length === 0) {
  console.log(`Documentation type gate passed: 0 findings in ${GATED.length} gated codes.`);
  process.exit(0);
}

console.error(`Documentation type gate failed: ${failures.length} finding(s).\n`);
for (const line of failures) console.error(`  ${line}`);
console.error('\nWhat these mean:');
for (const entry of GATED) {
  if (failures.some(line => line.includes(entry.code))) {
    console.error(`  ${entry.code}  ${entry.why}`);
  }
}
process.exit(1);
