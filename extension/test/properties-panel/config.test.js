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

  it('defaults include and exclude lists to empty arrays', () => {
    expect(resolveTerminologyPropertiesConfig()).toMatchObject({
      includeTypes: [],
      excludeTypes: []
    });
  });

  it('copies include and exclude lists without changing the defaults', () => {
    const config = resolveTerminologyPropertiesConfig({
      includeTypes: ['bpmn:Participant'],
      excludeTypes: ['bpmn:UserTask']
    });

    expect(config.targetTypes).toEqual(DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG.targetTypes);
    expect(config.includeTypes).toEqual(['bpmn:Participant']);
    expect(config.excludeTypes).toEqual(['bpmn:UserTask']);
  });

  it.each(['bpmn:Task', [null], ['Task'], ['bpmn:']])('rejects invalid targetTypes: %j', targetTypes => {
    expect(() => resolveTerminologyPropertiesConfig({ targetTypes })).toThrow(TypeError);
  });

  it.each(['bpmn:Task', [null], ['Task'], ['bpmn:']])('rejects invalid includeTypes: %j', includeTypes => {
    expect(() => resolveTerminologyPropertiesConfig({ includeTypes })).toThrow(TypeError);
  });

  it.each(['bpmn:Task', [null], ['Task'], ['bpmn:']])('rejects invalid excludeTypes: %j', excludeTypes => {
    expect(() => resolveTerminologyPropertiesConfig({ excludeTypes })).toThrow(TypeError);
  });
});
