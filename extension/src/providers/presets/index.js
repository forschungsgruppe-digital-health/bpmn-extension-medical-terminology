import { createPackageCollectionProvider } from '../../services/TerminologyServices.js';
import { formatPackageDisplayName } from '../../services/PackageMetadata.js';

import iheXdsClassCodeSystem from 'de.ihe-d.terminology/CodeSystem-IHEXDSclassCode.json';
import iheXdsTypeCodeSystem from 'de.ihe-d.terminology/CodeSystem-IHEXDStypeCode.json';
import kdlCodeSystem from 'dvmd.kdl.r4/codesystem-kdl.xml.json';
import hl7GeneratedCodeSystems from './hl7-r4-codesystems.generated.js';

let hasWarnedAboutMissingHl7PackageCodeSystems = false;

function warnMissingHl7PackageCodeSystems() {
  if (hasWarnedAboutMissingHl7PackageCodeSystems) {
    return;
  }

  hasWarnedAboutMissingHl7PackageCodeSystems = true;
  console.warn(
    '[terminology] No CodeSystem JSON resources were found for "hl7.terminology.r4". ' +
    'The "hl7-terminology-r4-package" preset will be skipped. ' +
    'If needed, override the preset via createDefaultTerminologyServices(...) and pass ' +
    '`packageProviderOptions["hl7-terminology-r4-package"].codeSystems`.'
  );
}

export function loadHl7TerminologyR4CodeSystemsFromGlob(globFn) {
  if (typeof globFn !== 'function') {
    return [];
  }

  const packageMatches = Object.values(globFn(
    'hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const absoluteMatches = Object.values(globFn(
    '/node_modules/hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const localWorkspaceMatches = Object.values(globFn(
    '../../../node_modules/hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const hoistedWorkspaceMatches = Object.values(globFn(
    '../../../../../node_modules/hl7.terminology.r4/CodeSystem-*.json',
    {
      eager: true,
      import: 'default'
    }
  ));

  const codeSystems = [];
  const seenSystemUris = new Set();

  for (const codeSystem of [
    ...packageMatches,
    ...absoluteMatches,
    ...localWorkspaceMatches,
    ...hoistedWorkspaceMatches
  ]) {
    const systemUri = codeSystem?.url || `${codeSystem?.id || ''}`;
    if (!systemUri || seenSystemUris.has(systemUri)) {
      continue;
    }

    seenSystemUris.add(systemUri);
    codeSystems.push(codeSystem);
  }

  return codeSystems;
}

export function loadHl7TerminologyR4CodeSystems() {
  const fromGlob = loadHl7TerminologyR4CodeSystemsFromGlob(import.meta.glob);
  if (fromGlob.length > 0) {
    return fromGlob;
  }

  return hl7GeneratedCodeSystems;
}

export const DEFAULT_PACKAGE_PROVIDER_IDS = Object.freeze([
  'hl7-terminology-r4-package',
  'ihe-xds-class',
  'ihe-xds-type',
  'kdl'
]);

const PACKAGE_PROVIDER_PRESETS = Object.freeze({
  'hl7-terminology-r4-package': Object.freeze({
    id: 'hl7-terminology-r4-package',
    packageName: 'hl7.terminology.r4',
    resolveCodeSystems: config => config.codeSystems || loadHl7TerminologyR4CodeSystems(),
    returnNullIfEmpty: true
  }),
  'ihe-xds-class': Object.freeze({
    id: 'ihe-xds-class',
    packageName: 'de.ihe-d.terminology',
    resolveCodeSystems: config => config.codeSystems || [iheXdsClassCodeSystem]
  }),
  'ihe-xds-type': Object.freeze({
    id: 'ihe-xds-type',
    packageName: 'de.ihe-d.terminology',
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

  if (preset.returnNullIfEmpty && !codeSystems.length) {
    if (preset.id === 'hl7-terminology-r4-package') {
      warnMissingHl7PackageCodeSystems();
    }
    return null;
  }

  const displayName = config.displayName
    || formatPackageDisplayName(
      preset.packageName,
      config.packageMetadata?.[preset.packageName]
    );

  return createPackageCollectionProvider({
    id: preset.id,
    displayName,
    ...config,
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
