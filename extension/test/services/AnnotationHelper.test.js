import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAnnotations,
  addAnnotation,
  createId,
  getUsedIds,
  getCodingKey,
  getUsedCodingKeys,
  isValidId,
  removeAnnotation,
  getAnnotationsContainer,
  ensureAnnotationsContainer,
  ensureExtensionElements
} from '../../src/services/AnnotationHelper.js';

/**
 * Minimal mock for bpmn-moddle's create() method.
 */
function createMockModdle() {
  return {
    create(type, props = {}) {
      return { $type: type, ...props };
    }
  };
}

function createBusinessObject(extensionElements = undefined) {
  return { extensionElements };
}

describe('AnnotationHelper', () => {
  let moddle;

  beforeEach(() => {
    moddle = createMockModdle();
  });

  // ─── getAnnotationsContainer ──────────────────────────────

  describe('getAnnotationsContainer()', () => {
    it('should return undefined if no extensionElements', () => {
      const bo = createBusinessObject();
      expect(getAnnotationsContainer(bo)).toBeUndefined();
    });

    it('should return undefined if no term:Annotations', () => {
      const bo = createBusinessObject({
        values: [{ $type: 'other:Container' }]
      });
      expect(getAnnotationsContainer(bo)).toBeUndefined();
    });

    it('should find and return term:Annotations', () => {
      const container = { $type: 'term:Annotations', values: [] };
      const bo = createBusinessObject({ values: [container] });
      expect(getAnnotationsContainer(bo)).toBe(container);
    });
  });

  // ─── getAnnotations ───────────────────────────────────────

  describe('getAnnotations()', () => {
    it('should return empty array if no container', () => {
      expect(getAnnotations(createBusinessObject())).toEqual([]);
    });

    it('should return annotations from container', () => {
      const annotation1 = { $type: 'term:Annotation', id: 'term-ann-1' };
      const annotation2 = { $type: 'term:Annotation', id: 'term-ann-2' };
      const container = { $type: 'term:Annotations', values: [annotation1, annotation2] };
      const bo = createBusinessObject({ values: [container] });

      const result = getAnnotations(bo);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('term-ann-1');
    });
  });

  describe('ID helpers', () => {
    it('should collect used IDs', () => {
      const bo = createBusinessObject({
        values: [{
          $type: 'term:Annotations',
          values: [
            { $type: 'term:Annotation', id: 'term-ann-1' },
            { $type: 'term:Annotation', id: 'term-ann-2' },
            { $type: 'term:Annotation' }
          ]
        }]
      });

      expect(getUsedIds(bo)).toEqual(['term-ann-1', 'term-ann-2']);
    });

    it('should generate the next unique ID', () => {
      expect(createId(['term-ann-1', 'term-ann-2'])).toBe('term-ann-3');
    });

    it('should validate ID format', () => {
      expect(isValidId('term-ann-1')).toBe(true);
      expect(isValidId('term-ann_1')).toBe(true);
      expect(isValidId('-term-ann-')).toBe(true);
      expect(isValidId('term-ann 1')).toBe(false);
    });
  });

  describe('coding helpers', () => {
    it('should collect used coding keys', () => {
      const bo = createBusinessObject({
        values: [{
          $type: 'term:Annotations',
          values: [
            {
              $type: 'term:Annotation',
              id: 'term-ann-1',
              codings: [
                { system: 'http://snomed.info/sct', code: '123' },
                { system: 'http://loinc.org', code: '456' }
              ]
            },
            {
              $type: 'term:Annotation',
              id: 'term-ann-2',
              codings: [
                { system: 'http://snomed.info/sct', code: '123' }
              ]
            }
          ]
        }]
      });

      expect(getCodingKey({ system: 'http://snomed.info/sct', code: '123' })).toBe('http://snomed.info/sct|123');
      expect(getUsedCodingKeys(bo)).toEqual([
        'http://snomed.info/sct|123',
        'http://loinc.org|456',
        'http://snomed.info/sct|123'
      ]);
    });
  });

  // ─── ensureExtensionElements ──────────────────────────────

  describe('ensureExtensionElements()', () => {
    it('should create extensionElements if not present', () => {
      const bo = createBusinessObject();
      const ext = ensureExtensionElements(bo, moddle);
      expect(ext.$type).toBe('bpmn:ExtensionElements');
      expect(ext.values).toEqual([]);
      expect(bo.extensionElements).toBe(ext);
    });

    it('should return existing extensionElements', () => {
      const existing = { $type: 'bpmn:ExtensionElements', values: [{ $type: 'term:Annotations' }] };
      const bo = createBusinessObject(existing);
      const ext = ensureExtensionElements(bo, moddle);
      expect(ext).toBe(existing);
    });
  });

  // ─── ensureAnnotationsContainer ───────────────────────────

  describe('ensureAnnotationsContainer()', () => {
    it('should create extensionElements and Annotations container if none exist', () => {
      const bo = createBusinessObject();
      const container = ensureAnnotationsContainer(bo, moddle);
      expect(container.$type).toBe('term:Annotations');
      expect(container.values).toEqual([]);
      expect(bo.extensionElements.values).toContain(container);
    });

    it('should return existing Annotations container', () => {
      const existingContainer = { $type: 'term:Annotations', values: [] };
      const bo = createBusinessObject({ values: [existingContainer] });
      const container = ensureAnnotationsContainer(bo, moddle);
      expect(container).toBe(existingContainer);
    });
  });

  // ─── addAnnotation ────────────────────────────────────────

  describe('addAnnotation()', () => {
    it('should add a basic annotation', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        text: 'CT-Thorax mit Kontrastmittel'
      });

      expect(annotation.$type).toBe('term:Annotation');
      expect(annotation.id).toBe('term-ann-1');
      expect(annotation.text).toBe('CT-Thorax mit Kontrastmittel');
      expect(getAnnotations(bo)).toHaveLength(1);
    });

    it('should default the ID to term-ann-1', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {});
      expect(annotation.id).toBe('term-ann-1');
    });

    it('should keep a manually provided ID', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        id: 'thorax-report-type'
      });

      expect(annotation.id).toBe('thorax-report-type');
    });

    it('should add codings', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        codings: [
          { system: 'http://snomed.info/sct', version: '2024', code: '169069000', display: 'CT of chest' },
          { system: 'http://fhir.de/CodeSystem/bfarm/ops', code: '3-222', display: 'CT Thorax' }
        ]
      });

      expect(annotation.codings).toHaveLength(2);
      expect(annotation.codings[0].$type).toBe('term:Coding');
      expect(annotation.codings[0].code).toBe('169069000');
      expect(annotation.codings[0].system).toBe('http://snomed.info/sct');
      expect(annotation.codings[0].version).toBe('2024');
      expect(annotation.codings[1].code).toBe('3-222');
    });


    it('should add multiple annotations to the same element', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'First' });
      addAnnotation(bo, moddle, { text: 'Second' });

      const annotations = getAnnotations(bo);
      expect(annotations).toHaveLength(2);
      expect(annotations[0].id).toBe('term-ann-1');
      expect(annotations[1].id).toBe('term-ann-2');
    });

    it('should set $parent references correctly', () => {
      const bo = createBusinessObject();
      const annotation = addAnnotation(bo, moddle, {
        codings: [{ system: 'http://snomed.info/sct', code: '123' }]
      });

      expect(annotation.$parent.$type).toBe('term:Annotations');
      expect(annotation.codings[0].$parent).toBe(annotation);
    });
  });

  // ─── removeAnnotation ─────────────────────────────────────

  describe('removeAnnotation()', () => {
    it('should remove annotation at given index', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'First' });
      addAnnotation(bo, moddle, { text: 'Second' });
      addAnnotation(bo, moddle, { text: 'Third' });

      removeAnnotation(bo, 1);
      const annotations = getAnnotations(bo);
      expect(annotations).toHaveLength(2);
      expect(annotations[0].text).toBe('First');
      expect(annotations[1].text).toBe('Third');
    });

    it('should handle out-of-bounds index gracefully', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'Only' });
      removeAnnotation(bo, 5); // out of bounds
      expect(getAnnotations(bo)).toHaveLength(1);
    });

    it('should handle negative index gracefully', () => {
      const bo = createBusinessObject();
      addAnnotation(bo, moddle, { text: 'Only' });
      removeAnnotation(bo, -1);
      expect(getAnnotations(bo)).toHaveLength(1);
    });

    it('should handle missing container gracefully', () => {
      const bo = createBusinessObject();
      expect(() => removeAnnotation(bo, 0)).not.toThrow();
    });

  });
});
