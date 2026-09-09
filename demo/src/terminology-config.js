export const DEMO_SNOWSTORM_PROXY_PATH = '/snowstorm-api';

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

export function createDemoTerminologyConfig(env = import.meta.env) {
  const baseUrl = getOptionalEnvValue(env, 'VITE_SNOWSTORM_BASE_URL')
    || (env.DEV && getOptionalEnvValue(env, 'VITE_SNOWSTORM_PROXY_TARGET')
      ? DEMO_SNOWSTORM_PROXY_PATH
      : undefined);

  if (!baseUrl) {
    return {};
  }

  return {
    snomedConfig: {
      transport: 'snowstorm',
      baseUrl,
      branch: getOptionalEnvValue(env, 'VITE_SNOWSTORM_BRANCH') || 'MAIN',
      language: getOptionalEnvValue(env, 'VITE_SNOWSTORM_LANGUAGE') || 'de',
      languageStrategy: getLanguageStrategy(env),
      defaultEcl: getOptionalEnvValue(env, 'VITE_SNOWSTORM_DEFAULT_ECL'),
      maxResults: getMaxResults(env)
    }
  };
}

export async function createDemoTerminologyServices(env = import.meta.env) {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology');

  return createDefaultTerminologyServices(createDemoTerminologyConfig(env));
}
