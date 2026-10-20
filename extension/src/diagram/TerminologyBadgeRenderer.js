import { getAnnotations } from '../services/AnnotationHelper.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BADGE_HEIGHT = 20;
const BADGE_MIN_WIDTH = 36;
const BADGE_CHAR_WIDTH = 7;
const BADGE_PADDING = 14;
const BADGE_OFFSET = 6;
// Above bpmn-js' own renderer (1000), so the badge is added to whatever the
// other renderers draw without replacing them.
const BADGE_RENDER_PRIORITY = 2000;

/**
 * Format the badge text for an annotation count.
 *
 * @param {number} count
 * @returns {string} `MT+<count>`
 */
export function formatBadgeText(count) {
  return `MT+${count}`;
}

/**
 * Draws a small `MT+n` badge on every shape that carries terminology
 * annotations.
 *
 * The badge is real SVG inside the shape's graphics, so it is part of the SVG
 * export. It does not replace any renderer: it re-fires `render.shape` to let
 * the other renderers draw the shape first and appends the badge afterwards.
 *
 * @param {import('diagram-js/lib/core/EventBus').default} eventBus
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
    getAnnotations(element.businessObject).length
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

  const count = getAnnotations(element.businessObject).length;
  gfx.appendChild(this._createBadge(element, count));

  return shape;
};

TerminologyBadgeRenderer.prototype._createBadge = function(element, count) {
  const text = formatBadgeText(count);
  const width = Math.max(BADGE_MIN_WIDTH, text.length * BADGE_CHAR_WIDTH + BADGE_PADDING);
  const label = this._translate('{count} terminology annotation(s)', { count });

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'mt-badge');
  group.setAttribute('role', 'img');
  group.setAttribute('aria-label', label);
  group.setAttribute('transform',
    `translate(${element.width - width + BADGE_OFFSET}, ${-BADGE_HEIGHT + BADGE_OFFSET - 2})`);
  group.setAttribute('pointer-events', 'none');

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = label;

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('width', width);
  rect.setAttribute('height', BADGE_HEIGHT);
  rect.setAttribute('rx', BADGE_HEIGHT / 2);
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('stroke', '#333333');
  rect.setAttribute('stroke-width', 1.5);

  const textNode = document.createElementNS(SVG_NS, 'text');
  textNode.setAttribute('x', width / 2);
  textNode.setAttribute('y', BADGE_HEIGHT / 2 + 4);
  textNode.setAttribute('text-anchor', 'middle');
  textNode.setAttribute('font-family', 'Arial, sans-serif');
  textNode.setAttribute('font-size', 11);
  textNode.setAttribute('font-weight', 'bold');
  textNode.setAttribute('fill', '#222222');
  textNode.textContent = text;

  group.append(title, rect, textNode);
  return group;
};
