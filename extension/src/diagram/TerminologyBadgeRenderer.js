import { getAnnotations } from '../services/AnnotationHelper.js';
import { getSystemShortName } from '../services/SystemLabel.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BADGE_HEIGHT = 20;
const BADGE_MIN_WIDTH = 36;
const BADGE_CHAR_WIDTH = 7;
const BADGE_PADDING = 14;
const BADGE_OFFSET = 6;
// Above bpmn-js' own renderer (1000), so the badge is added to whatever the
// other renderers draw without replacing them.
const BADGE_RENDER_PRIORITY = 2000;

const COMMENT_MAX_LINES = 6;
const COMMENT_MAX_CHARS = 60;
const COMMENT_LINE_HEIGHT = 14;
const COMMENT_CHAR_WIDTH = 5.6;
const COMMENT_PADDING = 6;
const COMMENT_GAP = 8;

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
 * @param {import('./TerminologyCommentVisibility.js').default} commentVisibility
 * @param {import('didi').Injector} injector - Resolves the optional terminology registry.
 */
export default function TerminologyBadgeRenderer(eventBus, translate, commentVisibility, injector) {
  this._injector = injector;
  this._eventBus = eventBus;
  this._translate = translate;
  this._commentVisibility = commentVisibility;
  this._drawing = false;

  eventBus.on('render.shape', BADGE_RENDER_PRIORITY, (event, context) => {
    if (this._drawing || !this.canRender(context.element)) {
      return undefined;
    }

    return this.drawShape(context.gfx, context.element, context.attrs);
  });
}

TerminologyBadgeRenderer.$inject = [ 'eventBus', 'translate', 'terminologyCommentVisibility', 'injector' ];

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

  const annotations = getAnnotations(element.businessObject);
  gfx.appendChild(this._createBadge(element, annotations.length));

  if (this._commentVisibility.isVisible()) {
    const comment = this._createComment(element, annotations);
    gfx.appendChild(comment);
    comment.fitToText();
  }

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

function truncate(text) {
  return text.length > COMMENT_MAX_CHARS ? `${text.slice(0, COMMENT_MAX_CHARS - 1)}…` : text;
}

/**
 * One line per coding of every annotation: `system name: code – display`.
 *
 * @param {object[]} annotations
 * @param {object} [registry] - Terminology registry used to resolve system names.
 * @returns {{ lines: string[], details: string[] }} Visible lines and the full
 *   list for the tooltip.
 */
export function getCommentLines(annotations, registry) {
  const codings = annotations.flatMap((annotation) => annotation.codings || []);
  const lines = codings.map((coding) =>
    `${coding.system ? `${getSystemShortName(coding.system, registry)}: ` : ''}${coding.code}${coding.display ? ` – ${coding.display}` : ''}`);
  const details = codings.map((coding) =>
    `${coding.system || ''}|${coding.code}${coding.display ? ` – ${coding.display}` : ''}`);
  return { lines, details };
}

TerminologyBadgeRenderer.prototype._createComment = function(element, annotations) {
  const { lines, details } = getCommentLines(annotations, this._injector.get('terminologyRegistry', false));
  const hidden = Math.max(0, lines.length - COMMENT_MAX_LINES);
  const visible = lines.slice(0, COMMENT_MAX_LINES).map(truncate);
  if (hidden) {
    visible.push(this._translate('+{count} more', { count: hidden }));
  }

  const estimatedWidth = Math.max(...visible.map((line) => line.length), 1) * COMMENT_CHAR_WIDTH
    + COMMENT_PADDING * 2;
  const height = visible.length * COMMENT_LINE_HEIGHT + COMMENT_PADDING * 2;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'mt-comment');
  group.setAttribute('transform', `translate(0, ${element.height + COMMENT_GAP})`);
  group.setAttribute('pointer-events', 'none');

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = details.join('\n');

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('width', estimatedWidth);
  rect.setAttribute('height', height);
  rect.setAttribute('rx', 4);
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('stroke', '#333333');
  rect.setAttribute('stroke-width', 1);

  group.append(title, rect);

  visible.forEach((line, index) => {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', COMMENT_PADDING);
    text.setAttribute('y', COMMENT_PADDING + COMMENT_LINE_HEIGHT * (index + 1) - 3);
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', 11);
    text.setAttribute('fill', '#222222');
    text.textContent = line;
    group.appendChild(text);
  });

  // Fit the box to the rendered text when the browser can measure it.
  group.fitToText = () => {
    const measured = Math.max(0, ...[ ...group.querySelectorAll('text') ]
      .map((node) => node.getBBox?.().width || 0));
    if (measured > 0) {
      rect.setAttribute('width', Math.ceil(measured) + COMMENT_PADDING * 2);
    }
  };

  return group;
};
