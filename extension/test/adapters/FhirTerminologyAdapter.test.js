import { describe, it, expect, vi } from 'vitest';
import { FhirTerminologyAdapter } from '../../src/adapters/FhirTerminologyAdapter.js';

function createMockFetch(responseBody, ok = true) {
  return vi.fn(async () => ({
    ok,
    json: async () => responseBody
  }));
}

const BASE_URL = 'https://fhir.bfarm.de/fhir';
const SYSTEM_URI = 'http://fhir.de/CodeSystem/bfarm/icd-10-gm';

describe('FhirTerminologyAdapter', () => {

  describe('search()', () => {
    it('should call ValueSet/$expand with correct parameters', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          contains: [
            { code: 'C34.1', display: 'Bösartige Neubildung: Oberlappen', system: SYSTEM_URI, version: '2024' }
          ],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch,
        language: 'de'
      });

      const result = await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.pathname).toContain('ValueSet/$expand');
      expect(calledUrl.searchParams.get('filter')).toBe('Lunge');
      expect(calledUrl.searchParams.get('count')).toBe('10');
      expect(calledUrl.searchParams.get('offset')).toBe('0');
      expect(calledUrl.searchParams.get('displayLanguage')).toBe('de');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        code: 'C34.1',
        display: 'Bösartige Neubildung: Oberlappen',
        system: SYSTEM_URI,
        version: '2024',
        active: true
      });
      expect(result.total).toBe(1);
    });

    it('should append configured expand parameters', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
        expandParameters: {
          valueSetVersion: '2020',
          'system-version': 'http://fhir.de/CodeSystem/bfarm/icd-10-gm|2020'
        },
        fetchFn: mockFetch
      });

      await adapter.search({ term: '', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('valueSetVersion')).toBe('2020');
      expect(calledUrl.searchParams.get('system-version')).toBe('http://fhir.de/CodeSystem/bfarm/icd-10-gm|2020');
    });

    it('should use an explicit valueSetUri without appending ?vs', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: 'http://loinc.org',
        valueSetUri: 'http://loinc.org/vs',
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'discharge', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('url')).toBe('http://loinc.org/vs');
    });

    it('should handle inactive concepts', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          contains: [
            { code: 'OLD', display: 'Old Code', inactive: true }
          ],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'old', limit: 10, offset: 0 });
      expect(result.items[0].active).toBe(false);
    });

    it('should return empty result on non-OK response', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: createMockFetch({}, false)
      });

      const result = await adapter.search({ term: 'test', limit: 10, offset: 0 });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty result on fetch error', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => { throw new Error('network error'); })
      });

      const result = await adapter.search({ term: 'test', limit: 10, offset: 0 });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use system URI as fallback for concept system', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          contains: [{ code: 'X', display: 'Test' }] // no system in response
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'test', limit: 10, offset: 0 });
      expect(result.items[0].system).toBe(SYSTEM_URI);
    });

    it('should use the CodeSystem version from expansion parameters', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [
            {
              name: 'version',
              valueUri: 'http://loinc.org|2.82'
            }
          ],
          contains: [
            { code: 'LP149706-6', display: 'Discharge', system: 'http://loinc.org' }
          ],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: 'http://loinc.org',
        valueSetUri: 'http://loinc.org/vs',
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'discharge', limit: 10, offset: 0 });

      expect(result.items[0].version).toBe('2.82');
    });

    it('should strip trailing slash from baseUrl', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL + '/',
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'test', limit: 10, offset: 0 });
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('fhir//ValueSet');
    });
  });

  describe('lookup()', () => {
    it('should call CodeSystem/$lookup and return concept', async () => {
      const mockFetch = createMockFetch({
        parameter: [
          { name: 'display', valueString: 'Bösartige Neubildung des Bronchus' },
          { name: 'name', valueString: 'ICD-10-GM' },
          { name: 'version', valueString: '2024' }
        ]
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      const concept = await adapter.lookup('C34.1');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.pathname).toContain('CodeSystem/$lookup');
      expect(calledUrl.searchParams.get('system')).toBe(SYSTEM_URI);
      expect(calledUrl.searchParams.get('code')).toBe('C34.1');

      expect(concept).toEqual({
        code: 'C34.1',
        display: 'Bösartige Neubildung des Bronchus',
        system: SYSTEM_URI,
        version: '2024',
        active: true
      });
    });

    it('should use name as fallback if display not present', async () => {
      const mockFetch = createMockFetch({
        parameter: [
          { name: 'name', valueString: 'ICD-10-GM Code' }
        ]
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      const concept = await adapter.lookup('X99');
      expect(concept.display).toBe('ICD-10-GM Code');
    });

    it('should append configured lookup parameters', async () => {
      const mockFetch = createMockFetch({ parameter: [] });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        lookupParameters: {
          version: '2025.0.0'
        },
        fetchFn: mockFetch
      });

      await adapter.lookup('C34.1');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('version')).toBe('2025.0.0');
    });

    it('should return null on non-OK response', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: createMockFetch({}, false)
      });

      const concept = await adapter.lookup('INVALID');
      expect(concept).toBeNull();
    });

    it('should return null on fetch error', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => { throw new Error('network error'); })
      });

      const concept = await adapter.lookup('INVALID');
      expect(concept).toBeNull();
    });

    it('should set Accept: application/fhir+json header', async () => {
      const mockFetch = createMockFetch({ parameter: [] });
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      await adapter.lookup('C34.1');
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Accept']).toBe('application/fhir+json');
    });
  });

  describe('authentication', () => {
    it('should add Bearer auth header', async () => {
      const mockFetch = createMockFetch({ parameter: [] });
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        auth: { type: 'Bearer', token: 'tok' },
        fetchFn: mockFetch
      });

      await adapter.lookup('X');
      expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer tok');
    });

    it('should add Basic auth header', async () => {
      const mockFetch = createMockFetch({ parameter: [] });
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        auth: { type: 'Basic', credentials: 'abc' },
        fetchFn: mockFetch
      });

      await adapter.lookup('X');
      expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Basic abc');
    });
  });
});
