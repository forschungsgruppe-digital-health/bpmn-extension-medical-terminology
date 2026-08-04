import { ref, inject, onMounted, onBeforeUnmount } from 'vue';

/**
 * Vue composable for accessing the terminology registry.
 *
 * Usage:
 *   const { availableSystems, search, searchResults, isSearching } = useTerminology();
 *
 * Requires a TerminologyRegistry to be provided via Vue's provide/inject:
 *   app.provide('terminologyRegistry', registry);
 */
export function useTerminology() {
  const registry = inject('terminologyRegistry', null);
  const availableSystems = ref([]);
  const searchResults = ref([]);
  const isSearching = ref(false);
  const error = ref(null);

  function refreshAvailableSystems() {
    availableSystems.value = registry
      ? registry.listProviders().filter(provider => provider.capabilities?.search !== false)
      : [];
  }

  onMounted(() => {
    refreshAvailableSystems();

    if (!registry || typeof registry.on !== 'function' || typeof registry.off !== 'function') {
      return;
    }

    registry.on('provider:registered', refreshAvailableSystems);
    registry.on('provider:unregistered', refreshAvailableSystems);
  });

  onBeforeUnmount(() => {
    if (!registry || typeof registry.off !== 'function') {
      return;
    }

    registry.off('provider:registered', refreshAvailableSystems);
    registry.off('provider:unregistered', refreshAvailableSystems);
  });

  async function search(term, systemId, options) {
    if (!registry) return;
    isSearching.value = true;
    error.value = null;
    try {
      const result = await registry.search(term, systemId, options);
      searchResults.value = result.concepts;
    } catch (err) {
      error.value = err.message;
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }

  async function searchAll(term, options) {
    if (!registry) return new Map();
    isSearching.value = true;
    const results = await registry.searchAll(term, options);
    isSearching.value = false;
    return results;
  }

  async function lookup(code, systemId) {
    if (!registry) return null;
    return registry.lookup(code, systemId);
  }

  return { availableSystems, searchResults, isSearching, error, search, searchAll, lookup, registry };
}
