import { describe, expect, it } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';
import descriptor from '../../src/moddle/clinical.json';
import { getAnnotations, getAnnotationsContainer } from '../../src/services/AnnotationHelper.js';
import { saveAnnotation, deleteAnnotation } from '../../src/services/AnnotationModeling.js';
import { createAnnotationCommandStack } from '../helpers/annotation-command-stack.js';

const first = {
  id: 'synthetic-1', text: 'Synthetic annotation',
  codings: [{ system: 'https://example.invalid/cs', code: 'TEST', display: 'Synthetic code', version: '1' }]
};

function setup() {
  const moddle = new BpmnModdle({ term: descriptor });
  const bo = moddle.create('bpmn:Task', { id: 'Task_Synthetic' });
  const element = { id: bo.id, businessObject: bo };
  return { ...createAnnotationCommandStack(), moddle, bo, element };
}

describe('annotation modeling with the bpmn-js command handler', () => {
  it.each(['none', 'foreign', 'empty annotations'])('undoes the first addition atomically with %s extensions', async (kind) => {
    const { moddle, bo, element, modeling, commandStack } = setup();
    if (kind !== 'none') {
      const child = kind === 'foreign'
        ? moddle.createAny('test:metadata', 'https://example.invalid/test', { value: 'keep' })
        : moddle.create('term:Annotations', { values: [] });
      bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [child] });
      bo.extensionElements.$parent = bo;
      child.$parent = bo.extensionElements;
    }
    const before = (await moddle.toXML(bo)).xml;
    const previousExtensions = bo.extensionElements;
    const annotation = saveAnnotation(element, moddle, modeling, first);
    const after = (await moddle.toXML(bo)).xml;
    expect(getAnnotations(bo)).toEqual([annotation]);
    expect(annotation.$parent).toBe(getAnnotationsContainer(bo));
    expect(annotation.codings[0].$parent).toBe(annotation);
    expect(annotation.$parent.$parent).toBe(bo.extensionElements);
    expect(bo.extensionElements.$parent).toBe(bo);
    commandStack.undo();
    expect((await moddle.toXML(bo)).xml).toBe(before);
    expect(bo.extensionElements).toBe(previousExtensions);
    expect(commandStack.canUndo()).toBe(false);
    commandStack.redo();
    expect((await moddle.toXML(bo)).xml).toBe(after);
  });

  it('preserves each state across add, edit, delete, undo and redo', async () => {
    const { moddle, bo, element, modeling, commandStack } = setup();
    const states = [(await moddle.toXML(bo)).xml];
    const annotation = saveAnnotation(element, moddle, modeling, first);
    states.push((await moddle.toXML(bo)).xml);
    const oldValues = getAnnotations(bo);
    saveAnnotation(element, moddle, modeling, { id: 'synthetic-2', text: 'Synthetic second' });
    expect(oldValues).toEqual([annotation]);
    states.push((await moddle.toXML(bo)).xml);
    saveAnnotation(element, moddle, modeling, { id: 'synthetic-edited', text: 'Synthetic edited', codings: [] }, annotation);
    states.push((await moddle.toXML(bo)).xml);
    deleteAnnotation(element, modeling, annotation);
    states.push((await moddle.toXML(bo)).xml);
    for (let index = states.length - 2; index >= 0; index--) {
      commandStack.undo();
      expect((await moddle.toXML(bo)).xml).toBe(states[index]);
    }
    for (let index = 1; index < states.length; index++) {
      commandStack.redo();
      expect((await moddle.toXML(bo)).xml).toBe(states[index]);
    }
  });

  it('edits and deletes imported annotations and preserves foreign metadata through roundtrip', async () => {
    const { moddle, modeling, commandStack } = setup();
    const { rootElement: bo } = await moddle.fromXML(`
      <bpmn:task xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:term="https://clinical-bpmn.org/terminology/v1" xmlns:test="https://example.invalid/test" id="Task_Imported">
        <bpmn:extensionElements>
          <test:metadata value="keep" />
          <term:annotations><term:annotation id="synthetic-1" text="Synthetic imported" test:flag="keep">
            <term:coding system="https://example.invalid/cs" code="TEST" display="Synthetic code" version="1" test:flag="keep" />
          </term:annotation></term:annotations>
        </bpmn:extensionElements>
      </bpmn:task>`, 'bpmn:Task');
    const element = { id: bo.id, businessObject: bo };
    const annotation = getAnnotations(bo)[0];
    const originalXml = (await moddle.toXML(bo)).xml;
    const foreign = bo.extensionElements.values[0];
    const coding = annotation.codings[0];
    saveAnnotation(element, moddle, modeling, { ...first, text: 'Synthetic edited' }, annotation);
    expect(annotation.codings[0]).toBe(coding);
    expect(bo.extensionElements.values[0]).toBe(foreign);
    const editedXml = (await moddle.toXML(bo)).xml;
    const { rootElement: reopened } = await moddle.fromXML(editedXml, 'bpmn:Task');
    expect(getAnnotations(reopened)[0].text).toBe('Synthetic edited');
    expect(getAnnotations(reopened)[0].codings[0].version).toBe('1');
    expect(editedXml).toContain('test:flag="keep"');
    commandStack.undo();
    expect((await moddle.toXML(bo)).xml).toBe(originalXml);
    commandStack.redo();
    expect((await moddle.toXML(bo)).xml).toBe(editedXml);
    deleteAnnotation(element, modeling, annotation);
    expect(getAnnotations(bo)).toEqual([]);
    commandStack.undo();
    expect((await moddle.toXML(bo)).xml).toBe(editedXml);
    commandStack.redo();
    expect(getAnnotations(bo)).toEqual([]);
  });
});
