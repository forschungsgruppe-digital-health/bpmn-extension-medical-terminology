import { describe, expect, it } from 'vitest';
import { createDemoTerminologyConfig } from '../../../demo/src/terminology-config.js';

describe('demo terminology configuration', () => {
  it('uses an explicit external Snowstorm base URL when configured', () => {
    expect(createDemoTerminologyConfig({
      DEV: true,
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct'
    })).toEqual({
      snomedConfig: {
        transport: 'snowstorm',
        baseUrl: 'https://snowstorm.example.test/snomed-ct',
        branch: 'MAIN',
        language: 'de',
        languageStrategy: 'header',
        defaultEcl: undefined,
        maxResults: 15
      }
    });
  });

  it('preserves the configured Snowstorm request settings', () => {
    expect(createDemoTerminologyConfig({
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE',
      VITE_SNOWSTORM_LANGUAGE: 'en-GB',
      VITE_SNOWSTORM_LANGUAGE_STRATEGY: 'param',
      VITE_SNOWSTORM_DEFAULT_ECL: '< 404684003',
      VITE_SNOWSTORM_MAX_RESULTS: '5'
    })).toEqual({
      snomedConfig: {
        transport: 'snowstorm',
        baseUrl: 'https://snowstorm.example.test/snomed-ct',
        branch: 'MAIN/SNOMEDCT-DE',
        language: 'en-GB',
        languageStrategy: 'param',
        defaultEcl: '< 404684003',
        maxResults: 5
      }
    });
  });

  it('does not configure Snowstorm without an external URL', () => {
    expect(createDemoTerminologyConfig({ DEV: true })).toEqual({});
  });

  it('rejects an invalid Snowstorm result limit', () => {
    expect(() => createDemoTerminologyConfig({
      DEV: true,
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_MAX_RESULTS: '0'
    })).toThrow('VITE_SNOWSTORM_MAX_RESULTS must be a positive integer.');
  });
});
