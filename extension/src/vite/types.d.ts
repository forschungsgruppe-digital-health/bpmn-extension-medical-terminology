export interface TerminologyVitePluginOptions {
  /**
   * Explicit package selection. Explicit packages may be outside the default
   * automatic-discovery allowlist, and the plugin imports them unfiltered:
   * selecting `hl7.terminology.r4` explicitly also imports its third-party code
   * systems (SNODENT, the ADA tooth codes, the NUCC provider taxonomy and the
   * W3C colour codes), which need their owners' licences. The
   * default runtime registration (`packageAutoDiscovery: true`) still keeps
   * only the default packages without those code systems; pass the selection
   * as `packageDiscovery.packages` or `packageAutoDiscovery: { packages }` to
   * register it as it is.
   */
  packages?: string[] | Record<string, {
    include?: string[];
    exclude?: string[];
  }>;
  /**
   * Automatic discovery is limited to the bundled HL7, IHE, and KDL data and
   * leaves out the third-party code systems of `hl7.terminology.r4`.
   */
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
