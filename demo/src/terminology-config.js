function getOptionalEnvValue(env, key) {
  const value = env[key]?.trim();

  return value || undefined;
}

function getLanguageStrategy(env) {
  const languageStrategy = getOptionalEnvValue(env, 'VITE_SNOWSTORM_LANGUAGE_STRATEGY') || 'header';

  if (!['header', 'param'].includes(languageStrategy)) {
    throw new Error('VITE_SNOWSTORM_LANGUAGE_STRATEGY must be "header" or "param".');
  }

  return languageStrategy;
}

function getMaxResults(env) {
  const value = getOptionalEnvValue(env, 'VITE_SNOWSTORM_MAX_RESULTS');

  if (!value) {
    return 15;
  }

  const maxResults = Number(value);

  if (!Number.isSafeInteger(maxResults) || maxResults < 1) {
    throw new Error('VITE_SNOWSTORM_MAX_RESULTS must be a positive integer.');
  }

  return maxResults;
}

function createSnowstormConfig(env, baseUrl) {
  return {
    transport: 'snowstorm',
    baseUrl,
    // No fallback: without a branch the package keeps Snowstorm disabled and
    // warns, because MAIN holds the International Edition.
    branch: getOptionalEnvValue(env, 'VITE_SNOWSTORM_BRANCH'),
    language: getOptionalEnvValue(env, 'VITE_SNOWSTORM_LANGUAGE') || 'de',
    languageStrategy: getLanguageStrategy(env),
    defaultEcl: getOptionalEnvValue(env, 'VITE_SNOWSTORM_DEFAULT_ECL'),
    maxResults: getMaxResults(env)
  };
}

/**
 * Read the server-related Vite variables once, so the terminology
 * configuration and the page's server notice always agree.
 */
function readServerEnv(env) {
  const fhirBaseUrl = getOptionalEnvValue(env, 'VITE_FHIR_BASE_URL');
  const snowstormBaseUrl = getOptionalEnvValue(env, 'VITE_SNOWSTORM_BASE_URL');
  const snowstormBranch = getOptionalEnvValue(env, 'VITE_SNOWSTORM_BRANCH');
  const snomedEdition = getOptionalEnvValue(env, 'VITE_SNOMED_EDITION');
  const snomedEditionVersion = getOptionalEnvValue(env, 'VITE_SNOMED_EDITION_VERSION');
  let snomedTransport = null;

  if (snowstormBaseUrl) {
    // The package keeps Snowstorm disabled without a branch (MAIN holds the
    // International Edition), so the demo then contacts no Snowstorm server
    // and must not name one. A Snowstorm URL still takes precedence over
    // SNOMED CT over FHIR.
    snomedTransport = snowstormBranch ? 'snowstorm' : null;
  } else if (fhirBaseUrl && snomedEdition) {
    snomedTransport = 'fhir';
  }

  return { fhirBaseUrl, snowstormBaseUrl, snomedEdition, snomedEditionVersion, snomedTransport };
}

function getUrlHost(url) {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

/**
 * Build the demo's terminology configuration from Vite environment variables.
 *
 * Without any variable the demo contacts no terminology server and offers only
 * the code systems bundled with the package. The public GitHub Pages build sets
 * none of them; it only offers the consent-based live search of
 * `describeDemoOptInServer`. Set them in `demo/.env.local` only for a server
 * you are licensed to use.
 */
export function createDemoTerminologyConfig(env = import.meta.env) {
  const {
    fhirBaseUrl,
    snowstormBaseUrl,
    snomedEdition,
    snomedEditionVersion,
    snomedTransport
  } = readServerEnv(env);
  const config = {};

  if (fhirBaseUrl) {
    config.serverConfig = { fhirBaseUrl };
  }

  if (snomedTransport === 'snowstorm') {
    config.snomedConfig = createSnowstormConfig(env, snowstormBaseUrl);
  } else if (snomedTransport === 'fhir') {
    config.snomedConfig = {
      edition: snomedEdition,
      ...(snomedEditionVersion ? { editionVersion: snomedEditionVersion } : {})
    };
  } else if (snowstormBaseUrl) {
    console.warn(
      '[demo] SNOMED CT is disabled: VITE_SNOWSTORM_BASE_URL is set without VITE_SNOWSTORM_BRANCH. ' +
      'Set VITE_SNOWSTORM_BRANCH to the branch of the edition covered by your licence, for example ' +
      'MAIN/SNOMEDCT-DE (German National Edition); MAIN holds the International Edition.'
    );
  }

  // Without a licensed server, keep the server-backed providers off
  // explicitly, so the demo neither contacts a server nor warns about it.
  if (!fhirBaseUrl) {
    config.enableFhirDefaults = false;
  }

  if (!config.snomedConfig) {
    config.enableSnomed = false;
  }

  return config;
}

/**
 * Describe which terminology server this build contacts, for the page's
 * banner and licence dialog. Pure and non-throwing: invalid Snowstorm
 * settings are reported by `createDemoTerminologyConfig`, not here.
 *
 * @param {Record<string, string | boolean | undefined>} [env]
 * @returns {null | {
 *   fhirBaseUrl: string | null,
 *   fhirHost: string | null,
 *   snomed: null | {
 *     transport: 'fhir' | 'snowstorm',
 *     edition: string | null,
 *     editionVersion: string | null,
 *     host: string
 *   }
 * }} `null` when the build contacts no terminology server.
 */
export function describeDemoTerminologyServer(env = import.meta.env) {
  const {
    fhirBaseUrl,
    snowstormBaseUrl,
    snomedEdition,
    snomedEditionVersion,
    snomedTransport
  } = readServerEnv(env);

  if (!fhirBaseUrl && !snomedTransport) {
    return null;
  }

  let snomed = null;

  if (snomedTransport === 'snowstorm') {
    snomed = {
      transport: 'snowstorm',
      edition: null,
      editionVersion: null,
      host: getUrlHost(snowstormBaseUrl)
    };
  } else if (snomedTransport === 'fhir') {
    snomed = {
      transport: 'fhir',
      edition: snomedEdition,
      editionVersion: snomedEditionVersion ?? null,
      host: getUrlHost(fhirBaseUrl)
    };
  }

  return {
    fhirBaseUrl: fhirBaseUrl ?? null,
    fhirHost: fhirBaseUrl ? getUrlHost(fhirBaseUrl) : null,
    snomed
  };
}

/**
 * Describe the server for the public demo's optional live search.
 *
 * `VITE_OPT_IN_FHIR_BASE_URL` names a FHIR terminology server that the demo
 * contacts only after the visitor's separate consent (see `live-search.js`).
 * A server configured with `VITE_FHIR_BASE_URL`, or `VITE_SNOWSTORM_BASE_URL`
 * together with `VITE_SNOWSTORM_BRANCH` (local previews), takes precedence:
 * then no opt-in is offered.
 * `VITE_SNOMED_EDITION` takes effect only together with `VITE_FHIR_BASE_URL`,
 * so on its own it does not suppress the opt-in. The live-search consent does
 * not cover SNOMED CT: it can only be unlocked separately, with a licence
 * self-declaration (see `describeDemoOptInSnomed`).
 *
 * @param {Record<string, string | boolean | undefined>} [env]
 * @returns {null | { fhirBaseUrl: string, fhirHost: string }}
 */
export function describeDemoOptInServer(env = import.meta.env) {
  const fhirBaseUrl = getOptionalEnvValue(env, 'VITE_OPT_IN_FHIR_BASE_URL');

  if (!fhirBaseUrl || describeDemoTerminologyServer(env)) {
    return null;
  }

  return { fhirBaseUrl, fhirHost: getUrlHost(fhirBaseUrl) };
}

/**
 * The only SNOMED CT edition the unlock dialog in `demo/index.html` describes:
 * the German National Edition (module `11000274103`), whose licence statements
 * cover use in Germany.
 */
const DEMO_OPT_IN_SNOMED_EDITION = '11000274103';

/**
 * Describe the SNOMED CT edition that licensed visitors may unlock in the
 * public demo's live search with a self-declaration (see `snomed-unlock.js`).
 *
 * Needs `VITE_OPT_IN_SNOMED_EDITION` next to `VITE_OPT_IN_FHIR_BASE_URL`;
 * `VITE_OPT_IN_SNOMED_EDITION_VERSION` (YYYYMMDD) optionally pins a release.
 * Only the German National Edition (`11000274103`) is accepted, because the
 * self-declaration dialog describes that edition and use in Germany alone
 * (fail closed): any other module id offers no unlock and logs a warning.
 * Returns `null` without an opt-in server.
 *
 * @param {Record<string, string | boolean | undefined>} [env]
 * @returns {null | { edition: '11000274103', editionVersion: string | null }}
 */
export function describeDemoOptInSnomed(env = import.meta.env) {
  const edition = getOptionalEnvValue(env, 'VITE_OPT_IN_SNOMED_EDITION');

  if (!edition || !describeDemoOptInServer(env)) {
    return null;
  }

  if (edition !== DEMO_OPT_IN_SNOMED_EDITION) {
    console.warn(
      `[demo] SNOMED CT unlock is not offered: VITE_OPT_IN_SNOMED_EDITION is "${edition}", but the ` +
      `self-declaration in index.html covers only the German National Edition (${DEMO_OPT_IN_SNOMED_EDITION}).`
    );
    return null;
  }

  return {
    edition,
    editionVersion: getOptionalEnvValue(env, 'VITE_OPT_IN_SNOMED_EDITION_VERSION') ?? null
  };
}

/**
 * Create the SNOMED CT provider for an unlocked opt-in edition.
 *
 * @param {{ fhirBaseUrl: string }} server
 * @param {{ edition: string, editionVersion?: string | null }} snomed
 * @param {{ fetchFn?: typeof fetch }} [options]
 */
export async function createDemoOptInSnomedProvider(server, snomed, { fetchFn } = {}) {
  const {
    createDefaultTerminologyConfig
  } = await import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology');
  const config = createDefaultTerminologyConfig({
    serverConfig: { fhirBaseUrl: server.fhirBaseUrl },
    snomedConfig: {
      edition: snomed.edition,
      ...(snomed.editionVersion ? { editionVersion: snomed.editionVersion } : {})
    },
    ...(fetchFn ? { fetchFn } : {}),
    enableFhirDefaults: false,
    enablePackageDefaults: false,
    packageAutoDiscovery: false,
    loaderConfig: false
  });
  const provider = config.providers.find(entry => entry.id === 'snomed-ct');

  if (!provider) {
    throw new Error('The SNOMED CT provider could not be created for the configured edition.');
  }

  return provider;
}

/**
 * Create the FHIR providers (LOINC, ICD-10-GM, OPS, ATC) for the opt-in
 * live search. SNOMED CT is not among them: it is added only by the separate
 * self-declaration unlock (`createDemoOptInSnomedProvider`).
 *
 * @param {{ fhirBaseUrl: string }} server
 * @param {{ fetchFn?: typeof fetch }} [options]
 */
export async function createDemoOptInProviders(server, { fetchFn } = {}) {
  const {
    createDefaultFhirProviderConfigs,
    FhirProvider
  } = await import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology');

  return createDefaultFhirProviderConfigs({ fhirBaseUrl: server.fhirBaseUrl, fetchFn })
    .map(config => new FhirProvider(config));
}

/**
 * @param {Record<string, string | boolean | undefined>} [env]
 * @param {{ fetchFn?: typeof fetch }} [options] - Optional `fetch` wrapper for all server requests.
 */
export async function createDemoTerminologyServices(env = import.meta.env, { fetchFn } = {}) {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology');

  return createDefaultTerminologyServices({
    ...createDemoTerminologyConfig(env),
    ...(fetchFn ? { fetchFn } : {})
  });
}
