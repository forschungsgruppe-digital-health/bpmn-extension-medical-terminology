export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showClinicalDomain: true,
  showAnnotations: true
});

export function resolveTerminologyPropertiesConfig(config = {}) {
  return {
    showClinicalDomain: config?.showClinicalDomain
      ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.showClinicalDomain,
    showAnnotations: config?.showAnnotations
      ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.showAnnotations
  };
}
