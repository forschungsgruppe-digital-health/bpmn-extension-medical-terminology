import {
  DEFAULT_RESOURCE_TYPES,
  DEFAULT_TRANSITIVE_ROOT_PACKAGES,
  discoverTerminologyPackageFiles
} from '../build-time/package-discovery.js';
import { DEFAULT_PACKAGE_METADATA_GLOBAL_KEY } from '../services/PackageMetadata.js';
import { resolve } from 'node:path';

const VIRTUAL_MODULE_ID = 'virtual:fdh-terminology-packages';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;
const DEFAULT_GLOBAL_PACKAGES_KEY = '__FDH_TERMINOLOGY_PACKAGES__';

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

  return {
    name: 'fdh-terminology-packages',

    configResolved(config) {
      root = config.root;
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

      const packageEntries = discoverTerminologyPackageFiles({
        root,
        packages: explicitPackages,
        autoDiscover,
        includeTransitiveFrom,
        exclude: userExclude,
        resourceTypes
      });
      const importStatements = [];
      const exportEntries = [];
      let importCounter = 0;
      const packageMetadata = {};

      for (const { packageName, packageDir, resourceFiles, metadata } of packageEntries) {
        const variablePrefix = packageName
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        const variableNames = [];

        for (const filename of resourceFiles) {
          const absolutePath = resolve(packageDir, filename);
          const variableName = `_cs_${variablePrefix}_${importCounter++}`;
          importStatements.push(`import ${variableName} from ${JSON.stringify(absolutePath)};`);
          variableNames.push(variableName);
        }

        exportEntries.push(`  ${JSON.stringify(packageName)}: [${variableNames.join(', ')}]`);
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
