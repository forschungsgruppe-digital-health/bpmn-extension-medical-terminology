// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import BpmnModeler from 'bpmn-js/lib/Modeler.js';
import TerminologyBadgeModule from '../../src/diagram/index.js';
import {
  getGeneratedCommentDimensions,
  isGeneratedComment
} from '../../src/diagram/generated-comment.js';
import TerminologyModdleDescriptor from '../../src/moddle/medical-terminology.json' with { type: 'json' };

const DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Defs">
  <bpmn:process id="P" isExecutable="false">
    <bpmn:task id="A" /><bpmn:task id="B" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="D"><bpmndi:BPMNPlane id="PL" bpmnElement="P">
    <bpmndi:BPMNShape id="A_di" bpmnElement="A"><dc:Bounds x="100" y="100" width="100" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="B_di" bpmnElement="B"><dc:Bounds x="300" y="100" width="100" height="80"/></bpmndi:BPMNShape>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

// jsdom implements neither CSS.escape nor SVG layout, both used by diagram-js.
globalThis.CSS ??= { escape: (value) => String(value) };
SVGElement.prototype.getBBox ??= () => ({ x: 0, y: 0, width: 0, height: 0 });
SVGSVGElement.prototype.createSVGMatrix ??= () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
SVGSVGElement.prototype.createSVGTransform ??= () => ({ setMatrix() {}, setTranslate() {}, setScale() {}, setRotate() {}, matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } });
globalThis.SVGMatrix ??= class SVGMatrix {};
if (!('transform' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'transform', {
    get() {
      return { baseVal: { consolidate: () => null, numberOfItems: 0, appendItem() {}, clear() {} } };
    }
  });
}

let modeler;

async function createModeler() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  modeler = new BpmnModeler({
    container,
    additionalModules: [ TerminologyBadgeModule ],
    moddleExtensions: { mt: TerminologyModdleDescriptor }
  });
  await modeler.importXML(DIAGRAM);
}

function annotate(id, count, annotationText) {
  const moddle = modeler.get('moddle');
  const element = modeler.get('elementRegistry').get(id);

  modeler.get('commandStack').execute('element.updateModdleProperties', {
    element,
    moddleElement: element.businessObject,
    properties: {
      extensionElements: moddle.create('bpmn:ExtensionElements', {
        values: [
          moddle.create('mt:Annotations', {
            values: Array.from({ length: count }, (_, i) => moddle.create('mt:Annotation', {
              id: `a${i}`,
              text: i === 0 ? annotationText : undefined,
              codings: [ moddle.create('mt:Coding', {
                system: 'http://example.org/cs', code: `${i}`, display: `Term ${i}`
              }) ]
            }))
          })
        ]
      })
    }
  });
}

function gfx(id) {
  return modeler.get('elementRegistry').getGraphics(id);
}

function badgeCount(id) {
  const label = gfx(id).querySelector('.mt-badge')?.getAttribute('aria-label');
  return label?.split(' ')[0];
}

function overlaps(first, second) {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

function overlapsConnection(shape, connection) {
  return connection.waypoints.slice(1).some((point, index) => {
    const previous = connection.waypoints[index];
    return lineIntersectsShape(previous, point, shape);
  });
}

function lineIntersectsShape(start, end, shape) {
  const bounds = {
    left: shape.x,
    right: shape.x + shape.width,
    top: shape.y,
    bottom: shape.y + shape.height
  };
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let lower = 0;
  let upper = 1;

  for (const [ p, q ] of [
    [ -deltaX, start.x - bounds.left ],
    [ deltaX, bounds.right - start.x ],
    [ -deltaY, start.y - bounds.top ],
    [ deltaY, bounds.bottom - start.y ]
  ]) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }

    const ratio = q / p;
    if (p < 0) {
      lower = Math.max(lower, ratio);
    } else {
      upper = Math.min(upper, ratio);
    }

    if (lower > upper) {
      return false;
    }
  }

  return true;
}

function addObstacle(id, bounds) {
  const moddle = modeler.get('moddle');
  const businessObject = moddle.create('bpmn:Task', { id });
  const shape = modeler.get('elementFactory').createShape({
    type: 'bpmn:Task',
    businessObject,
    width: bounds.width,
    height: bounds.height
  });

  return modeler.get('modeling').createShape(shape, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }, modeler.get('canvas').getRootElement());
}

afterEach(() => {
  modeler?.destroy();
  document.body.innerHTML = '';
});

describe('TerminologyBadgeRenderer', () => {
  it('draws no badge without annotations and still renders the shape', async () => {
    await createModeler();
    expect(gfx('A').querySelector('.mt-badge')).toBeNull();
    expect(gfx('A').querySelector('rect')).not.toBeNull();
  });

  it('shows the count and updates on change and undo/redo', async () => {
    await createModeler();

    annotate('A', 1);
    expect(badgeCount('A')).toBe('1');
    expect(badgeCount('B')).toBeUndefined();

    annotate('A', 3);
    expect(badgeCount('A')).toBe('3');

    modeler.get('commandStack').undo();
    expect(badgeCount('A')).toBe('1');
    modeler.get('commandStack').redo();
    expect(badgeCount('A')).toBe('3');
  });

  it('draws one badge per render with an accessible name', async () => {
    await createModeler();
    annotate('A', 2);
    annotate('A', 2);

    const badges = gfx('A').querySelectorAll('.mt-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].getAttribute('aria-label')).toBe('2 terminology annotation(s)');
  });

  it('is part of the SVG export and leaves the XML free of badge data', async () => {
    await createModeler();
    annotate('A', 1);

    const { svg } = await modeler.saveSVG();
    expect(svg).toContain('mt-badge');

    const { xml } = await modeler.saveXML();
    expect(xml).not.toContain('MT');
    expect(xml).not.toContain('mt-badge');
  });

  it('shows the badge after importing an annotated diagram', async () => {
    await createModeler();
    annotate('A', 2);
    const { xml } = await modeler.saveXML();

    await modeler.importXML(xml);
    expect(badgeCount('A')).toBe('2');
  });

  describe('comment block', () => {
    const generatedComments = () => modeler.get('elementRegistry').getAll()
      .filter(element => isGeneratedComment(element.businessObject));
    const annotationFor = (targetId) => {
      const target = modeler.get('elementRegistry').get(targetId);
      const association = [ ...target.incoming, ...target.outgoing ]
        .find(connection => connection.businessObject.$type === 'bpmn:Association');
      return association.source === target ? association.target : association.source;
    };
    const commentLines = (targetId) => annotationFor(targetId).businessObject.text.split('\n');

    it('creates real linked BPMN TextAnnotations from all annotated elements', async () => {
      await createModeler();
      annotate('A', 2);
      annotate('B', 1);

      const targetB = modeler.get('elementRegistry').get('B');
      modeler.get('modeling').moveShape(targetB, { x: -90, y: -45 });
      const visibility = modeler.get('terminologyCommentVisibility');
      visibility.setVisible(true);

      expect(generatedComments()).toHaveLength(2);
      expect(commentLines('A')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0', '\u00a0\u00a0cs: 1 – Term 1' ]);
      expect(commentLines('B')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0' ]);
      const registryElements = modeler.get('elementRegistry').getAll();
      for (const comment of generatedComments()) {
        const overlapping = registryElements.filter(element =>
          element !== comment
              && !element.labelTarget
              && element.width > 0
              && element.height > 0
              && overlaps(comment, element)
        );
        expect(overlapping).toEqual([]);
      }
      expect(gfx('A').querySelector('.mt-badge')).not.toBeNull();
      expect(gfx(annotationFor('A').id).querySelector('.mt-badge')?.getAttribute('transform'))
        .toBe('translate(0, 0)');
      expect(gfx('A').querySelector('.mt-badge')?.getAttribute('transform'))
        .toBe(`translate(${modeler.get('elementRegistry').get('A').width}, 0)`);
    });

    it('creates space when every nearby position is occupied', async () => {
      await createModeler();
      annotate('A', 1);
      const target = modeler.get('elementRegistry').get('A');
      const originalB = modeler.get('elementRegistry').get('B').x;
      const blocker = addObstacle('eastBlocker', {
        x: 224, y: -1000, width: 1000, height: 2000
      });
      const originalBlockerX = blocker.x;

      modeler.get('terminologyCommentVisibility').setVisible(true);

      const comment = annotationFor('A');
      expect(modeler.get('elementRegistry').get('B').x).toBeGreaterThan(originalB);
      expect(blocker.x).toBeGreaterThan(originalBlockerX);
      expect(overlaps(comment, blocker)).toBe(false);
      expect(overlaps(comment, target)).toBe(false);
      expect(comment.x).toBeGreaterThan(target.x + target.width);
    });

    it('avoids existing connections as well as shapes', async () => {
      await createModeler();
      annotate('A', 1);
      const elements = modeler.get('elementRegistry');
      const connection = modeler.get('modeling').connect(
        elements.get('A'),
        elements.get('B'),
        { type: 'bpmn:SequenceFlow' }
      );

      modeler.get('terminologyCommentVisibility').setVisible(true);

      expect(overlapsConnection(annotationFor('A'), connection)).toBe(false);
    });

    it('chooses a nearby position around a gateway name label', async () => {
      await createModeler();
      const modeling = modeler.get('modeling');
      const target = modeler.get('elementFactory').createShape({
        type: 'bpmn:ExclusiveGateway',
        businessObject: modeler.get('moddle').create('bpmn:ExclusiveGateway', {
          id: 'namedGateway',
          name: 'Gateway name'
        })
      });
      modeling.createShape(target, { x: 100, y: 400 }, modeler.get('canvas').getRootElement());
      const commentDimensions = getGeneratedCommentDimensions('\u00a0\u00a0cs: 0 – Term 0');
      const stepX = commentDimensions.width + 24;
      const stepY = commentDimensions.height + 24;
      const commentLeft = target.x + target.width + 24;
      modeling.updateLabel(target, 'Gateway name', {
        x: commentLeft,
        y: target.y + target.height / 2 - 5 * stepY - commentDimensions.height / 2,
        width: commentDimensions.width,
        height: 10 * stepY + commentDimensions.height
      });
      modeling.moveShape(target.label, {
        x: commentLeft - target.label.x,
        y: target.y + target.height / 2 - 5 * stepY - commentDimensions.height / 2 - target.label.y
      });
      annotate('namedGateway', 1);
      const otherElement = modeler.get('elementRegistry').get('B');
      modeling.moveShape(otherElement, { x: 400, y: 0 });

      modeler.get('terminologyCommentVisibility').setVisible(true);

      const comment = annotationFor('namedGateway');
      const gatewayName = target.label;
      expect(generatedComments()).toHaveLength(1);
      expect(overlaps(comment, gatewayName)).toBe(false);
      expect(comment.x).toBeCloseTo(commentLeft + stepX, 0);
      expect(comment.y + comment.height / 2).toBe(target.y + target.height / 2);
      expect(otherElement.x).toBe(700);
    });

    it('avoids obstacles in the association path even when the comment box is clear', async () => {
      await createModeler();
      annotate('A', 1);
      const blocker = addObstacle('pathBlocker', {
        x: 205, y: 130, width: 15, height: 20
      });

      modeler.get('terminologyCommentVisibility').setVisible(true);

      const target = modeler.get('elementRegistry').get('A');
      const association = [ ...target.incoming, ...target.outgoing ]
        .find(connection => connection.businessObject.$type === 'bpmn:Association');
      expect(overlapsConnection(blocker, association)).toBe(false);
    });

    it('keeps generated comments to the right and docks the association at the marker center', async () => {
      await createModeler();
      annotate('A', 1);
      const target = modeler.get('elementRegistry').get('A');

      modeler.get('terminologyCommentVisibility').setVisible(true);

      const comment = annotationFor('A');
      const association = [ ...target.incoming, ...target.outgoing ]
        .find(connection => connection.businessObject.$type === 'bpmn:Association');
      const commentEndpoint = association.source === comment
        ? association.waypoints[0]
        : association.waypoints.at(-1);

      expect(comment.x).toBeGreaterThan(target.x + target.width);
      expect(commentEndpoint.x).toBe(comment.x);
      expect(commentEndpoint.y).toBe(comment.y + comment.height / 2);
    });

    it('includes annotation text as well as codings in the generated comment', async () => {
      await createModeler();
      annotate('A', 1, 'Clinical note');
      modeler.get('terminologyCommentVisibility').setVisible(true);

      expect(commentLines('A')).toEqual([ '\u00a0\u00a0Clinical note', '\u00a0\u00a0cs: 0 – Term 0' ]);
    });

    it('prints annotation text in full while limiting only coding lines', async () => {
      await createModeler();
      const fullText = 'This annotation text must remain complete in the generated BPMN comment.';
      annotate('A', 8, fullText);
      modeler.get('terminologyCommentVisibility').setVisible(true);

      const lines = commentLines('A');
      expect(lines[0]).toBe(`\u00a0\u00a0${fullText}`);
      expect(lines.at(-1)).toBe('\u00a0\u00a0+2 more');
      expect(annotationFor('A').width).toBeGreaterThan(400);
    });

    it('stores plain-text BPMN comments and includes them in SVG export', async () => {
      await createModeler();
      annotate('A', 1);
      modeler.get('terminologyCommentVisibility').setVisible(true);

      const { svg } = await modeler.saveSVG();
      expect(svg).toContain('cs: 0 – Term 0');

      const { xml } = await modeler.saveXML();
      expect(xml).toContain('<bpmn:textAnnotation');
      expect(xml).toContain('<bpmn:association');
      expect(xml).toContain('cs: 0 – Term 0');
      expect(xml).toContain('<mt:generatedComment');
      expect(xml).not.toContain('application/x-mt-terminology-reference');
    });

    it('renders the stored BPMN comment in a modeler without the terminology extension', async () => {
      await createModeler();
      annotate('A', 1);
      modeler.get('terminologyCommentVisibility').setVisible(true);
      const { xml } = await modeler.saveXML();

      const container = document.createElement('div');
      document.body.appendChild(container);
      const plainModeler = new BpmnModeler({ container });
      try {
        await plainModeler.importXML(xml);
        const comment = plainModeler.get('elementRegistry').getAll()
          .find(element => element.businessObject?.$type === 'bpmn:TextAnnotation');

        expect(comment.businessObject.text).toContain('cs: 0 – Term 0');
        expect(plainModeler.get('elementRegistry').getGraphics(comment).textContent)
          .toContain('cs: 0 – Term 0');
      } finally {
        plainModeler.destroy();
      }
    });

    it('regenerates generated comments from current mt data when toggled again', async () => {
      await createModeler();
      annotate('A', 1);
      const visibility = modeler.get('terminologyCommentVisibility');
      visibility.setVisible(true);
      const firstId = generatedComments()[0].id;

      visibility.setVisible(false);
      expect(generatedComments()).toHaveLength(0);
      expect(modeler.get('elementRegistry').getAll()
        .filter(element => element.businessObject?.$type === 'bpmn:Association')).toHaveLength(0);

      visibility.setVisible(true);
      expect(generatedComments()).toHaveLength(1);
      expect(generatedComments()[0].id).not.toBe(firstId);
      expect(commentLines('A')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0' ]);
    });

    it('keeps comments synchronized when terminology data changes', async () => {
      await createModeler();
      annotate('A', 1);
      modeler.get('terminologyCommentVisibility').setVisible(true);

      annotate('A', 2);
      expect(generatedComments()).toHaveLength(1);
      expect(commentLines('A')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0', '\u00a0\u00a0cs: 1 – Term 1' ]);

      annotate('A', 0);
      expect(generatedComments()).toHaveLength(0);
    });

    it('restores the global switch when importing generated comments', async () => {
      await createModeler();
      annotate('A', 1);
      modeler.get('terminologyCommentVisibility').setVisible(true);
      const { xml } = await modeler.saveXML();

      await modeler.importXML(xml);

      expect(modeler.get('terminologyCommentVisibility').isVisible()).toBe(true);
      expect(generatedComments()).toHaveLength(1);
      expect(commentLines('A')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0' ]);
    });

    it('limits the number of rendered coding lines', async () => {
      await createModeler();
      annotate('A', 9);
      modeler.get('terminologyCommentVisibility').setVisible(true);
      const lines = commentLines('A');
      expect(lines).toHaveLength(7);
      expect(lines.at(-1)).toBe('\u00a0\u00a0+3 more');
    });
  });
});
