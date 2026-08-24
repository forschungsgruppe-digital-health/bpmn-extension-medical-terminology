import { createPackageCollectionProvider } from './TerminologyServices.js';
import { formatPackageDisplayName } from './PackageMetadata.js';

export const DEFAULT_DISCOVERY_INCLUDE = Object.freeze([
  '*'
]);

export const DEFAULT_DISCOVERY_EXCLUDE = Object.freeze([]);

const DEFAULT_AUTO_DISCOVERY_GLOBS = Object.freeze([
  '/node_modules/*/CodeSystem-*.json',
  '/node_modules/@*/*/CodeSystem-*.json',
  '../../../node_modules/*/CodeSystem-*.json',
  '../../../node_modules/@*/*/CodeSystem-*.json',
  '../../../../../node_modules/*/CodeSystem-*.json',
  '../../../../../node_modules/@*/*/CodeSystem-*.json'
]);

function toSafeIdPart(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9@/.-]+/g, '-')
    .replace(/^@/, '')
    .replace(/[/.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toProviderId(packageName) {
  return `pkg-${toSafeIdPart(packageName)}`;
}

function matchesPattern(packageName, pattern) {
  if (!pattern || pattern === '*') {
    return true;
  }

  if (!pattern.includes('*')) {
    return packageName === pattern;
  }

  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
  return regex.test(packageName);
}

function isIncluded(packageName, includePatterns, mode) {
  if (!includePatterns.length) {
    return mode !== 'whitelist';
  }

  return includePatterns.some(pattern => matchesPattern(packageName, pattern));
}

function isExcluded(packageName, excludePatterns) {
  return excludePatterns.some(pattern => matchesPattern(packageName, pattern));
}

function dedupeCodeSystems(codeSystems = []) {
  const uniqueCodeSystems = [];
  const seenSystemUris = new Set();

  for (const codeSystem of codeSystems) {
    const systemUri = codeSystem?.url || `${codeSystem?.id || ''}`;

    if (!systemUri || seenSystemUris.has(systemUri)) {
      continue;
    }

    seenSystemUris.add(systemUri);
    uniqueCodeSystems.push(codeSystem);
  }

  return uniqueCodeSystems;
}

function validateComponentLabels(packages, componentLabels = {}) {
  for (const [packageName, labels] of Object.entries(componentLabels)) {
    if (!packages[packageName]) {
      throw new Error(`Component labels reference unknown package "${packageName}".`);
    }

    const systemUris = new Set(dedupeCodeSystems(packages[packageName]).map(codeSystem => codeSystem.url));
    for (const systemUri of Object.keys(labels || {})) {
      if (!systemUris.has(systemUri)) {
        throw new Error(
          `Component label references unknown CodeSystem "${systemUri}" in package "${packageName}".`
        );
      }
    }
  }
}

function getNodeModulesPackagePath(packageName) {
  return `/node_modules/${packageName}/`;
}

function getPackageNameFromNodeModulesPath(path) {
  const marker = '/node_modules/';
  const markerIndex = path.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const relative = path.slice(markerIndex + marker.length);
  const parts = relative.split('/');

  if (!parts[0]) {
    return null;
  }

  if (parts[0].startsWith('@') && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0];
}

/**
 * Group Vite glob-loaded CodeSystem modules by explicit package names.
 *
 * @param {Record<string, import('@types/fhir').fhir4.CodeSystem>} modules
 * @param {string[]} packageNames
 * @returns {Record<string, import('@types/fhir').fhir4.CodeSystem[]>}
 */
export function collectPackageCodeSystemsFromModules(modules = {}, packageNames = []) {
  const uniquePackageNames = [...new Set((packageNames || []).filter(Boolean))];
  const codeSystemsByPackageName = {};
  const seenUrisByPackageName = {};

  uniquePackageNames.forEach(packageName => {
    codeSystemsByPackageName[packageName] = [];
    seenUrisByPackageName[packageName] = new Set();
  });

  for (const [path, codeSystem] of Object.entries(modules || {})) {
    for (const packageName of uniquePackageNames) {
      if (!path.includes(getNodeModulesPackagePath(packageName))) {
        continue;
      }

      const systemUri = codeSystem?.url || `${codeSystem?.id || ''}`;
      const seenUris = seenUrisByPackageName[packageName];

      if (!systemUri || seenUris.has(systemUri)) {
        continue;
      }

      seenUris.add(systemUri);
      codeSystemsByPackageName[packageName].push(codeSystem);
      break;
    }
  }

  return codeSystemsByPackageName;
}

/**
 * Group Vite glob-loaded CodeSystem modules by package path detection.
 *
 * @param {(pattern: string, options: { eager: true, import: 'default' }) => Record<string, import('@types/fhir').fhir4.CodeSystem>} globFn
 * @param {{ patterns?: string[] }} [config]
 * @returns {Record<string, import('@types/fhir').fhir4.CodeSystem[]>}
 */
export function collectPackageCodeSystemsFromGlob(globFn, config = {}) {
  if (typeof globFn !== 'function') {
    return {};
  }

  const patterns = config.patterns || DEFAULT_AUTO_DISCOVERY_GLOBS;
  const codeSystemsByPackageName = {};
  const seenUrisByPackageName = {};

  for (const pattern of patterns) {
    const modules = globFn(pattern, { eager: true, import: 'default' }) || {};
    for (const [path, codeSystem] of Object.entries(modules)) {
      const packageName = getPackageNameFromNodeModulesPath(path);
      if (!packageName) {
        continue;
      }

      const systemUri = codeSystem?.url || `${codeSystem?.id || ''}`;
      if (!systemUri) {
        continue;
      }

      if (!codeSystemsByPackageName[packageName]) {
        codeSystemsByPackageName[packageName] = [];
        seenUrisByPackageName[packageName] = new Set();
      }

      const seenUris = seenUrisByPackageName[packageName];
      if (seenUris.has(systemUri)) {
        continue;
      }

      seenUris.add(systemUri);
      codeSystemsByPackageName[packageName].push(codeSystem);
    }
  }

  return codeSystemsByPackageName;
}

/**
 * Build one searchable package-backed provider per package from consumer-
 * provided CodeSystem collections keyed by package name.
 *
 * @param {Record<string, import('@types/fhir').fhir4.CodeSystem[]>} packages
 * @param {{
 *   include?: string[],
 *   exclude?: string[],
 *   mode?: 'auto' | 'whitelist',
 *   metadata?: Record<string, { title?: string, version?: string }>,
 *   componentLabels?: Record<string, Record<string, string>>,
 *   excludeSystemUris?: Iterable<string>
 * }} [config]
 * @returns {import('../core/TerminologyProvider').TerminologyProvider[]}
 */
export function discoverPackageProviders(packages = {}, config = {}) {
  const includePatterns = config.include || DEFAULT_DISCOVERY_INCLUDE;
  const excludePatterns = config.exclude || DEFAULT_DISCOVERY_EXCLUDE;
  const mode = config.mode || 'auto';
  const metadata = config.metadata || {};
  const excludedSystemUris = new Set(config.excludeSystemUris || []);

  validateComponentLabels(packages, config.componentLabels);

  return Object.entries(packages)
    .filter(([packageName]) =>
      packageName
      && isIncluded(packageName, includePatterns, mode)
      && !isExcluded(packageName, excludePatterns)
    )
    .flatMap(([packageName, codeSystems]) => {
      const uniqueCodeSystems = dedupeCodeSystems(codeSystems)
        .filter(codeSystem => !excludedSystemUris.has(codeSystem.url));
      const componentLabels = config.componentLabels?.[packageName] || {};

      if (!uniqueCodeSystems.length) {
        return [];
      }

      return [createPackageCollectionProvider({
        id: toProviderId(packageName),
        packageName,
        packageMetadata: metadata[packageName],
        componentLabel: uniqueCodeSystems.length === 1
          ? componentLabels[uniqueCodeSystems[0].url]
          : undefined,
        includeCodeSystemName: uniqueCodeSystems.length === 1,
        codeSystems: uniqueCodeSystems
      })];
    })
}
