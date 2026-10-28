import { getAnnotations } from '../services/AnnotationHelper.js';
import { is } from 'bpmn-js/lib/util/ModelUtil.js';
import { isGeneratedComment } from './generated-comment.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BADGE_RADIUS = 12;
const BADGE_TEXT = 'MT';
// Above bpmn-js' own renderer (1000), so the badge is added to whatever the
// other renderers draw without replacing them.
const BADGE_RENDER_PRIORITY = 2000;

/**
 * Draws a small round `MT` badge on every shape that carries terminology
 * annotations.
 *
 * The badge is real SVG inside the shape's graphics, so it is part of the SVG
 * export. It does not replace any renderer: it re-fires `render.shape` to let
 * the other renderers draw the shape first and appends the badge afterwards.
 *
 * @param {import('diagram-js/lib/core/EventBus.js').default} eventBus
 * @param {Function} translate - Host `translate(template, replacements)` service.
 */
export default function TerminologyBadgeRenderer(eventBus, translate) {
  this._eventBus = eventBus;
  this._translate = translate;
  this._drawing = false;

  eventBus.on('render.shape', BADGE_RENDER_PRIORITY, (event, context) => {
    if (this._drawing || !this.canRender(context.element)) {
      return undefined;
    }

    return this.drawShape(context.gfx, context.element, context.attrs);
  });
}

TerminologyBadgeRenderer.$inject = [ 'eventBus', 'translate' ];

TerminologyBadgeRenderer.prototype.canRender = function(element) {
  return Boolean(
    element &&
    !element.labelTarget &&
    !element.waypoints &&
    element.width &&
    (getAnnotations(element.businessObject).length || isGeneratedComment(element.businessObject))
  );
};

TerminologyBadgeRenderer.prototype.drawShape = function(gfx, element, attrs) {
  this._drawing = true;
  let shape;
  try {
    shape = this._eventBus.fire('render.shape', { gfx, element, attrs });
  } finally {
    this._drawing = false;
  }

  if (isGeneratedComment(element.businessObject)) {
    const target = getCommentTarget(element);
    const annotations = target ? getAnnotations(target.businessObject) : [];
    if (annotations.length) {
      gfx.appendChild(this._createBadge(element, annotations.length));
    }
  } else {
    const annotations = getAnnotations(element.businessObject);
    gfx.appendChild(this._createBadge(element, annotations.length));
  }

  return shape;
};

TerminologyBadgeRenderer.prototype._createBadge = function(element, count) {
  const label = this._translate('{count} terminology annotation(s)', { count });

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'mt-badge');
  group.setAttribute('role', 'img');
  group.setAttribute('aria-label', label);
  const position = isGeneratedComment(element.businessObject)
    ? 'translate(0, 0)'
    : `translate(${element.width}, 0)`;
  // Anchor comment badges to the TextAnnotation marker; other badges stay at
  // the top-right corner. Events still reach the shape underneath.
  group.setAttribute('transform', position);

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = label;

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('r', BADGE_RADIUS);
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', '#333333');
  circle.setAttribute('stroke-width', 1.5);

  const textNode = document.createElementNS(SVG_NS, 'text');
  textNode.setAttribute('y', 4);
  textNode.setAttribute('text-anchor', 'middle');
  textNode.setAttribute('font-family', 'Arial, sans-serif');
  textNode.setAttribute('font-size', 11);
  textNode.setAttribute('font-weight', 'bold');
  textNode.setAttribute('fill', '#222222');
  textNode.textContent = BADGE_TEXT;

  group.append(title, circle, textNode);
  return group;
};

function getCommentTarget(annotation) {
  const association = [ ...(annotation.incoming || []), ...(annotation.outgoing || []) ]
    .find(connection => is(connection, 'bpmn:Association'));

  if (!association) {
    return undefined;
  }

  return association.source === annotation ? association.target : association.source;
}
