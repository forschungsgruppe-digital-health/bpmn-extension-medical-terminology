import { describe, it, expect } from 'vitest';
import { TerminologyProvider } from '../../src/core/TerminologyProvider.js';

describe('TerminologyProvider (interface)', () => {
  it('should throw on accessing id', () => {
    const provider = new TerminologyProvider();
    expect(() => provider.id).toThrow('Not implemented: id');
  });

  it('should throw on accessing displayName', () => {
    const provider = new TerminologyProvider();
    expect(() => provider.displayName).toThrow('Not implemented: displayName');
  });

  it('should throw on accessing systemUri', () => {
    const provider = new TerminologyProvider();
    expect(() => provider.systemUri).toThrow('Not implemented: systemUri');
  });

  it('should return default capabilities with all false', () => {
    const provider = new TerminologyProvider();
    expect(provider.capabilities).toEqual({
      search: false,
      lookup: false,
      hierarchy: false,
      validate: false
    });
  });

  it('should throw on search()', async () => {
    const provider = new TerminologyProvider();
    await expect(provider.search('test')).rejects.toThrow('Not implemented: search()');
  });

  it('should throw on lookup()', async () => {
    const provider = new TerminologyProvider();
    await expect(provider.lookup('123')).rejects.toThrow('Not implemented: lookup()');
  });

  it('validate() should delegate to lookup() and return valid=false if not found', async () => {
    const provider = new TerminologyProvider();
    // Override lookup to return null (not found) and id to avoid the "Not implemented" error
    provider.lookup = async () => null;
    Object.defineProperty(provider, 'id', { get: () => 'test-provider' });
    const result = await provider.validate('MISSING');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('MISSING');
  });

  it('validate() should return valid=true for found active concept', async () => {
    const provider = new TerminologyProvider();
    provider.lookup = async () => ({ code: '123', display: 'Test', system: 'test', active: true });
    Object.defineProperty(provider, 'id', { get: () => 'test-provider' });
    const result = await provider.validate('123');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('validate() should return valid=false for inactive concept', async () => {
    const provider = new TerminologyProvider();
    provider.lookup = async () => ({ code: '123', display: 'Test', system: 'test', active: false });
    Object.defineProperty(provider, 'id', { get: () => 'test-provider' });
    const result = await provider.validate('123');
    expect(result.valid).toBe(false);
  });

  it('getHierarchy() should return empty parents and children by default', async () => {
    const provider = new TerminologyProvider();
    const result = await provider.getHierarchy('123');
    expect(result).toEqual({ parents: [], children: [] });
  });
});
