import { getAnnotationsContainer } from './AnnotationHelper.js';

// Only attach new objects through modeling. In particular, never mutate an
// existing values array: the command stack keeps that array for undo.
export function saveAnnotation(element, moddle, modeling, data, annotation = null) {
  const bo = element.businessObject;
  const container = getAnnotationsContainer(bo);

  if (annotation && !container?.values?.includes(annotation)) {
    throw new Error('The annotation is no longer attached to this element.');
  }

  const target = annotation || moddle.create('mt:Annotation');
  const codings = (data.codings || []).map(value => {
    const existing = annotation?.codings?.find(coding =>
      ['system', 'code', 'display', 'version'].every(key =>
        (coding[key] || '') === (value[key] || '')
      )
    );
    if (existing) return existing;

    const coding = moddle.create('mt:Coding', {
      system: value.system,
      code: value.code,
      display: value.display,
      version: value.version || undefined
    });
    coding.$parent = target;
    return coding;
  });
  const properties = { id: data.id, text: data.text || undefined, codings };

  if (annotation) {
    modeling.updateModdleProperties(element, annotation, properties);
    return annotation;
  }

  Object.entries(properties).forEach(([key, value]) => target.set(key, value));
  if (container) {
    target.$parent = container;
    modeling.updateModdleProperties(element, container, {
      values: [...(container.values || []), target]
    });
    return target;
  }

  const extensionElements = bo.extensionElements || moddle.create('bpmn:ExtensionElements');
  const newContainer = moddle.create('mt:Annotations', { values: [target] });
  newContainer.$parent = extensionElements;
  target.$parent = newContainer;

  if (bo.extensionElements) {
    modeling.updateModdleProperties(element, extensionElements, {
      values: [...(extensionElements.values || []), newContainer]
    });
  } else {
    extensionElements.$parent = bo;
    extensionElements.set('values', [newContainer]);
    modeling.updateModdleProperties(element, bo, { extensionElements });
  }
  return target;
}

export function deleteAnnotation(element, modeling, annotation) {
  const container = getAnnotationsContainer(element.businessObject);
  if (!container?.values?.includes(annotation)) return;

  modeling.updateModdleProperties(element, container, {
    values: container.values.filter(value => value !== annotation)
  });
}
