/**
 * Global, in-memory switch for the annotation comment blocks on the diagram.
 *
 * It is view state only: nothing is written to the BPMN XML, and it is not part
 * of undo/redo or import/export of the model.
 *
 * @param {import('diagram-js/lib/core/EventBus').default} eventBus
 * @param {import('diagram-js/lib/core/ElementRegistry').default} elementRegistry
 * @param {import('diagram-js/lib/core/GraphicsFactory').default} graphicsFactory
 */
export default function TerminologyCommentVisibility(eventBus, elementRegistry, graphicsFactory) {
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._graphicsFactory = graphicsFactory;
  this._visible = false;
}

TerminologyCommentVisibility.$inject = [ 'eventBus', 'elementRegistry', 'graphicsFactory' ];

TerminologyCommentVisibility.prototype.isVisible = function() {
  return this._visible;
};

/**
 * Show or hide the comment blocks and redraw all shapes that carry badges.
 *
 * @param {boolean} visible
 */
TerminologyCommentVisibility.prototype.setVisible = function(visible) {
  const next = Boolean(visible);
  if (next === this._visible) {
    return;
  }

  this._visible = next;

  this._elementRegistry.forEach((element, gfx) => {
    if (element.waypoints || element.labelTarget || !element.width) {
      return;
    }
    // Only shapes with a badge can change; redrawing the rest is harmless.
    if (gfx.querySelector('.mt-badge')) {
      this._graphicsFactory.update('shape', element, gfx);
    }
  });

  this._eventBus.fire('terminology.comments.changed', { visible: next });
};
