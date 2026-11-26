import { describe, it, expect, vi } from 'vitest';
import { FhirTerminologyAdapter } from '../../src/adapters/FhirTerminologyAdapter.js';
import { TerminologyRequestError } from '../../src/core/TerminologyRequestError.js';

function createMockFetch(responseBody, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
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
          valueSetVersion: '2026',
          'system-version': 'http://fhir.de/CodeSystem/bfarm/icd-10-gm|2026'
        },
        fetchFn: mockFetch
      });

      await adapter.search({ term: '', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('valueSetVersion')).toBe('2026');
      expect(calledUrl.searchParams.get('system-version')).toBe('http://fhir.de/CodeSystem/bfarm/icd-10-gm|2026');
    });

    it('should use an explicit valueSetUri without appending ?fhir_vs', async () => {
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

    it('treats an empty ValueSet expansion as a successful search without matches', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: createMockFetch({
          expansion: {
            contains: [],
            total: 0
          }
        })
      });

      await expect(adapter.search({ term: 'absent', limit: 10, offset: 0 }))
        .resolves.toEqual({ items: [], total: 0 });
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

    it('should reject with an authorization error on a forbidden response', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => ({ ok: false, status: 403 }))
      });

      await expect(adapter.search({ term: 'test', limit: 10, offset: 0 }))
        .rejects.toMatchObject({
          kind: 'authorization',
          host: 'fhir.bfarm.de',
          status: 403
        });
    });

    it('should reject with a network error on fetch failure', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => { throw new Error('network error'); })
      });

      await expect(adapter.search({ term: 'test', limit: 10, offset: 0 }))
        .rejects.toMatchObject({
          kind: 'network',
          host: 'fhir.bfarm.de'
        });
    });

    it('classifies an externally aborted search request', async () => {
      const controller = new AbortController();
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn((_, { signal }) => new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }))
      });

      const result = adapter.search({ term: 'test', limit: 10, offset: 0, signal: controller.signal });
      controller.abort();

      await expect(result).rejects.toMatchObject({ kind: 'aborted' });
    });

    it('enforces the configured search request timeout', async () => {
      vi.useFakeTimers();
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        requestTimeoutMs: 100,
        fetchFn: vi.fn((_, { signal }) => new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('timed out')));
        }))
      });

      const result = adapter.search({ term: 'test', limit: 10, offset: 0 });
      const assertion = expect(result).rejects.toMatchObject({ kind: 'timeout' });
      await vi.advanceTimersByTimeAsync(100);

      await assertion;
      vi.useRealTimers();
    });

    it('should reject with a data error for an invalid expansion response', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: createMockFetch({ expansion: { contains: 'invalid' } })
      });

      await expect(adapter.search({ term: 'test', limit: 10, offset: 0 }))
        .rejects.toMatchObject({
          kind: 'data',
          host: 'fhir.bfarm.de'
        });
    });

    it('should reject with a data error for an invalid expansion entry', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: createMockFetch({
          expansion: {
            contains: [{ display: 'Missing code' }]
          }
        })
      });

      await expect(adapter.search({ term: 'test', limit: 10, offset: 0 }))
        .rejects.toMatchObject({ kind: 'data' });
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
      expect(result.total).toBeUndefined();
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

    it('expands the FHIR implicit value set <systemUri>?fhir_vs without a valueSetUri', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('url')).toBe(`${SYSTEM_URI}?fhir_vs`);
    });

    it('keeps a system URI that already names a value set', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
        fetchFn: mockFetch
      });

      await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('url')).toBe('http://fhir.de/ValueSet/bfarm/icd-10-gm');
    });

    it('prefers the used-codesystem release of its own code system', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [
            { name: 'version', valueUri: 'http://example.test/CodeSystem/other|9.9' },
            { name: 'used-codesystem', valueUri: 'http://example.test/CodeSystem/other|9.9' },
            { name: 'used-codesystem', valueUri: `${SYSTEM_URI}|2026` }
          ],
          contains: [{ code: 'C34.1', display: 'Bösartige Neubildung: Oberlappen' }],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      expect(result.items[0].version).toBe('2026');
    });

    it('keeps a SNOMED CT release URI reported by used-codesystem', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [{
            name: 'used-codesystem',
            valueUri: 'http://snomed.info/sct|http://snomed.info/sct/11000274103/version/20260815'
          }],
          contains: [{ code: '1', display: 'Example' }],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: 'http://snomed.info/sct',
        valueSetUri: 'http://snomed.info/sct/11000274103?fhir_vs',
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'example', limit: 10, offset: 0 });

      expect(result.items[0].version).toBe('http://snomed.info/sct/11000274103/version/20260815');
    });

    it('falls back to another system release when its own is not reported', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [
            { name: 'used-codesystem', valueUri: 'http://loinc.org|2.81' }
          ],
          contains: [{ code: 'LP149706-6', display: 'Discharge' }]
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: 'http://loinc.org/other',
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'discharge', limit: 10, offset: 0 });

      expect(result.items[0].version).toBe('2.81');
    });

    it('stores no version when used-codesystem names its own system without a release', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [
            { name: 'used-codesystem', valueUri: 'http://example.test/CodeSystem/other|1.0' },
            { name: 'used-codesystem', valueUri: SYSTEM_URI }
          ],
          contains: [{ code: 'C34.1', display: 'Bösartige Neubildung: Oberlappen' }],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        valueSetUri: 'http://fhir.de/ValueSet/bfarm/icd-10-gm',
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      expect(result.items[0].version).toBeUndefined();
    });

    it.each([
      ['used-codesystem', 'valueUri'],
      ['system-version', 'valueCanonical']
    ])('stores no version for a %s canonical without a release', async (name, valueKey) => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [{ name, [valueKey]: 'http://example.test/CodeSystem/other' }],
          contains: [{ code: 'C34.1', display: 'Bösartige Neubildung: Oberlappen' }],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      expect(result.items[0].version).toBeUndefined();
    });

    it('keeps a plain version parameter value as the release', async () => {
      const mockFetch = createMockFetch({
        expansion: {
          parameter: [{ name: 'version', valueString: '2026' }],
          contains: [{ code: 'C34.1', display: 'Bösartige Neubildung: Oberlappen' }],
          total: 1
        }
      });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      const result = await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

      expect(result.items[0].version).toBe('2026');
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

    it('fails every request for a relative base URL outside a web page', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });
      let adapter;

      expect(() => {
        adapter = new FhirTerminologyAdapter({
          baseUrl: '/fhir',
          systemUri: SYSTEM_URI,
          fetchFn: mockFetch
        });
      }).not.toThrow();

      const expectedError = {
        name: 'TerminologyRequestError',
        kind: 'network',
        message: 'Cannot resolve the relative terminology server URL "/fhir" outside a web page.'
      };
      await expect(adapter.search({ term: 'Lunge', limit: 10, offset: 0 }))
        .rejects.toMatchObject(expectedError);
      await expect(adapter.lookup('C34.1')).rejects.toBeInstanceOf(TerminologyRequestError);
      await expect(adapter.lookup('C34.1')).rejects.toMatchObject(expectedError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('resolves a same-origin route against the current page', async () => {
      vi.stubGlobal('location', {
        href: 'https://modeler.example.test/app/index.html',
        origin: 'https://modeler.example.test'
      });

      try {
        const mockFetch = createMockFetch({ expansion: { contains: [] } });
        const adapter = new FhirTerminologyAdapter({
          baseUrl: '/api/terminology/',
          systemUri: SYSTEM_URI,
          fetchFn: mockFetch
        });

        await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });
        await adapter.lookup('C34.1');

        const searchUrl = new URL(mockFetch.mock.calls[0][0]);
        const lookupUrl = new URL(mockFetch.mock.calls[1][0]);
        expect(searchUrl.origin).toBe('https://modeler.example.test');
        expect(searchUrl.pathname).toBe('/api/terminology/ValueSet/$expand');
        expect(lookupUrl.pathname).toBe('/api/terminology/CodeSystem/$lookup');
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('resolves a relative base URL against the inherited document base on about:srcdoc', async () => {
      vi.stubGlobal('location', { href: 'about:srcdoc', origin: 'null' });
      vi.stubGlobal('document', { baseURI: 'https://modeler.example.test/app/' });

      try {
        const mockFetch = createMockFetch({ expansion: { contains: [] } });
        const adapter = new FhirTerminologyAdapter({
          baseUrl: '/api/terminology',
          systemUri: SYSTEM_URI,
          fetchFn: mockFetch
        });

        await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

        const calledUrl = new URL(mockFetch.mock.calls[0][0]);
        expect(calledUrl.origin).toBe('https://modeler.example.test');
        expect(calledUrl.pathname).toBe('/api/terminology/ValueSet/$expand');
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('resolves a relative base URL against <base href> before the page URL', async () => {
      vi.stubGlobal('location', {
        href: 'https://modeler.example.test/app/index.html',
        origin: 'https://modeler.example.test'
      });
      vi.stubGlobal('document', { baseURI: 'https://static.example.test/modeler/' });

      try {
        const mockFetch = createMockFetch({ expansion: { contains: [] } });
        const adapter = new FhirTerminologyAdapter({
          baseUrl: 'api/fhir',
          systemUri: SYSTEM_URI,
          fetchFn: mockFetch
        });

        await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });

        expect(mockFetch.mock.calls[0][0])
          .toMatch(/^https:\/\/static\.example\.test\/modeler\/api\/fhir\/ValueSet\/\$expand\?/);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('fails requests instead of guessing a host when the page has no resolvable base', async () => {
      vi.stubGlobal('location', { href: 'about:blank', origin: 'null' });
      vi.stubGlobal('document', { baseURI: 'about:blank' });

      try {
        const mockFetch = createMockFetch({ expansion: { contains: [] } });
        let adapter;

        expect(() => {
          adapter = new FhirTerminologyAdapter({
            baseUrl: '/api/terminology',
            systemUri: SYSTEM_URI,
            fetchFn: mockFetch
          });
        }).not.toThrow();

        await expect(adapter.search({ term: 'Lunge', limit: 10, offset: 0 }))
          .rejects.toMatchObject({
            name: 'TerminologyRequestError',
            kind: 'network',
            message: 'Cannot resolve the relative terminology server URL "/api/terminology" outside a web page.'
          });
        expect(mockFetch).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('resolves a protocol-relative base URL against the current page', async () => {
      vi.stubGlobal('location', {
        href: 'https://example.test/app/',
        origin: 'https://example.test'
      });

      try {
        const mockFetch = createMockFetch({ expansion: { contains: [] } });
        const adapter = new FhirTerminologyAdapter({
          baseUrl: '//tx.example/fhir',
          systemUri: SYSTEM_URI,
          fetchFn: mockFetch
        });

        await adapter.search({ term: 'Lunge', limit: 10, offset: 0 });
        await adapter.lookup('C34.1');

        expect(mockFetch.mock.calls[0][0])
          .toMatch(/^https:\/\/tx\.example\/fhir\/ValueSet\/\$expand\?/);
        expect(mockFetch.mock.calls[1][0])
          .toMatch(/^https:\/\/tx\.example\/fhir\/CodeSystem\/\$lookup\?/);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('rejects a protocol-relative base URL outside a web page with a request error', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });
      const adapter = new FhirTerminologyAdapter({
        baseUrl: '//tx.example/fhir',
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      await expect(adapter.search({ term: 'Lunge', limit: 10, offset: 0 }))
        .rejects.toMatchObject({ name: 'TerminologyRequestError', kind: 'network' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects an absolute base URL that is not a valid URL with a request error', async () => {
      const mockFetch = createMockFetch({ expansion: { contains: [] } });
      const adapter = new FhirTerminologyAdapter({
        baseUrl: 'https://exa mple.test/fhir',
        systemUri: SYSTEM_URI,
        fetchFn: mockFetch
      });

      await expect(adapter.search({ term: 'Lunge', limit: 10, offset: 0 }))
        .rejects.toMatchObject({ name: 'TerminologyRequestError', kind: 'network' });
      await expect(adapter.lookup('C34.1'))
        .rejects.toMatchObject({ name: 'TerminologyRequestError', kind: 'network' });
      expect(mockFetch).not.toHaveBeenCalled();
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
          version: '2026'
        },
        fetchFn: mockFetch
      });

      await adapter.lookup('C34.1');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('version')).toBe('2026');
    });

    it('requests the display language with the param strategy', async () => {
      const mockFetch = createMockFetch({ parameter: [] });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        language: 'de',
        languageStrategy: 'param',
        fetchFn: mockFetch
      });

      await adapter.lookup('C34.1');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('displayLanguage')).toBe('de');
      expect(mockFetch.mock.calls[0][1].headers['Accept-Language']).toBeUndefined();
    });

    it('lets an explicit lookup parameter override the display language', async () => {
      const mockFetch = createMockFetch({ parameter: [] });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        language: 'de',
        languageStrategy: 'param',
        lookupParameters: { displayLanguage: 'en' },
        fetchFn: mockFetch
      });

      await adapter.lookup('C34.1');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.getAll('displayLanguage')).toEqual(['en']);
    });

    it('sends the display language as Accept-Language with the header strategy', async () => {
      const mockFetch = createMockFetch({ parameter: [] });

      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        language: 'de-DE',
        languageStrategy: 'header',
        fetchFn: mockFetch
      });

      await adapter.lookup('C34.1');

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.has('displayLanguage')).toBe(false);
      expect(mockFetch.mock.calls[0][1].headers['Accept-Language']).toBe('de');
    });

    it('should return null only when the code is not found', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => ({ ok: false, status: 404 }))
      });

      const concept = await adapter.lookup('INVALID');
      expect(concept).toBeNull();
    });

    it('should propagate a network failure', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => { throw new Error('network error'); })
      });

      await expect(adapter.lookup('INVALID')).rejects.toMatchObject({ kind: 'network' });
    });

    it('should propagate server failures instead of treating them as a missing code', async () => {
      const adapter = new FhirTerminologyAdapter({
        baseUrl: BASE_URL,
        systemUri: SYSTEM_URI,
        fetchFn: vi.fn(async () => ({ ok: false, status: 503 }))
      });

      await expect(adapter.lookup('INVALID')).rejects.toMatchObject({ kind: 'server', status: 503 });
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
