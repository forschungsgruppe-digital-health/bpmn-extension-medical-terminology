import TerminologyPropertiesProvider from './TerminologyPropertiesProvider.js';
import { resolveTerminologyPropertiesConfig } from './config.js';

/**
 * @typedef {Object} TerminologyPropertiesPanelModuleDefinition - bpmn-js dependency-injection module for the terminology properties group.
 * @property {string[]} __init__ - Services initialized when the modeler starts.
 * @property {[string, Function]} terminologyPropertiesProvider - Provider service registration.
 * @property {[string, object]} terminologyPropertiesConfig - Resolved properties-panel configuration value.
 */

/**
 * Build a properties-panel module with host-provided display options.
 * @param {object} [config] - Terminology properties-panel configuration overrides.
 * @param {boolean} [config.showAnnotations=true] - Show the terminology annotation entry.
 * @param {boolean} [config.showBadges=true] - Show `MT` badges on annotated BPMN elements and generated comments.
 * @param {string[]} [config.targetTypes] - Replace the default annotatable BPMN types.
 * @param {string[]} [config.includeTypes] - Add types to the defaults or `targetTypes` override.
 * @param {string[]} [config.excludeTypes] - Exclude types after defaults, `targetTypes`, and `includeTypes`.
 * @param {number} [config.serverSearchDebounceMs=300] - Milliseconds a search with a provider that
 *   queries a terminology server (`sourceType: 'api'`, such as the FHIR and Snowstorm providers and
 *   providers loaded on demand, or `remoteSearch: true`, such as an offline package with FHIR
 *   fallback) waits after the last keystroke; only the last term is sent. `0` searches on every
 *   keystroke. Local providers always search at once.
 * @param {number} [config.serverSearchMinLength=3] - Minimum number of characters before such a
 *   provider is queried; shorter terms show a hint instead. Local providers search from one character.
 * @example
 * ```js
 * createTerminologyPropertiesPanelModule({
 *   includeTypes: ['bpmn:Participant'],
 *   excludeTypes: ['bpmn:UserTask'],
 *   serverSearchDebounceMs: 300,
 *   serverSearchMinLength: 3
 * });
 * ```
 * @returns {TerminologyPropertiesPanelModuleDefinition}
 */
export function createTerminologyPropertiesPanelModule(config = {}) {
  return {
    __init__: ['terminologyPropertiesProvider'],
    terminologyPropertiesProvider: ['type', TerminologyPropertiesProvider],
    terminologyPropertiesConfig: ['value', resolveTerminologyPropertiesConfig(config)]
  };
}

/**
 * Default bpmn-js properties-panel module for medical terminology annotations.
 *
 * @type {TerminologyPropertiesPanelModuleDefinition}
 * @category Properties panel
 */
const TerminologyPropertiesPanelModule = createTerminologyPropertiesPanelModule();

export default TerminologyPropertiesPanelModule;
