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
      // Explicit, so the default-branch warning stays out of these tests.
      branch: 'MAIN',
      fetchFn: overrides.fetchFn ?? createMockFetch({ items: [], total: 0 }),
      ...overrides
    });
  }

  describe('branch', () => {
    it('queries MAIN without a branch, as before, but warns once', async () => {
      vi.resetModules();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const { SnomedCtProvider: FreshSnomedCtProvider } =
          await import('../../src/providers/SnomedCtProvider.js');
        const fetchFn = createMockFetch({ items: [], total: 0 });
        const provider = new FreshSnomedCtProvider({ baseUrl: 'https://snowstorm.example.com', fetchFn });
        new FreshSnomedCtProvider({ baseUrl: 'https://snowstorm.example.com', branch: '  ', fetchFn });

        await provider.search('heart');

        expect(new URL(fetchFn.mock.calls[0][0]).pathname).toBe('/MAIN/concepts');
        const branchWarnings = warn.mock.calls
          .map(([message]) => message)
          .filter(message => message.includes('no branch configured'));
        expect(branchWarnings).toHaveLength(1);
        expect(branchWarnings[0]).toContain('SnomedCtProvider');
        expect(branchWarnings[0]).toContain('International Edition');
        expect(branchWarnings[0]).toContain('MAIN/SNOMEDCT-DE');
      } finally {
        warn.mockRestore();
      }
    });

    it('does not warn when a branch is configured', async () => {
      vi.resetModules();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const { SnomedCtProvider: FreshSnomedCtProvider } =
          await import('../../src/providers/SnomedCtProvider.js');
        new FreshSnomedCtProvider({ baseUrl: 'https://snowstorm.example.com', branch: 'MAIN/SNOMEDCT-DE' });

        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });

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

  it('supports a relative host-owned baseUrl', async () => {
    const fetchFn = createMockFetch({ items: [], total: 0 });
    const provider = createProvider({
      baseUrl: '/api/snowstorm/snomed-ct',
      fetchFn
    });

    await provider.search('pneumonia');

    const requestUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(provider.sourceLabel).toBe('localhost');
    expect(requestUrl.pathname).toBe('/api/snowstorm/snomed-ct/MAIN/concepts');
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

    it('preserves an unavailable total from the Snowstorm adapter', async () => {
      const provider = createProvider({
        fetchFn: createMockFetch({
          items: [{
            conceptId: '233604007',
            pt: { term: 'Pneumonia' },
            active: true
          }]
        })
      });

      const result = await provider.search('pneumonia');

      expect(result).toMatchObject({
        concepts: [{ code: '233604007' }]
      });
      expect(result.total).toBeUndefined();
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

    it('forwards configured branch, language, and defaultEcl to Snowstorm', async () => {
      const fetchFn = createMockFetch({ items: [], total: 0 });
      const provider = createProvider({
        baseUrl: 'https://snowstorm.example.com/snowstorm/snomed-ct',
        branch: 'MAIN/SNOMEDCT-DE',
        language: 'de-DE',
        languageStrategy: 'header',
        defaultEcl: '< 404684003',
        fetchFn
      });

      await provider.search('pneumonia');

      const calledUrl = new URL(fetchFn.mock.calls[0][0]);
      const requestOptions = fetchFn.mock.calls[0][1];
      expect(calledUrl.pathname).toBe('/snowstorm/snomed-ct/MAIN/SNOMEDCT-DE/concepts');
      expect(calledUrl.searchParams.get('ecl')).toBe('< 404684003');
      expect(requestOptions.headers['Accept-Language']).toBe('de');
    });

    it('should preserve server errors from the Snowstorm adapter', async () => {
      const provider = createProvider({
        fetchFn: vi.fn(async () => ({ ok: false, status: 503 }))
      });

      await expect(provider.search('test'))
        .rejects.toMatchObject({ kind: 'server', status: 503 });
    });

    it('should preserve data errors from the Snowstorm adapter', async () => {
      const provider = createProvider({
        fetchFn: createMockFetch({ items: [{ pt: { term: 'Missing concept id' } }] })
      });

      await expect(provider.search('test'))
        .rejects.toMatchObject({ kind: 'data' });
    });

    it('preserves redirect errors from the Snowstorm adapter', async () => {
      const provider = createProvider({
        fetchFn: vi.fn(async () => ({ ok: false, status: 302 }))
      });

      await expect(provider.search('test'))
        .rejects.toMatchObject({ kind: 'redirect', status: 302 });
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
          [ createMockFetch({ items: [{ pt: { term: 'Missing concept id' } }] }), { kind: 'data' } ]
        ];

        for (const [ fetchFn, expected ] of cases) {
          warn.mockClear();

          const provider = createProvider({ fetchFn });
          const failure = provider.search('test');

          await expect(failure).rejects.toMatchObject(expected);
          expect(warn).toHaveBeenCalledTimes(1);
          expect(warn).toHaveBeenCalledWith(
            '[terminology] Search failed for provider "snomed-ct" at snowstorm.example.com.',
            await failure.catch(error => error)
          );
        }
      } finally {
        warn.mockRestore();
      }
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