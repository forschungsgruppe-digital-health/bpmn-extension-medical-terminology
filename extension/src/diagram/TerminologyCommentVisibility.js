import { getAnnotations } from '../services/AnnotationHelper.js';
import {
  getGeneratedCommentAssociationWaypoints,
  placeGeneratedComment
} from './comment-placement.js';
import {
  GENERATED_COMMENT_TYPE,
  getGeneratedCommentDimensions,
  getGeneratedCommentText,
  isGeneratedComment
} from './generated-comment.js';

/**
 * Global switch for BPMN TextAnnotations generated from terminology data.
 *
 * @param {import('diagram-js/lib/core/EventBus.js').default} eventBus
 * @param {import('diagram-js/lib/core/ElementRegistry.js').default} elementRegistry
 * @param {import('diagram-js/lib/core/GraphicsFactory.js').default} graphicsFactory
 * @param {import('didi').Injector} injector
 */
export default function TerminologyCommentVisibility(eventBus, elementRegistry, graphicsFactory, injector) {
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._graphicsFactory = graphicsFactory;
  this._terminologyRegistry = injector.get('terminologyRegistry', false);
  this._translate = injector.get('translate');
  this._modeling = injector.get('modeling', false);
  this._elementFactory = injector.get('elementFactory', false);
  this._bpmnFactory = injector.get('bpmnFactory', false);
  this._moddle = injector.get('moddle');
  this._canvas = injector.get('canvas');
  this._spaceTool = injector.get('spaceTool', false);
  this._textRenderer = injector.get('textRenderer');
  this._visible = false;
  this._syncing = false;

  eventBus.on('import.done', () => {
    this._visible = this._getGeneratedComments().length > 0;
    this._refreshGeneratedComments();
    eventBus.fire('terminology.comments.changed', { visible: this._visible });
  });

  eventBus.on('element.changed', ({ element }) => {
    this._syncGeneratedCommentFor(element);
  });
}

TerminologyCommentVisibility.$inject = [
  'eventBus',
  'elementRegistry',
  'graphicsFactory',
  'injector'
];

TerminologyCommentVisibility.prototype.isVisible = function() {
  return this._visible;
};

/**
 * Regenerate generated BPMN TextAnnotations from the current terminology data,
 * or remove them when the switch is turned off.
 *
 * @param {boolean} visible
 */
TerminologyCommentVisibility.prototype.setVisible = function(visible) {
  const next = Boolean(visible);
  if (next === this._visible) {
    return;
  }
  this._assertModelingServices();

  this._syncing = true;
  try {
    this._removeGeneratedComments();

    if (next) {
      this._createGeneratedComments();
    }
    this._visible = next;
  } finally {
    this._syncing = false;
  }

  this._eventBus.fire('terminology.comments.changed', { visible: next });
};

TerminologyCommentVisibility.prototype._getGeneratedComments = function() {
  return this._elementRegistry.getAll().filter(element =>
    isGeneratedComment(element.businessObject)
  );
};

TerminologyCommentVisibility.prototype._removeGeneratedComments = function() {
  const comments = this._getGeneratedComments();
  if (comments.length) {
    this._modeling.removeElements(comments);
  }
};

TerminologyCommentVisibility.prototype._createGeneratedComments = function() {
  const targets = this._elementRegistry.getAll().filter(element =>
    !element.labelTarget
      && !element.waypoints
      && element.width
      && getAnnotations(element.businessObject).length
  );

  for (const target of targets) {
    this._createGeneratedComment(target);
  }
};

TerminologyCommentVisibility.prototype._createGeneratedComment = function(target) {
  const annotations = getAnnotations(target.businessObject);
  const text = getGeneratedCommentText(
    annotations,
    this._terminologyRegistry,
    this._translate,
    this._textRenderer
  );
  const dimensions = getGeneratedCommentDimensions(text, this._textRenderer);
  const businessObject = this._bpmnFactory.create('bpmn:TextAnnotation', {
    text,
    textFormat: 'text/plain'
  });
  const generatedMarker = this._moddle.create(GENERATED_COMMENT_TYPE);
  const extensionElements = this._moddle.create('bpmn:ExtensionElements', {
    values: [ generatedMarker ]
  });
  generatedMarker.$parent = extensionElements;
  extensionElements.$parent = businessObject;
  businessObject.extensionElements = extensionElements;

  const shape = this._elementFactory.createShape({
    type: 'bpmn:TextAnnotation',
    businessObject,
    ...dimensions
  });
  const position = this._placeComment(target, shape);

  const comment = this._modeling.appendShape(target, shape, position, target.parent, {
    connection: { type: 'bpmn:Association' }
  });
  const association = [ ...comment.incoming, ...comment.outgoing ]
    .find(connection => connection.businessObject.$type === 'bpmn:Association');
  if (!association) {
    throw new Error('Failed to create the association for a generated terminology comment.');
  }

  const waypoints = getGeneratedCommentAssociationWaypoints(target, comment);
  this._modeling.updateWaypoints(
    association,
    association.source === comment ? [ ...waypoints ].reverse() : waypoints
  );
};

TerminologyCommentVisibility.prototype._placeComment = function(target, shape) {
  return placeGeneratedComment(
    target,
    shape,
    this._elementRegistry,
    this._canvas,
    this._spaceTool,
    this._modeling
  );
};

TerminologyCommentVisibility.prototype._assertModelingServices = function() {
  if (!this._modeling || !this._elementFactory || !this._bpmnFactory) {
    throw new Error('Terminology comment toggling requires a bpmn-js modeler.');
  }
};

TerminologyCommentVisibility.prototype._syncGeneratedCommentFor = function(element) {
  if (this._syncing || !this._visible || !element || element.businessObject?.$type === 'bpmn:TextAnnotation') {
    return;
  }

  const associations = [ ...(element.incoming || []), ...(element.outgoing || []) ];
  const generatedComments = associations.flatMap(connection => {
    const comment = connection.source === element ? connection.target : connection.source;
    return isGeneratedComment(comment?.businessObject) ? [ comment ] : [];
  });

  const annotations = getAnnotations(element.businessObject);
  const hasAnnotations = annotations.length > 0;
  const expectedText = hasAnnotations
    ? getGeneratedCommentText(
      annotations,
      this._terminologyRegistry,
      this._translate,
      this._textRenderer
    )
    : '';
  if (generatedComments.length === 1 && generatedComments[0].businessObject.text === expectedText) {
    return;
  }
  if (!hasAnnotations && !generatedComments.length) {
    return;
  }

  this._syncing = true;
  try {
    if (generatedComments.length) {
      this._modeling.removeElements(generatedComments);
    }

    if (hasAnnotations) {
      this._createGeneratedComment(element);
    }
  } finally {
    this._syncing = false;
  }
};

TerminologyCommentVisibility.prototype._refreshGeneratedComments = function() {
  this._getGeneratedComments().forEach(comment => {
    const gfx = this._elementRegistry.getGraphics(comment);
    if (gfx) {
      this._graphicsFactory.update('shape', comment, gfx);
    }
  });
};
