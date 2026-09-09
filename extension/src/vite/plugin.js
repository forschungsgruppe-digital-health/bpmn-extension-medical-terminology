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
export const DEFAULT_SNOWSTORM_PROXY_PATH = '/snowstorm-api';

/**
 * Create Vite development-server proxy entries for a Snowstorm API base URL.
 *
 * @param {{ target: string, path?: string }} options
 * @returns {Record<string, { target: string, changeOrigin: boolean, rewrite: (path: string) => string }>}
 */
export function createSnowstormProxyConfig({ target, path = DEFAULT_SNOWSTORM_PROXY_PATH }) {
  if (typeof target !== 'string' || !target.trim()) {
    throw new Error('Snowstorm Vite proxy requires a target base URL.');
  }

  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new Error('Snowstorm Vite proxy path must start with "/".');
  }

  const proxyPath = path.replace(/\/$/, '');
  if (!proxyPath) {
    throw new Error('Snowstorm Vite proxy path must not be the origin root.');
  }

  const targetUrl = new URL(target);
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('Snowstorm Vite proxy target must use http or https.');
  }

  if (targetUrl.search || targetUrl.hash) {
    throw new Error('Snowstorm Vite proxy target must not contain query parameters or a fragment.');
  }

  const targetBasePath = targetUrl.pathname.replace(/\/$/, '');

  return {
    [proxyPath]: {
      target: targetUrl.origin,
      changeOrigin: true,
      rewrite: requestPath => `${targetBasePath}${requestPath.slice(proxyPath.length)}`
    }
  };
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
 * @property {{ target: string, path?: string }} [snowstormProxy]
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
    metadataGlobalKey = DEFAULT_PACKAGE_METADATA_GLOBAL_KEY,
    snowstormProxy
  } = options;

  /** @type {string} */
  let root;

  return {
    name: 'fdh-terminology-packages',

    config(userConfig, { command }) {
      if (!snowstormProxy || command !== 'serve') {
        return;
      }

      const snowstormProxyConfig = createSnowstormProxyConfig(snowstormProxy);
      const snowstormProxyPath = Object.keys(snowstormProxyConfig)[0];

      if (userConfig.server?.proxy?.[snowstormProxyPath]) {
        throw new Error(
          `Snowstorm Vite proxy path "${snowstormProxyPath}" is already configured by the host application.`
        );
      }

      return {
        server: {
          proxy: snowstormProxyConfig
        }
      };
    },

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
