import TerminologyBadgeRenderer from './TerminologyBadgeRenderer.js';
import TerminologyCommentVisibility from './TerminologyCommentVisibility.js';

/**
 * @typedef {Object} TerminologyBadgeModuleDefinition - bpmn-js module for terminology badges and generated comments.
 * @property {string[]} __init__ - Services initialized when the modeler starts.
 * @property {[string, Function]} terminologyBadgeRenderer - Badge renderer registration.
 * @property {[string, Function]} terminologyCommentVisibility - Global generated-comment manager.
 */

/**
 * bpmn-js module that draws round `MT` badges and manages generated BPMN
 * TextAnnotations. Add it to `additionalModules` to enable diagram comments.
 *
 * @type {TerminologyBadgeModuleDefinition}
 */
const TerminologyBadgeModule = {
  __init__: [ 'terminologyBadgeRenderer' ],
  terminologyBadgeRenderer: [ 'type', TerminologyBadgeRenderer ],
  terminologyCommentVisibility: [ 'type', TerminologyCommentVisibility ]
};

export default TerminologyBadgeModule;
