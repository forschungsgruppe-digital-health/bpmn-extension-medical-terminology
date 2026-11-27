import annotationConfig from '../config/annotation-config.json' with { type: 'json' };

export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showAnnotations: true,
  showBadges: true,
  targetTypes: Object.freeze([...annotationConfig.targetTypes]),
  includeTypes: Object.freeze([]),
  excludeTypes: Object.freeze([]),
  // Searches with a provider that queries a terminology server
  // (`sourceType: 'api'` or `remoteSearch: true`) wait this long after the
  // last keystroke and need a term of at least this many characters. Local
  // providers search at once.
  serverSearchDebounceMs: 300,
  serverSearchMinLength: 3
});

function resolveInteger(config, name, minimum) {
  const value = config?.[name] ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG[name];

  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be an integer of at least ${minimum}.`);
  }

  return value;
}

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
    showBadges: config?.showBadges
      ?? DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.showBadges,
    targetTypes: [...targetTypes],
    includeTypes: [...includeTypes],
    excludeTypes: [...excludeTypes],
    serverSearchDebounceMs: resolveInteger(config, 'serverSearchDebounceMs', 0),
    serverSearchMinLength: resolveInteger(config, 'serverSearchMinLength', 1)
  };
}
