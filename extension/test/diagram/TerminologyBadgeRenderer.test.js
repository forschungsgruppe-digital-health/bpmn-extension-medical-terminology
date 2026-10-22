// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import BpmnModeler from 'bpmn-js/lib/Modeler.js';
import TerminologyBadgeModule from '../../src/diagram/index.js';
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

function annotate(id, count) {
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
    const commentLines = (id) => [ ...gfx(id).querySelectorAll('.mt-comment text') ]
      .map((node) => node.textContent);

    it('is hidden by default and shown for all annotated shapes via the global switch', async () => {
      await createModeler();
      annotate('A', 2);
      annotate('B', 1);
      expect(gfx('A').querySelector('.mt-comment')).toBeNull();

      const visibility = modeler.get('terminologyCommentVisibility');
      visibility.setVisible(true);
      expect(commentLines('A')).toEqual([ 'cs: 0 – Term 0', 'cs: 1 – Term 1' ]);
      expect(commentLines('B')).toEqual([ 'cs: 0 – Term 0' ]);
      expect(badgeCount('A')).toBe('2');

      visibility.setVisible(false);
      expect(gfx('A').querySelector('.mt-comment')).toBeNull();
    });

    it('stays in sync with changes and appears in the SVG export, not in the XML', async () => {
      await createModeler();
      modeler.get('terminologyCommentVisibility').setVisible(true);
      annotate('A', 1);
      expect(commentLines('A')).toEqual([ 'cs: 0 – Term 0' ]);

      const { svg } = await modeler.saveSVG();
      expect(svg).toContain('cs: 0 – Term 0');
      const { xml } = await modeler.saveXML();
      expect(xml).not.toContain('mt-comment');

      modeler.get('commandStack').undo();
      expect(gfx('A').querySelector('.mt-comment')).toBeNull();
    });

    it('limits the number of lines', async () => {
      await createModeler();
      annotate('A', 9);
      modeler.get('terminologyCommentVisibility').setVisible(true);
      const lines = commentLines('A');
      expect(lines).toHaveLength(7);
      expect(lines.at(-1)).toBe('+3 more');
    });
  });
});
