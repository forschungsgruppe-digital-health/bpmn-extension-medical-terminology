import { describe, it, expect } from 'vitest';
import { StaticProvider } from '../../src/providers/StaticProvider.js';

const SAMPLE_CONCEPTS = [
  { code: 'A1', display: 'Alpha One', system: 'http://example.com/cs' },
  { code: 'A2', display: 'Alpha Two', system: 'http://example.com/cs' },
  { code: 'B1', display: 'Beta One', system: 'http://example.com/cs' },
  { code: 'B2', display: 'Beta Two', system: 'http://example.com/cs' },
  { code: 'G1', display: 'Gamma One', system: 'http://example.com/cs' }
];

function createProvider(concepts = SAMPLE_CONCEPTS) {
  return new StaticProvider('test-static', 'Test Static', 'http://example.com/cs', concepts);
}

describe('StaticProvider', () => {

  // ─── Identity ──────────────────────────────────────────────

  it('should return correct id, displayName, and systemUri', () => {
    const provider = createProvider();
    expect(provider.id).toBe('test-static');
    expect(provider.displayName).toBe('Test Static');
    expect(provider.systemUri).toBe('http://example.com/cs');
  });

  it('should declare search, lookup, and validate capabilities', () => {
    const provider = createProvider();
    expect(provider.capabilities).toEqual({
      search: true,
      lookup: true,
      hierarchy: false,
      validate: true
    });
  });

  // ─── search() ──────────────────────────────────────────────

  describe('search()', () => {
    it('should find concepts by display text (case-insensitive)', async () => {
      const result = await createProvider().search('alpha');
      expect(result.concepts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.concepts[0].code).toBe('A1');
      expect(result.concepts[1].code).toBe('A2');
    });

    it('should find concepts by code (case-insensitive)', async () => {
      const result = await createProvider().search('b1');
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].code).toBe('B1');
    });

    it('should return empty result for no match', async () => {
      const result = await createProvider().search('nonexistent');
      expect(result.concepts).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should respect limit option', async () => {
      const result = await createProvider().search('', { limit: 2 });
      expect(result.concepts).toHaveLength(2);
      expect(result.total).toBe(5); // total matches, not limited
    });

    it('should respect offset option', async () => {
      const result = await createProvider().search('', { offset: 3, limit: 10 });
      expect(result.concepts).toHaveLength(2);
      expect(result.concepts[0].code).toBe('B2');
    });

    it('should default limit to 20 and offset to 0', async () => {
      const result = await createProvider().search('');
      expect(result.concepts).toHaveLength(5);
    });

    it('should match partial strings', async () => {
      const result = await createProvider().search('one');
      expect(result.concepts).toHaveLength(3); // Alpha One, Beta One, Gamma One
    });

    it('should search through the beginning and end of a large concept array', async () => {
      const concepts = Array.from({ length: 5000 }, (_, index) => ({
        code: `CODE-${index}`,
        display: `Concept ${index}`,
        system: 'http://example.com/cs'
      }));
      concepts.unshift({
        code: 'FIRST-CODE',
        display: 'First concept',
        system: 'http://example.com/cs'
      });
      concepts.push({
        code: 'LAST-CODE',
        display: 'Final concept',
        system: 'http://example.com/cs'
      });

      const provider = createProvider(concepts);
      const firstResult = await provider.search('FIRST-CODE');
      const lastResult = await provider.search('LAST-CODE');

      expect(firstResult.total).toBe(1);
      expect(firstResult.concepts).toEqual([
        expect.objectContaining({ code: 'FIRST-CODE' })
      ]);
      expect(lastResult.total).toBe(1);
      expect(lastResult.concepts).toEqual([
        expect.objectContaining({ code: 'LAST-CODE' })
      ]);
    });
  });

  // ─── lookup() ──────────────────────────────────────────────

  describe('lookup()', () => {
    it('should find an existing concept by exact code', async () => {
      const concept = await createProvider().lookup('A1');
      expect(concept).not.toBeNull();
      expect(concept.code).toBe('A1');
      expect(concept.display).toBe('Alpha One');
    });

    it('should return null for unknown code', async () => {
      const concept = await createProvider().lookup('MISSING');
      expect(concept).toBeNull();
    });

    it('should be case-sensitive for code matching', async () => {
      const concept = await createProvider().lookup('a1');
      expect(concept).toBeNull(); // codes are exact match
    });
  });

  // ─── validate() ────────────────────────────────────────────

  describe('validate()', () => {
    it('should return valid=true for existing code', async () => {
      const result = await createProvider().validate('A1');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should return valid=false with message for missing code', async () => {
      const result = await createProvider().validate('MISSING');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('MISSING');
      expect(result.message).toContain('test-static');
    });
  });

  // ─── getAll() ──────────────────────────────────────────────

  describe('getAll()', () => {
    it('should return a copy of all concepts', () => {
      const provider = createProvider();
      const all = provider.getAll();
      expect(all).toHaveLength(5);
      // Should be a copy, not the same array
      expect(all).not.toBe(SAMPLE_CONCEPTS);
    });
  });

  it('preserves per-concept versions without inferring one for unversioned concepts', async () => {
    const provider = new StaticProvider(
      'mixed-static',
      'Mixed Static',
      'http://example.com/package',
      [
        { code: 'V1', display: 'Versioned', system: 'http://example.com/v1', version: '1.0.0' },
        { code: 'U1', display: 'Unversioned', system: 'http://example.com/v2' }
      ]
    );

    expect(provider.version).toBeUndefined();
    const result = await provider.search('');

    expect(result.concepts[0].version).toBe('1.0.0');
    expect(result.concepts[1]).not.toHaveProperty('version');
  });

  it('uses an explicitly configured provider version for unversioned concepts', async () => {
    const provider = new StaticProvider(
      'configured-static',
      'Configured Static',
      'http://example.com/cs',
      [{ code: 'C1', display: 'Configured', system: 'http://example.com/cs' }],
      '2.0.0'
    );

    await expect(provider.lookup('C1')).resolves.toMatchObject({
      code: 'C1',
      version: '2.0.0'
    });
  });
});
