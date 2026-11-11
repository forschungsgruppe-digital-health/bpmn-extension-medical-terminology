import { getSystemShortName } from '../services/SystemLabel.js';

export const GENERATED_COMMENT_TYPE = 'mt:GeneratedComment';

const MAX_COMMENT_WIDTH = 350;
const MIN_COMMENT_WIDTH = 100;
const RENDERER_PADDING_DIFFERENCE = 4;
const TEXT_ANNOTATION_PADDING = 7;
const INDENT_WIDTH = 16;
const TEXT_ANNOTATION_INDENT = '\u00a0\u00a0';

export function isGeneratedComment(businessObject) {
  return businessObject?.$type === 'bpmn:TextAnnotation'
    && businessObject.extensionElements?.values?.some(value => value.$type === GENERATED_COMMENT_TYPE);
}

export function getGeneratedCommentText(annotations, registry, textRenderer) {
  const sourceLines = annotations.flatMap(annotation => [
    ...(annotation.text ? annotation.text.split('\n') : []),
    ...(annotation.codings || []).map(coding =>
      `${coding.system ? `${getSystemShortName(coding.system, registry)}: ` : ''}${coding.code || ''}${coding.display ? ` – ${coding.display}` : ''}`
    )
  ]);

  if (!sourceLines.length) {
    return '';
  }

  const lines = sourceLines.flatMap(line => wrapLine(line, textRenderer));
  return formatLines(lines);
}

export function getGeneratedCommentDimensions(text, textRenderer) {
  const maxWidthBounds = getTextAnnotationBounds(text, textRenderer, MAX_COMMENT_WIDTH);
  let low = MIN_COMMENT_WIDTH;
  let high = MAX_COMMENT_WIDTH;

  while (low < high) {
    const candidateWidth = Math.floor((low + high) / 2);
    const candidateBounds = getTextAnnotationBounds(text, textRenderer, candidateWidth);

    if (candidateBounds.height <= maxWidthBounds.height) {
      high = candidateWidth;
    } else {
      low = candidateWidth + 1;
    }
  }

  return {
    width: low,
    height: maxWidthBounds.height
  };
}

function formatLines(lines) {
  return lines.map(line => `${TEXT_ANNOTATION_INDENT}${line}`).join('\n');
}

function wrapLine(line, textRenderer) {
  const rendered = textRenderer.createText(line, {
    box: {
      width: MAX_COMMENT_WIDTH - (2 * TEXT_ANNOTATION_PADDING) - INDENT_WIDTH,
      height: 30
    },
    style: textRenderer.getDefaultStyle(),
    align: 'left-top',
    padding: 0
  });

  return [ ...rendered.querySelectorAll('tspan') ].map(tspan => tspan.textContent);
}

function getTextAnnotationBounds(text, textRenderer, width) {
  return textRenderer.getTextAnnotationBounds(
    // TextAnnotations render with 7px padding; the bounds helper uses 5px.
    { x: 0, y: 0, width: width - RENDERER_PADDING_DIFFERENCE, height: 30 },
    text
  );
}
