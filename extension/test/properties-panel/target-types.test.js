import { describe, expect, it, vi } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

vi.mock('../../src/properties-panel/entries/AnnotationListEntry.js', () => ({
  AnnotationListEntry: () => null
}));

vi.mock('../../src/properties-panel/entries/ShowAsCommentEntry.js', () => ({
  ShowAsCommentEntry: () => null,
  SHOW_AS_COMMENT_ENTRY_ID: 'show-as-comment'
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

  it('adds included types to the defaults', () => {
    expect(groupsFor('bpmn:Task', { includeTypes: ['bpmn:Participant'] })).toHaveLength(1);
    expect(groupsFor('bpmn:Participant', { includeTypes: ['bpmn:Participant'] })).toHaveLength(1);
  });

  it('excludes a type from included defaults, including inherited matches', () => {
    const config = { excludeTypes: ['bpmn:UserTask'] };
    expect(groupsFor('bpmn:Task', config)).toHaveLength(1);
    expect(groupsFor('bpmn:UserTask', config)).toHaveLength(0);
    expect(groupsFor('bpmn:ServiceTask', config)).toHaveLength(1);
  });

  it('applies exclusions after custom target and include types', () => {
    const config = {
      targetTypes: ['bpmn:Task'],
      includeTypes: ['bpmn:Participant'],
      excludeTypes: ['bpmn:Task']
    };
    expect(groupsFor('bpmn:UserTask', config)).toHaveLength(0);
    expect(groupsFor('bpmn:Participant', config)).toHaveLength(1);
  });

  it('supports disabling all types or the entire panel', () => {
    expect(groupsFor('bpmn:Task', { targetTypes: [] })).toHaveLength(0);
    expect(groupsFor('bpmn:Task', { showAnnotations: false })).toHaveLength(0);
  });

  it('offers the global comment switch for every element when the diagram module is installed', () => {
    const injector = { get: (name) => (name === 'terminologyCommentVisibility' ? {} : null) };
    const provider = new TerminologyPropertiesProvider(
      { registerProvider() {} }, text => text, undefined, injector
    );
    const groups = provider.getGroups({ businessObject: moddle.create('bpmn:Participant') })([]);

    expect(groups.map(group => group.id)).toEqual(['medical-terminology-diagram']);
  });
});
