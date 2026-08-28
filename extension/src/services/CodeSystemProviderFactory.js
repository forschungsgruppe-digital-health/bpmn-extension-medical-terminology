import { StaticProvider } from '../providers/StaticProvider.js';
import { formatPackageProviderDisplayName } from './PackageMetadata.js';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCodeSystemDisplayName(codeSystem) {
  return codeSystem.title?.trim()
    || codeSystem.name?.trim()
    || codeSystem.id?.trim()
    || codeSystem.url;
}

function getConceptStatus(concept) {
  const properties = Array.isArray(concept.property) ? concept.property : [];
  const statusProperty = properties.find(property => property.code === 'status');
  const status = statusProperty?.valueCode || statusProperty?.valueString;

  return status ? !['retired', 'deprecated'].includes(status) : true;
}

function extractConcepts(items, systemUri, version, concepts) {
  for (const item of items || []) {
    if (item.code) {
      concepts.push({
        code: item.code,
        display: item.display || item.code,
        system: systemUri,
        version,
        active: getConceptStatus(item),
        definition: item.definition
      });
    }

    if (Array.isArray(item.concept) && item.concept.length > 0) {
      extractConcepts(item.concept, systemUri, version, concepts);
    }
  }
}

/**
 * Create a StaticProvider from a FHIR CodeSystem JSON resource.
 *
 * This is useful for local package-backed terminology sources such as
 * `hl7.terminology.r4`, but it also works with any other FHIR CodeSystem JSON.
 *
 * @param {import('@types/fhir').fhir4.CodeSystem} codeSystem
 * @param {{ id?: string, displayName?: string, systemUri?: string }} [options]
 * @returns {StaticProvider}
 */
export function createStaticProviderFromCodeSystem(codeSystem, options = {}) {
  if (!codeSystem?.url) {
    throw new Error('CodeSystem resource must define a canonical url.');
  }

  const concepts = [];
  extractConcepts(codeSystem.concept || [], options.systemUri || codeSystem.url, codeSystem.version, concepts);

  return new StaticProvider(
    options.id || slugify(codeSystem.id || codeSystem.url),
    options.displayName || formatPackageProviderDisplayName({
      packageName: options.packageName,
      packageMetadata: options.packageMetadata,
      componentLabel: options.componentLabel,
      codeSystems: [codeSystem]
    }) || getCodeSystemDisplayName(codeSystem),
    options.systemUri || codeSystem.url,
    concepts,
    codeSystem.version
  );
}
