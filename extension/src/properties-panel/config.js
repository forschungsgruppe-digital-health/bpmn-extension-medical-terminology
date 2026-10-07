import annotationConfig from '../config/annotation-config.json' with { type: 'json' };

export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showAnnotations: true,
  targetTypes: Object.freeze([...annotationConfig.targetTypes])
});

export function resolveTerminologyPropertiesConfig(config = {}) {
  const targetTypes = config?.targetTypes
    ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.targetTypes;

  if (!Array.isArray(targetTypes) || targetTypes.some(type =>
    typeof type !== 'string' || !/^bpmn:[A-Za-z][A-Za-z0-9]*$/.test(type)
  )) {
    throw new TypeError('targetTypes must be an array of BPMN type names (for example bpmn:Task).');
  }

  return {
    showAnnotations: config?.showAnnotations
      ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.showAnnotations,
    targetTypes: [...targetTypes]
  };
}
