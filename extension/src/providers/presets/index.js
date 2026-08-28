import { createPackageCollectionProvider } from '../../services/TerminologyServices.js';

import iheXdsClassCodeSystem from 'de.ihe-d.terminology/CodeSystem-IHEXDSclassCode.json' with { type: 'json' };
import iheXdsTypeCodeSystem from 'de.ihe-d.terminology/CodeSystem-IHEXDStypeCode.json' with { type: 'json' };
import ihePackageMetadata from 'de.ihe-d.terminology/package.json' with { type: 'json' };
import kdlCodeSystem from 'dvmd.kdl.r4/codesystem-kdl.xml.json' with { type: 'json' };
import kdlPackageMetadata from 'dvmd.kdl.r4/package.json' with { type: 'json' };
import hl7PackageMetadata from 'hl7.terminology.r4/package.json' with { type: 'json' };
import hl7CodeSystems from './hl7-code-systems.json' with { type: 'json' };

const DEFAULT_PACKAGE_METADATA = Object.freeze({
  [hl7PackageMetadata.name]: hl7PackageMetadata,
  [ihePackageMetadata.name]: ihePackageMetadata,
  [kdlPackageMetadata.name]: kdlPackageMetadata
});

export const DEFAULT_PACKAGE_PROVIDER_IDS = Object.freeze([
  'hl7-terminology-r4-package',
  'ihe-xds-class',
  'ihe-xds-type',
  'kdl'
]);

function collectUniqueCodeSystems(codeSystems) {
  const uniqueCodeSystems = [];
  const seenSystemUris = new Set();

  for (const codeSystem of codeSystems) {
    const systemUri = codeSystem?.url;

    if (!systemUri || seenSystemUris.has(systemUri)) {
      continue;
    }

    seenSystemUris.add(systemUri);
    uniqueCodeSystems.push(codeSystem);
  }

  return uniqueCodeSystems;
}

function warnMissingHl7PackageCodeSystems() {
  console.warn(
    '[terminology] No CodeSystem JSON resources were found for "hl7.terminology.r4". ' +
    'The default HL7 package preset will be skipped. ' +
    'Use packageAutoDiscovery or pass `hl7CodeSystems` to supply a package-backed provider.'
  );
}

function getPackageMetadata(preset, config) {
  const metadata = {
    ...DEFAULT_PACKAGE_METADATA[preset.packageName],
    ...config.packageMetadata?.[preset.packageName]
  };

  if (
    preset.normalizeDefaultTitle
    && metadata.title === DEFAULT_PACKAGE_METADATA[preset.packageName]?.title
  ) {
    return {
      ...metadata,
      title: preset.packageName
    };
  }

  return metadata;
}

export function loadHl7TerminologyR4CodeSystems() {
  return collectUniqueCodeSystems(hl7CodeSystems);
}

const PACKAGE_PROVIDER_PRESETS = Object.freeze({
  'hl7-terminology-r4-package': Object.freeze({
    id: 'hl7-terminology-r4-package',
    packageName: 'hl7.terminology.r4',
    normalizeDefaultTitle: true,
    resolveCodeSystems: config => config.codeSystems || loadHl7TerminologyR4CodeSystems(),
    returnNullIfEmpty: true
  }),
  'ihe-xds-class': Object.freeze({
    id: 'ihe-xds-class',
    packageName: 'de.ihe-d.terminology',
    componentLabel: 'IHE XDS Document Class',
    resolveCodeSystems: config => config.codeSystems || [iheXdsClassCodeSystem]
  }),
  'ihe-xds-type': Object.freeze({
    id: 'ihe-xds-type',
    packageName: 'de.ihe-d.terminology',
    componentLabel: 'IHE XDS Document Type',
    resolveCodeSystems: config => config.codeSystems || [iheXdsTypeCodeSystem]
  }),
  kdl: Object.freeze({
    id: 'kdl',
    packageName: 'dvmd.kdl.r4',
    resolveCodeSystems: config => config.codeSystems || [kdlCodeSystem]
  })
});

export function createPackagePresetProvider(presetId, config = {}) {
  const preset = PACKAGE_PROVIDER_PRESETS[presetId];

  if (!preset) {
    throw new Error(`Unknown package preset "${presetId}".`);
  }

  const codeSystems = preset.resolveCodeSystems(config);

  if (preset.returnNullIfEmpty && (!codeSystems || !codeSystems.length)) {
    warnMissingHl7PackageCodeSystems();
    return null;
  }

  return createPackageCollectionProvider({
    id: preset.id,
    ...config,
    packageName: preset.packageName,
    packageMetadata: getPackageMetadata(preset, config),
    componentLabel: config.componentLabel || preset.componentLabel,
    codeSystems
  });
}

export function createHl7TerminologyR4PackageProvider(config = {}) {
  return createPackagePresetProvider('hl7-terminology-r4-package', config);
}

export function createIheXdsClassCodeProvider(config = {}) {
  return createPackagePresetProvider('ihe-xds-class', config);
}

export function createIheXdsTypeCodeProvider(config = {}) {
  return createPackagePresetProvider('ihe-xds-type', config);
}

export function createKdlProvider(config = {}) {
  return createPackagePresetProvider('kdl', config);
}
