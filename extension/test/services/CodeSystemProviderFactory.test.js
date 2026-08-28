import { describe, expect, it } from 'vitest';
import { createStaticProviderFromCodeSystem } from '../../src/services/CodeSystemProviderFactory.js';

describe('createStaticProviderFromCodeSystem()', () => {
  it('should flatten nested concepts into a StaticProvider', () => {
    const provider = createStaticProviderFromCodeSystem({
      resourceType: 'CodeSystem',
      id: 'v3-ActCode',
      url: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      version: '4.0.0',
      title: 'HL7 v3 ActCode',
      concept: [
        {
          code: '_Act',
          display: 'Act',
          concept: [
            { code: 'AA', display: 'Adjudicated with adjustments' },
            { code: 'AR', display: 'Adjudicated as refused' }
          ]
        }
      ]
    }, {
      id: 'hl7-v3-actcode'
    });

    expect(provider.id).toBe('hl7-v3-actcode');
    expect(provider.systemUri).toBe('http://terminology.hl7.org/CodeSystem/v3-ActCode');
    expect(provider.getAll()).toHaveLength(3);
    expect(provider.getAll()[1].code).toBe('AA');
    expect(provider.getAll()[1].version).toBe('4.0.0');
  });

  it('should mark retired and deprecated concepts as inactive', async () => {
    const provider = createStaticProviderFromCodeSystem({
      resourceType: 'CodeSystem',
      id: 'v2-0203',
      url: 'http://terminology.hl7.org/CodeSystem/v2-0203',
      concept: [
        {
          code: 'OLD',
          display: 'Old',
          property: [{ code: 'status', valueCode: 'retired' }]
        },
        {
          code: 'NEW',
          display: 'New',
          property: [{ code: 'status', valueCode: 'active' }]
        }
      ]
    });

    await expect(provider.validate('OLD')).resolves.toEqual({
      valid: false,
      message: undefined
    });
    await expect(provider.validate('NEW')).resolves.toEqual({
      valid: true,
      message: undefined
    });
  });

  it('should fail clearly when the canonical url is missing', () => {
    expect(() => createStaticProviderFromCodeSystem({
      resourceType: 'CodeSystem',
      id: 'missing-url'
    })).toThrow('canonical url');
  });
});
