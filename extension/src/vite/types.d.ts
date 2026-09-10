export interface TerminologyVitePluginOptions {
  /**
   * Explicit package selection. Explicit packages may be outside the default
   * automatic-discovery allowlist.
   */
  packages?: string[] | Record<string, {
    include?: string[];
    exclude?: string[];
  }>;
  /** Automatic discovery is limited to the bundled HL7, IHE, and KDL data. */
  autoDiscover?: boolean;
  includeTransitiveFrom?: string[];
  exclude?: string[];
  resourceTypes?: string[];
  /**
   * Expose discovered collections through the configured globals. The plugin
   * resolves its internal virtual module during Vite's HTML transformation;
   * consumers must not load that URI as a browser URL.
   */
  exposeGlobal?: boolean;
  globalKey?: string;
  metadataGlobalKey?: string;
}

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
