import TerminologyPropertiesProvider from './TerminologyPropertiesProvider.js';
import { resolveTerminologyPropertiesConfig } from './config.js';

export function createTerminologyPropertiesPanelModule(config = {}) {
  return {
    __init__: ['terminologyPropertiesProvider'],
    terminologyPropertiesProvider: ['type', TerminologyPropertiesProvider],
    terminologyPropertiesConfig: ['value', resolveTerminologyPropertiesConfig(config)]
  };
}

export default createTerminologyPropertiesPanelModule();
