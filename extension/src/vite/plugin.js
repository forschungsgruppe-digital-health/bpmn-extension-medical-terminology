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

function createPackageRegistryScript(globalKey, metadataGlobalKey) {
  return [
    '<script type="module">',
    `import discoveredPackages, { packageMetadata } from '${VIRTUAL_MODULE_ID}';`,
    `globalThis[${JSON.stringify(globalKey)}] = discoveredPackages;`,
    `globalThis[${JSON.stringify(metadataGlobalKey)}] = packageMetadata;`,
    '</script>'
  ].join('');
}

function injectPackageRegistryScript(html, script) {
  if (html.includes(VIRTUAL_MODULE_ID)) {
    return html;
  }

  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}</head>`);
  }

  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  }

  return `${html}${script}`;
}

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

      for (const { packageKey, packageDir, resourceFiles, metadata } of packageEntries) {
        const variablePrefix = packageKey
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

        exportEntries.push(`  ${JSON.stringify(packageKey)}: [${variableNames.join(', ')}]`);
        if (metadata) {
          packageMetadata[packageKey] = metadata;
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

    transformIndexHtml: {
      // The core HTML transform subsequently runs import analysis on this
      // script, which resolves the virtual module before the browser sees it.
      order: 'pre',
      handler(html) {
        if (!exposeGlobal) {
          return html;
        }

        return injectPackageRegistryScript(
          html,
          createPackageRegistryScript(globalKey, metadataGlobalKey)
        );
      }
    }
  };
}

export default terminologyVitePlugin;
