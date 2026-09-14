import { describe, expect, it, vi } from 'vitest';
import { loadCodeSystemFromFhir } from '../../src/services/FhirCodeSystemLoader.js';

describe('loadCodeSystemFromFhir()', () => {
  it('loads a provider when the code system exists', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        entry: [{
          resource: {
            resourceType: 'CodeSystem',
            url: 'http://loinc.org',
            title: 'LOINC'
          }
        }]
      })
    }));

    const provider = await loadCodeSystemFromFhir('http://loinc.org', 'https://example.com/fhir', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.com/fhir/CodeSystem?url=http%3A%2F%2Floinc.org',
      { headers: { Accept: 'application/fhir+json' } }
    );
    expect(provider.id).toBe('dyn-loinc');
    expect(provider.displayName).toBe('LOINC');
    expect(provider.systemUri).toBe('http://loinc.org');
  });

  it('fails when the code system is missing', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({ entry: [] })
    }));

    await expect(
      loadCodeSystemFromFhir('http://example.com/missing', 'https://example.com/fhir', fetchFn)
    ).rejects.toThrow('is not available');
  });

  it('forwards the configured fetch function to a dynamically loaded provider', async () => {
    const fetchFn = vi.fn(async url => {
      if (url.includes('/CodeSystem?')) {
        return {
          ok: true,
          json: async () => ({
            entry: [{
              resource: {
                resourceType: 'CodeSystem',
                url: 'https://example.test/CodeSystem/empty',
                title: 'Empty Test CodeSystem'
              }
            }]
          })
        };
      }

      return {
        ok: true,
        json: async () => ({ expansion: { contains: [], total: 0 } })
      };
    });

    const provider = await loadCodeSystemFromFhir(
      'https://example.test/CodeSystem/empty',
      'https://example.test/fhir',
      fetchFn
    );

    await expect(provider.search('absent')).resolves.toEqual({ concepts: [], total: 0 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][0]).toContain('/ValueSet/$expand');
  });
});
