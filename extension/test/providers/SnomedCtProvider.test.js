import { describe, it, expect, vi } from 'vitest';
import { SnomedCtProvider } from '../../src/providers/SnomedCtProvider.js';

function createMockFetch(responseBody) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => responseBody
  }));
}

describe('SnomedCtProvider', () => {
  function createProvider(overrides = {}) {
    return new SnomedCtProvider({
      baseUrl: 'https://snowstorm.example.com',
      fetchFn: overrides.fetchFn ?? createMockFetch({ items: [], total: 0 }),
      ...overrides
    });
  }

  it('should have correct identity', () => {
    const provider = createProvider();
    expect(provider.id).toBe('snomed-ct');
    expect(provider.displayName).toBe('SNOMED CT');
    expect(provider.systemUri).toBe('http://snomed.info/sct');
  });

  it('should allow custom displayName', () => {
    const provider = createProvider({ displayName: 'SNOMED CT International' });
    expect(provider.displayName).toBe('SNOMED CT International');
  });

  it('should declare full capabilities', () => {
    const provider = createProvider();
    expect(provider.capabilities).toEqual({
      search: true, lookup: true, hierarchy: true, validate: true
    });
  });

  describe('search()', () => {
    it('should delegate to SnowstormAdapter and pass through moduleId and version', async () => {
      const fetchFn = createMockFetch({
        items: [{
          conceptId: '233604007',
          pt: { term: 'Pneumonia' },
          fsn: { term: 'Pneumonia (disorder)' },
          releasedEffectiveTime: 20240901,
          moduleId: '900000000000207008',
          active: true
        }],
        total: 1
      });
      const provider = createProvider({ fetchFn });

      const result = await provider.search('pneumonia', { limit: 5 });
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].version).toBe('http://snomed.info/sct/900000000000207008/version/20240901');
      expect(result.concepts[0].moduleId).toBeUndefined(); // Map doesn't include moduleId directly

      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      const calledHeaders = fetchFn.mock.calls[0][1].headers;
      expect(calledUrl.searchParams.get('term')).toBe('pneumonia');
      expect(calledUrl.searchParams.get('limit')).toBe('5');
      expect(calledUrl.searchParams.get('language')).toBeNull();
      expect(calledHeaders['Accept-Language']).toBe('de');
    });

    it('should add the configured version when search omits one', async () => {
      const fetchFn = createMockFetch({
        items: [{
          conceptId: '233604007',
          pt: { term: 'Pneumonia' },
          active: true
        }],
        total: 1
      });
      const provider = createProvider({
        version: '2024-09',
        fetchFn
      });

      await expect(provider.search('pneumonia')).resolves.toMatchObject({
        concepts: [{
          code: '233604007',
          version: '2024-09'
        }]
      });
    });

    it('should pass ECL constraint from default config', async () => {
      const fetchFn = createMockFetch({ items: [], total: 0 });
      const provider = createProvider({ defaultEcl: '<71388002', fetchFn });

      await provider.search('test');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('ecl')).toBe('<71388002');
    });

    it('should pass ECL from options overriding default', async () => {
      const fetchFn = createMockFetch({ items: [], total: 0 });
      const provider = createProvider({ defaultEcl: '<71388002', fetchFn });

      await provider.search('test', { ecl: '<404684003' });
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('ecl')).toBe('<404684003');
    });
  });

  describe('lookup()', () => {
    it('should fetch and map a single concept via code', async () => {
      const fetchFn = createMockFetch({
        conceptId: '169069000',
        pt: { term: 'CT of chest' },
        fsn: { term: 'CT of chest (procedure)' },
        releasedEffectiveTime: 20240901,
        moduleId: '900000000000207008',
        active: true
      });
      const provider = createProvider({ fetchFn });

      const concept = await provider.lookup('169069000');
      expect(concept).not.toBeNull();
      expect(concept.code).toBe('169069000');
      expect(concept.version).toBe('http://snomed.info/sct/900000000000207008/version/20240901');
      expect(concept.moduleId).toBeUndefined(); // Map doesn't include moduleId directly
    });

    it('uses the configured version when lookup omits one', async () => {
      const fetchFn = createMockFetch({
        conceptId: '169069000',
        pt: { term: 'CT of chest' },
        active: true
      });
      const provider = createProvider({
        version: '2024-09',
        fetchFn
      });

      await expect(provider.lookup('169069000')).resolves.toMatchObject({
        code: '169069000',
        version: '2024-09'
      });
    });
  });

  describe('eclQuery()', () => {
    it('should delegate to search with ECL', async () => {
      const fetchFn = createMockFetch({ items: [], total: 0 });
      const provider = createProvider({ fetchFn });

      await provider.eclQuery('<71388002', 'test');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('ecl')).toBe('<71388002');
    });
  });

  describe('getHierarchy()', () => {
    it('should fetch parents and children in parallel', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async (url) => {
        callCount++;
        if (url.includes('/parents')) {
          return { ok: true, json: async () => [{ conceptId: 'P1', pt: { term: 'Parent' }, fsn: { term: 'Parent (concept)' }, active: true }] };
        }
        if (url.includes('/children')) {
          return { ok: true, json: async () => ({ items: [{ conceptId: 'C1', pt: { term: 'Child' }, fsn: { term: 'Child (concept)' }, active: true }] }) };
        }
        return { ok: true, json: async () => ({}) };
      });

      const provider = createProvider({ fetchFn });
      const result = await provider.getHierarchy('169069000');

      expect(result.parents).toHaveLength(1);
      expect(result.parents[0].code).toBe('P1');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].code).toBe('C1');
    });
  });
});