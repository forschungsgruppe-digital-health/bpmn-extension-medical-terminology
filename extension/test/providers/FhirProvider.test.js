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
        valueSetVersion: '2026'
      }
    });

    expect(provider.version).toBe('2026');
  });

  it('has no version label when no release is pinned', () => {
    expect(createProvider().version).toBeUndefined();
  });

  it('derives the version label from system-version and force-system-version', () => {
    expect(createProvider({
      expandParameters: {
        'system-version': 'http://fhir.de/CodeSystem/bfarm/icd-10-gm|2026'
      }
    }).version).toBe('2026');
    expect(createProvider({
      expandParameters: {
        'force-system-version': 'http://fhir.de/CodeSystem/bfarm/icd-10-gm|2025'
      }
    }).version).toBe('2025');
  });

  it('does not treat a SNOMED CT edition URI as a release', () => {
    expect(createProvider({
      systemUri: 'http://snomed.info/sct',
      lookupParameters: { version: 'http://snomed.info/sct/11000274103' }
    }).version).toBeUndefined();
    expect(createProvider({
      systemUri: 'http://snomed.info/sct',
      lookupParameters: { version: 'http://snomed.info/sct/11000274103/version/20260815' }
    }).version).toBe('http://snomed.info/sct/11000274103/version/20260815');
  });

  it('accepts a relative base URL outside a browser but fails its requests', async () => {
    const fetchFn = createMockFetch({ expansion: { contains: [] } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let provider;

    try {
      expect(() => {
        provider = createProvider({ baseUrl: '/api/terminology', fetchFn });
      }).not.toThrow();
      expect(provider.sourceLabel).toBe('/api/terminology');

      await expect(provider.search('Lunge')).rejects.toMatchObject({
        name: 'TerminologyRequestError',
        kind: 'network',
        message: 'Cannot resolve the relative terminology server URL "/api/terminology" outside a web page.'
      });
      expect(fetchFn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('labels a relative base URL with the inherited document host on about:srcdoc', async () => {
    vi.stubGlobal('location', { href: 'about:srcdoc', origin: 'null' });
    vi.stubGlobal('document', { baseURI: 'https://modeler.example.test/app/' });

    try {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ baseUrl: '/api/terminology', fetchFn });

      expect(provider.sourceLabel).toBe('modeler.example.test');

      await provider.search('Lunge');
      expect(new URL(fetchFn.mock.calls[0][0]).host).toBe(provider.sourceLabel);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('labels a protocol-relative base URL with the host it requests', async () => {
    vi.stubGlobal('location', {
      href: 'https://modeler.example.test/app/',
      origin: 'https://modeler.example.test'
    });

    try {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ baseUrl: '//tx.example.test/fhir', fetchFn });

      expect(provider.sourceLabel).toBe('tx.example.test');

      await provider.search('Lunge');
      expect(new URL(fetchFn.mock.calls[0][0]).origin).toBe('https://tx.example.test');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('labels a relative base URL with the page host in a browser', async () => {
    vi.stubGlobal('location', {
      href: 'https://modeler.example.test/app/',
      origin: 'https://modeler.example.test'
    });

    try {
      const fetchFn = createMockFetch({ expansion: { contains: [] } });
      const provider = createProvider({ baseUrl: '/api/terminology', fetchFn });

      expect(provider.sourceLabel).toBe('modeler.example.test');

      await provider.search('Lunge');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.origin).toBe('https://modeler.example.test');
      expect(calledUrl.pathname).toBe('/api/terminology/ValueSet/$expand');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('labels an absolute base URL with its host', () => {
    expect(createProvider().sourceLabel).toBe('fhir.bfarm.de');
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

    it('should add the configured version when the search response omits one', async () => {
      const fetchFn = createMockFetch({
        expansion: {
          contains: [
            { code: 'C34.1', display: 'Oberlappen' }
          ],
          total: 1
        }
      });
      const provider = createProvider({
        version: '2024',
        fetchFn
      });

      const result = await provider.search('Lunge');

      expect(result.concepts[0].version).toBe('2024');
    });

    it('preserves an unavailable total from the FHIR adapter', async () => {
      const provider = createProvider({
        fetchFn: createMockFetch({
          expansion: {
            contains: [{ code: 'C34.1', display: 'Oberlappen' }]
          }
        })
      });

      const result = await provider.search('Lunge');

      expect(result).toMatchObject({
        concepts: [{ code: 'C34.1' }]
      });
      expect(result.total).toBeUndefined();
    });

    it('should preserve the CodeSystem version reported by the expansion', async () => {
      const fetchFn = createMockFetch({
        expansion: {
          parameter: [
            { name: 'version', valueUri: 'http://loinc.org|2.82' }
          ],
          contains: [
            { code: 'LP149706-6', display: 'Discharge' }
          ],
          total: 1
        }
      });
      const provider = createProvider({
        systemUri: 'http://loinc.org',
        valueSetUri: 'http://loinc.org/vs',
        fetchFn
      });

      const result = await provider.search('discharge');

      expect(result.concepts[0]).toMatchObject({
        system: 'http://loinc.org',
        version: '2.82'
      });
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
          valueSetVersion: '2026'
        },
        fetchFn
      });

      await provider.search('');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('url')).toBe('http://fhir.de/ValueSet/bfarm/icd-10-gm');
      expect(calledUrl.searchParams.get('valueSetVersion')).toBe('2026');
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

    it('should preserve data errors from the FHIR adapter', async () => {
      const provider = createProvider({
        fetchFn: createMockFetch({ expansion: { contains: 'invalid' } })
      });

      await expect(provider.search('test'))
        .rejects.toMatchObject({ kind: 'data' });
    });

    it('does not warn about a search the caller aborted', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const controller = new AbortController();
        const fetchFn = vi.fn(async (url, init) => {
          controller.abort();
          throw init.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
        });
        const provider = createProvider({ fetchFn });

        await expect(provider.search('test', { signal: controller.signal }))
          .rejects.toMatchObject({ kind: 'aborted' });
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('still warns about other search errors', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const cases = [
          [ vi.fn(async () => { throw new TypeError('Failed to fetch'); }), { kind: 'network' } ],
          [ vi.fn(async () => ({ ok: false, status: 503 })), { kind: 'server', status: 503 } ],
          [ createMockFetch({ expansion: { contains: 'invalid' } }), { kind: 'data' } ]
        ];

        for (const [ fetchFn, expected ] of cases) {
          warn.mockClear();

          const provider = createProvider({ fetchFn });
          const failure = provider.search('test');

          await expect(failure).rejects.toMatchObject(expected);
          expect(warn).toHaveBeenCalledTimes(1);
          expect(warn).toHaveBeenCalledWith(
            '[terminology] Search failed for provider "icd-10-gm" at fhir.bfarm.de.',
            await failure.catch(error => error)
          );
        }
      } finally {
        warn.mockRestore();
      }
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

    it('stores the release reported by $lookup when no release is pinned', async () => {
      const fetchFn = createMockFetch({
        parameter: [
          { name: 'display', valueString: 'Bösartige Neubildung' },
          { name: 'version', valueString: '2026' }
        ]
      });
      const provider = createProvider({ fetchFn });

      await expect(provider.lookup('C34.1')).resolves.toMatchObject({
        code: 'C34.1',
        version: '2026'
      });
    });

    it('should add the configured version when lookup omits one', async () => {
      const fetchFn = createMockFetch({
        parameter: [
          { name: 'display', valueString: 'Bösartige Neubildung' }
        ]
      });
      const provider = createProvider({
        version: '2024',
        fetchFn
      });

      await expect(provider.lookup('C34.1')).resolves.toMatchObject({
        code: 'C34.1',
        version: '2024'
      });
    });

    it('should forward lookupParameters to the adapter lookup request', async () => {
      const fetchFn = createMockFetch({ parameter: [] });
      const provider = createProvider({
        lookupParameters: {
          version: '2026'
        },
        fetchFn
      });

      await provider.lookup('C34.1');
      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('version')).toBe('2026');
    });
  });
});
