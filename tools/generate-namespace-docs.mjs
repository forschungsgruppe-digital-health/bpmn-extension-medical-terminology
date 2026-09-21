#!/usr/bin/env node
/**
 * Generate the public XML namespace reference from the moddle descriptor.
 *
 * The descriptor is the source of truth for the namespace and structural model;
 * the XSD is generated from that descriptor by moddle-to-xsd.mjs. This tool
 * renders the human-readable Starlight page and can stage both machine-readable
 * artifacts for Astro to publish beside it.
 *
 * Usage:
 *   node tools/generate-namespace-docs.mjs          write the Markdown page
 *   node tools/generate-namespace-docs.mjs --check  fail when the page is stale
 *   node tools/generate-namespace-docs.mjs --stage  stage JSON and XSD for Astro
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const descriptorPath = join(repoRoot, 'extension/src/moddle/clinical.json');
const schemaPath = join(repoRoot, 'schema/clinical-semantics.xsd');
const siteRoot = new URL(
  'https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/'
);

function lowerCaseFirst(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function namespaceLocation(descriptor) {
  const namespace = new URL(descriptor.uri);
  const expectedPrefix = `${siteRoot.pathname}ns/terminology/`;

  if (
    namespace.origin !== siteRoot.origin ||
    !namespace.pathname.startsWith(expectedPrefix) ||
    namespace.search ||
    namespace.hash
  ) {
    throw new Error(
      `descriptor uri must be below ${new URL('ns/terminology/', siteRoot).href}`
    );
  }

  const relativePath = namespace.pathname.slice(siteRoot.pathname.length);
  const match = relativePath.match(/^ns\/terminology\/(v[1-9]\d*)$/);
  if (!match) {
    throw new Error('descriptor uri must end in /ns/terminology/v<positive integer>');
  }

  return {
    formatVersion: match[1],
    markdownPath: join(repoRoot, 'docs-site/src/content/docs', `${relativePath}.md`),
    publicPath: join(repoRoot, 'docs-site/public', relativePath)
  };
}

function propertyRow(property, descriptor) {
  const xml = property.isAttr
    ? `attribute \`@${property.name}\``
    : `child \`<${descriptor.prefix}:${lowerCaseFirst(property.type)}>\``;
  const cardinality = property.isMany ? '0..n' : '0..1';
  return `| \`${property.name}\` | ${xml} | \`${property.type}\` | ${cardinality} |`;
}

export function renderNamespacePage(descriptor) {
  const { formatVersion } = namespaceLocation(descriptor);
  const lines = [
    '---',
    `title: "Terminology namespace ${formatVersion}"`,
    'description: "The stable XML namespace contract for medical terminology annotations in BPMN files."',
    'editUrl: false',
    '---',
    '',
    ':::note[Generated reference]',
    'This page is generated from `extension/src/moddle/clinical.json` by',
    '`tools/generate-namespace-docs.mjs`. CI rejects changes when the descriptor,',
    'generated XSD and this reference disagree.',
    ':::',
    '',
    '## Identifier',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Namespace URI | \`${descriptor.uri}\` |`,
    `| Conventional prefix | \`${descriptor.prefix}\` |`,
    `| Moddle package | \`${descriptor.name}\` |`,
    `| XML format version | \`${formatVersion}\` |`,
    '| Package release | Independent npm SemVer; see `extension/package.json` |',
    '',
    'Use the namespace in BPMN definitions as follows:',
    '',
    '```xml',
    `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"`,
    `                  xmlns:${descriptor.prefix}="${descriptor.uri}"`,
    '                  targetNamespace="https://example.invalid/bpmn/process">',
    '```',
    '',
    'Machine-readable artifacts:',
    '',
    `- [Moddle descriptor](${descriptor.uri}/clinical.json)`,
    `- [XML Schema](${descriptor.uri}/clinical-semantics.xsd)`,
    '',
    '## Content model',
    ''
  ];

  for (const type of descriptor.types || []) {
    const tag = lowerCaseFirst(type.name);
    lines.push(`### \`${descriptor.prefix}:${tag}\``);
    lines.push('');
    lines.push(`Moddle type: \`${descriptor.prefix}:${type.name}\`.`);
    if (type.superClass?.length) {
      lines.push(`Superclass: ${type.superClass.map(name => `\`${name}\``).join(', ')}.`);
    }
    lines.push('');
    if (type.properties?.length) {
      lines.push('| Property | XML representation | Type | Cardinality |');
      lines.push('| --- | --- | --- | --- |');
      for (const property of type.properties) {
        lines.push(propertyRow(property, descriptor));
      }
    } else {
      lines.push('This element declares no properties.');
    }
    lines.push('');
  }

  lines.push('## Versioning policy');
  lines.push('');
  lines.push(`The \`${formatVersion}\` segment versions the serialized XML contract, not the npm package.`);
  lines.push('Ordinary package releases and backward-compatible additions keep this URI unchanged.');
  lines.push('An incompatible removal, rename or semantic change requires maintainer approval,');
  lines.push('a new namespace version and a documented migration path. Package releases remain');
  lines.push('in the `0.x` series until the project deliberately declares a stable public release.');
  lines.push('');
  lines.push('The extension family follows the pattern');
  lines.push('`https://forschungsgruppe-digital-health.github.io/<repository>/ns/<extension>/v<format-major>`.');
  lines.push('The companion FHIR-mapping extension therefore owns its namespace below its own');
  lines.push('GitHub Pages repository rather than reusing this terminology namespace.');
  lines.push('');
  lines.push('## Previous development namespace');
  lines.push('');
  lines.push('Development versions used `https://clinical-bpmn.org/terminology/v1`, which was also');
  lines.push('used by the incompatible public predecessor `bpmn-js-clinical-semantics`. This project');
  lines.push('had no users or external BPMN files when the authority changed, so repository fixtures');
  lines.push('were updated in place and no legacy reader or migration tool is provided. Files from');
  lines.push('the predecessor must not be relabelled: its annotation model is structurally different.');
  lines.push('');
  lines.push('See [ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md)');
  lines.push('for the authority, compatibility and family-wide naming decision.');
  lines.push('');

  return lines.join('\n');
}

function loadDescriptor() {
  return JSON.parse(readFileSync(descriptorPath, 'utf8'));
}

function writePage(descriptor) {
  const { markdownPath } = namespaceLocation(descriptor);
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(markdownPath, renderNamespacePage(descriptor));
  console.log(`Wrote ${markdownPath}`);
}

function checkPage(descriptor) {
  const { markdownPath } = namespaceLocation(descriptor);
  if (!existsSync(markdownPath) || readFileSync(markdownPath, 'utf8') !== renderNamespacePage(descriptor)) {
    console.error(`${markdownPath} is out of date with extension/src/moddle/clinical.json.`);
    console.error('Run `npm run docs:namespace` and commit the result.');
    process.exitCode = 1;
    return;
  }
  console.log('Namespace reference is up to date.');
}

function stageArtifacts(descriptor) {
  const { publicPath } = namespaceLocation(descriptor);
  mkdirSync(publicPath, { recursive: true });
  copyFileSync(descriptorPath, join(publicPath, 'clinical.json'));
  copyFileSync(schemaPath, join(publicPath, 'clinical-semantics.xsd'));
  console.log(`Staged namespace artifacts in ${publicPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const modes = process.argv.slice(2);
  if (modes.length > 1 || (modes[0] && !['--check', '--stage'].includes(modes[0]))) {
    console.error('Usage: node tools/generate-namespace-docs.mjs [--check|--stage]');
    process.exitCode = 2;
  } else {
    try {
      const descriptor = loadDescriptor();
      if (modes[0] === '--check') checkPage(descriptor);
      else if (modes[0] === '--stage') stageArtifacts(descriptor);
      else writePage(descriptor);
    } catch (error) {
      console.error(`generate-namespace-docs: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
