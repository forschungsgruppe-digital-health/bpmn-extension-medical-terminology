export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showClinicalDomain: true,
  showAnnotations: true,
  showMappingTarget: true
});

export function resolveTerminologyPropertiesConfig(config = {}) {
  return {
    ...DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG,
    ...(config || {})
  };
}
