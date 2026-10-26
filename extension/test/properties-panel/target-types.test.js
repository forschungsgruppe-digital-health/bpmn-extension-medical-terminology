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
  it('always shows the terminology group and only enables annotation editing for target types', () => {
    const taskGroup = groupsFor('bpmn:Task')[0];
    const participantGroup = groupsFor('bpmn:Participant')[0];

    expect(taskGroup.entries.map(entry => entry.id)).toEqual([
      'show-as-comment',
      'medical-terminology'
    ]);
    expect(participantGroup.entries.map(entry => entry.id)).toEqual([ 'show-as-comment' ]);
  });

  it('enables a new type and excludes the previous defaults', () => {
    const config = { targetTypes: ['bpmn:Participant'] };
    expect(groupsFor('bpmn:Participant', config)[0].entries).toHaveLength(2);
    expect(groupsFor('bpmn:Task', config)[0].entries).toHaveLength(1);
  });

  it('matches BPMN inheritance', () => {
    expect(groupsFor('bpmn:UserTask', { targetTypes: ['bpmn:Task'] })[0].entries).toHaveLength(2);
  });

  it('adds included types to the defaults', () => {
    expect(groupsFor('bpmn:Task', { includeTypes: ['bpmn:Participant'] })[0].entries).toHaveLength(2);
    expect(groupsFor('bpmn:Participant', { includeTypes: ['bpmn:Participant'] })[0].entries).toHaveLength(2);
  });

  it('excludes a type from included defaults, including inherited matches', () => {
    const config = { excludeTypes: ['bpmn:UserTask'] };
    expect(groupsFor('bpmn:Task', config)[0].entries).toHaveLength(2);
    expect(groupsFor('bpmn:UserTask', config)[0].entries).toHaveLength(1);
    expect(groupsFor('bpmn:ServiceTask', config)[0].entries).toHaveLength(2);
  });

  it('applies exclusions after custom target and include types', () => {
    const config = {
      targetTypes: ['bpmn:Task'],
      includeTypes: ['bpmn:Participant'],
      excludeTypes: ['bpmn:Task']
    };
    expect(groupsFor('bpmn:UserTask', config)[0].entries).toHaveLength(1);
    expect(groupsFor('bpmn:Participant', config)).toHaveLength(1);
  });

  it('supports disabling all types or the entire panel', () => {
    expect(groupsFor('bpmn:Task', { targetTypes: [] })[0].entries).toHaveLength(1);
    expect(groupsFor('bpmn:Task', { showAnnotations: false })[0].entries).toHaveLength(1);
  });

});
