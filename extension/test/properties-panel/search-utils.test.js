import { describe, expect, it } from 'vitest';
import {
  normalizeConcepts,
  getConceptLabel,
  getAutocompleteSuffix
} from '../../src/properties-panel/entries/search-utils.js';

describe('search-utils', () => {
  it('should normalize concepts from concepts and items arrays', () => {
    expect(normalizeConcepts({ concepts: [ { code: 'a' } ] })).toEqual([ { code: 'a' } ]);
    expect(normalizeConcepts({ items: [ { code: 'b' } ] })).toEqual([ { code: 'b' } ]);
    expect(normalizeConcepts({ concepts: 'invalid' })).toEqual([]);
  });

  it('should prefer display over code for labels', () => {
    expect(getConceptLabel({ display: 'Appendectomy', code: '80146002' })).toBe('Appendectomy');
    expect(getConceptLabel({ code: '80146002' })).toBe('80146002');
    expect(getConceptLabel(null)).toBe('');
  });

  it('should return a case-preserving suffix for matching prefixes', () => {
    expect(getAutocompleteSuffix('app', { display: 'Appendectomy' })).toBe('endectomy');
    expect(getAutocompleteSuffix('APP', { display: 'Appendectomy' })).toBe('endectomy');
  });

  it('should only autocomplete prefix matches', () => {
    expect(getAutocompleteSuffix('pend', { display: 'Appendectomy' })).toBe('');
    expect(getAutocompleteSuffix('Appendectomy', { display: 'Appendectomy' })).toBe('');
    expect(getAutocompleteSuffix('', { display: 'Appendectomy' })).toBe('');
  });
});
