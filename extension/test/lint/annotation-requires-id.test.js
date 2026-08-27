import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const annotationRequiresId = require(
  '../../lint/bpmnlint-plugin-terminology/rules/annotation-requires-id.js'
);

function lintAnnotations(annotations) {
  const reports = [];
  const rule = annotationRequiresId();

  rule.check({
    id: 'Task_1',
    extensionElements: {
      values: [{
        $type: 'term:Annotations',
        values: annotations
      }]
    }
  }, {
    report: (...args) => reports.push(args)
  });

  return reports;
}

describe('annotation-requires-id', () => {
  it('accepts non-empty IDs containing hyphens', () => {
    expect(lintAnnotations([
      { $type: 'term:Annotation', id: '-term-ann-1-' }
    ])).toHaveLength(0);
  });

  it('reports annotations without a valid ID', () => {
    const reports = lintAnnotations([
      { $type: 'term:Annotation', id: 'invalid id' },
      { $type: 'term:Annotation' }
    ]);

    expect(reports).toHaveLength(2);
    expect(reports[0][1]).toContain('requires a non-empty valid "id" attribute');
  });
});
