import { describe, expect, it, vi } from 'vitest';
import { FallbackProvider } from '../../src/providers/FallbackProvider.js';

function createProvider(overrides = {}) {
  return {
    id: 'provider',
    displayName: 'Provider',
    systemUri: 'http://example.com/system',
    capabilities: {
      search: true,
      lookup: true,
      hierarchy: false,
      validate: true
    },
    search: vi.fn(async () => ({ concepts: [], total: 0 })),
    lookup: vi.fn(async () => null),
    validate: vi.fn(async () => ({ valid: false, message: 'missing' })),
    getHierarchy: vi.fn(async () => ({ parents: [], children: [] })),
    ...overrides
  };
}

describe('FallbackProvider', () => {
  it('should return the primary search result when it has hits', async () => {
    const primary = createProvider({
      search: vi.fn(async () => ({ concepts: [{ code: 'A1' }], total: 1 }))
    });
    const fallback = createProvider();

    const provider = new FallbackProvider({
      id: 'dual-track',
      primaryProvider: primary,
      fallbackProvider: fallback
    });

    const result = await provider.search('a1');

    expect(result.concepts).toHaveLength(1);
    expect(fallback.search).not.toHaveBeenCalled();
  });

  it('should fall back to the secondary provider when the primary search is empty', async () => {
    const primary = createProvider();
    const fallback = createProvider({
      search: vi.fn(async () => ({ items: [{ code: 'B2' }], total: 1 }))
    });

    const provider = new FallbackProvider({
      id: 'dual-track',
      primaryProvider: primary,
      fallbackProvider: fallback
    });

    const result = await provider.search('b2');

    expect(result.items).toHaveLength(1);
    expect(fallback.search).toHaveBeenCalled();
  });

  it('should fall back to lookup and validate when the primary provider misses', async () => {
    const primary = createProvider();
    const fallback = createProvider({
      lookup: vi.fn(async () => ({ code: 'X1', display: 'Found' })),
      validate: vi.fn(async () => ({ valid: true }))
    });

    const provider = new FallbackProvider({
      id: 'dual-track',
      primaryProvider: primary,
      fallbackProvider: fallback
    });

    await expect(provider.lookup('X1')).resolves.toEqual({ code: 'X1', display: 'Found' });
    await expect(provider.validate('X1')).resolves.toEqual({ valid: true });
  });

  it('should reject mismatched system URIs', () => {
    const primary = createProvider({ systemUri: 'http://example.com/a' });
    const fallback = createProvider({ systemUri: 'http://example.com/b' });

    expect(() => new FallbackProvider({
      id: 'dual-track',
      primaryProvider: primary,
      fallbackProvider: fallback
    })).toThrow('same systemUri');
  });
});
