export interface PackageMetadata {
  /** Canonical package name used by generated discovery registries. */
  packageName?: string;
  title?: string;
  version?: string;
  /** Set when discovery saw the package as a direct dependency. */
  directDependency?: boolean;
  /** Set when discovery saw the package as a transitive dependency. */
  transitiveDependency?: boolean;
  /** Set when direct and transitive requirements resolved to one installation. */
  deduplicated?: boolean;
}

export interface Concept {
  code: string;
  display?: string;
  system: string;
  /** Version of the concrete CodeSystem; packageVersion is separate metadata. */
  version?: string;
  active?: boolean;
  properties?: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  language?: string;
  activeOnly?: boolean;
  filter?: Record<string, string>;
}

export interface SearchResult {
  concepts: Concept[];
  /** Total matches when the provider can supply a reliable value. */
  total?: number;
}

export type TerminologyRequestErrorKind =
  | 'network'
  | 'authorization'
  | 'server'
  | 'data'
  | 'redirect';

export interface TerminologyAuth {
  type: 'Bearer' | 'Basic' | 'ApiKey';
  token?: string;
  credentials?: string;
  apiKey?: string;
  headerName?: string;
}

export interface TerminologyProvider {
  readonly id: string;
  readonly displayName: string;
  readonly systemUri: string;
  readonly packageKey?: string;
  readonly packageName?: string;
  /** Version of the installed npm terminology package. */
  readonly packageVersion?: string;
  readonly packageMetadata?: PackageMetadata;
  readonly sourceType?: 'api' | 'package';
  readonly sourceLabel?: string;
  readonly sourceName?: string;
  search(term: string, options?: SearchOptions): Promise<SearchResult>;
  lookup(code: string): Promise<Concept | null>;
  validate(code: string): Promise<{ valid: boolean; message?: string }>;
}

export interface CodeSystemResource {
  resourceType?: 'CodeSystem';
  id?: string;
  url: string;
  name?: string;
  title?: string;
  version?: string;
  concept?: unknown[];
}

export interface PackageProviderOptions {
  displayName?: string;
  componentLabel?: string;
  /** A single metadata object or the legacy package-name keyed metadata map. */
  packageMetadata?: PackageMetadata | Record<string, PackageMetadata>;
}

export interface FhirProviderConfig {
  id: string;
  displayName: string;
  systemUri: string;
  valueSetUri?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  expandParameters?: Record<string, string>;
  lookupParameters?: Record<string, string>;
}

export interface PackageProviderConfig extends PackageProviderOptions {
  id: string;
  /** Stable registry key, usually `packageName@packageVersion` for parallel versions. */
  packageKey?: string;
  packageName?: string;
  systemUri?: string;
  codeSystem?: CodeSystemResource;
  codeSystems?: CodeSystemResource[];
  fallbackProvider?: TerminologyProvider;
  fallbackFhirConfig?: FhirProviderConfig;
}

export interface PackageDiscoveryConfig {
  /**
   * Request discovery when package data comes from a host or bundler.
   * Supplying `packages`, `packageNames`, or `modules` also requests discovery.
   */
  enabled?: boolean;
  /** Restrict explicitly supplied or discovered packages by package name. */
  include?: string[];
  /** Exclude package names after applying `include`. */
  exclude?: string[];
  mode?: 'auto' | 'whitelist';
  /**
   * Explicit package data, registered independently of `enablePackageDefaults`.
   * Keys may be plain package names or version-qualified `packageName@version`
   * keys when multiple installed versions are supplied.
   */
  packages?: Record<string, CodeSystemResource[]>;
  /** Package names or version-qualified package keys to include. */
  packageNames?: string[];
  modules?: Record<string, CodeSystemResource>;
  /** Metadata uses the same keys as `packages`; plain package-name fallbacks are supported. */
  metadata?: Record<string, PackageMetadata>;
  /** Labels may be keyed by a version-qualified package key or package name. */
  componentLabels?: Record<string, Record<string, string>>;
}

export interface PackageAutoDiscoveryConfig {
  /** Bundler-exposed package collections may use version-qualified package keys. */
  packages?: Record<string, CodeSystemResource[]>;
  metadata?: Record<string, PackageMetadata>;
  globalKey?: string;
  metadataGlobalKey?: string;
  globFn?: (
    pattern: string,
    options: { eager: true; import: 'default' }
  ) => Record<string, CodeSystemResource>;
}

export interface LoaderConfig {
  fhirBaseUrl?: string;
  fetchFn?: typeof fetch;
  loadProvider?: (
    systemUri: string,
    fhirBaseUrl: string,
    fetchFn?: typeof fetch
  ) => Promise<TerminologyProvider>;
}

export interface SnomedProviderConfig {
  transport?: 'fhir' | 'snowstorm';
  baseUrl?: string;
  displayName?: string;
  fetchFn?: typeof fetch;
  /** Snowstorm edition branch, without the `/concepts` path. */
  branch?: string;
  language?: string;
  languageStrategy?: 'param' | 'header';
  maxResults?: number;
  defaultEcl?: string;
  version?: string;
  auth?: TerminologyAuth;
  headers?: Record<string, string>;
}

export interface DefaultTerminologyConfig {
  serverConfig?: {
    fhirBaseUrl?: string;
    snomedBaseUrl?: string;
    snowstormBaseUrl?: string;
  };
  snomedConfig?: SnomedProviderConfig;
  fetchFn?: typeof fetch;
  enableSnomed?: boolean;
  enableFhirDefaults?: boolean;
  /** Enable bundled package providers; explicit package discovery remains available. */
  enablePackageDefaults?: boolean;
  disabledProviderIds?: string[];
  providers?: TerminologyProvider[];
  fhirProviders?: Array<TerminologyProvider | FhirProviderConfig>;
  additionalFhirProviders?: Array<TerminologyProvider | FhirProviderConfig>;
  packageProviders?: Array<TerminologyProvider | PackageProviderConfig>;
  additionalPackageProviders?: Array<TerminologyProvider | PackageProviderConfig>;
  fhirProviderOverrides?: Array<Partial<FhirProviderConfig>>;
  packageProviderOptions?: Record<string, PackageProviderOptions>;
  /** Register explicitly supplied package data and configure package filters. */
  packageDiscovery?: PackageDiscoveryConfig;
  /** Enable or disable host/bundler package auto-discovery only. */
  packageAutoDiscovery?: boolean | PackageAutoDiscoveryConfig;
  packageMetadata?: Record<string, PackageMetadata>;
  hl7CodeSystems?: CodeSystemResource[];
  loaderConfig?: false | LoaderConfig;
}
