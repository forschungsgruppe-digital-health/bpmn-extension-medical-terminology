import annotationConfig from '../config/annotation-config.json' with { type: 'json' };

export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showAnnotations: true,
  targetTypes: Object.freeze([...annotationConfig.targetTypes]),
  includeTypes: Object.freeze([]),
  excludeTypes: Object.freeze([])
});

export function resolveTerminologyPropertiesConfig(config = {}) {
  const targetTypes = config?.targetTypes
    ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.targetTypes;
  const includeTypes = config?.includeTypes ?? [];
  const excludeTypes = config?.excludeTypes ?? [];

  for (const [name, types] of Object.entries({ targetTypes, includeTypes, excludeTypes })) {
    if (!Array.isArray(types) || types.some(type =>
      typeof type !== 'string' || !/^bpmn:[A-Za-z][A-Za-z0-9]*$/.test(type)
    )) {
      throw new TypeError(`${name} must be an array of BPMN type names (for example bpmn:Task).`);
    }
  }

  return {
    showAnnotations: config?.showAnnotations
      ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.showAnnotations,
    targetTypes: [...targetTypes],
    includeTypes: [...includeTypes],
    excludeTypes: [...excludeTypes]
  };
}
