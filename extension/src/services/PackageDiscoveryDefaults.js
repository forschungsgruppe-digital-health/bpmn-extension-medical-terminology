import { resolvePackageMetadata } from './PackageMetadata.js';

const IHE_XDS_RESOURCE_URLS = Object.freeze([
  'http://ihe-d.de/CodeSystems/IHEXDSclassCode',
  'http://ihe-d.de/CodeSystems/IHEXDStypeCode'
]);

const DEFAULT_PACKAGE_RESOURCE_FILES = Object.freeze({
  'de.ihe-d.terminology': Object.freeze([
    'CodeSystem-IHEXDSclassCode.json',
    'CodeSystem-IHEXDStypeCode.json'
  ]),
  'dvmd.kdl.r4': Object.freeze([
    'codesystem-kdl.xml.json'
  ])
});

const DEFAULT_PACKAGE_RESOURCE_URLS = Object.freeze({
  'de.ihe-d.terminology': IHE_XDS_RESOURCE_URLS,
  'dvmd.kdl.r4': Object.freeze([
    'http://dvmd.de/fhir/CodeSystem/kdl'
  ])
});

export const DEFAULT_TERMINOLOGY_PACKAGE_NAMES = Object.freeze([
  'hl7.terminology.r4',
  'de.ihe-d.terminology',
  'dvmd.kdl.r4'
]);

export function getDefaultPackageResourceFilter(packageName) {
  const files = DEFAULT_PACKAGE_RESOURCE_FILES[packageName];

  return files
    ? { files: [...files] }
    : {};
}

export function filterDefaultPackageRegistry(packages = {}, metadata = {}) {
  const allowedPackageNames = new Set(DEFAULT_TERMINOLOGY_PACKAGE_NAMES);
  const filteredPackages = {};

  for (const [packageKey, codeSystems] of Object.entries(packages || {})) {
    const { packageName } = resolvePackageMetadata(packageKey, metadata);

    if (!allowedPackageNames.has(packageName)) {
      continue;
    }

    const allowedResourceUrls = DEFAULT_PACKAGE_RESOURCE_URLS[packageName];
    const filteredCodeSystems = Array.isArray(codeSystems)
      ? codeSystems.filter(codeSystem =>
        !allowedResourceUrls || allowedResourceUrls.includes(codeSystem?.url)
      )
      : [];

    if (filteredCodeSystems.length > 0) {
      filteredPackages[packageKey] = filteredCodeSystems;
    }
  }

  return filteredPackages;
}
