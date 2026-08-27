const { is } = require('bpmnlint-utils');

const ANNOTATION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

module.exports = function () {
  function check(node, reporter) {
    const extensionElements = node.extensionElements;

    if (!extensionElements?.values) {
      return;
    }

    extensionElements.values.forEach(value => {
      if (!is(value, 'term:Annotations') || !value.values) {
        return;
      }

      value.values.forEach(annotation => {
        if (!is(annotation, 'term:Annotation')) {
          return;
        }

        const id = typeof annotation.id === 'string' ? annotation.id.trim() : '';

        if (!ANNOTATION_ID_PATTERN.test(id)) {
          reporter.report(
            node.id,
            'term:Annotation requires a non-empty valid "id" attribute'
          );
        }
      });
    });
  }

  return { check };
};
