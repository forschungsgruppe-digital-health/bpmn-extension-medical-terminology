export const DEFAULT_PACKAGE_METADATA_GLOBAL_KEY = '__FDH_TERMINOLOGY_PACKAGE_METADATA__';

export function formatPackageDisplayName(packageName, metadata = {}, fallbackName = packageName) {
  const title = metadata?.title?.trim() || fallbackName || packageName;
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
