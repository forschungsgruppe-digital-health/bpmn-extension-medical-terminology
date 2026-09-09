import { describe, expect, it } from 'vitest';
import { resolveTerminologyPropertiesConfig } from '../../src/properties-panel/config.js';

describe('terminology properties configuration', () => {
  it('showAnnotations: false preserves the disabled annotation setting', () => {
    expect(resolveTerminologyPropertiesConfig({ showAnnotations: false }))
      .toEqual({ showAnnotations: false });
  });
});
