// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import BpmnModeler from 'bpmn-js/lib/Modeler.js';
import TerminologyBadgeModule from '../../src/diagram/index.js';
import { isGeneratedComment } from '../../src/diagram/generated-comment.js';
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

      const originalBPosition = modeler.get('elementRegistry').get('B').x;
      const visibility = modeler.get('terminologyCommentVisibility');
      visibility.setVisible(true);

      expect(generatedComments()).toHaveLength(2);
      expect(modeler.get('elementRegistry').get('B').x).toBe(originalBPosition);
      expect(commentLines('A')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0', '\u00a0\u00a0cs: 1 – Term 1' ]);
      expect(commentLines('B')).toEqual([ '\u00a0\u00a0cs: 0 – Term 0' ]);
      const target = modeler.get('elementRegistry').get('A');
      const comment = annotationFor('A');
      expect(comment.x + comment.width / 2).toBeCloseTo(target.x + target.width + comment.width / 2, 0);
      expect(comment.y + comment.height / 2).toBeCloseTo(target.y - 50 - comment.height / 2, 0);
      expect(gfx('A').querySelector('.mt-badge')).not.toBeNull();
      expect(gfx(annotationFor('A').id).querySelector('.mt-badge')?.getAttribute('transform'))
        .toBe('translate(0, 0)');
      expect(gfx('A').querySelector('.mt-badge')?.getAttribute('transform'))
        .toBe(`translate(${modeler.get('elementRegistry').get('A').width}, 0)`);
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
