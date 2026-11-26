#!/usr/bin/env node
/**
 * Generate the default-configuration reference page from the code that
 * produces the defaults.
 *
 * The values a reader most needs — which terminology server is contacted, and
 * which code systems and value sets are requested — are module-private
 * constants inside `extension/src/config/terminology-config.js`. They can never
 * appear in a generated API reference, and they are exactly the kind of fact
 * that rots. So the page is generated from the assembled configuration itself,
 * and `--check` fails the build when the page and the code disagree, the same
 * way the XSD and the HL7 preset are guarded.
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
import {
  DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG
} from '../extension/src/properties-panel/config.js';

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

// The no-argument configuration warns that licensed providers stay disabled;
// that is the documented behaviour, not a generator problem.
const originalWarn = console.warn;
console.warn = () => {};
const config = createDefaultTerminologyConfig();
// Placeholder server and edition, used only to list what becomes available
// once an integrator configures their own licensed server.
const EXAMPLE_SERVER_URL = 'https://terminology.example.org/fhir';
const EXAMPLE_SNOMED_EDITION = '11000274103';
const EXAMPLE_SNOMED_RELEASE = '20260815';
const configuredConfig = createDefaultTerminologyConfig({
  serverConfig: { fhirBaseUrl: EXAMPLE_SERVER_URL },
  snomedConfig: { edition: EXAMPLE_SNOMED_EDITION },
  loaderConfig: false
});
const pinnedSnomedConfig = createDefaultTerminologyConfig({
  serverConfig: { fhirBaseUrl: EXAMPLE_SERVER_URL },
  snomedConfig: { edition: EXAMPLE_SNOMED_EDITION, editionVersion: EXAMPLE_SNOMED_RELEASE },
  enableFhirDefaults: false,
  enablePackageDefaults: false,
  packageAutoDiscovery: false,
  loaderConfig: false
});
console.warn = originalWarn;
const SERVER_RELEASE = "Server's current release";
const server = createDefaultServerConfig();
const panelConfig = DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG;

const lines = [];
lines.push('---');
lines.push('title: "Default configuration"');
lines.push('description: "Every value the extension uses when you call createDefaultTerminologyModule with no arguments."');
lines.push('editUrl: false');
lines.push('---');
lines.push('');
lines.push(':::note');
lines.push('This page is generated from `extension/src/config/terminology-config.js` and');
lines.push('`extension/src/properties-panel/config.js` by `tools/generate-config-defaults.mjs`,');
lines.push('and a `--check` run in CI fails when the code and docs disagree. It is therefore');
lines.push('the authoritative list of defaults; the prose pages link here rather than repeating values.');
lines.push(':::');
lines.push('');
lines.push('These are the values in effect when you call');
lines.push('[`createDefaultTerminologyModule`](/api/functions/createdefaultterminologymodule/) or');
lines.push('[`createDefaultTerminologyConfig`](/api/functions/createdefaultterminologyconfig/) with no');
lines.push('arguments. Every one of them can be overridden — see [Configuration](/configuration/).');
lines.push('For a worked example with a real server, see [Connecting a terminology server](/configuration/terminology-server/).');
lines.push('');
lines.push('## Terminology server');
lines.push('');
lines.push('| Setting | Default |');
lines.push('| --- | --- |');
for (const [key, value] of Object.entries(server)) {
  lines.push(`| \`${key}\` | ${code(value)} |`);
}
lines.push('');
lines.push('No terminology server is preconfigured, so the default configuration contacts no');
lines.push('server at all. SNOMED CT, LOINC, ICD-10-GM, OPS and ATC are licensed content: set');
lines.push('`serverConfig.fhirBaseUrl` to a server you are licensed to use. The content it serves is');
lines.push('licensed by its publishers, not by this package — see [Licensing](/licensing/).');
lines.push('');
lines.push('## Providers contacted over the network');
lines.push('');
const networkProviders = config.providers || [];
if (networkProviders.length === 0) {
  lines.push('None by default.');
  lines.push('');
}
lines.push('With a configured server and SNOMED CT edition, for example');
lines.push(`\`serverConfig: { fhirBaseUrl: '${EXAMPLE_SERVER_URL}' }\` and`);
lines.push(`\`snomedConfig: { edition: '${EXAMPLE_SNOMED_EDITION}' }\` (German National Edition), the`);
lines.push('SNOMED CT provider is registered as follows. Without `snomedConfig.edition` (or an explicit');
lines.push('`snomedConfig.valueSetUri`) it stays disabled, so the server cannot silently answer from an');
lines.push('edition you are not licensed for.');
lines.push('');
lines.push('| Id | Display name | Code system | Value set | `$lookup` version | Version label |');
lines.push('| --- | --- | --- | --- | --- | --- |');
const snomedRows = [
  ...(configuredConfig.providers || []),
  ...(pinnedSnomedConfig.providers || [])
];
for (const provider of snomedRows) {
  const adapter = read(provider, '_adapter');
  lines.push(
    `| ${code(read(provider, 'id'))} | ${read(provider, 'displayName') || '—'} ` +
    `| ${code(read(provider, 'systemUri'))} | ${code(adapter?._valueSetUri)} ` +
    `| ${code(adapter?._lookupParameters?.version)} | ${code(read(provider, 'version'))} |`
  );
}
const exampleStoredVersion = read(pinnedSnomedConfig.providers?.[0], 'version');
lines.push('');
lines.push('The first row is `snomedConfig: { edition }` alone, the second adds');
lines.push(`\`editionVersion: '${EXAMPLE_SNOMED_RELEASE}'\`. Each coding stores the release the server reports`);
lines.push(`for it, for example \`${exampleStoredVersion}\`. The provider has a version label`);
lines.push('only when `editionVersion` pins a release; only then are stored codings of another release');
lines.push('marked "Version unavailable".');
lines.push('');
lines.push('## FHIR-backed code systems');
lines.push('');
lines.push('These are registered only once `serverConfig.fhirBaseUrl` is set. Each is then served');
lines.push('by that server through the FHIR `$expand` and `$lookup` operations.');
lines.push('');
lines.push('| Id | Display name | Code system URI | Value set | Release |');
lines.push('| --- | --- | --- | --- | --- |');
for (const entry of configuredConfig.fhirProviders || []) {
  const systemVersion = ['system-version', 'force-system-version']
    .map(name => entry.expandParameters?.[name])
    .find(value => typeof value === 'string' && value.includes('|'))
    ?.split('|')[1];
  const pinned = entry.version
    || entry.lookupParameters?.version
    || entry.expandParameters?.valueSetVersion
    || entry.expandParameters?.version
    || systemVersion;
  lines.push(
    `| ${code(entry.id)} | ${entry.displayName || '—'} | ${code(entry.systemUri)} ` +
    `| ${code(entry.valueSetUri)} | ${pinned ? `Pinned: ${code(pinned)}` : SERVER_RELEASE} |`
  );
}
lines.push('');
lines.push('Release: the server\'s current release; each coding stores the release the server reports');
lines.push('(`used-codesystem` in `$expand`, the `version` output of `$lookup`). No release is pinned,');
lines.push('because a hard-coded year stops working once a server drops that release. To pin one, see');
lines.push('[Pin a release](/configuration/terminology-server/#pin-a-release).');
lines.push('');
const atcEntry = (configuredConfig.fhirProviders || []).find(entry => entry.id === 'atc');
if (atcEntry) {
  lines.push(':::caution[Breaking change: ATC is ATC-GM]');
  lines.push(`The \`atc\` provider uses the BfArM ATC-GM, \`${atcEntry.systemUri}\` with the value set`);
  lines.push(`\`${atcEntry.valueSetUri}\`, instead of the WHO ATC (\`http://www.whocc.no/atc\`). New codings`);
  lines.push('carry the ATC-GM system URI; existing codings with the WHO ATC system URI remain valid data.');
  lines.push(':::');
  lines.push('');
}
lines.push('## Code systems bundled with the package');
lines.push('');
lines.push('These need no network access. `hl7.terminology.r4` is generated by');
lines.push('`tools/generate-hl7-code-systems.mjs`, which leaves out code systems owned by third parties');
lines.push('(SNODENT, the ADA tooth codes, the NUCC provider taxonomy and the W3C colour codes).');
lines.push('Automatic package discovery');
lines.push('(the Vite plugin, `fdh-terminology-discover` and `packageAutoDiscovery`) leaves them out as');
lines.push('well; only an explicit package selection imports them. IHE XDS and KDL are imported');
lines.push('directly from their installed FHIR packages, which declare no licence. See');
lines.push('[Licensing](/licensing/) and the package\'s `THIRD_PARTY_NOTICES.md`.');
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
if (config.loaderConfig === false) {
  lines.push('Disabled by default, because no terminology server is configured. It is enabled with');
  lines.push('`serverConfig.fhirBaseUrl` or an explicit `loaderConfig.fhirBaseUrl`.');
} else {
  lines.push('| Setting | Default |');
  lines.push('| --- | --- |');
  for (const [key, value] of Object.entries(config.loaderConfig || {})) {
    lines.push(`| \`${key}\` | ${code(value)} |`);
  }
}
lines.push('');
lines.push('## Properties panel');
lines.push('');
lines.push('These are the defaults in');
lines.push('[`DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG`](/api/variables/default_terminology_properties_config/)');
lines.push('when you use `TerminologyPropertiesPanelModule` or call');
lines.push('[`createTerminologyPropertiesPanelModule`](/api/functions/createterminologypropertiespanelmodule/)');
lines.push('with no arguments. Override them via `createTerminologyPropertiesPanelModule(options)` — see');
lines.push('[Properties panel options](/properties-panel/#options).');
lines.push('');
lines.push('| Setting | Default |');
lines.push('| --- | --- |');
lines.push(`| \`showAnnotations\` | ${code(panelConfig.showAnnotations)} |`);
lines.push(`| \`showBadges\` | ${code(panelConfig.showBadges)} |`);
lines.push(`| \`includeTypes\` | ${code(JSON.stringify(panelConfig.includeTypes))} |`);
lines.push(`| \`excludeTypes\` | ${code(JSON.stringify(panelConfig.excludeTypes))} |`);
lines.push('');
lines.push('Default `targetTypes`:');
lines.push('');
for (const type of panelConfig.targetTypes) {
  lines.push(`- ${code(type)}`);
}
lines.push('');
lines.push('To change the terminology server, disable or override any of the provider IDs above,');
lines.push('switch to offline-only mode, or configure authentication, continue with');
lines.push('[Configuration options](/configuration/).');
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
