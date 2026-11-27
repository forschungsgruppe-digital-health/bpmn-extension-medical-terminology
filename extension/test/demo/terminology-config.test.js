import { describe, expect, it, vi } from 'vitest';
import {
  createDemoTerminologyConfig,
  describeDemoOptInServer,
  describeDemoOptInSnomed,
  describeDemoTerminologyServer
} from '../../../demo/src/terminology-config.js';

describe('demo terminology configuration', () => {
  it('uses an explicit external Snowstorm base URL and branch when configured', () => {
    expect(createDemoTerminologyConfig({
      DEV: true,
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    })).toEqual({
      enableFhirDefaults: false,
      snomedConfig: {
        transport: 'snowstorm',
        baseUrl: 'https://snowstorm.example.test/snomed-ct',
        branch: 'MAIN/SNOMEDCT-DE',
        language: 'de',
        languageStrategy: 'header',
        defaultEcl: undefined,
        maxResults: 15
      }
    });
  });

  it('keeps SNOMED CT off and warns for a Snowstorm base URL without a branch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // No MAIN fallback: MAIN holds the International Edition.
      expect(createDemoTerminologyConfig({
        DEV: true,
        VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct'
      })).toEqual({ enableSnomed: false, enableFhirDefaults: false });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('VITE_SNOWSTORM_BRANCH');
      expect(warn.mock.calls[0][0]).toContain('International Edition');

      // Nor does SNOMED CT fall back to the FHIR server.
      warn.mockClear();
      expect(createDemoTerminologyConfig({
        VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir',
        VITE_SNOMED_EDITION: '11000274103',
        VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct'
      })).toEqual({
        serverConfig: { fhirBaseUrl: 'https://fhir.example.test/fhir' },
        enableSnomed: false
      });
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
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
      enableFhirDefaults: false,
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

  it('turns server-backed providers off without an external URL', () => {
    expect(createDemoTerminologyConfig({ DEV: true })).toEqual({
      enableSnomed: false,
      enableFhirDefaults: false
    });
  });

  it('configures a licensed FHIR server and SNOMED CT edition only when both are set', () => {
    expect(createDemoTerminologyConfig({
      VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir'
    })).toEqual({
      serverConfig: { fhirBaseUrl: 'https://fhir.example.test/fhir' },
      enableSnomed: false
    });
    expect(createDemoTerminologyConfig({
      VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir',
      VITE_SNOMED_EDITION: '11000274103',
      VITE_SNOMED_EDITION_VERSION: '20260815'
    })).toEqual({
      serverConfig: { fhirBaseUrl: 'https://fhir.example.test/fhir' },
      snomedConfig: { edition: '11000274103', editionVersion: '20260815' }
    });
    expect(createDemoTerminologyConfig({
      VITE_SNOMED_EDITION: '11000274103'
    })).toEqual({ enableSnomed: false, enableFhirDefaults: false });
  });

  it('rejects an invalid Snowstorm result limit', () => {
    expect(() => createDemoTerminologyConfig({
      DEV: true,
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE',
      VITE_SNOWSTORM_MAX_RESULTS: '0'
    })).toThrow('VITE_SNOWSTORM_MAX_RESULTS must be a positive integer.');
  });
});

describe('demo terminology server description', () => {
  it('reports no server when no server variable is set', () => {
    expect(describeDemoTerminologyServer({ DEV: true })).toBeNull();
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: '   ',
      VITE_SNOMED_EDITION: '11000274103',
      VITE_SNOMED_EDITION_VERSION: '20260815'
    })).toBeNull();
  });

  it('describes a FHIR server without SNOMED CT', () => {
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir'
    })).toEqual({
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de',
      snomed: null
    });
  });

  it('describes SNOMED CT over the FHIR server when an edition is set', () => {
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://tx.fhir.de/fhir',
      VITE_SNOMED_EDITION: '11000274103',
      VITE_SNOMED_EDITION_VERSION: '20260815'
    })).toEqual({
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de',
      snomed: {
        transport: 'fhir',
        edition: '11000274103',
        editionVersion: '20260815',
        host: 'tx.fhir.de'
      }
    });
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'http://localhost:8080/fhir',
      VITE_SNOMED_EDITION: '11000274103'
    }).snomed).toEqual({
      transport: 'fhir',
      edition: '11000274103',
      editionVersion: null,
      host: 'localhost:8080'
    });
  });

  it('describes a Snowstorm server, which takes precedence for SNOMED CT', () => {
    expect(describeDemoTerminologyServer({
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    })).toEqual({
      fhirBaseUrl: null,
      fhirHost: null,
      snomed: {
        transport: 'snowstorm',
        edition: null,
        editionVersion: null,
        host: 'snowstorm.example.test'
      }
    });
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir',
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE',
      VITE_SNOMED_EDITION: '11000274103',
      VITE_SNOWSTORM_MAX_RESULTS: '0'
    })).toEqual({
      fhirBaseUrl: 'https://fhir.example.test/fhir',
      fhirHost: 'fhir.example.test',
      snomed: {
        transport: 'snowstorm',
        edition: null,
        editionVersion: null,
        host: 'snowstorm.example.test'
      }
    });
  });

  it('names no Snowstorm server without a branch, because the demo then contacts none', () => {
    expect(describeDemoTerminologyServer({
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct'
    })).toBeNull();
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir',
      VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
      VITE_SNOMED_EDITION: '11000274103'
    })).toEqual({
      fhirBaseUrl: 'https://fhir.example.test/fhir',
      fhirHost: 'fhir.example.test',
      snomed: null
    });
  });

  it('keeps an invalid URL as the raw string instead of throwing', () => {
    expect(describeDemoTerminologyServer({
      VITE_FHIR_BASE_URL: 'not a url',
      VITE_SNOMED_EDITION: '11000274103'
    })).toEqual({
      fhirBaseUrl: 'not a url',
      fhirHost: 'not a url',
      snomed: {
        transport: 'fhir',
        edition: '11000274103',
        editionVersion: null,
        host: 'not a url'
      }
    });
  });

  it('agrees with the terminology configuration on which servers are used', () => {
    const envs = [
      {},
      { VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir' },
      { VITE_SNOMED_EDITION: '11000274103' },
      { VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir', VITE_SNOMED_EDITION: '11000274103' },
      { VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct' },
      {
        VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct',
        VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
      },
      {
        VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir',
        VITE_SNOMED_EDITION: '11000274103',
        VITE_SNOWSTORM_BASE_URL: 'https://snowstorm.example.test/snomed-ct'
      }
    ];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      for (const env of envs) {
        const config = createDemoTerminologyConfig(env);
        const description = describeDemoTerminologyServer(env);

        expect(description?.fhirBaseUrl ?? undefined).toBe(config.serverConfig?.fhirBaseUrl);
        expect(Boolean(description?.snomed)).toBe(Boolean(config.snomedConfig));
        expect(description === null).toBe(config.enableFhirDefaults === false && config.enableSnomed === false);
      }
    } finally {
      warn.mockRestore();
    }
  });
});

describe('demo opt-in live search configuration', () => {
  const OPT_IN = { VITE_OPT_IN_FHIR_BASE_URL: 'https://tx.fhir.de/fhir' };
  const OPT_IN_SNOMED = {
    ...OPT_IN,
    VITE_OPT_IN_SNOMED_EDITION: '11000274103',
    VITE_OPT_IN_SNOMED_EDITION_VERSION: '20260815'
  };

  it('describes the opt-in server with its host', () => {
    expect(describeDemoOptInServer(OPT_IN)).toEqual({
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de'
    });
    expect(describeDemoOptInServer({ VITE_OPT_IN_FHIR_BASE_URL: '  https://tx.fhir.de/fhir  ' })).toEqual({
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de'
    });
  });

  it('offers no opt-in without the variable, including the empty value of an unset repository variable', () => {
    expect(describeDemoOptInServer({})).toBeNull();
    expect(describeDemoOptInServer({ VITE_OPT_IN_FHIR_BASE_URL: '' })).toBeNull();
    expect(describeDemoOptInServer({ VITE_OPT_IN_FHIR_BASE_URL: '   ' })).toBeNull();
  });

  it('lets a server configured for a local preview take precedence', () => {
    expect(describeDemoOptInServer({
      ...OPT_IN,
      VITE_FHIR_BASE_URL: 'http://localhost:8080/fhir'
    })).toBeNull();
    expect(describeDemoOptInServer({
      ...OPT_IN,
      VITE_SNOWSTORM_BASE_URL: 'http://localhost:8081/snowstorm',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    })).toBeNull();
    expect(describeDemoOptInServer({
      ...OPT_IN,
      VITE_FHIR_BASE_URL: 'http://localhost:8080/fhir',
      VITE_SNOMED_EDITION: '11000274103'
    })).toBeNull();
  });

  it('keeps the opt-in for a Snowstorm URL without a branch, which contacts no server', () => {
    const env = { ...OPT_IN, VITE_SNOWSTORM_BASE_URL: 'http://localhost:8081/snowstorm' };

    expect(describeDemoTerminologyServer(env)).toBeNull();
    expect(describeDemoOptInServer(env)).toEqual({
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de'
    });
  });

  it('keeps the opt-in when only VITE_SNOMED_EDITION is set, which needs VITE_FHIR_BASE_URL to take effect', () => {
    const env = { ...OPT_IN, VITE_SNOMED_EDITION: '11000274103', VITE_SNOMED_EDITION_VERSION: '20260815' };

    expect(describeDemoTerminologyServer(env)).toBeNull();
    expect(describeDemoOptInServer(env)).toEqual({
      fhirBaseUrl: 'https://tx.fhir.de/fhir',
      fhirHost: 'tx.fhir.de'
    });
  });

  it('describes the SNOMED CT edition that can be unlocked, with an optional release', () => {
    expect(describeDemoOptInSnomed(OPT_IN_SNOMED)).toEqual({
      edition: '11000274103',
      editionVersion: '20260815'
    });
    expect(describeDemoOptInSnomed({
      ...OPT_IN,
      VITE_OPT_IN_SNOMED_EDITION: ' 11000274103 ',
      VITE_OPT_IN_SNOMED_EDITION_VERSION: '  '
    })).toEqual({
      edition: '11000274103',
      editionVersion: null
    });
  });

  it('offers no SNOMED CT unlock without an edition or without the opt-in server', () => {
    expect(describeDemoOptInSnomed(OPT_IN)).toBeNull();
    expect(describeDemoOptInSnomed({ ...OPT_IN, VITE_OPT_IN_SNOMED_EDITION: '' })).toBeNull();
    expect(describeDemoOptInSnomed({
      VITE_OPT_IN_SNOMED_EDITION: '11000274103',
      VITE_OPT_IN_SNOMED_EDITION_VERSION: '20260815'
    })).toBeNull();
    expect(describeDemoOptInSnomed({
      ...OPT_IN_SNOMED,
      VITE_FHIR_BASE_URL: 'http://localhost:8080/fhir'
    })).toBeNull();
    expect(describeDemoOptInSnomed({
      ...OPT_IN_SNOMED,
      VITE_SNOWSTORM_BASE_URL: 'http://localhost:8081/snowstorm',
      VITE_SNOWSTORM_BRANCH: 'MAIN/SNOMEDCT-DE'
    })).toBeNull();
  });

  it('offers the SNOMED CT unlock only for the German National Edition the dialog describes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      for (const edition of [ '900000000000207008', '45991000052106', '11000274103x', '011000274103' ]) {
        warn.mockClear();

        expect(describeDemoOptInSnomed({ ...OPT_IN_SNOMED, VITE_OPT_IN_SNOMED_EDITION: edition })).toBeNull();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain(`"${edition}"`);
        expect(warn.mock.calls[0][0]).toContain('German National Edition (11000274103)');
      }

      warn.mockClear();
      expect(describeDemoOptInSnomed(OPT_IN_SNOMED)).toEqual({
        edition: '11000274103',
        editionVersion: '20260815'
      });
      expect(describeDemoOptInSnomed({ ...OPT_IN, VITE_OPT_IN_SNOMED_EDITION: '11000274103' })).toEqual({
        edition: '11000274103',
        editionVersion: null
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn about another edition while no opt-in server is configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      expect(describeDemoOptInSnomed({ VITE_OPT_IN_SNOMED_EDITION: '900000000000207008' })).toBeNull();
      expect(describeDemoOptInSnomed({
        ...OPT_IN,
        VITE_FHIR_BASE_URL: 'http://localhost:8080/fhir',
        VITE_OPT_IN_SNOMED_EDITION: '900000000000207008'
      })).toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('does not let the opt-in variables change the build-time configuration', () => {
    const local = {
      VITE_FHIR_BASE_URL: 'https://fhir.example.test/fhir',
      VITE_SNOMED_EDITION: '11000274103'
    };

    expect(createDemoTerminologyConfig(OPT_IN_SNOMED)).toEqual(createDemoTerminologyConfig({}));
    expect(createDemoTerminologyConfig(OPT_IN_SNOMED)).toEqual({
      enableSnomed: false,
      enableFhirDefaults: false
    });
    expect(describeDemoTerminologyServer(OPT_IN_SNOMED)).toBeNull();
    expect(createDemoTerminologyConfig({ ...local, ...OPT_IN_SNOMED })).toEqual(createDemoTerminologyConfig(local));
    expect(describeDemoTerminologyServer({ ...local, ...OPT_IN_SNOMED })).toEqual(describeDemoTerminologyServer(local));
  });
});
