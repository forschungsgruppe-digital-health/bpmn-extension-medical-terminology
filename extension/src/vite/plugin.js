import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { DEFAULT_PACKAGE_METADATA_GLOBAL_KEY } from '../services/PackageMetadata.js';

/**
 * @typedef {object} TerminologyVitePluginOptions
 * Resource filters match CodeSystem.url values, not package filenames.
 * @property {string[] | Record<string, { include?: string[], exclude?: string[] }>} [packages]
 * @property {boolean} [autoDiscover]
 * @property {string[]} [includeTransitiveFrom]
 * @property {string[]} [exclude] Package name filters for automatic discovery
 * @property {string[]} [resourceTypes]
 * @property {boolean} [exposeGlobal]
 * @property {string} [globalKey]
 */

const VIRTUAL_MODULE_ID = 'virtual:fdh-terminology-packages';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;
const DEFAULT_GLOBAL_PACKAGES_KEY = '__FDH_TERMINOLOGY_PACKAGES__';

const DEFAULT_RESOURCE_TYPES = Object.freeze(['CodeSystem']);
const DEFAULT_TRANSITIVE_ROOT_PACKAGES = Object.freeze([
  '@forschungsgruppe-digital-health/terminology'
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
  const resource = JSON.parse(readFileSync(join(packageDir, filename), 'utf-8'));
  return resource?.url;
}

function readPackageMetadata(packageDir) {
  try {
    const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'));
    const metadata = {};

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
        // ignore malformed package.json and keep walking up
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
        // ignore malformed package.json and continue searching upwards
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
    // fall through to package.json and node_modules fallbacks
  }

  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [baseDir] });
    const packageRoot = findPackageRoot(dirname(packageJsonPath), packageName);
    if (packageRoot) {
      return packageRoot;
    }
  } catch {
    // fall through to node_modules directory walk
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

function toSafeVarName(name) {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function discoverPackages(root, excludeSet, transitiveRoots = [], packageDirs = new Map()) {
  const discovered = new Set();
  const visited = new Set();
  const pending = [];

  const enqueueDependencies = (packageDir, dependencies, traverseDependencies) => {
    for (const depName of dependencies) {
      pending.push({baseDir: packageDir, depName, traverseDependencies});
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
    const {baseDir, depName, traverseDependencies} = pending.shift();
    if (excludeSet.has(depName)) {
      continue;
    }

    const packageDir = resolvePackageDir(depName, baseDir);
    if (!packageDir || visited.has(packageDir)) {
      continue;
    }

    visited.add(packageDir);
    const isFhirPackage = isFhirTerminologyPackage(packageDir);
    if (isFhirPackage) {
      discovered.add(depName);
      packageDirs.set(depName, packageDir);
    }

    if (traverseDependencies || isFhirPackage) {
      enqueueDependencies(packageDir, readPackageDependencies(packageDir), true);
    }
  }

  return [...discovered];
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

export function terminologyVitePlugin(options = {}) {
  const {
    packages: explicitPackages,
    autoDiscover = true,
    includeTransitiveFrom = DEFAULT_TRANSITIVE_ROOT_PACKAGES,
    exclude: userExclude = [],
    resourceTypes = DEFAULT_RESOURCE_TYPES,
    exposeGlobal = true,
    globalKey = DEFAULT_GLOBAL_PACKAGES_KEY,
    metadataGlobalKey = DEFAULT_PACKAGE_METADATA_GLOBAL_KEY
  } = options;

  /** @type {string} */
  let root;

  /** @type {Set<string>} */
  let excludeSet;
  let packageSelection;
  let discoveredPackageDirs = new Map();

  return {
    name: 'fdh-terminology-packages',

    configResolved(config) {
      root = config.root;
      packageSelection = normalizePackageSelection(explicitPackages);
      excludeSet = new Set(userExclude);
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },

    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return;
      }

      const packageNames = explicitPackages
        ? packageSelection.packageNames
        : (autoDiscover
          ? discoverPackages(root, excludeSet, includeTransitiveFrom, discoveredPackageDirs)
          : []);

      const importStatements = [];
      const exportEntries = [];
      let importCounter = 0;
      const packageMetadata = {};

      for (const packageName of packageNames) {
        if (excludeSet.has(packageName) && !explicitPackages) {
          continue;
        }

        const packageDir = discoveredPackageDirs.get(packageName)
          || resolveDiscoveredPackageDir(packageName, root, includeTransitiveFrom);
        if (!packageDir) {
          console.warn(`[fdh-terminology] Could not resolve package "${packageName}" - skipping.`);
          continue;
        }

        const resourceFilter = packageSelection.resourceFilters[packageName];
        const resourceFiles = filterResourceFiles(
          packageDir,
          packageName,
          findResourceFiles(packageDir, resourceTypes),
          resourceFilter
        );
        if (resourceFiles.length === 0) {
          console.warn(`[fdh-terminology] No CodeSystem resources found in "${packageName}" - skipping.`);
          continue;
        }

        const variablePrefix = toSafeVarName(packageName);
        const variableNames = [];

        for (const filename of resourceFiles) {
          const absolutePath = resolve(packageDir, filename);
          const variableName = `_cs_${variablePrefix}_${importCounter++}`;
          importStatements.push(`import ${variableName} from ${JSON.stringify(absolutePath)};`);
          variableNames.push(variableName);
        }

        exportEntries.push(`  ${JSON.stringify(packageName)}: [${variableNames.join(', ')}]`);
      }

      for (const packageName of packageNames) {
        const packageDir = discoveredPackageDirs.get(packageName)
          || resolveDiscoveredPackageDir(packageName, root, includeTransitiveFrom);
        if (!packageDir) {
          continue;
        }

        const metadata = readPackageMetadata(packageDir);
        if (metadata) {
          packageMetadata[packageName] = metadata;
        }
      }

      return [
        ...importStatements,
        '',
        `export const packageMetadata = ${JSON.stringify(packageMetadata, null, 2)};`,
        '',
        'export default {',
        exportEntries.join(',\n'),
        '};'
      ].join('\n');
    },

    transformIndexHtml(html) {
      if (!exposeGlobal) {
        return html;
      }

      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: {
              type: 'module'
            },
            children: `import discoveredPackages, { packageMetadata } from '${VIRTUAL_MODULE_ID}'; globalThis[${JSON.stringify(globalKey)}] = discoveredPackages; globalThis[${JSON.stringify(metadataGlobalKey)}] = packageMetadata;`,
            injectTo: 'head-prepend'
          }
        ]
      };
    }
  };
}

export default terminologyVitePlugin;
