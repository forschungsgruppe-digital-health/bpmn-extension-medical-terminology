import { describe, expect, it, vi } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

vi.mock('../../src/properties-panel/entries/AnnotationListEntry.js', () => ({
  AnnotationListEntry: () => null
}));

import TerminologyPropertiesProvider from '../../src/properties-panel/TerminologyPropertiesProvider.js';

const moddle = new BpmnModdle();

function groupsFor(type, config) {
  const provider = new TerminologyPropertiesProvider(
    { registerProvider() {} }, text => text, config
  );
  return provider.getGroups({ businessObject: moddle.create(type) })([]);
}

describe('annotation target types', () => {
  it('keeps tasks enabled and participants hidden by default', () => {
    expect(groupsFor('bpmn:Task')).toHaveLength(1);
    expect(groupsFor('bpmn:Participant')).toHaveLength(0);
  });

  it('enables a new type and excludes the previous defaults', () => {
    const config = { targetTypes: ['bpmn:Participant'] };
    expect(groupsFor('bpmn:Participant', config)).toHaveLength(1);
    expect(groupsFor('bpmn:Task', config)).toHaveLength(0);
  });

  it('matches BPMN inheritance', () => {
    expect(groupsFor('bpmn:UserTask', { targetTypes: ['bpmn:Task'] })).toHaveLength(1);
  });

  it('supports disabling all types or the entire panel', () => {
    expect(groupsFor('bpmn:Task', { targetTypes: [] })).toHaveLength(0);
    expect(groupsFor('bpmn:Task', { showAnnotations: false })).toHaveLength(0);
  });
});
