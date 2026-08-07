export const DEFAULT_PACKAGE_METADATA_GLOBAL_KEY = '__FDH_TERMINOLOGY_PACKAGE_METADATA__';

export function formatPackageDisplayName(packageName, metadata = {}, fallbackName = packageName) {
  const title = metadata?.title?.trim() || fallbackName || packageName;
  const version = metadata?.version?.trim();

  return version ? `${title} (${version})` : title;
}
