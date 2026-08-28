import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminologyRegistry } from '../../src/core/TerminologyRegistry.js';
import { createFhirTerminologyProviderLoader } from '../../src/services/TerminologyProviderLoader.js';

describe('createFhirTerminologyProviderLoader()', () => {
  let registry;

  beforeEach(() => {
    registry = new TerminologyRegistry();
  });

  it('should return an already registered provider for the same system URI', async () => {
    const provider = {
      id: 'loinc',
      displayName: 'LOINC',
      systemUri: 'http://loinc.org',
      capabilities: { search: true, lookup: true, hierarchy: false, validate: true }
    };

    registry.register(provider);

    const loadProvider = vi.fn();
    const loader = createFhirTerminologyProviderLoader({
      terminologyRegistry: registry,
      fhirBaseUrl: 'https://example.com/fhir',
      loadProvider
    });

    await expect(loader.ensureProvider('http://loinc.org')).resolves.toBe(provider);
    expect(loadProvider).not.toHaveBeenCalled();
  });

  it('should load and register a missing provider', async () => {
    const loadProvider = vi.fn(async () => ({
      id: 'dyn-actcode',
      displayName: 'ActCode',
      systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      capabilities: { search: true, lookup: true, hierarchy: false, validate: true }
    }));

    const loader = createFhirTerminologyProviderLoader({
      terminologyRegistry: registry,
      fhirBaseUrl: 'https://example.com/fhir',
      loadProvider
    });

    const provider = await loader.ensureProvider('http://terminology.hl7.org/CodeSystem/v3-ActCode');

    expect(loadProvider).toHaveBeenCalledWith(
      'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      'https://example.com/fhir',
      undefined
    );
    expect(provider.id).toBe('dyn-actcode');
    expect(registry.getProvider('dyn-actcode')).toBe(provider);
  });

  it('should reuse the same in-flight load for concurrent requests', async () => {
    const loadProvider = vi.fn(async () => {
      await Promise.resolve();
      return {
        id: 'dyn-rolecode',
        displayName: 'RoleCode',
        systemUri: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        capabilities: { search: true, lookup: true, hierarchy: false, validate: true }
      };
    });

    const loader = createFhirTerminologyProviderLoader({
      terminologyRegistry: registry,
      fhirBaseUrl: 'https://example.com/fhir',
      loadProvider
    });

    const [first, second] = await Promise.all([
      loader.ensureProvider('http://terminology.hl7.org/CodeSystem/v3-RoleCode'),
      loader.ensureProvider('http://terminology.hl7.org/CodeSystem/v3-RoleCode')
    ]);

    expect(loadProvider).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('should fail clearly when no base URL is configured', async () => {
    const loader = createFhirTerminologyProviderLoader({
      terminologyRegistry: registry,
      fhirBaseUrl: ''
    });

    await expect(loader.ensureProvider('http://loinc.org'))
      .rejects.toThrow('No FHIR terminology base URL configured');
  });
});
