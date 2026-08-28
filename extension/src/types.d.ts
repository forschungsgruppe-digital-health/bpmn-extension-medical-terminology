export interface PackageMetadata {
  /** Canonical package name used by generated discovery registries. */
  packageName?: string;
  title?: string;
  version?: string;
}

export interface Concept {
  code: string;
  display?: string;
  system: string;
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
  total: number;
}

export interface TerminologyProvider {
  readonly id: string;
  readonly displayName: string;
  readonly systemUri: string;
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
  packageMetadata?: Record<string, PackageMetadata>;
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
  packageName?: string;
  systemUri?: string;
  codeSystem?: CodeSystemResource;
  codeSystems?: CodeSystemResource[];
  fallbackProvider?: TerminologyProvider;
  fallbackFhirConfig?: FhirProviderConfig;
}

export interface PackageDiscoveryConfig {
  enabled?: boolean;
  include?: string[];
  exclude?: string[];
  mode?: 'auto' | 'whitelist';
  packages?: Record<string, CodeSystemResource[]>;
  packageNames?: string[];
  modules?: Record<string, CodeSystemResource>;
  metadata?: Record<string, PackageMetadata>;
  componentLabels?: Record<string, Record<string, string>>;
}

export interface PackageAutoDiscoveryConfig {
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
  enablePackageDefaults?: boolean;
  disabledProviderIds?: string[];
  providers?: TerminologyProvider[];
  fhirProviders?: Array<TerminologyProvider | FhirProviderConfig>;
  additionalFhirProviders?: Array<TerminologyProvider | FhirProviderConfig>;
  packageProviders?: Array<TerminologyProvider | PackageProviderConfig>;
  additionalPackageProviders?: Array<TerminologyProvider | PackageProviderConfig>;
  fhirProviderOverrides?: Array<Partial<FhirProviderConfig>>;
  packageProviderOptions?: Record<string, PackageProviderOptions>;
  packageDiscovery?: PackageDiscoveryConfig;
  packageAutoDiscovery?: boolean | PackageAutoDiscoveryConfig;
  packageMetadata?: Record<string, PackageMetadata>;
  hl7CodeSystems?: CodeSystemResource[];
  loaderConfig?: false | LoaderConfig;
}
