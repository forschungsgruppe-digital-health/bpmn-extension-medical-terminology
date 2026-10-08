#!/usr/bin/env node
/**
 * Coverage ratchet for the generated API reference.
 *
 * Compares the coverage report written by typedoc-plugin-coverage against a
 * committed baseline. Documentation coverage may improve freely; it may not
 * regress. Run `node tools/check-api-docs.mjs --update` after an improvement
 * to record the new floor.
 *
 * Gate on the report rather than on TypeDoc's exit code: TypeDoc's own
 * `--treatValidationWarningsAsErrors` exits non-zero and writes no output at
 * all, so a single run cannot both gate and publish.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const COVERAGE = 'docs-site/.typedoc-coverage.json';
const BASELINE = 'tools/api-docs-baseline.json';

if (!existsSync(COVERAGE)) {
  console.error(`No coverage report at ${COVERAGE}. Run \`npm run docs:api\` first.`);
  process.exit(2);
}

const report = JSON.parse(readFileSync(COVERAGE, 'utf8'));
const undocumented = (report.notDocumented || []).length;
const percent = report.percent;

if (process.argv.includes('--update')) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify({ percent, undocumented, documented: report.actual, expected: report.expected }, null, 2)}\n`
  );
  console.log(`Baseline updated: ${percent}% documented, ${undocumented} undocumented.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const regressions = [];

if (percent < baseline.percent) {
  regressions.push(`coverage fell from ${baseline.percent}% to ${percent}%`);
}
if (undocumented > baseline.undocumented) {
  regressions.push(`undocumented symbols rose from ${baseline.undocumented} to ${undocumented}`);
}

if (regressions.length > 0) {
  console.error('::error::API documentation coverage regressed');
  for (const line of regressions) console.error(`  ${line}`);
  console.error('\nFirst undocumented symbols:');
  for (const name of (report.notDocumented || []).slice(0, 20)) console.error(`  ${name}`);
  console.error('\nDocument them, or run `node tools/check-api-docs.mjs --update` if the drop is intended.');
  process.exit(1);
}

if (percent > baseline.percent || undocumented < baseline.undocumented) {
  console.log(
    `::notice::API documentation improved to ${percent}% (${undocumented} undocumented). ` +
    'Run `node tools/check-api-docs.mjs --update` to lower the baseline.'
  );
}

console.log(`API documentation gate passed: ${percent}% documented, ${undocumented} undocumented (baseline ${baseline.percent}% / ${baseline.undocumented}).`);
