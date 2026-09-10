export interface SnowstormViteProxyOptions {
  /** Redirect-free Snowstorm API base URL, without the branch or `/concepts`. */
  target: string;
  /** Local Vite development-server route. Defaults to `/snowstorm-api`. */
  path?: string;
}

export interface TerminologyVitePluginOptions {
  packages?: string[] | Record<string, {
    include?: string[];
    exclude?: string[];
  }>;
  autoDiscover?: boolean;
  includeTransitiveFrom?: string[];
  exclude?: string[];
  resourceTypes?: string[];
  exposeGlobal?: boolean;
  globalKey?: string;
  metadataGlobalKey?: string;
  /**
   * Optional development-only Snowstorm proxy. It is not included in static
   * builds and does not provide a production proxy.
   */
  snowstormProxy?: SnowstormViteProxyOptions;
}

export const DEFAULT_SNOWSTORM_PROXY_PATH: '/snowstorm-api';

export function createSnowstormProxyConfig(
  options: SnowstormViteProxyOptions
): Record<string, {
  target: string;
  changeOrigin: boolean;
  rewrite(path: string): string;
}>;

export function terminologyVitePlugin(
  options?: TerminologyVitePluginOptions
): unknown;

declare module 'virtual:fdh-terminology-packages' {
  const packages: Record<string, import('fhir/r4').CodeSystem[]>;
  export const packageMetadata: Record<string, {
    packageName?: string;
    title?: string;
    version?: string;
    directDependency?: boolean;
    transitiveDependency?: boolean;
    deduplicated?: boolean;
  }>;
  export default packages;
}
