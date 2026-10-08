import { is } from 'bpmn-js/lib/util/ModelUtil.js';
import { AnnotationListEntry } from './entries/AnnotationListEntry.js';
import { resolveTerminologyPropertiesConfig } from './config.js';
import { MEDICAL_TERMINOLOGY_ENTRY_ID } from './error-contract.js';

const LOW_PRIORITY = 500;

export default function TerminologyPropertiesProvider(propertiesPanel, translate, terminologyPropertiesConfig) {
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
  this._translate = translate;
  this._config = resolveTerminologyPropertiesConfig(terminologyPropertiesConfig);
}

TerminologyPropertiesProvider.$inject = ['propertiesPanel', 'translate', 'terminologyPropertiesConfig'];

TerminologyPropertiesProvider.prototype.getGroups = function (element) {
  const translate = this._translate;
  const config = this._config;

  return function (groups) {
    if (!config.targetTypes.some(type => is(element, type))) return groups;

    const entries = [];

    if (config.showAnnotations) {
      entries.push({
        id: MEDICAL_TERMINOLOGY_ENTRY_ID,
        component: AnnotationListEntry,
        isEdited: () => {
          const ext = element.businessObject.extensionElements;
          return ext?.values?.some(v => v.$type === 'mt:Annotations' && v.values?.length > 0);
        }
      });
    }

    if (!entries.length) {
      return groups;
    }

    groups.push({
      id: 'medical-terminology',
      label: translate('Medical terminology'),
      entries
    });

    return groups;
  };
};
