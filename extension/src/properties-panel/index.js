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
 * @returns {TerminologyPropertiesPanelModuleDefinition}
 */
export function createTerminologyPropertiesPanelModule(config = {}) {
  return {
    __init__: ['terminologyPropertiesProvider'],
    terminologyPropertiesProvider: ['type', TerminologyPropertiesProvider],
    terminologyPropertiesConfig: ['value', resolveTerminologyPropertiesConfig(config)]
  };
}

/** @type {TerminologyPropertiesPanelModuleDefinition} */
const TerminologyPropertiesPanelModule = createTerminologyPropertiesPanelModule();

export default TerminologyPropertiesPanelModule;
