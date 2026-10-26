import { getSystemShortName } from '../services/SystemLabel.js';

export const GENERATED_COMMENT_TYPE = 'mt:GeneratedComment';

const MAX_LINES = 6;
const MAX_CHARACTERS = 60;
const LINE_HEIGHT = 14;
const PADDING = 12;
const TEXT_ANNOTATION_INDENT = '\u00a0\u00a0';

export function isGeneratedComment(businessObject) {
  return businessObject?.$type === 'bpmn:TextAnnotation'
    && businessObject.extensionElements?.values?.some(value => value.$type === GENERATED_COMMENT_TYPE);
}

export function getGeneratedCommentText(annotations, registry, translate) {
  const annotationLines = annotations.flatMap(annotation =>
    annotation.text ? annotation.text.split('\n') : []
  );
  const codingLines = annotations.flatMap(annotation =>
    (annotation.codings || []).map(coding =>
      `${coding.system ? `${getSystemShortName(coding.system, registry)}: ` : ''}${coding.code || ''}${coding.display ? ` – ${coding.display}` : ''}`
    )
  );
  const visibleCodingLines = codingLines.slice(0, MAX_LINES);
  const hiddenCount = Math.max(0, codingLines.length - MAX_LINES);

  if (hiddenCount) {
    visibleCodingLines.push(translate('+{count} more', { count: hiddenCount }));
  }

  const lines = [
    ...annotationLines,
    ...visibleCodingLines.map(line =>
      line.length > MAX_CHARACTERS ? `${line.slice(0, MAX_CHARACTERS - 1)}…` : line
    )
  ];

  return lines.map(line => `${TEXT_ANNOTATION_INDENT}${line}`).join('\n');
}

export function getGeneratedCommentDimensions(text) {
  const lines = text ? text.split('\n') : [];
  const width = Math.max(
    100,
    ...lines.map(line => line.length * 6.2 + PADDING)
  );

  return {
    width: width + PADDING,
    height: Math.max(30, lines.length * LINE_HEIGHT + PADDING)
  };
}
