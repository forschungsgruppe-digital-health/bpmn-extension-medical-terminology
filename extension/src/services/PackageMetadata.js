export const DEFAULT_PACKAGE_METADATA_GLOBAL_KEY = '__FDH_TERMINOLOGY_PACKAGE_METADATA__';

const PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/;

export function createPackageKey(packageName, version) {
  const normalizedName = typeof packageName === 'string' ? packageName.trim() : '';
  const normalizedVersion = typeof version === 'string' ? version.trim() : '';

  return normalizedName && normalizedVersion
    ? `${normalizedName}@${normalizedVersion}`
    : normalizedName;
}

export function parsePackageKey(packageKey) {
  const normalizedKey = typeof packageKey === 'string' ? packageKey.trim() : '';
  const separatorIndex = normalizedKey.lastIndexOf('@');
  const version = normalizedKey.slice(separatorIndex + 1);

  if (
    separatorIndex > 0
    && PACKAGE_VERSION_PATTERN.test(version)
  ) {
    return {
      packageName: normalizedKey.slice(0, separatorIndex),
      version
    };
  }

  return {
    packageName: normalizedKey,
    version: undefined
  };
}

export function resolvePackageMetadata(packageKey, metadataByKey = {}) {
  const parsedKey = parsePackageKey(packageKey);
  const baseMetadata = metadataByKey[parsedKey.packageName] || {};
  const entryMetadata = metadataByKey[packageKey] || {};
  const packageMetadata = {
    ...baseMetadata,
    ...entryMetadata
  };
  const packageName = typeof packageMetadata.packageName === 'string'
    && packageMetadata.packageName.trim()
    ? packageMetadata.packageName.trim()
    : parsedKey.packageName;
  const explicitEntryVersion = typeof entryMetadata.version === 'string'
    && entryMetadata.version.trim()
    ? entryMetadata.version.trim()
    : undefined;
  const configuredVersion = typeof baseMetadata.version === 'string'
    && baseMetadata.version.trim()
    ? baseMetadata.version.trim()
    : undefined;
  const version = explicitEntryVersion || parsedKey.version || configuredVersion;

  return {
    packageKey,
    packageName,
    version,
    packageMetadata: version && packageMetadata.version !== version
      ? { ...packageMetadata, version }
      : packageMetadata
  };
}

export function formatPackageDisplayName(packageName, metadata = {}, fallbackName = packageName) {
  const title = metadata?.packageName === packageName
    ? packageName
    : metadata?.title?.trim() || fallbackName || packageName;
  const version = metadata?.version?.trim();

  return version ? `${title} (${version})` : title;
}

function getCodeSystemDisplayName(codeSystem) {
  return codeSystem?.title?.trim()
    || codeSystem?.name?.trim()
    || codeSystem?.id?.trim()
    || codeSystem?.url
    || null;
}

export function formatPackageProviderDisplayName({
  packageName,
  packageMetadata,
  componentLabel,
  codeSystems = [],
  includeCodeSystemName = true
}) {
  const packageDisplayName = packageName
    ? formatPackageDisplayName(packageName, packageMetadata)
    : null;
  const resolvedComponentLabel = componentLabel
    || (includeCodeSystemName && codeSystems.length === 1
      ? getCodeSystemDisplayName(codeSystems[0])
      : null);

  if (packageDisplayName && resolvedComponentLabel) {
    return `${packageDisplayName} — ${resolvedComponentLabel}`;
  }

  return packageDisplayName || resolvedComponentLabel || null;
}
