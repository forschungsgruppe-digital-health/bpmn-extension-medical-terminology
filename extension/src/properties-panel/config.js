export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showAnnotations: true
});

export function resolveTerminologyPropertiesConfig(config = {}) {
  return {
    showAnnotations: config?.showAnnotations
      ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.showAnnotations
  };
}
