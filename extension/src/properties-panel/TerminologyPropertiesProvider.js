import { is } from 'bpmn-js/lib/util/ModelUtil.js';
import { AnnotationListEntry } from './entries/AnnotationListEntry.js';
import { ShowAsCommentEntry, SHOW_AS_COMMENT_ENTRY_ID } from './entries/ShowAsCommentEntry.js';
import { resolveTerminologyPropertiesConfig } from './config.js';
import { MEDICAL_TERMINOLOGY_ENTRY_ID } from './error-contract.js';

const LOW_PRIORITY = 500;

export default function TerminologyPropertiesProvider(propertiesPanel, translate, terminologyPropertiesConfig, injector) {
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
  this._translate = translate;
  this._injector = injector;
  this._config = resolveTerminologyPropertiesConfig(terminologyPropertiesConfig);
}

TerminologyPropertiesProvider.$inject = ['propertiesPanel', 'translate', 'terminologyPropertiesConfig', 'injector'];

TerminologyPropertiesProvider.prototype.getGroups = function (element) {
  const translate = this._translate;
  const config = this._config;
  const hasCommentSwitch = Boolean(this._injector?.get('terminologyCommentVisibility', false));

  return function (groups) {
    // The comment switch is global, so it goes into the always-present
    // General group instead of an extra group.
    if (config.showAnnotations && hasCommentSwitch) {
      const general = groups.find((group) => group.id === 'general');
      const commentEntry = { id: SHOW_AS_COMMENT_ENTRY_ID, component: ShowAsCommentEntry };
      if (general) {
        general.entries.push(commentEntry);
      } else {
        groups.push({
          id: 'medical-terminology-diagram',
          label: translate('Medical terminology diagram'),
          entries: [commentEntry]
        });
      }
    }

    const isTargetType = [...config.targetTypes, ...config.includeTypes]
      .some(type => is(element, type));
    const isExcludedType = config.excludeTypes.some(type => is(element, type));

    if (!isTargetType || isExcludedType) return groups;

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
