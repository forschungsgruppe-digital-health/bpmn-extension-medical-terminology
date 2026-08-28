import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const codeSystems = resourceFiles.map(fileName =>
  JSON.parse(readFileSync(resolve(packageDirectory, fileName), 'utf8'))
);
const source = `${JSON.stringify(codeSystems)}\n`;

if (checkOnly) {
  if (!existsSync(targetPath) || readFileSync(targetPath, 'utf8') !== source) {
    throw new Error(`${targetPath} is out of date. Run npm run generate:hl7.`);
  }

  console.log(`HL7 CodeSystem data is up to date (${resourceFiles.length} resources).`);
} else {
  writeFileSync(targetPath, source);
  console.log(`Generated ${resourceFiles.length} HL7 CodeSystems.`);
}
