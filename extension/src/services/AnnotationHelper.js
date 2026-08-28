/**
 * Helper functions for reading and writing term:annotations
 * on BPMN element businessObjects.
 */

const DEFAULT_ANN_PREFIX = 'term-ann';
const ANN_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function getExtensionElement(bo, type) {
  if (!bo.extensionElements) return undefined;
  return bo.extensionElements.values?.find(e => e.$type === type);
}

export function getAnnotationsContainer(bo) {
  return getExtensionElement(bo, 'term:Annotations');
}

export function getAnnotations(bo) {
  const container = getAnnotationsContainer(bo);
  return container?.values || [];
}

export function getUsedIds(bo) {
  return getAnnotations(bo)
    .map(annotation => annotation.id)
    .filter(Boolean);
}

export function getCodingKey(coding) {
  const system = (coding?.system || '').trim();
  const code = (coding?.code || '').trim();

  if (!system || !code) {
    return '';
  }

  return `${system}|${code}`;
}

export function getUsedCodingKeys(bo) {
  return getAnnotations(bo).flatMap(annotation =>
    (annotation.codings || []).map(getCodingKey).filter(Boolean)
  );
}

export function isValidId(id) {
  return ANN_ID_PATTERN.test((id || '').trim());
}

export function createId(existingIds = []) {
  const normalizedBase = DEFAULT_ANN_PREFIX;
  const idsInUse = new Set(existingIds.filter(Boolean));

  let sequence = 1;
  let candidate = `${normalizedBase}-${sequence}`;

  while (idsInUse.has(candidate)) {
    sequence += 1;
    candidate = `${normalizedBase}-${sequence}`;
  }

  return candidate;
}

export function ensureExtensionElements(bo, moddle) {
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] });
  }
  return bo.extensionElements;
}

export function ensureAnnotationsContainer(bo, moddle) {
  const extElements = ensureExtensionElements(bo, moddle);
  let container = getAnnotationsContainer(bo);
  if (!container) {
    container = moddle.create('term:Annotations', { values: [] });
    container.$parent = bo.extensionElements;
    extElements.values.push(container);
  }
  return container;
}

export function addAnnotation(bo, moddle, { id, text, codings, existingIds }) {
  const container = ensureAnnotationsContainer(bo, moddle);
  const props = {
    id: (id || '').trim() || createId(
      existingIds || getUsedIds(bo)
    )
  };
  if (text) props.text = text;

  const annotation = moddle.create('term:Annotation', props);
  annotation.$parent = container;

  if (codings && codings.length > 0) {
    annotation.codings = codings.map(c => {
      const coding = moddle.create('term:Coding', {
        system: c.system,
        code: c.code,
        display: c.display,
        version: c.version || undefined
      });
      coding.$parent = annotation;
      return coding;
    });
  }

  if (!container.values) container.values = [];
  container.values.push(annotation);
  return annotation;
}

export function removeAnnotation(bo, index) {
  const container = getAnnotationsContainer(bo);
  if (container?.values && index >= 0 && index < container.values.length) {
    container.values.splice(index, 1);
  }
}
