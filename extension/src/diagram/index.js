import TerminologyBadgeRenderer from './TerminologyBadgeRenderer.js';
import TerminologyCommentVisibility from './TerminologyCommentVisibility.js';

/**
 * @typedef {Object} TerminologyBadgeModuleDefinition - bpmn-js dependency-injection module for the annotation badge.
 * @property {string[]} __init__ - Services initialized when the modeler starts.
 * @property {[string, Function]} terminologyBadgeRenderer - Badge renderer registration.
 * @property {[string, Function]} terminologyCommentVisibility - Global comment-block switch.
 */

/**
 * bpmn-js module that draws an `MT+n` badge on annotated shapes. Opt-in:
 * add it to `additionalModules` next to the properties-panel module.
 *
 * @type {TerminologyBadgeModuleDefinition}
 */
const TerminologyBadgeModule = {
  __init__: [ 'terminologyBadgeRenderer' ],
  terminologyBadgeRenderer: [ 'type', TerminologyBadgeRenderer ],
  terminologyCommentVisibility: [ 'type', TerminologyCommentVisibility ]
};

export default TerminologyBadgeModule;
