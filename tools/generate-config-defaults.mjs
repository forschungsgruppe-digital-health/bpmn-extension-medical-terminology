#!/usr/bin/env node
/**
 * Generate the default-configuration reference page from the code that
 * produces the defaults.
 *
 * The values a reader most needs — which terminology server is contacted, and
 * which code system versions are pinned — are module-private constants inside
 * `extension/src/config/terminology-config.js`. They can never appear in a
 * generated API reference, and pinned version years are exactly the kind of
 * fact that rots. So the page is generated from the assembled configuration
 * itself, and `--check` fails the build when the page and the code disagree,
 * the same way the XSD and the HL7 preset are guarded.
 *
 * Usage:
 *   node tools/generate-config-defaults.mjs           write the page
 *   node tools/generate-config-defaults.mjs --check   fail if the page is stale
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  createDefaultTerminologyConfig,
  createDefaultServerConfig
} from '../extension/src/config/terminology-config.js';

const TARGET = 'docs-site/src/content/docs/configuration/defaults.md';

const code = value => (value === undefined || value === null || value === '' ? '—' : `\`${value}\``);
const read = (provider, name) => {
  try {
    const value = provider[name];
    return typeof value === 'function' ? undefined : value;
  } catch {
    return undefined;
  }
};

const config = createDefaultTerminologyConfig();
const server = createDefaultServerConfig();

const lines = [];
lines.push('---');
lines.push('title: "Default configuration"');
lines.push('description: "Every value the extension uses when you call createDefaultTerminologyModule with no arguments."');
lines.push('editUrl: false');
lines.push('---');
lines.push('');
lines.push(':::note');
lines.push('This page is generated from `extension/src/config/terminology-config.js` by');
lines.push('`tools/generate-config-defaults.mjs`, and a `--check` run in CI fails when the two');
lines.push('disagree. It is therefore the authoritative list of defaults; the prose pages link here');
lines.push('rather than repeating values.');
lines.push(':::');
lines.push('');
lines.push('These are the values in effect when you call');
lines.push('[`createDefaultTerminologyModule`](/api/functions/createdefaultterminologymodule/) or');
lines.push('[`createDefaultTerminologyConfig`](/api/functions/createdefaultterminologyconfig/) with no');
lines.push('arguments. Every one of them can be overridden — see [Configuration](/configuration/).');
lines.push('');
lines.push('## Terminology server');
lines.push('');
lines.push('| Setting | Default |');
lines.push('| --- | --- |');
for (const [key, value] of Object.entries(server)) {
  lines.push(`| \`${key}\` | ${code(value)} |`);
}
lines.push('');
lines.push('The public Ontoserver instance is a convenience for getting started, not a service this');
lines.push('project operates or guarantees. Point `fhirBaseUrl` at a terminology server you control');
lines.push('before relying on it, and note that the licensed content it serves — SNOMED CT, LOINC,');
lines.push('ICD-10-GM, OPS, ATC — is licensed by whoever operates that server, not by this package.');
lines.push('');
lines.push('## Providers contacted over the network');
lines.push('');
lines.push('| Id | Display name | Code system | Source |');
lines.push('| --- | --- | --- | --- |');
for (const provider of config.providers || []) {
  lines.push(
    `| ${code(read(provider, 'id'))} | ${read(provider, 'displayName') || '—'} ` +
    `| ${code(read(provider, 'systemUri'))} | ${read(provider, 'sourceLabel') || '—'} |`
  );
}
lines.push('');
lines.push('## FHIR-backed code systems');
lines.push('');
lines.push('Each of these is served by the terminology server above, through the FHIR');
lines.push('`$expand`, `$lookup` and `$validate-code` operations.');
lines.push('');
lines.push('| Id | Display name | Code system URI | Value set | Pinned version |');
lines.push('| --- | --- | --- | --- | --- |');
for (const entry of config.fhirProviders || []) {
  const pinned = entry.expandParameters?.valueSetVersion || entry.version;
  lines.push(
    `| ${code(entry.id)} | ${entry.displayName || '—'} | ${code(entry.systemUri)} ` +
    `| ${code(entry.valueSetUri)} | ${code(pinned)} |`
  );
}
lines.push('');
lines.push('A pinned version means the expansion is requested for exactly that release of the code');
lines.push('system. Override it per provider if your server carries a different release.');
lines.push('');
lines.push('## Code systems bundled with the package');
lines.push('');
lines.push('These need no network access: the concepts ship inside the package, generated from');
lines.push('openly licensed FHIR packages by `tools/generate-hl7-code-systems.mjs`.');
lines.push('');
lines.push('| Id | Display name | Package | Package version |');
lines.push('| --- | --- | --- | --- |');
for (const provider of config.packageProviders || []) {
  lines.push(
    `| ${code(read(provider, 'id'))} | ${read(provider, 'displayName') || '—'} ` +
    `| ${code(read(provider, 'packageName'))} | ${code(read(provider, 'packageVersion'))} |`
  );
}
lines.push('');
lines.push('## Lazy provider loader');
lines.push('');
lines.push('| Setting | Default |');
lines.push('| --- | --- |');
for (const [key, value] of Object.entries(config.loaderConfig || {})) {
  lines.push(`| \`${key}\` | ${code(value)} |`);
}
lines.push('');

const rendered = `${lines.join('\n')}`;

if (process.argv.includes('--check')) {
  if (!existsSync(TARGET)) {
    console.error(`${TARGET} is missing. Run \`npm run docs:defaults\`.`);
    process.exit(1);
  }
  if (readFileSync(TARGET, 'utf8') !== rendered) {
    console.error(`${TARGET} is out of date with extension/src/config/terminology-config.js.`);
    console.error('Run `npm run docs:defaults` and commit the result.');
    process.exit(1);
  }
  console.log('Default-configuration page is up to date.');
  process.exit(0);
}

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, rendered);
console.log(`Wrote ${TARGET}`);
