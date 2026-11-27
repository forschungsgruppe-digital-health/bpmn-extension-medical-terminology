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
  /**
   * Items of this page that the provider received but hid, for example
   * through a FHIR provider's `codePattern`. `total` still counts them.
   */
  filteredOut?: number;
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
  /**
   * `'api'` for a provider that sends searches to a terminology server; the
   * properties panel throttles its searches (`serverSearchDebounceMs`,
   * `serverSearchMinLength`). `'package'` for bundled package data. A custom
   * provider that queries a server should report `'api'`.
   */
  readonly sourceType?: 'api' | 'package';
  /**
   * `true` for a provider whose searches may reach a terminology server
   * although it does not report `sourceType: 'api'`, such as a
   * `FallbackProvider` (offline package with FHIR fallback). The properties
   * panel throttles its searches like those of an `'api'` provider; the
   * dropdown label still follows `sourceType`.
   */
  readonly remoteSearch?: boolean;
  /** Package source label, usually `packageName@packageVersion`. */
  readonly sourceLabel?: string;
  /** Dynamic resource or package name; explicit sourceName overrides it. */
  readonly sourceName?: string;
  search(term: string, options?: SearchOptions): Promise<SearchResult>;
  lookup(code: string): Promise<Concept | null>;
  validate(code: string): Promise<{ valid: boolean; message?: string }>;
  /** Locally known versions for the requested CodeSystem URI, when available. */
  getCodeSystemVersions?(systemUri: string): string[];
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
  /**
   * FHIR base URL. A relative URL such as `/api/terminology` (or a
   * protocol-relative `//host/fhir`) resolves against the current page, like
   * `fetch`; without a page to resolve it against, every request fails.
   */
  baseUrl?: string;
  fetchFn?: typeof fetch;
  /**
   * Extra `$expand` parameters. The default providers pin no release; to pin
   * one, set for example `{ valueSetVersion: '2026' }`. A server that does not
   * hold that release answers HTTP 404.
   */
  expandParameters?: Record<string, string>;
  /** Extra `$lookup` parameters, for example `{ version: '2026' }`. */
  lookupParameters?: Record<string, string>;
  /**
   * Show only search results whose code matches this pattern. The default
   * `loinc` provider sets `'^\\d{1,7}-\\d$'` (LOINC term codes, no Parts,
   * Answers, groups or answer lists). The filter runs on each page the server
   * returns, so a page may hold fewer items while `offset` and `total` stay
   * the server's. `null` or `''` disables it. Lookups are not filtered.
   */
  codePattern?: RegExp | string | null;
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
  /**
   * Bundler-exposed default terminology package collections may use
   * version-qualified package keys. Use packageDiscovery for other packages.
   */
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
  /**
   * Module id of the SNOMED CT edition covered by your licence, for example
   * `11000274103` (German National Edition) or `900000000000207008`
   * (International Edition). Required for the FHIR transport unless
   * `valueSetUri` is set explicitly; without either, SNOMED CT stays disabled.
   */
  edition?: string;
  /**
   * Release of the edition as `YYYYMMDD`, for example `20260815`; omit to use
   * the server's latest release of it. Each coding stores the release the
   * server reports. Only a pinned release becomes the provider's version, so
   * only then are stored codings of another release flagged as unavailable.
   */
  editionVersion?: string;
  /**
   * Explicit ValueSet URI for `$expand`; overrides the one derived from
   * `edition`. An implicit SNOMED CT value set such as
   * `http://snomed.info/sct/11000274103?fhir_vs=isa/404684003` also scopes
   * `$lookup` to that edition, unless `edition` is set too: `edition` then
   * scopes `$lookup`, and the console warns once if the two name different
   * editions or releases. Any other value set, including
   * `http://snomed.info/sct?fhir_vs…` without a module id, leaves `$lookup`
   * unscoped unless `edition` or `lookupParameters.version` is set, and the
   * console warns once.
   */
  valueSetUri?: string;
  /**
   * Extra `$expand` parameters for the FHIR transport, merged over the
   * default `{ activeOnly: 'true' }`. `{ activeOnly: 'false' }` also returns
   * inactive concepts.
   */
  expandParameters?: Record<string, string>;
  lookupParameters?: Record<string, string>;
  displayName?: string;
  fetchFn?: typeof fetch;
  /**
   * Snowstorm edition branch, without the `/concepts` path, for example
   * `MAIN/SNOMEDCT-DE`. Required for the Snowstorm transport: there is no
   * default branch, and without one SNOMED CT stays disabled.
   */
  branch?: string;
  /**
   * Snowstorm transport only. The FHIR transport uses the package language
   * setting: `displayLanguage=de`.
   */
  language?: string;
  /**
   * Snowstorm transport only (default `'header'`). The FHIR transport uses the
   * package language setting: `displayLanguage=de`.
   */
  languageStrategy?: 'param' | 'header';
  maxResults?: number;
  defaultEcl?: string;
  version?: string;
  auth?: TerminologyAuth;
  headers?: Record<string, string>;
}

export interface TerminologyPropertiesPanelConfig {
  /** Show or hide the terminology annotation entry on matching elements. */
  showAnnotations?: boolean;
  /** Show or hide `MT` badges on annotated elements and generated comments. */
  showBadges?: boolean;
  /** Replace the package's default annotatable BPMN types. */
  targetTypes?: string[];
  /** Add BPMN types to the defaults, or to the `targetTypes` override. */
  includeTypes?: string[];
  /** Exclude matching BPMN types; exclusions take precedence over inclusions. */
  excludeTypes?: string[];
  /**
   * Milliseconds a search with a provider that queries a terminology server
   * (`sourceType: 'api'` or `remoteSearch: true`) waits after the last
   * keystroke (default `300`); only the last term is sent. `0` searches on
   * every keystroke. Local providers always search at once.
   */
  serverSearchDebounceMs?: number;
  /**
   * Minimum number of characters before such a provider is queried (default
   * `3`); shorter terms show a hint. Local providers search from one character.
   */
  serverSearchMinLength?: number;
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
