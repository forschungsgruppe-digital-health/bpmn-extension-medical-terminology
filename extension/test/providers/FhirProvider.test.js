import { describe, it, expect, vi } from 'vitest';
import { FhirProvider } from '../../src/providers/FhirProvider.js';

function createMockFetch(responseBody, ok = true) {
  return vi.fn(async () => ({
    ok,
    json: async () => responseBody
  }));
}

describe('FhirProvider', () => {
  function createProvider(overrides = {}) {
    return new FhirProvider({
      id: 'icd-10-gm',
      displayName: 'ICD-10-GM',
      systemUri: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
      baseUrl: 'https://fhir.bfarm.de/fhir',
      fetchFn: overrides.fetchFn ?? createMockFetch({ expansion: { contains: [] } }),
      ...overrides
    });
  }

  it('should have correct identity', () => {
    const provider = createProvider();
    expect(provider.id).toBe('icd-10-gm');
    expect(provider.displayName).toBe('ICD-10-GM');
    expect(provider.systemUri).toBe('http://fhir.de/CodeSystem/bfarm/icd-10-gm');
  });

  it('should expose a version derived from provider config', () => {
    const provider = createProvider({
      expandParameters: {
        valueSetVersion: '2020'
      }
    });

    expect(provider.version).toBe('2020');
  });

  it('should declare search, lookup, validate capabilities', () => {
    const provider = createProvider();
    expect(provider.capabilities).toEqual({
      search: true, lookup: true, hierarchy: false, validate: true
    });
  });

  describe('search()', () => {
    it('should delegate to FhirTerminologyAdapter', async () => {
      const fetchFn = createMockFetch({
        expansion: {
          contains: [
            { code: 'C34.1', display: 'Oberlappen', system: 'http://fhir.de/ValueSet/bfarm/icd-10-gm' }
          ],
          total: 1
        }
      });
      const provider = createProvider({ fetchFn });

      const result = await provider.search('Lunge', { limit: 5 });
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].code).toBe('C34.1');
      expect(result.concepts[0].system).toBe('http://fhir.de/CodeSystem/bfarm/icd-10-gm');
    });

    it('should respect maxResults config', async () => {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ maxResults: 25, fetchFn });

      await provider.search('test');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('count')).toBe('25');
    });

    it('should override maxResults with options.limit', async () => {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ maxResults: 25, fetchFn });

      await provider.search('test', { limit: 3 });
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('count')).toBe('3');
    });

    it('should forward expandParameters to the adapter search request', async () => {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({
        valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
        expandParameters: {
          valueSetVersion: '2020'
        },
        fetchFn
      });

      await provider.search('');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('url')).toBe('http://fhir.de/ValueSet/bfarm/icd-10-gm');
      expect(calledUrl.searchParams.get('valueSetVersion')).toBe('2020');
    });

    it('should use valueSetUri as-is for search', async () => {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({
        systemUri: 'http://loinc.org',
        valueSetUri: 'http://loinc.org/vs',
        fetchFn
      });

      await provider.search('discharge');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('url')).toBe('http://loinc.org/vs');
    });
  });

  describe('lookup()', () => {
    it('should delegate to FhirTerminologyAdapter', async () => {
      const fetchFn = createMockFetch({
        parameter: [
          { name: 'display', valueString: 'Bösartige Neubildung' }
        ]
      });
      const provider = createProvider({ fetchFn });

      const concept = await provider.lookup('C34.1');
      expect(concept.code).toBe('C34.1');
      expect(concept.display).toBe('Bösartige Neubildung');
    });

    it('should forward lookupParameters to the adapter lookup request', async () => {
      const fetchFn = createMockFetch({ parameter: [] });
      const provider = createProvider({
        lookupParameters: {
          version: '2025.0.0'
        },
        fetchFn
      });

      await provider.lookup('C34.1');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('version')).toBe('2025.0.0');
    });
  });
});
