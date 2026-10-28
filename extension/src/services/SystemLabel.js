/**
 * Short, human-readable name of a code system.
 *
 * Uses the display name of the registered provider and falls back to the last
 * segment of the system URI when no provider is registered.
 *
 * @param {string} [uri] - Code system URI.
 * @param {{ listProviders(): Array<{ systemUri?: string, displayName?: string }> }} [registry]
 * @returns {string}
 */
export function getSystemShortName(uri, registry) {
  if (!uri) return '';
  const provider = registry?.listProviders().find((p) => p.systemUri === uri);
  if (provider?.displayName) return provider.displayName;
  return uri.split('/').pop();
}
