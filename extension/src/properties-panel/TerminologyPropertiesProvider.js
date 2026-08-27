import { is } from 'bpmn-js/lib/util/ModelUtil';
import { AnnotationListEntry } from './entries/AnnotationListEntry.js';
import { resolveTerminologyPropertiesConfig } from './config.js';

const LOW_PRIORITY = 500;

const TARGET_TYPES = [
  'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:SendTask',
  'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask', 'bpmn:SubProcess',
  'bpmn:ExclusiveGateway',
  'bpmn:DataObjectReference', 'bpmn:DataStoreReference',
  'bpmn:IntermediateThrowEvent', 'bpmn:IntermediateCatchEvent',
  'bpmn:StartEvent', 'bpmn:EndEvent'
];

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
    if (!TARGET_TYPES.some(type => is(element, type))) return groups;

    const entries = [];

    if (config.showAnnotations) {
      entries.push({
        id: 'clinical-annotations',
        component: AnnotationListEntry,
        isEdited: () => {
          const ext = element.businessObject.extensionElements;
          return ext?.values?.some(v => v.$type === 'term:Annotations' && v.values?.length > 0);
        }
      });
    }

    if (!entries.length) {
      return groups;
    }

    groups.push({
      id: 'clinical-terminology',
      label: translate('Clinical annotations'),
      entries
    });

    return groups;
  };
};
