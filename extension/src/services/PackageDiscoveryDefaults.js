import { resolvePackageMetadata } from './PackageMetadata.js';
import { getHl7ExclusionReason } from '../providers/presets/hl7-exclusions.js';

const IHE_XDS_RESOURCE_URLS = Object.freeze([
  'http://ihe-d.de/CodeSystems/IHEXDSclassCode',
  'http://ihe-d.de/CodeSystems/IHEXDStypeCode'
]);

const DEFAULT_PACKAGE_RESOURCE_URLS = Object.freeze({
  'de.ihe-d.terminology': IHE_XDS_RESOURCE_URLS,
  'dvmd.kdl.r4': Object.freeze([
    'http://dvmd.de/fhir/CodeSystem/kdl'
  ])
});

// Default discovery leaves out resources that must not be redistributed, such
// as the third-party code systems in hl7.terminology.r4 (SNODENT, ADA, NUCC,
// W3C colour codes).
// Each predicate returns the reason a resource is left out, or null. This is a
// predicate rather than an `exclude` URL list: a selector missing from another
// release of the package would make discovery fail or skip the package.
const DEFAULT_PACKAGE_RESOURCE_EXCLUSIONS = Object.freeze({
  'hl7.terminology.r4': getHl7ExclusionReason
});

export const DEFAULT_TERMINOLOGY_PACKAGE_NAMES = Object.freeze([
  'hl7.terminology.r4',
  'de.ihe-d.terminology',
  'dvmd.kdl.r4'
]);

/**
 * Resource filter used when a package is found by default discovery rather
 * than selected explicitly.
 *
 * @param {string} packageName
 * @returns {{ include?: string[], warnOnMissing?: boolean, excludeResource?: (resource: object) => string | null }}
 */
export function getDefaultPackageResourceFilter(packageName) {
  const include = DEFAULT_PACKAGE_RESOURCE_URLS[packageName];
  const excludeResource = DEFAULT_PACKAGE_RESOURCE_EXCLUSIONS[packageName];

  return {
    ...(include ? { include: [...include], warnOnMissing: true } : {}),
    ...(excludeResource ? { excludeResource } : {})
  };
}

/**
 * Restrict an automatically discovered package registry to the default
 * packages and resources. Explicitly selected package data is not passed
 * through this filter.
 *
 * @param {Record<string, object[]>} [packages]
 * @param {Record<string, object>} [metadata]
 * @returns {Record<string, object[]>}
 */
export function filterDefaultPackageRegistry(packages = {}, metadata = {}) {
  const allowedPackageNames = new Set(DEFAULT_TERMINOLOGY_PACKAGE_NAMES);
  const filteredPackages = {};

  for (const [packageKey, codeSystems] of Object.entries(packages || {})) {
    const { packageName } = resolvePackageMetadata(packageKey, metadata);

    if (!allowedPackageNames.has(packageName)) {
      continue;
    }

    const allowedResourceUrls = DEFAULT_PACKAGE_RESOURCE_URLS[packageName];
    const excludeResource = DEFAULT_PACKAGE_RESOURCE_EXCLUSIONS[packageName];
    const filteredCodeSystems = Array.isArray(codeSystems)
      ? codeSystems.filter(codeSystem =>
        (!allowedResourceUrls || allowedResourceUrls.includes(codeSystem?.url))
        && !excludeResource?.(codeSystem)
      )
      : [];

    if (filteredCodeSystems.length > 0) {
      filteredPackages[packageKey] = filteredCodeSystems;
    }
  }

  return filteredPackages;
}
