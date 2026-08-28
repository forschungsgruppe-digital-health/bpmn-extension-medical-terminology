import { describe, it, expect, vi } from 'vitest';
import { SnowstormAdapter } from '../../src/adapters/SnowstormAdapter.js';

function createMockFetch(responseBody, ok = true) {
  return vi.fn(async () => ({
    ok,
    json: async () => responseBody
  }));
}

describe('SnowstormAdapter', () => {
  const BASE_URL = 'https://snowstorm.example.com/snomed-ct';

  describe('search()', () => {
    it('should call correct URL with parameters', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: mockFetch });

      await adapter.search({ term: 'pneumonia', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.pathname).toContain('/MAIN/concepts');
      expect(calledUrl.searchParams.get('term')).toBe('pneumonia');
      expect(calledUrl.searchParams.get('limit')).toBe('10');
      expect(calledUrl.searchParams.get('offset')).toBe('0');
      expect(calledUrl.searchParams.get('activeFilter')).toBe('true');
      expect(calledUrl.searchParams.get('language')).toBe('de');
    });

    it('should map Snowstorm response to Concept objects with a canonical FHIR version URI', async () => {
      const mockResponse = {
        items: [
          {
            conceptId: '233604007',
            pt: { term: 'Pneumonia' },
            fsn: { term: 'Pneumonia (disorder)' },
            releasedEffectiveTime: 20240901,
            moduleId: '900000000000207008',
            active: true,
            definitionStatus: 'PRIMITIVE'
          }
        ],
        total: 1
      };
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch(mockResponse) });

      const result = await adapter.search({ term: 'pneumonia', limit: 10, offset: 0 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        code: '233604007',
        display: 'Pneumonia',
        system: 'http://snomed.info/sct',
        // 🟢 Erwartet jetzt die offizielle FHIR-konforme URI im version-Feld
        version: 'http://snomed.info/sct/900000000000207008/version/20240901',
        active: true,
        properties: {
          fsn: 'Pneumonia (disorder)',
          semanticTag: 'disorder',
          definitionStatus: 'PRIMITIVE'
        }
      });
      expect(result.total).toBe(1);
    });

    it('should pass additional params like ECL', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: mockFetch });

      await adapter.search({
        term: 'CT',
        limit: 5,
        offset: 0,
        additionalParams: { ecl: '<71388002', semanticTag: 'procedure' }
      });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('ecl')).toBe('<71388002');
      expect(calledUrl.searchParams.get('semanticTag')).toBe('procedure');
    });

    it('should use custom branch', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, branch: 'MAIN/SNOMEDCT-DE', fetchFn: mockFetch });

      await adapter.search({ term: 'test', limit: 5, offset: 0 });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('MAIN/SNOMEDCT-DE/concepts');
    });

    it('should resolve relative base URLs against the current origin', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({ baseUrl: '/snowstorm-api', fetchFn: mockFetch });

      await adapter.search({ term: 'pneumonia', limit: 5, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.pathname).toContain('/snowstorm-api/MAIN/concepts');
    });

    it('should handle empty items', async () => {
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch({}) });
      const result = await adapter.search({ term: 'xyz', limit: 5, offset: 0 });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('lookup()', () => {
    it('should build canonical URI even if moduleId is returned as a number', async () => {
      const mockResponse = {
        conceptId: '169069000',
        pt: { term: 'CT of chest' },
        fsn: { term: 'CT of chest (procedure)' },
        releasedEffectiveTime: 20240901,
        moduleId: 11000274103, // Als Nummer geliefert
        active: true,
        definitionStatus: 'FULLY_DEFINED'
      };
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch(mockResponse) });

      const concept = await adapter.lookup('169069000');
      expect(concept.code).toBe('169069000');
      expect(concept.display).toBe('CT of chest');
      expect(concept.system).toBe('http://snomed.info/sct');
      // 🟢 Prüft, ob auch Zahlen-ModuleIDs sauber in die URI fließen
      expect(concept.version).toBe('http://snomed.info/sct/11000274103/version/20240901');
    });

    it('should fallback to raw effectiveTime string if moduleId is missing', async () => {
      const mockResponse = {
        conceptId: '169069000',
        pt: { term: 'CT of chest' },
        fsn: { term: 'CT of chest (procedure)' },
        releasedEffectiveTime: 20240901, // Keine moduleId vorhanden
        active: true
      };
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch(mockResponse) });

      const concept = await adapter.lookup('169069000');
      // 🟢 Abwärtskompatibilität: Wenn das Modul fehlt, nutzen wir die nackte Zeit als String
      expect(concept.version).toBe('20240901');
    });

    it('should return null for non-OK response', async () => {
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch({}, false) });
      const concept = await adapter.lookup('INVALID');
      expect(concept).toBeNull();
    });
  });

  describe('getParents()', () => {
    it('should return mapped parent concepts', async () => {
      const mockResponse = [
        { conceptId: '71388002', pt: { term: 'Procedure' }, fsn: { term: 'Procedure (procedure)' }, active: true }
      ];
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch(mockResponse) });

      const parents = await adapter.getParents('169069000');
      expect(parents).toHaveLength(1);
      expect(parents[0].code).toBe('71388002');
    });

    it('should return empty array on error', async () => {
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch({}, false) });
      const parents = await adapter.getParents('INVALID');
      expect(parents).toEqual([]);
    });
  });

  describe('getChildren()', () => {
    it('should return mapped child concepts', async () => {
      const mockResponse = {
        items: [
          { conceptId: '12345', pt: { term: 'Child' }, fsn: { term: 'Child (procedure)' }, active: true }
        ]
      };
      const adapter = new SnowstormAdapter({ baseUrl: BASE_URL, fetchFn: createMockFetch(mockResponse) });

      const children = await adapter.getChildren('169069000');
      expect(children).toHaveLength(1);
      expect(children[0].code).toBe('12345');
    });
  });

  describe('authentication headers', () => {
    it('should add Bearer auth header', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({
        baseUrl: BASE_URL,
        auth: { type: 'Bearer', token: 'my-token' },
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'test', limit: 5, offset: 0 });
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    it('should add Basic auth header', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({
        baseUrl: BASE_URL,
        auth: { type: 'Basic', credentials: 'dXNlcjpwYXNz' },
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'test', limit: 5, offset: 0 });
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Basic dXNlcjpwYXNz');
    });

    it('should add ApiKey header', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({
        baseUrl: BASE_URL,
        auth: { type: 'ApiKey', apiKey: 'secret-key', headerName: 'X-Custom-Key' },
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'test', limit: 5, offset: 0 });
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-Custom-Key']).toBe('secret-key');
    });

    it('should merge extra headers', async () => {
      const mockFetch = createMockFetch({ items: [], total: 0 });
      const adapter = new SnowstormAdapter({
        baseUrl: BASE_URL,
        headers: { 'X-Custom': 'value' },
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'test', limit: 5, offset: 0 });
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-Custom']).toBe('value');
    });
  });
});