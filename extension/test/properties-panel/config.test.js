import { describe, expect, it } from 'vitest';
import { DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG, resolveTerminologyPropertiesConfig } from '../../src/properties-panel/config.js';

describe('terminology properties configuration', () => {
  it('showAnnotations: false preserves the disabled annotation setting', () => {
    expect(resolveTerminologyPropertiesConfig({ showAnnotations: false }))
      .toMatchObject({ showAnnotations: false });
  });
  it('keeps the existing element types by default', () => {
    expect(resolveTerminologyPropertiesConfig().targetTypes)
      .toEqual(DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.targetTypes);
  });

  it('replaces defaults with a custom list and preserves an empty list', () => {
    expect(resolveTerminologyPropertiesConfig({ targetTypes: ['bpmn:Participant'] }).targetTypes)
      .toEqual(['bpmn:Participant']);
    expect(resolveTerminologyPropertiesConfig({ targetTypes: [] }).targetTypes).toEqual([]);
  });

  it.each(['bpmn:Task', [null], ['Task'], ['bpmn:']])('rejects invalid targetTypes: %j', targetTypes => {
    expect(() => resolveTerminologyPropertiesConfig({ targetTypes })).toThrow(TypeError);
  });
});
