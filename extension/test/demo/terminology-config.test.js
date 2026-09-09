import { describe, expect, it } from 'vitest';
import {
  DEMO_SNOWSTORM_PROXY_PATH,
  createDemoTerminologyConfig
} from '../../../demo/src/terminology-config.js';

describe('demo terminology configuration', () => {
  it('uses the Vite Snowstorm proxy during development when a proxy target is configured', () => {
    expect(createDemoTerminologyConfig({
      DEV: true,
      VITE_SNOWSTORM_PROXY_TARGET: 'https://snowstorm.example.test/snomed-ct'
    })).toEqual({
      snomedConfig: {
        transport: 'snowstorm',
        baseUrl: DEMO_SNOWSTORM_PROXY_PATH,
        branch: 'MAIN',
        language: 'de',
        languageStrategy: 'header',
        defaultEcl: undefined,
        maxResults: 15
      }
    });
  });

  it('uses an explicit external Snowstorm base URL outside development', () => {
    expect(createDemoTerminologyConfig({
      DEV: false,
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

  it('does not configure Snowstorm without an external URL or development proxy target', () => {
    expect(createDemoTerminologyConfig({ DEV: true })).toEqual({});
    expect(createDemoTerminologyConfig({ DEV: false })).toEqual({});
  });

  it('rejects an invalid Snowstorm result limit', () => {
    expect(() => createDemoTerminologyConfig({
      DEV: true,
      VITE_SNOWSTORM_PROXY_TARGET: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_MAX_RESULTS: '0'
    })).toThrow('VITE_SNOWSTORM_MAX_RESULTS must be a positive integer.');
  });
});
