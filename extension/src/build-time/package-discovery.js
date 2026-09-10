import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import {
  createPackageKey,
  parsePackageKey
} from '../services/PackageMetadata.js';
import {
  DEFAULT_TERMINOLOGY_PACKAGE_NAMES,
  getDefaultPackageResourceFilter
} from '../services/PackageDiscoveryDefaults.js';

export const DEFAULT_RESOURCE_TYPES = Object.freeze(['CodeSystem']);

export const DEFAULT_TRANSITIVE_ROOT_PACKAGES = Object.freeze([
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology'
]);

function readFhirIndex(packageDir) {
  const indexPath = join(packageDir, '.index.json');
  if (!existsSync(indexPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(indexPath, 'utf-8'));
  } catch {
    return null;
  }
}

function getResourceFilesFromIndex(packageDir, resourceTypes) {
  const index = readFhirIndex(packageDir);
  if (!index?.files) {
    return [];
  }

  return index.files
    .filter(entry => resourceTypes.includes(entry.resourceType))
    .map(entry => entry.filename)
    .filter(filename => filename.endsWith('.json'));
}

function getResourceFilesFromGlob(packageDir) {
  try {
    return readdirSync(packageDir).filter(fileName => /^CodeSystem-.*\.json$/i.test(fileName));
  } catch {
    return [];
  }
}

function findResourceFiles(packageDir, resourceTypes) {
  const fromIndex = getResourceFilesFromIndex(packageDir, resourceTypes);
  if (fromIndex.length > 0) {
    return fromIndex;
  }

  return getResourceFilesFromGlob(packageDir);
}

function getResourceSelector(packageDir, filename) {
  const resource = readPackageResource(packageDir, filename);
  return resource?.url;
}

export function readPackageResource(packageDir, filename) {
  return JSON.parse(readFileSync(join(packageDir, filename), 'utf-8'));
}

export function readPackageMetadata(packageDir, packageName) {
  try {
    const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'));
    const metadata = {};

    if (typeof packageName === 'string' && packageName.trim()) {
      metadata.packageName = packageName.trim();
    }

    if (typeof packageJson.title === 'string' && packageJson.title.trim()) {
      metadata.title = packageJson.title.trim();
    }

    if (typeof packageJson.version === 'string' && packageJson.version.trim()) {
      metadata.version = packageJson.version.trim();
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch {
    return null;
  }
}

function filterResourceFiles(packageDir, packageName, resourceFiles, resourceFilter) {
  const includeFiles = resourceFilter?.files;

  if (includeFiles) {
    const availableFiles = new Set(resourceFiles);
    const missingFile = includeFiles.find(filename => !availableFiles.has(filename));

    if (missingFile) {
      throw new Error(
        `[fdh-terminology] Resource file "${missingFile}" not found in package "${packageName}".`
      );
    }

    return resourceFiles.filter(filename => includeFiles.includes(filename));
  }

  const resources = resourceFiles.map(filename => ({
    filename,
    selector: getResourceSelector(packageDir, filename)
  }));
  const include = resourceFilter?.include;
  const exclude = resourceFilter?.exclude || [];
  const availableSelectors = new Set(resources.map(resource => resource.selector).filter(Boolean));
  const selectors = [...(include || []), ...exclude].filter(selector => selector !== '*');
  const missingSelector = selectors.find(selector => !availableSelectors.has(selector));

  if (missingSelector) {
    throw new Error(
      `[fdh-terminology] Resource selector "${missingSelector}" not found in package "${packageName}".`
    );
  }

  return resources
    .filter(({ selector }) =>
      (!include
        || include.includes('*')
        || include.includes(selector))
      && !exclude.includes(selector)
    )
    .map(resource => resource.filename);
}

function normalizePackageSelection(explicitPackages) {
  if (Array.isArray(explicitPackages)) {
    return {
      packageNames: explicitPackages,
      resourceFilters: {}
    };
  }

  const resourceFilters = Object.fromEntries(
    Object.entries(explicitPackages || {}).map(([packageName, filter]) => {
      if (Array.isArray(filter)) {
        throw new Error(
          `Package resource filter for "${packageName}" must use the "include" keyword.`
        );
      }

      return [packageName, filter || {}];
    })
  );

  return {
    packageNames: Object.keys(explicitPackages || {}),
    resourceFilters
  };
}

function findPackageRoot(startDir, expectedPackageName) {
  let currentDir = startDir;

  while (currentDir && dirname(currentDir) !== currentDir) {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (pkg?.name === expectedPackageName) {
          return currentDir;
        }
      } catch {
        // Ignore malformed package.json and keep walking up.
      }
    }

    currentDir = dirname(currentDir);
  }

  return null;
}

function findPackageDirInNodeModules(baseDir, packageName) {
  let currentDir = baseDir;

  while (currentDir && dirname(currentDir) !== currentDir) {
    const candidateDir = join(currentDir, 'node_modules', ...packageName.split('/'));
    const packageJsonPath = join(candidateDir, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (pkg?.name === packageName) {
          return candidateDir;
        }
      } catch {
        // Ignore malformed package.json and continue searching upwards.
      }
    }

    currentDir = dirname(currentDir);
  }

  return null;
}

function resolvePackageDir(packageName, baseDir) {
  const require = createRequire(join(baseDir, '__placeholder__.js'));

  try {
    const packageEntryPath = require.resolve(packageName, { paths: [baseDir] });
    const packageRoot = findPackageRoot(dirname(packageEntryPath), packageName);
    if (packageRoot) {
      return packageRoot;
    }
  } catch {
    // Fall through to package.json and node_modules fallbacks.
  }

  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [baseDir] });
    const packageRoot = findPackageRoot(dirname(packageJsonPath), packageName);
    if (packageRoot) {
      return packageRoot;
    }
  } catch {
    // Fall through to node_modules directory walk.
  }

  return findPackageDirInNodeModules(baseDir, packageName);
}

function readPackageDependenciesFromPackageJson(packageJsonPath) {
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];
  } catch {
    return [];
  }
}

function readConsumerDependencies(root) {
  return readPackageDependenciesFromPackageJson(join(root, 'package.json'));
}

function readPackageDependencies(packageDir) {
  return readPackageDependenciesFromPackageJson(join(packageDir, 'package.json'));
}

function isFhirTerminologyPackage(packageDir) {
  const index = readFhirIndex(packageDir);
  if (index?.files?.some(file => file.resourceType === 'CodeSystem')) {
    return true;
  }

  return getResourceFilesFromGlob(packageDir).length > 0;
}

export function discoverPackages(
  root,
  excludeSet = new Set(),
  transitiveRoots = [],
  packageDirs = new Map(),
  allowedPackageNames = null
) {
  const discovered = new Map();
  const occurrences = new Map();
  const visited = new Set();
  const pending = [];
  const allowedPackages = allowedPackageNames
    ? new Set(allowedPackageNames)
    : null;

  const enqueueDependencies = (packageDir, dependencies, traverseDependencies) => {
    for (const depName of dependencies) {
      pending.push({ baseDir: packageDir, depName, traverseDependencies });
    }
  };

  enqueueDependencies(root, readConsumerDependencies(root), false);
  for (const rootPackageName of transitiveRoots || []) {
    const rootPackageDir = resolvePackageDir(rootPackageName, root);
    if (!rootPackageDir) {
      continue;
    }

    enqueueDependencies(rootPackageDir, readPackageDependencies(rootPackageDir), true);
  }

  while (pending.length > 0) {
    const { baseDir, depName, traverseDependencies } = pending.shift();
    if (excludeSet.has(depName)) {
      continue;
    }

    if (allowedPackages && !allowedPackages.has(depName)) {
      continue;
    }

    const packageDir = resolvePackageDir(depName, baseDir);
    if (!packageDir) {
      continue;
    }

    const metadata = readPackageMetadata(packageDir, depName);
    const packageName = metadata?.packageName || depName;

    if (allowedPackages && !allowedPackages.has(packageName)) {
      continue;
    }

    const packageKey = createPackageKey(packageName, metadata?.version);
    const occurrence = occurrences.get(packageKey) || {
      directDependency: false,
      transitiveDependency: false
    };

    if (traverseDependencies) {
      occurrence.transitiveDependency = true;
    } else {
      occurrence.directDependency = true;
    }

    occurrences.set(packageKey, occurrence);

    if (visited.has(packageDir)) {
      continue;
    }

    visited.add(packageDir);
    const isFhirPackage = isFhirTerminologyPackage(packageDir);
    if (isFhirPackage && !discovered.has(packageKey)) {
      discovered.set(packageKey, {
        packageKey,
        packageName,
        packageDir,
        metadata
      });
      packageDirs.set(packageKey, packageDir);
    }

    if (traverseDependencies || isFhirPackage) {
      enqueueDependencies(packageDir, readPackageDependencies(packageDir), true);
    }
  }

  for (const [packageKey, occurrence] of occurrences) {
    if (
      occurrence.directDependency
      && occurrence.transitiveDependency
      && discovered.has(packageKey)
    ) {
      const entry = discovered.get(packageKey);
      entry.metadata = {
        ...(entry.metadata || {}),
        directDependency: true,
        transitiveDependency: true,
        deduplicated: true
      };
    }
  }

  return [...discovered.values()];
}

function resolveDiscoveredPackageDir(packageName, root, transitiveRoots = []) {
  const packageDir = resolvePackageDir(packageName, root);
  if (packageDir) {
    return packageDir;
  }

  for (const rootPackageName of transitiveRoots || []) {
    const rootPackageDir = resolvePackageDir(rootPackageName, root);
    if (!rootPackageDir) {
      continue;
    }

    const transitivePackageDir = resolvePackageDir(packageName, rootPackageDir);
    if (transitivePackageDir) {
      return transitivePackageDir;
    }
  }

  return null;
}

/**
 * Resolve package directories and selected FHIR resource files at build time.
 *
 * @param {{
 *   root: string,
 *   packages?: string[] | Record<string, { include?: string[], exclude?: string[] }>,
 *   autoDiscover?: boolean,
 *   includeTransitiveFrom?: string[],
 *   exclude?: string[],
 *   resourceTypes?: string[],
 *   allowedPackageNames?: string[]
 * }} options
 * @returns {Array<{ packageKey: string, packageName: string, packageDir: string, resourceFiles: string[], metadata: { packageName?: string, title?: string, version?: string, directDependency?: boolean, transitiveDependency?: boolean, deduplicated?: boolean } | null }>}
 */
export function discoverTerminologyPackageFiles(options) {
  const {
    root,
    packages: explicitPackages,
    autoDiscover = true,
    includeTransitiveFrom = DEFAULT_TRANSITIVE_ROOT_PACKAGES,
    exclude: userExclude = [],
    resourceTypes = DEFAULT_RESOURCE_TYPES,
    allowedPackageNames = DEFAULT_TERMINOLOGY_PACKAGE_NAMES
  } = options;

  const excludeSet = new Set(userExclude);
  const packageSelection = normalizePackageSelection(explicitPackages);
  const discoveredPackageEntries = explicitPackages
    ? packageSelection.packageNames.map(packageKey => {
      const { packageName } = parsePackageKey(packageKey);

      return {
        packageKey,
        packageName,
        packageDir: null,
        metadata: null
      };
    })
    : (autoDiscover
      ? discoverPackages(
        root,
        excludeSet,
        includeTransitiveFrom,
        new Map(),
        allowedPackageNames
      )
      : []);
  const discoveredCounts = new Map();

  for (const entry of discoveredPackageEntries) {
    discoveredCounts.set(
      entry.packageName,
      (discoveredCounts.get(entry.packageName) || 0) + 1
    );
  }

  return discoveredPackageEntries.flatMap(entry => {
    const { packageKey, packageName } = entry;

    if (excludeSet.has(packageName) && !explicitPackages) {
      return [];
    }

    const packageDir = entry.packageDir
      || resolveDiscoveredPackageDir(packageName, root, includeTransitiveFrom);
    if (!packageDir) {
      console.warn(`[fdh-terminology] Could not resolve package "${packageKey}" - skipping.`);
      return [];
    }

    const resourceFiles = filterResourceFiles(
      packageDir,
      packageKey,
      findResourceFiles(packageDir, resourceTypes),
      packageSelection.resourceFilters[packageKey]
        || packageSelection.resourceFilters[packageName]
        || (!explicitPackages
          ? getDefaultPackageResourceFilter(packageName)
          : undefined)
    );

    if (resourceFiles.length === 0) {
      console.warn(`[fdh-terminology] No CodeSystem resources found in "${packageKey}" - skipping.`);
      return [];
    }

    const metadata = entry.metadata || readPackageMetadata(packageDir, packageName);
    const normalizedPackageKey = explicitPackages || discoveredCounts.get(packageName) > 1
      ? packageKey
      : packageName;

    return [{
      packageKey: normalizedPackageKey,
      packageName,
      packageDir,
      resourceFiles,
      metadata
    }];
  });
}

/**
 * Load selected CodeSystem resources into the bundler-neutral registry shape.
 *
 * @param {Parameters<typeof discoverTerminologyPackageFiles>[0]} options
 * @returns {{ packages: Record<string, object[]>, metadata: Record<string, { packageName?: string, title?: string, version?: string, directDependency?: boolean, transitiveDependency?: boolean, deduplicated?: boolean }> }}
 */
export function loadTerminologyPackageRegistry(options) {
  const packages = {};
  const metadata = {};

  for (const entry of discoverTerminologyPackageFiles(options)) {
    packages[entry.packageKey] = entry.resourceFiles.map(filename =>
      readPackageResource(entry.packageDir, filename)
    );

    if (entry.metadata) {
      metadata[entry.packageKey] = entry.metadata;
    }
  }

  return {
    packages,
    metadata
  };
}
