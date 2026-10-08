#!/usr/bin/env node
/**
 * Check that serialized examples, the demo, the generated schema and current
 * documentation all use the namespace declared by the moddle descriptor.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walkBpmn(root, directory, files = []) {
  const path = join(root, directory);
  if (!existsSync(path)) return files;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) walkBpmn(root, child, files);
    else if (entry.isFile() && entry.name.endsWith('.bpmn')) files.push(child);
  }
  return files;
}

export function checkNamespaceConsistency(root = repoRoot) {
  const read = path => readFileSync(join(root, path), 'utf8');
  const descriptor = JSON.parse(read('extension/src/moddle/medical-terminology.json'));
  const { uri, prefix } = descriptor;
  const errors = [];

  if (typeof uri !== 'string' || !uri || prefix !== 'mt') {
    errors.push('extension/src/moddle/medical-terminology.json: expected a non-empty uri and prefix "mt"');
    return { uri, errors };
  }

  const xsd = read('schema/medical-terminology.xsd');
  const targetNamespaces = [...xsd.matchAll(/\btargetNamespace="([^"]+)"/g)].map(match => match[1]);
  if (targetNamespaces.length !== 1 || targetNamespaces[0] !== uri) {
    errors.push(`schema/medical-terminology.xsd: targetNamespace must equal ${uri}`);
  }

  const bpmnFiles = [
    ...walkBpmn(root, 'examples'),
    ...walkBpmn(root, 'demo/public')
  ];
  for (const file of bpmnFiles) {
    const xml = read(file);
    const declaration = xml.match(/\bxmlns:mt="([^"]+)"/);
    if (xml.includes('<mt:') && !declaration) {
      errors.push(`${file}: uses terminology elements without an xmlns:mt declaration`);
    } else if (declaration && declaration[1] !== uri) {
      errors.push(`${file}: xmlns:mt must equal ${uri}`);
    }
  }

  const currentDocs = [
    'README.md',
    'schema/README.md',
    'docs/ARCHITECTURE.md',
    'docs/EXTENDING.md',
    'docs/arc42/02_architecture_constraints.md',
    'docs/arc42/04_solution_strategy.md',
    'docs/arc42/08_crosscutting_concepts.md',
    'docs/arc42/09_architecture_decisions.md',
    'docs/arc42/12_glossary.md',
    'docs-site/src/content/docs/index.md',
    'docs-site/src/content/docs/schema.md',
    'docs-site/src/content/docs/ns/terminology/v1.md'
  ];
  for (const file of currentDocs) {
    if (!existsSync(join(root, file)) || !read(file).includes(uri)) {
      errors.push(`${file}: does not reference the descriptor namespace ${uri}`);
    }
  }

  return { uri, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { uri, errors } = checkNamespaceConsistency(repoRoot);
    for (const error of errors) console.error(`check-namespace: ${error}`);
    if (!errors.length) console.log(`check-namespace: artifacts agree on ${uri}.`);
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) {
    console.error(`check-namespace: ${error.message}`);
    process.exitCode = 1;
  }
}
