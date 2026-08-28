import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerminologyRegistry } from '../../src/core/TerminologyRegistry.js';

/**
 * Minimal mock provider conforming to the TerminologyProvider interface.
 */
function createMockProvider(overrides = {}) {
  return {
    id: overrides.id ?? 'mock-provider',
    displayName: overrides.displayName ?? 'Mock Provider',
    systemUri: overrides.systemUri ?? 'http://example.com/mock',
    capabilities: overrides.capabilities ?? { search: true, lookup: true, hierarchy: false, validate: true },
    search: overrides.search ?? vi.fn(async () => ({ concepts: [], total: 0 })),
    lookup: overrides.lookup ?? vi.fn(async () => null),
    validate: overrides.validate ?? vi.fn(async () => ({ valid: false })),
    getHierarchy: overrides.getHierarchy ?? vi.fn(async () => ({ parents: [], children: [] }))
  };
}

describe('TerminologyRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new TerminologyRegistry();
  });

  // ─── Registration ──────────────────────────────────────────

  describe('register()', () => {
    it('should register a provider', () => {
      const provider = createMockProvider();
      registry.register(provider);
      expect(registry.listProviders()).toHaveLength(1);
      expect(registry.listProviders()[0].id).toBe('mock-provider');
    });

    it('should throw on duplicate registration', () => {
      registry.register(createMockProvider());
      expect(() => registry.register(createMockProvider())).toThrow('already registered');
    });

    it('should emit provider:registered event', () => {
      const listener = vi.fn();
      registry.on('provider:registered', listener);
      registry.register(createMockProvider());
      expect(listener).toHaveBeenCalledWith({
        id: 'mock-provider',
        displayName: 'Mock Provider'
      });
    });
  });

  // ─── Unregister ────────────────────────────────────────────

  describe('unregister()', () => {
    it('should remove a registered provider', () => {
      registry.register(createMockProvider());
      registry.unregister('mock-provider');
      expect(registry.listProviders()).toHaveLength(0);
    });

    it('should emit provider:unregistered event', () => {
      const listener = vi.fn();
      registry.on('provider:unregistered', listener);
      registry.register(createMockProvider());
      registry.unregister('mock-provider');
      expect(listener).toHaveBeenCalledWith({ id: 'mock-provider' });
    });

    it('should silently handle unregistering non-existent provider', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  // ─── getProvider ───────────────────────────────────────────

  describe('getProvider()', () => {
    it('should return the registered provider', () => {
      const provider = createMockProvider();
      registry.register(provider);
      expect(registry.getProvider('mock-provider')).toBe(provider);
    });

    it('should throw for unknown provider with available list', () => {
      registry.register(createMockProvider({ id: 'a' }));
      expect(() => registry.getProvider('unknown')).toThrow('No provider registered');
      expect(() => registry.getProvider('unknown')).toThrow('Available: a');
    });
  });

  describe('findProviderBySystem()', () => {
    it('should return the provider matching the system URI', () => {
      const provider = createMockProvider({ systemUri: 'http://example.com/system' });
      registry.register(provider);

      expect(registry.findProviderBySystem('http://example.com/system')).toBe(provider);
    });

    it('should return null when no provider matches the system URI', () => {
      registry.register(createMockProvider());

      expect(registry.findProviderBySystem('http://example.com/unknown')).toBeNull();
    });
  });

  // ─── listProviders ────────────────────────────────────────

  describe('listProviders()', () => {
    it('should return empty array when no providers registered', () => {
      expect(registry.listProviders()).toEqual([]);
    });

    it('should return metadata for all registered providers', () => {
      registry.register(createMockProvider({ id: 'alpha', displayName: 'Alpha', systemUri: 'http://alpha' }));
      registry.register(createMockProvider({ id: 'beta', displayName: 'Beta', systemUri: 'http://beta' }));

      const list = registry.listProviders();
      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({ id: 'alpha', displayName: 'Alpha', systemUri: 'http://alpha' });
      expect(list[1]).toMatchObject({ id: 'beta', displayName: 'Beta', systemUri: 'http://beta' });
    });
  });

  // ─── search ───────────────────────────────────────────────

  describe('search()', () => {
    it('should delegate to the correct provider', async () => {
      const searchFn = vi.fn(async () => ({ concepts: [{ code: '1' }], total: 1 }));
      registry.register(createMockProvider({ search: searchFn }));

      const result = await registry.search('pneumonia', 'mock-provider', { limit: 5 });
      expect(searchFn).toHaveBeenCalledWith('pneumonia', { limit: 5 });
      expect(result.total).toBe(1);
    });

    it('should throw for unknown provider', async () => {
      await expect(registry.search('test', 'unknown')).rejects.toThrow('No provider registered');
    });
  });

  // ─── lookup ───────────────────────────────────────────────

  describe('lookup()', () => {
    it('should delegate to the correct provider', async () => {
      const lookupFn = vi.fn(async () => ({ code: '169069000', display: 'CT of chest', system: 'http://snomed.info/sct' }));
      registry.register(createMockProvider({ lookup: lookupFn }));

      const concept = await registry.lookup('169069000', 'mock-provider');
      expect(lookupFn).toHaveBeenCalledWith('169069000');
      expect(concept.code).toBe('169069000');
    });
  });

  // ─── validate ─────────────────────────────────────────────

  describe('validate()', () => {
    it('should delegate to the correct provider', async () => {
      const validateFn = vi.fn(async () => ({ valid: true }));
      registry.register(createMockProvider({ validate: validateFn }));

      const result = await registry.validate('123', 'mock-provider');
      expect(validateFn).toHaveBeenCalledWith('123');
      expect(result.valid).toBe(true);
    });
  });

  // ─── Events ───────────────────────────────────────────────

  describe('event system', () => {
    it('should allow subscribing and unsubscribing', () => {
      const listener = vi.fn();
      registry.on('provider:registered', listener);
      registry.register(createMockProvider({ id: 'first' }));
      expect(listener).toHaveBeenCalledTimes(1);

      registry.off('provider:registered', listener);
      registry.register(createMockProvider({ id: 'second' }));
      expect(listener).toHaveBeenCalledTimes(1); // not called again
    });

    it('should handle off() for non-existent event gracefully', () => {
      expect(() => registry.off('nonexistent', () => {})).not.toThrow();
    });
  });
});
