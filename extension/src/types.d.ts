export interface PackageMetadata {
  title?: string;
  version?: string;
}

export interface CodeSystemResource {
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
  disabledProviderIds?: string[];
  packageProviderOptions?: Record<string, PackageProviderOptions>;
  packageDiscovery?: PackageDiscoveryConfig;
}
