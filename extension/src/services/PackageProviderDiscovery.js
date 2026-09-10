import { createPackageCollectionProvider } from './TerminologyServices.js';
import { resolvePackageMetadata } from './PackageMetadata.js';

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

function toProviderId(packageKey, version) {
  const versionSuffix = version && packageKey.endsWith(`@${version}`)
    ? `-${version}`
    : '';
  const idKey = versionSuffix
    ? `${packageKey.slice(0, -version.length - 1)}${versionSuffix}`
    : packageKey;

  return `pkg-${toSafeIdPart(idKey)}`;
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

function isIncluded(packageName, includePatterns, mode, packageKey = packageName) {
  if (!includePatterns.length) {
    return mode !== 'whitelist';
  }

  return includePatterns.some(pattern =>
    matchesPattern(packageName, pattern) || matchesPattern(packageKey, pattern)
  );
}

function isExcluded(packageName, excludePatterns, packageKey = packageName) {
  return excludePatterns.some(pattern =>
    matchesPattern(packageName, pattern) || matchesPattern(packageKey, pattern)
  );
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

function getPackageEntries(packages, metadata = {}) {
  const entriesByIdentity = new Map();

  for (const [packageKey, codeSystems] of Object.entries(packages || {})) {
    const resolved = resolvePackageMetadata(packageKey, metadata);
    const identityKey = resolved.version
      ? `${resolved.packageName}@${resolved.version}`
      : packageKey;
    const current = entriesByIdentity.get(identityKey);

    if (!current) {
      entriesByIdentity.set(identityKey, {
        packageKey,
        packageName: resolved.packageName,
        version: resolved.version,
        packageMetadata: resolved.packageMetadata,
        codeSystems: codeSystems || []
      });
      continue;
    }

    current.codeSystems = [
      ...current.codeSystems,
      ...(codeSystems || [])
    ];
    current.packageMetadata = {
      ...current.packageMetadata,
      ...resolved.packageMetadata,
      directDependency: Boolean(
        current.packageMetadata.directDependency
        || resolved.packageMetadata.directDependency
      ),
      transitiveDependency: Boolean(
        current.packageMetadata.transitiveDependency
        || resolved.packageMetadata.transitiveDependency
      ),
      deduplicated: Boolean(
        current.packageMetadata.deduplicated
        || resolved.packageMetadata.deduplicated
      )
    };

    if (packageKey === resolved.packageName) {
      current.packageKey = packageKey;
    }
  }

  return [...entriesByIdentity.values()];
}

function getComponentLabels(componentLabels, packageKey, packageName) {
  return componentLabels?.[packageKey] || componentLabels?.[packageName] || {};
}

function validateComponentLabels(packages, componentLabels = {}, metadata = {}) {
  const packageEntries = getPackageEntries(packages, metadata);

  for (const [labelKey, labels] of Object.entries(componentLabels)) {
    const matchingEntries = packageEntries.filter(entry =>
      entry.packageKey === labelKey || entry.packageName === labelKey
    );

    if (!matchingEntries.length) {
      throw new Error(`Component labels reference unknown package "${labelKey}".`);
    }

    for (const entry of matchingEntries) {
      const systemUris = new Set(
        dedupeCodeSystems(entry.codeSystems).map(codeSystem => codeSystem.url)
      );

      for (const systemUri of Object.keys(labels || {})) {
        if (!systemUris.has(systemUri)) {
          throw new Error(
            `Component label references unknown CodeSystem "${systemUri}" in package "${labelKey}".`
          );
        }
      }
    }
  }
}

function getPackageNameFromNodeModulesPath(path) {
  const normalizedPath = path.startsWith('node_modules/')
    ? `/${path}`
    : path;
  const marker = '/node_modules/';
  const markerIndex = normalizedPath.lastIndexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const relative = normalizedPath.slice(markerIndex + marker.length);
  const parts = relative.split('/');

  if (!parts[0]) {
    return null;
  }

  if (parts[0].startsWith('@') && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0];
}

function getPackageKeyFromPath(path, packageName, metadata = {}) {
  const candidates = Object.keys(metadata)
    .map(packageKey => ({
      packageKey,
      ...resolvePackageMetadata(packageKey, metadata)
    }))
    .filter(entry => entry.packageName === packageName);

  const versionedCandidate = candidates.find(entry =>
    entry.version && path.includes(`${entry.packageName}@${entry.version}`)
  );

  if (versionedCandidate) {
    return versionedCandidate.packageKey;
  }

  if (candidates.length === 1) {
    return candidates[0].packageKey;
  }

  return packageName;
}

/**
 * Group Vite glob-loaded CodeSystem modules by explicit package names.
 *
 * @param {Record<string, import('@types/fhir').fhir4.CodeSystem>} modules
 * @param {string[]} packageNames
 * @param {Record<string, { packageName?: string, title?: string, version?: string }>} [metadata]
 * @returns {Record<string, import('@types/fhir').fhir4.CodeSystem[]>}
 */
export function collectPackageCodeSystemsFromModules(modules = {}, packageNames = [], metadata = {}) {
  const uniquePackageKeys = [...new Set((packageNames || []).filter(Boolean))];
  const packageEntries = uniquePackageKeys.map(packageKey => ({
    packageKey,
    ...resolvePackageMetadata(packageKey, metadata)
  }));
  const codeSystemsByPackageName = {};
  const seenUrisByPackageName = {};

  uniquePackageKeys.forEach(packageKey => {
    codeSystemsByPackageName[packageKey] = [];
    seenUrisByPackageName[packageKey] = new Set();
  });

  for (const [path, codeSystem] of Object.entries(modules || {})) {
    const detectedPackageName = getPackageNameFromNodeModulesPath(path);
    const matchingEntries = packageEntries.filter(entry =>
      entry.packageName === detectedPackageName
      || entry.packageKey === detectedPackageName
    );
    const matchingEntry = matchingEntries.find(entry =>
      entry.version && path.includes(`${entry.packageName}@${entry.version}`)
    ) || matchingEntries.find(entry => !entry.version) || matchingEntries[0];

    if (!matchingEntry) {
      continue;
    }

    const systemUri = codeSystem?.url || `${codeSystem?.id || ''}`;
    const seenUris = seenUrisByPackageName[matchingEntry.packageKey];

    if (!systemUri || seenUris.has(systemUri)) {
      continue;
    }

    seenUris.add(systemUri);
    codeSystemsByPackageName[matchingEntry.packageKey].push(codeSystem);
  }

  return codeSystemsByPackageName;
}

/**
 * Group Vite glob-loaded CodeSystem modules by package path detection.
 *
 * @param {(pattern: string, options: { eager: true, import: 'default' }) => Record<string, import('@types/fhir').fhir4.CodeSystem>} globFn
 * @param {{ patterns?: string[], metadata?: Record<string, { packageName?: string, title?: string, version?: string }> }} [config]
 * @returns {Record<string, import('@types/fhir').fhir4.CodeSystem[]>}
 */
export function collectPackageCodeSystemsFromGlob(globFn, config = {}) {
  if (typeof globFn !== 'function') {
    return {};
  }

  const patterns = config.patterns || DEFAULT_AUTO_DISCOVERY_GLOBS;
  const codeSystemsByPackageName = {};
  const seenUrisByPackageName = {};
  const metadata = config.metadata || {};

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

      const packageKey = getPackageKeyFromPath(path, packageName, metadata);

      if (!codeSystemsByPackageName[packageKey]) {
        codeSystemsByPackageName[packageKey] = [];
        seenUrisByPackageName[packageKey] = new Set();
      }

      const seenUris = seenUrisByPackageName[packageKey];
      if (seenUris.has(systemUri)) {
        continue;
      }

      seenUris.add(systemUri);
      codeSystemsByPackageName[packageKey].push(codeSystem);
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
 *   metadata?: Record<string, { packageName?: string, title?: string, version?: string }>,
 *   componentLabels?: Record<string, Record<string, string>>,
 *   excludeSystemUris?: Iterable<string>,
 *   excludePackageCodeSystems?: Array<{ packageName: string, version?: string, systemUri: string }>
 * }} [config]
 * @returns {import('../core/TerminologyProvider').TerminologyProvider[]}
 */
export function discoverPackageProviders(packages = {}, config = {}) {
  const includePatterns = config.include || DEFAULT_DISCOVERY_INCLUDE;
  const excludePatterns = config.exclude || DEFAULT_DISCOVERY_EXCLUDE;
  const mode = config.mode || 'auto';
  const metadata = config.metadata || {};
  const excludedSystemUris = new Set(config.excludeSystemUris || []);
  const excludedPackageCodeSystems = config.excludePackageCodeSystems || [];
  const packageEntries = getPackageEntries(packages, metadata);

  validateComponentLabels(packages, config.componentLabels, metadata);

  return packageEntries
    .filter(({ packageKey, packageName }) =>
      packageName
      && isIncluded(packageName, includePatterns, mode, packageKey)
      && !isExcluded(packageName, excludePatterns, packageKey)
    )
    .flatMap(({
      packageKey,
      packageName,
      version,
      packageMetadata,
      codeSystems
    }) => {
      if (
        packageMetadata?.deduplicated
        && packageMetadata.directDependency
        && packageMetadata.transitiveDependency
      ) {
        console.warn(
          `[terminology] Package "${packageName}" version "${version || 'unknown'}" ` +
          'is installed directly and transitively. The package was deduplicated; ' +
          'one terminology provider will be used.'
        );
      }

      const uniqueCodeSystems = dedupeCodeSystems(codeSystems)
        .filter(codeSystem =>
          !excludedSystemUris.has(codeSystem.url)
          && !excludedPackageCodeSystems.some(excluded =>
            excluded.systemUri === codeSystem.url
            && excluded.packageName === packageName
            && (
              !excluded.version
              || !version
              || excluded.version === version
            )
          )
        );
      const componentLabels = getComponentLabels(
        config.componentLabels,
        packageKey,
        packageName
      );

      if (!uniqueCodeSystems.length) {
        return [];
      }

      return [createPackageCollectionProvider({
        id: toProviderId(packageKey, version),
        packageKey,
        packageName,
        packageMetadata,
        componentLabel: uniqueCodeSystems.length === 1
          ? componentLabels[uniqueCodeSystems[0].url]
          : undefined,
        includeCodeSystemName: uniqueCodeSystems.length === 1,
        codeSystems: uniqueCodeSystems
      })];
    })
}
