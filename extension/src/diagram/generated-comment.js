import { getSystemShortName } from '../services/SystemLabel.js';

export const GENERATED_COMMENT_TYPE = 'mt:GeneratedComment';

const MAX_COMMENT_WIDTH = 350;
const MIN_COMMENT_WIDTH = 100;
const MAX_VISIBLE_LINES = 5;
const RENDERER_PADDING_DIFFERENCE = 4;
const TEXT_ANNOTATION_PADDING = 7;
const INDENT_WIDTH = 16;
const TEXT_ANNOTATION_INDENT = '\u00a0\u00a0';

export function isGeneratedComment(businessObject) {
  return businessObject?.$type === 'bpmn:TextAnnotation'
    && businessObject.extensionElements?.values?.some(value => value.$type === GENERATED_COMMENT_TYPE);
}

export function getGeneratedCommentText(annotations, registry, translate, textRenderer) {
  const sourceLines = [
    ...annotations.flatMap(annotation =>
      annotation.text ? annotation.text.split('\n') : []
    ),
    ...annotations.flatMap(annotation =>
      (annotation.codings || []).map(coding =>
        `${coding.system ? `${getSystemShortName(coding.system, registry)}: ` : ''}${coding.code || ''}${coding.display ? ` – ${coding.display}` : ''}`
      )
    )
  ];

  if (!sourceLines.length) {
    return '';
  }

  const lines = sourceLines.flatMap(line => wrapLine(line, textRenderer));
  const maxHeight = getMaximumCommentHeight(textRenderer);
  if (fitsComment(lines, textRenderer, maxHeight)) {
    return formatLines(lines);
  }

  let low = 0;
  let high = lines.length - 1;
  let visibleLineCount = -1;

  while (low <= high) {
    const candidateCount = Math.floor((low + high) / 2);
    const hiddenCount = lines.length - candidateCount;
    const candidate = [
      ...lines.slice(0, candidateCount),
      translate('… +{count} more', { count: hiddenCount })
    ];

    if (fitsComment(candidate, textRenderer, maxHeight)) {
      visibleLineCount = candidateCount;
      low = candidateCount + 1;
    } else {
      high = candidateCount - 1;
    }
  }

  if (visibleLineCount > 0) {
    const hiddenCount = lines.length - visibleLineCount;
    return formatLines([
      ...lines.slice(0, visibleLineCount),
      translate('… +{count} more', { count: hiddenCount })
    ]);
  }

  const hiddenCount = lines.length;
  const partialLine = getPartialLine(lines[0], hiddenCount, translate, textRenderer, maxHeight);
  if (partialLine) {
    return formatLines([
      `${partialLine}…`,
      translate('+{count} more', { count: hiddenCount })
    ]);
  }

  return formatLines([
    translate('… +{count} more', { count: hiddenCount })
  ]);
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

function getMaximumCommentHeight(textRenderer) {
  const line = `${TEXT_ANNOTATION_INDENT}x`;
  const sample = Array(MAX_VISIBLE_LINES).fill(line).join('\n');

  return getTextAnnotationBounds(sample, textRenderer, MAX_COMMENT_WIDTH).height;
}

function fitsComment(lines, textRenderer, maxHeight) {
  const text = formatLines(lines);
  return getTextAnnotationBounds(text, textRenderer, MAX_COMMENT_WIDTH).height <= maxHeight;
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

function getPartialLine(line, hiddenCount, translate, textRenderer, maxHeight) {
  const characters = Array.from(line);
  let low = 1;
  let high = characters.length;
  let fittingLength = 0;

  while (low <= high) {
    const candidateLength = Math.floor((low + high) / 2);
    const candidate = characters.slice(0, candidateLength).join('').trimEnd();
    const text = formatLines([
      `${candidate}…`,
      translate('+{count} more', { count: hiddenCount })
    ]);

    if (candidate && getTextAnnotationBounds(text, textRenderer, MAX_COMMENT_WIDTH).height <= maxHeight) {
      fittingLength = candidateLength;
      low = candidateLength + 1;
    } else {
      high = candidateLength - 1;
    }
  }

  if (!fittingLength) {
    return '';
  }

  const prefix = characters.slice(0, fittingLength).join('').trimEnd();
  const wordBoundary = Math.max(prefix.lastIndexOf(' '), prefix.lastIndexOf('\u00a0'));
  return wordBoundary > 0 ? prefix.slice(0, wordBoundary).trimEnd() : prefix;
}
