# Extending bpmn.io — A Developer Primer for the Clinical-Semantics Extensions

This is a from-scratch primer for a developer who is **new to BPMN and to [bpmn.io](https://bpmn.io/)** but needs to understand, and then extend, the clinical-semantics extensions that live in this repository. It explains the BPMN 2.0 standard, the standard XML extension mechanism, the bpmn.io toolkit, the five ways you can extend bpmn.io, and finally how the two extensions in this repo map onto those concepts and how they are validated.

For the project itself, start at [README.md](../README.md); for design rationale and the data model see [ARCHITECTURE.md](ARCHITECTURE.md); for setup, the quality gate, and release process see [CONTRIBUTING.md](../CONTRIBUTING.md); for the lean operational rules (and the hard "clinical data only in `<extensionElements>`" boundary) see [AGENTS.md](../AGENTS.md).

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [BPMN in a nutshell](#2-bpmn-in-a-nutshell)
3. [BPMN XML structure](#3-bpmn-xml-structure)
4. [Extending BPMN / BPMN XML (the standard mechanism)](#4-extending-bpmn--bpmn-xml-the-standard-mechanism)
5. [What is bpmn.io](#5-what-is-bpmnio)
6. [The five ways to extend bpmn.io](#6-the-five-ways-to-extend-bpmnio)
   - [(a) moddle model extension](#a-moddle-model-extension)
   - [(b) bpmn-js module (renderer / rules / palette / context pad)](#b-bpmn-js-module-renderer--rules--palette--context-pad)
   - [(c) properties panel provider](#c-properties-panel-provider)
   - [(d) element templates](#d-element-templates)
   - [(e) bpmnlint plugin](#e-bpmnlint-plugin)
7. [This repository as a worked example](#7-this-repository-as-a-worked-example)
8. [Validating an extension](#8-validating-an-extension)
9. [Further reading](#9-further-reading)

---

## 1. Introduction

**Who this is for.** You write web frontends or tooling and have been asked to work on `bpmn-js-clinical-semantics` — two libraries that attach clinical meaning (terminology codes, FHIR resource mappings) to BPMN diagrams. You do not yet know what BPMN is, how its XML works, or how bpmn.io is structured. This document gets you from zero to productive.

**What you can do after reading.** You will be able to:

- Read a `.bpmn` file and explain what each namespace and element is for.
- Explain the standard BPMN `<extensionElements>` mechanism and why this repo uses it for everything clinical.
- Name the five ways bpmn.io can be extended, and recognise which two this repo actually uses (a *moddle model extension* and a *properties panel provider*) and which three it deliberately does not.
- Find the real files in this repo that implement each extension type, and add a new moddle type or a new properties-panel group correctly.
- Validate your change against this repo's conformance gate before opening a PR.

---

## 2. BPMN in a nutshell

**Business Process Model and Notation (BPMN)** is a graphical notation maintained by the [Object Management Group (OMG)](https://www.omg.org/bpmn/). Its purpose is a standard, flowchart-like notation for **business-process modelling** that is understandable by all stakeholders (analysts, developers, managers) yet precise enough to be translated into executable software. It is independent of any particular implementation environment.

- BPMN originated at the Business Process Management Initiative (BPMI) and has been maintained by OMG since the BPMI/OMG merger (2005). BPMN 2.0 was released in January 2011.
- The current OMG revision is **2.0.2** (document `formal/13-12-09`, January 2014) — a minor maintenance revision over 2.0.1. See the [BPMN 2.0.2 specification landing page](https://www.omg.org/spec/BPMN/2.0.2/).
- BPMN 2.0 is **also published as an international standard: ISO/IEC 19510** ("Information technology — Object Management Group Business Process Model and Notation (BPMN)"), ISO/IEC 19510:2013, corresponding to OMG BPMN 2.0.1. OMG hosts the ISO-formatted PDF at [omg.org/spec/BPMN/ISO/19510/PDF](https://www.omg.org/spec/BPMN/ISO/19510/PDF).

**The core element kinds** you will see in a process diagram:

- **Activities** — units of work: `task`, `subProcess`, `callActivity`.
- **Events** — something that happens: `startEvent`, intermediate events, `endEvent`.
- **Gateways** — branching/merging of flow: exclusive, parallel, inclusive, event-based, complex.
- **Sequence flows** — directed connectors (`sequenceFlow`) that order the above within a process.
- **Data** — data objects and data flows.
- **Collaboration constructs** — participants (pools) and `messageFlow` connecting them at the collaboration level.

A diagram's elements are wrapped in a **`<process>`** (a single orchestration) or a **`<collaboration>`** (two or more participants and the message flows between them).

---

## 3. BPMN XML structure

A BPMN file carries **two things in one document**: the *semantics* (what the process is) and the *layout* (where the shapes sit on the canvas). They live in different XML namespaces.

The root element is **`<definitions>`** (XSD type `tDefinitions`), defined in the master schema [`BPMN20.xsd`](https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd). Its `targetNamespace` attribute is **required**. The core namespace URIs are:

| Layer | Prefix (conventional) | Namespace URI | Owning OMG spec |
|---|---|---|---|
| **MODEL** (semantic / core BPMN) | `bpmn` / `bpmn2` | `http://www.omg.org/spec/BPMN/20100524/MODEL` | BPMN |
| **BPMNDI** (BPMN diagram interchange) | `bpmndi` | `http://www.omg.org/spec/BPMN/20100524/DI` | BPMN |
| **DI** (generic diagram interchange) | `di` | `http://www.omg.org/spec/DD/20100524/DI` | **DD** (Diagram Definition) |
| **DC** (diagram common: bounds, points, font) | `dc` | `http://www.omg.org/spec/DD/20100524/DC` | **DD** (Diagram Definition) |

> **Subtlety worth getting right:** only the **BPMNDI** layer lives under the BPMN namespace. The generic **DI** and **DC** primitives live under the OMG **DD** (Diagram Definition) spec namespaces (`.../spec/DD/...`), not under BPMN. (Note also that the namespace URI date is `20100524` while the file path on omg.org uses `20100501`.)

**Where things live.** Under `<definitions>` you find one or more *root elements* (`process`, `collaboration`, `choreography`, ...) carrying the semantics, plus a `<bpmndi:BPMNDiagram>` carrying the layout. The DI layer references each semantic element through a `bpmnElement` attribute: `<bpmndi:BPMNShape>` (with a `dc:Bounds`) and `<bpmndi:BPMNEdge>` (with `di:waypoint`s). This separation is why the same file can carry semantics (MODEL ns) and layout (DI/DC ns) without mixing them.

A tiny annotated skeleton (the four core namespaces on the root, then where each kind of content goes):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
    xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"        <!-- MODEL: the semantics -->
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"      <!-- BPMNDI: diagram interchange (BPMN ns) -->
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"            <!-- DI: generic, under the DD spec -->
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"            <!-- DC: bounds/points/font, under the DD spec -->
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    targetNamespace="http://example.org/process">                <!-- REQUIRED on <definitions> -->

  <process id="Process_1" isExecutable="false">
    <startEvent id="Start_1"/>
    <task id="Task_1" name="Do something"/>
    <endEvent id="End_1"/>
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1"/>
    <sequenceFlow id="Flow_2" sourceRef="Task_1"  targetRef="End_1"/>
  </process>

  <bpmndi:BPMNDiagram id="Diag_1">                                <!-- layout for the above -->
    <bpmndi:BPMNPlane bpmnElement="Process_1">
      <bpmndi:BPMNShape bpmnElement="Task_1">
        <dc:Bounds x="160" y="80" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <!-- BPMNEdge elements with di:waypoint for the sequence flows ... -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>

</definitions>
```

The official schemas live under `https://www.omg.org/spec/BPMN/20100501/`: [`BPMN20.xsd`](https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd) (the master, defines `<definitions>`), [`Semantic.xsd`](https://www.omg.org/spec/BPMN/20100501/Semantic.xsd) (core element types), [`BPMNDI.xsd`](https://www.omg.org/spec/BPMN/20100501/BPMNDI.xsd), [`DI.xsd`](https://www.omg.org/spec/BPMN/20100501/DI.xsd) and [`DC.xsd`](https://www.omg.org/spec/BPMN/20100501/DC.xsd).

---

## 4. Extending BPMN / BPMN XML (the standard mechanism)

BPMN was designed to be extended **without breaking the standard**. The hook is the **`<extensionElements>`** element, which is available on virtually every BPMN element because it is declared on the abstract base type `tBaseElement` (in [`Semantic.xsd`](https://www.omg.org/spec/BPMN/20100501/Semantic.xsd)):

```xml
<!-- From Semantic.xsd: every BPMN element inherits extensibility via tBaseElement -->
<xsd:complexType name="tBaseElement" abstract="true">
  <xsd:sequence>
    <xsd:element ref="documentation" minOccurs="0" maxOccurs="unbounded"/>
    <xsd:element ref="extensionElements" minOccurs="0" maxOccurs="1"/>
  </xsd:sequence>
  <xsd:attribute name="id" type="xsd:ID" use="optional"/>
  <xsd:anyAttribute namespace="##other" processContents="lax"/>
</xsd:complexType>

<!-- The extension wildcard itself -->
<xsd:complexType name="tExtensionElements">
  <xsd:sequence>
    <xsd:any namespace="##other" processContents="lax"
             minOccurs="0" maxOccurs="unbounded"/>
  </xsd:sequence>
</xsd:complexType>
```

**Foreign namespaces + prefixes — never the `bpmn:` namespace.** There are two standard ways to extend:

1. **Foreign child elements** go *inside* `<extensionElements>`. They MUST be in a **foreign namespace** (`namespace="##other"` means any namespace other than the schema's own MODEL namespace) under your own prefix and URI — for example `term:` / `fhirmap:` in this repo. You never invent new elements in the `bpmn:` (MODEL) namespace.
2. **Foreign attributes** may be placed directly on any BPMN element, because `tBaseElement` carries `<xsd:anyAttribute namespace="##other" processContents="lax"/>`. This is how `term:clinicalDomain="staging"` can appear as an attribute on a `bpmn2:task`.

`processContents="lax"` means: *validate the foreign content against a schema if one is available, otherwise skip validation.* This is exactly what makes unknown extensions tolerated by every conformant tool.

**The four metamodel components.** Beyond the XML wildcard, the BPMN metamodel (the CMOF model, described in the [specification PDF](https://www.omg.org/spec/BPMN/2.0.2/PDF)) defines a formal way to *declare* an extension:

- **`Extension`** — binds an `ExtensionDefinition` into a `Definitions`. Carries `mustUnderstand` (boolean) and a `definition` reference.
- **`ExtensionDefinition`** — a named group of attributes that extend a BPMN element (a name plus a list of `ExtensionAttributeDefinition`).
- **`ExtensionAttributeDefinition`** — defines one extension attribute (name, type, `isReference`, `isList`).
- **`ExtensionAttributeValue`** — the actual value supplied for an `ExtensionAttributeDefinition` on a concrete element (`value` / `valueRef`).

In the XSD this surfaces only as the `<extension>` element / `tExtension` complexType on `<definitions>`:

```xml
<!-- From Semantic.xsd: the metamodel-level extension declaration -->
<xsd:complexType name="tExtension">
  <xsd:sequence>
    <xsd:element ref="documentation" minOccurs="0" maxOccurs="unbounded"/>
  </xsd:sequence>
  <xsd:attribute name="definition" type="xsd:QName"/>
  <xsd:attribute name="mustUnderstand" type="xsd:boolean" use="optional" default="false"/>
</xsd:complexType>
```

Note the **XSD-vs-CMOF asymmetry**: `ExtensionDefinition`, `ExtensionAttributeDefinition` and `ExtensionAttributeValue` are CMOF/metamodel classes and are **not** emitted as standalone XSD complexTypes — the XSD relies on the `<xsd:any>` / `anyAttribute` wildcards instead. In practice (and in this repo) you rarely write `<extension>`/`ExtensionDefinition` by hand; you put your foreign elements directly under `<extensionElements>` and describe their shape with a moddle descriptor (see §6a).

**The rule: keep a valid BPMN core.** An extension must NOT break the BPMN core. A conformant tool must still be able to read the document while ignoring the extensions, and the underlying BPMN model must remain valid. `mustUnderstand="false"` (the default) tells a consumer it may safely ignore the extension; `true` means it must understand it or reject the element. This is the whole reason this repo's clinical data round-trips cleanly through non-clinical tools.

**The `definitions`/`extensionElements` known issue (XSD caveat).** Although the CMOF `BaseElement` has `extensionElements`, the `<definitions>` root in the XSD does **not**. In [`BPMN20.xsd`](https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd), `tDefinitions` is a **standalone** complexType (not derived from `tBaseElement`):

```xml
<!-- From BPMN20.xsd: tDefinitions is standalone and has NO extensionElements (OMG issue BPMN21-416) -->
<xsd:complexType name="tDefinitions">
  <xsd:sequence>
    <xsd:element ref="import" minOccurs="0" maxOccurs="unbounded"/>
    <xsd:element ref="extension" minOccurs="0" maxOccurs="unbounded"/>
    <xsd:element ref="rootElement" minOccurs="0" maxOccurs="unbounded"/>
    <xsd:element ref="bpmndi:BPMNDiagram" minOccurs="0" maxOccurs="unbounded"/>
    <xsd:element ref="relationship" minOccurs="0" maxOccurs="unbounded"/>
  </xsd:sequence>
  <xsd:attribute name="targetNamespace" type="xsd:anyURI" use="required"/>
  <!-- ... id, name, expressionLanguage, typeLanguage, exporter ... -->
  <xsd:anyAttribute namespace="##other" processContents="lax"/>
</xsd:complexType>
```

So foreign **attributes** on `<definitions>` are schema-valid (via `anyAttribute`), but a foreign **child element** placed via `extensionElements` directly under `<definitions>` is **not** schema-valid. This is OMG issue **BPMN21-416** — *"tDefinitions should have an extensionElements Element like in CMOF BaseElement"* (status: Open) in the [OMG BPMN issue tracker](https://issues.omg.org/issues/spec/BPMN/2.0). Practical impact: tools that want file-level extensions either patch the local XSD or accept the XSD flag. This repo sidesteps the issue entirely by attaching all clinical extensions to *flow elements and data references*, never to `<definitions>` (see §8 on why the XSD check here is informational).

**Conformance classes (short note).** BPMN 2.0 defines four conformance points; a tool may claim any subset:

1. **Process Modeling Conformance** — notation/diagramming and interchange of Process diagrams (execution semantics not required); sub-levels *Descriptive*, *Analytic*, *Common Executable*.
2. **Process Execution Conformance** — implements operational/execution semantics (for engines).
3. **BPEL Process Execution Conformance** — full mapping to WS-BPEL.
4. **Choreography Modeling Conformance** — Choreography diagram elements and interchange.

This repo and bpmn.io are concerned with the **Process Modeling Conformance** class (notation + interchange), not execution.

---

## 5. What is bpmn.io

[**bpmn.io**](https://bpmn.io/) is the umbrella open-source project (built and maintained by Camunda and contributors) for web-based tooling for the OMG modelling standards — tagline *"Web-based tooling for BPMN, DMN and Forms."* Its three headline toolkits are **bpmn-js** (BPMN 2.0 viewer + editor), **dmn-js** (DMN), and **form-js** (forms); a legacy **cmmn-js** also exists. There is a live reference modeler at [demo.bpmn.io](https://demo.bpmn.io/).

For BPMN, the relevant packages and how they fit together:

- **[bpmn-js](https://github.com/bpmn-io/bpmn-js)** — *"Create, embed and extend BPMN diagrams in your browser."* It sits on two layers:
  - **Semantic layer = [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle)** — reads/writes BPMN 2.0 XML to/from a JavaScript object tree (the *business objects*), using the BPMN 2.0 metamodel to validate and emit schema-compliant XML (`fromXML()` / `toXML()`). bpmn-moddle is built on **[moddle](https://github.com/bpmn-io/moddle)** (the metamodel engine) and **[moddle-xml](https://github.com/bpmn-io/moddle-xml)** (XML (de)serialization).
  - **Visual layer = [diagram-js](https://github.com/bpmn-io/diagram-js)** — *"A toolbox for displaying and modifying diagrams on the web."* It renders shapes/connections and provides the editing infrastructure (rules, palette, context pad, rendering, modeling). diagram-js uses **dependency injection (DI)** to wire and discover components; this DI mechanism is what `additionalModules` plugs into. diagram-js is the shared foundation of bpmn-js, dmn-js and cmmn-js.
  - Each graphical element links to its semantic counterpart through the **`businessObject`** property (e.g. `shape.businessObject` is the bpmn-moddle object).
- **[bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel)** — *"A properties panel extension for bpmn-js that adds the ability to edit technical properties."* It is built on the generic [`@bpmn-io/properties-panel`](https://www.npmjs.com/org/bpmn-io) rendering/styling library.
- **[bpmn-js-element-templates](https://github.com/bpmn-io/bpmn-js-element-templates)** — *"An element templates provider for bpmn-js."* Binds reusable JSON templates to element fields; works on top of the properties panel.
- **[bpmnlint](https://github.com/bpmn-io/bpmnlint)** — *"Validate your BPMN diagrams based on configurable lint rules"* (CLI + library), and **[bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint)** which *"integrates bpmnlint into bpmn-js"* (in-editor overlay).

A curated index of everything is the [awesome-bpmn-io](https://github.com/bpmn-io/awesome-bpmn-io) list, and the canonical guided tour of bpmn-js internals is the [bpmn-js Walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/).

**Embedding / watermark license note (important when embedding the modeler).** bpmn-js ships under the **bpmn.io license = MIT plus a mandatory watermark clause**. Verbatim from the [bpmn-js LICENSE](https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/LICENSE):

> The source code responsible for displaying the bpmn.io project watermark that links back to https://bpmn.io as part of rendered diagrams MUST NOT be removed or changed. When this software is being used in a website or application, the watermark must stay fully visible and not visually overlapped by other elements.

Practical takeaway: you may use, modify, and even sell it for free, but you must keep the bpmn.io watermark (the link back to https://bpmn.io shown on rendered diagrams) intact and fully visible. The LICENSE states no opt-out; any commercial/OEM arrangement would be a matter for Camunda directly (not covered by the file).

---

## 6. The five ways to extend bpmn.io

bpmn-js extensions fall into five categories. Here is the comparison first, then a minimal correct how-to for each.

| Extension type | Purpose | Package / mechanism | Persisted in BPMN XML? |
|---|---|---|---|
| **(a) moddle model extension** | Add a namespace + custom types/attributes to the BPMN metamodel so they can be read/written | A JSON descriptor passed via the `moddleExtensions` option (on top of [moddle](https://github.com/bpmn-io/moddle) / [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle)) | **Yes** — serialized into `<extensionElements>` / as foreign attributes |
| **(b) bpmn-js module** (renderer / rules / palette / context pad) | Change how elements look, what edits are allowed, what create/append controls exist | A [diagram-js](https://github.com/bpmn-io/diagram-js) DI module passed via `additionalModules` | **No** — pure editor behaviour (rules may *constrain* what gets written) |
| **(c) properties panel provider** | Add sidebar UI groups/entries to edit (often custom) properties | A module via [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel) (`registerProvider`) added to `additionalModules` | **Indirectly** — it edits the business object; persistence comes from the moddle model |
| **(d) element templates** | Let users pick a reusable, pre-configured property set instead of editing raw fields | JSON templates via [bpmn-js-element-templates](https://github.com/bpmn-io/bpmn-js-element-templates) wired as a properties-panel provider | **Yes** — template-bound values are written to the element |
| **(e) bpmnlint plugin** | Add custom validation rules | An npm package `bpmnlint-plugin-<NAME>` referenced from `.bpmnlintrc`; in-editor via [bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint) | **No** — validation only |

The canonical examples live in the [bpmn-js-examples](https://github.com/bpmn-io/bpmn-js-examples) monorepo (directories include `custom-meta-model`, `custom-modeling-rules`, `properties-panel`, `properties-panel-extension`, `modeler`, ...), with `custom-rendering`, `custom-controls` and the combined `custom-elements` as their own standalone repos.

### (a) moddle model extension

**What it is.** A JSON descriptor that adds a namespace + types to the BPMN metamodel so bpmn-moddle knows how to read/write your custom data. Top-level keys: `name`, `uri`, `prefix`, `types`. (From the official [custom-meta-model](https://github.com/bpmn-io/bpmn-js-examples/tree/main/custom-meta-model) example, namespace "QualityAssurance", prefix `qa`.)

- To add a property to an *existing* BPMN type, give a type an **`"extends": ["bpmn:FlowNode"]`** — this injects the property without creating a new element.
- To define a *new element* that plugs into `<extensionElements/>`, subclass the moddle base type: **`"superClass": ["Element"]`**.
- Property flags: **`"isAttr": true`** => serialized as an XML attribute; **`"isMany": true`** => a repeating child element (a collection). Properties also have a `type` (`String`, `Float`, or another custom type).
- Register the descriptor with the **`moddleExtensions`** option keyed by prefix.

```json
{
  "name": "QualityAssurance",
  "uri": "http://some-company/schema/bpmn/qa",
  "prefix": "qa",
  "types": [
    {
      "name": "AnalyzedNode",
      "extends": [ "bpmn:FlowNode" ],
      "properties": [
        { "name": "suitable", "isAttr": true, "type": "Float" }
      ]
    },
    {
      "name": "AnalysisDetails",
      "superClass": [ "Element" ],
      "properties": [
        { "name": "comments", "isMany": true, "type": "Comment" }
      ]
    }
  ]
}
```

```javascript
import qaPackage from './qa.json';

const modeler = new BpmnModeler({
  moddleExtensions: { qa: qaPackage }
});

// read/write via the business object:
element.businessObject.get('qa:suitable');
```

### (b) bpmn-js module (renderer / rules / palette / context pad)

**What it is.** A [diagram-js](https://github.com/bpmn-io/diagram-js) DI module passed to `additionalModules` to amend or replace editor behaviour. A module is a plain object: `__init__` lists services to instantiate eagerly; each entry is a DI registration (`['type', Class]` instantiates the class; classes declare deps via static `$inject`).

```javascript
// app/custom/index.js (bpmn-js-example-custom-controls, verbatim shape)
import CustomContextPad from './CustomContextPad';
import CustomPalette from './CustomPalette';

export default {
  __init__: [ 'customContextPad', 'customPalette' ],
  customContextPad: [ 'type', CustomContextPad ],
  customPalette: [ 'type', CustomPalette ]
};

// usage
const modeler = new BpmnModeler({ additionalModules: [ customModule ] });
```

Common things you build as modules:

- **Custom renderer** — extend `BaseRenderer` (usually with a high priority like `1500`), implement `canRender(element)`, `drawShape(parentNode, element)`, and `getShapePath(shape)` (connection cropping). See [bpmn-js-example-custom-rendering](https://github.com/bpmn-io/bpmn-js-example-custom-rendering).

  ```javascript
  import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
  const HIGH_PRIORITY = 1500;
  export default class CustomRenderer extends BaseRenderer {
    constructor(eventBus) { super(eventBus, HIGH_PRIORITY); }
    canRender(element) { /* e.g. only tasks/events, ignore labels */ }
    drawShape(parentNode, element) { /* draw + return gfx */ }
    getShapePath(shape) { /* return path for connection cropping */ }
  }
  CustomRenderer.$inject = [ 'eventBus' ];
  ```

- **Custom modeling rules** — a `RuleProvider` that calls `this.addRule('shape.create', fn)`, returning `false` to forbid an action. See [custom-modeling-rules](https://github.com/bpmn-io/bpmn-js-examples/tree/main/custom-modeling-rules).

  ```javascript
  this.addRule('shape.create', function(context) {
    const shapeBo  = context.shape.businessObject,
          targetBo = context.parent.businessObject;
    const allowDrop = targetBo.get('vendor:allowDrop');
    if (!allowDrop || !shapeBo.$instanceOf(allowDrop)) {
      return false; // forbid the create
    }
  });
  ```

- **Palette + context-pad providers** — implement `getPaletteEntries()` / `getContextPadEntries()` to add new create/append controls (e.g. `elementFactory.createShape({ type: 'bpmn:ServiceTask' })`). See [bpmn-js-example-custom-controls](https://github.com/bpmn-io/bpmn-js-example-custom-controls). The combined [bpmn-js-example-custom-elements](https://github.com/bpmn-io/bpmn-js-example-custom-elements) stitches together model extension + custom rendering + custom controls.

### (c) properties panel provider

**What it is.** A module (via [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel)) that adds sidebar groups/entries to edit properties. Wire the panel modules, set `propertiesPanel.parent`, import the CSS, and register a provider class that calls `propertiesPanel.registerProvider(PRIORITY, this)` and implements `getGroups(element)` returning a `(groups) => groups` transformer.

```javascript
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule }
  from 'bpmn-js-properties-panel';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [ BpmnPropertiesPanelModule, BpmnPropertiesProviderModule ]
});

class ExampleProvider {
  constructor(propertiesPanel) { propertiesPanel.registerProvider(500, this); }
  getGroups(element) { return (groups) => groups; }
}
ExampleProvider.$inject = [ 'propertiesPanel' ];
```

Official examples: `properties-panel`, `properties-panel-extension`, `properties-panel-list-extension`, `properties-panel-async-extension` in the [examples monorepo](https://github.com/bpmn-io/bpmn-js-examples). **This is one of the two extension types this repo uses** (see §7).

### (d) element templates

**What it is.** Reusable JSON template descriptors that bind a set of properties to a BPMN element's fields, so users pick a template instead of editing raw properties. Wire it as a properties-panel provider module: add `ElementTemplatesPropertiesProviderModule` (Camunda 7) or `CloudElementTemplatesPropertiesProviderModule` (Camunda 8) alongside the panel modules. The template JSON schema is governed by the separate [element-templates](https://github.com/bpmn-io/element-templates) spec repo.

```javascript
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule }
  from 'bpmn-js-properties-panel';
import { ElementTemplatesPropertiesProviderModule }
  from 'bpmn-js-element-templates';

const modeler = new BpmnModeler({
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    ElementTemplatesPropertiesProviderModule
  ]
});
```

### (e) bpmnlint plugin

**What it is.** A custom validation rule. A rule is a module exporting a **factory function** that returns an object with a `check(node, reporter)` method; the `is`/`isAny` helpers come from [bpmnlint-utils](https://github.com/bpmn-io/bpmnlint-utils). Plugins are npm packages named **`bpmnlint-plugin-<NAME>`** (the prefix is required for `plugin:<NAME>/...` resolution) and are referenced from a `.bpmnlintrc` config.

```javascript
// bpmnlint-plugin-example/rules/no-manual-task.js (verbatim)
const { is } = require('bpmnlint-utils');

module.exports = function() {
  function check(node, reporter) {
    if (is(node, 'bpmn:ManualTask')) {
      reporter.report(node.id, 'Element has disallowed type bpmn:ManualTask');
    }
  }
  return { check: check };
};
```

```json
{
  "extends": [
    "bpmnlint:recommended",
    "plugin:foo/recommended"
  ],
  "rules": { "label-required": "off" },
  "moddleExtensions": {
    "custom": "custom-bpmn-moddle/resources/custom.json"
  }
}
```

Rulesets: `bpmnlint:recommended` (best-practice + compliance), `bpmnlint:correctness` (compliance only), `bpmnlint:all` (everything as errors). For in-editor linting, [bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint) provides a `lintModule` (add to `additionalModules`) and reads the config via `linting: { bpmnlint: bpmnlintConfig }`. See the reference [bpmnlint-plugin-example](https://github.com/bpmn-io/bpmnlint-plugin-example).

---

## 7. This repository as a worked example

This repo is an npm-workspaces monorepo of **two independent bpmn-js extension libraries** (plus an optional Vue 3 wrapper and a vanilla demo). It adds clinical semantics to BPMN 2.0 **purely via standard `<extensionElements>`** under two custom XML namespaces. It is raw ESM (JS + JSDoc, no build step for the libraries), tested with Vitest. For the design rationale and the full data model see [ARCHITECTURE.md](ARCHITECTURE.md); for the layout and commands see [CONTRIBUTING.md](../CONTRIBUTING.md).

**Which of the five extension types this repo uses.** Exactly **two**, implemented once per package:

| Extension type | In this repo? | Concrete artifact |
|---|---|---|
| **(a) moddle model extension** | **Yes (×2)** | [`packages/terminology/src/moddle/clinical.json`](../packages/terminology/src/moddle/clinical.json), [`packages/fhir-mapping/src/moddle/fhir-mapping.json`](../packages/fhir-mapping/src/moddle/fhir-mapping.json) |
| **(c) properties panel provider** | **Yes (×2)** | [`packages/terminology/src/properties-panel/TerminologyPropertiesProvider.js`](../packages/terminology/src/properties-panel/TerminologyPropertiesProvider.js) (+ its `index.js` DI module), [`packages/fhir-mapping/src/properties-panel/FhirMappingPropertiesProvider.js`](../packages/fhir-mapping/src/properties-panel/FhirMappingPropertiesProvider.js) (+ its `index.js`) |
| **(b) bpmn-js module** (renderer) | No | not present — clinical data never touches rendering; use the canonical upstream [custom-rendering](https://github.com/bpmn-io/bpmn-js-example-custom-rendering) example if you ever need one |
| **(b) bpmn-js module** (rules) | No | not present — no `RuleProvider`; use the canonical [custom-modeling-rules](https://github.com/bpmn-io/bpmn-js-examples/tree/main/custom-modeling-rules) example |
| **(d) element templates / (e) bpmnlint plugin** | No | `.bpmnlintrc` consumes only the stock configs `["bpmnlint:recommended", "bpmnlint:correctness"]`; there is no `bpmnlint-plugin-*` package and no element-template files |

This is a deliberate design choice (see [AGENTS.md](../AGENTS.md) hard rules): clinical data lives in `<extensionElements>` and never changes BPMN core structure or rendering, which is why only the *data model* (a) and the *editing UI* (c) extension types are needed.

### (a) The two moddle descriptors — package identity

| Package (npm name) | Prefix | moddle `name` | Namespace URI | `xml.tagAlias` |
|---|---|---|---|---|
| `@forschungsgruppe-digital-health/terminology` | `term:` | `ClinicalTerminology` | `https://clinical-bpmn.org/terminology/v1` | `lowerCase` |
| `@forschungsgruppe-digital-health/fhir-mapping` | `fhirmap:` | `FhirMapping` | `https://clinical-bpmn.org/fhir-mapping/v1` | `lowerCase` |

Both descriptors use the two structural idioms from §6a:

1. **`extends` an existing bpmn type** to hang a namespaced attribute on it, *without* creating a new element. In terminology, the `Annotatable` type extends four BPMN types and adds the `clinicalDomain` attribute (this is what produces `term:clinicalDomain="staging"` on a task):

   ```json
   {
     "name": "Annotatable",
     "extends": [ "bpmn:FlowNode", "bpmn:DataObjectReference", "bpmn:DataStoreReference", "bpmn:MessageFlow" ],
     "properties": [ { "name": "clinicalDomain", "isAttr": true, "type": "String" } ]
   }
   ```

   In fhir-mapping the parallel type `MappedElement` extends the same four BPMN types but has empty `properties` — it reserves the extension point as a marker without adding attributes.

2. **`superClass: ["Element"]` to define a real custom element** that lives inside `<extensionElements>`. Nesting/cardinality is `isMany: true`; scalar attributes are `isAttr: true`. In terminology:

   ```json
   {
     "name": "Annotation",
     "superClass": [ "Element" ],
     "properties": [
       { "name": "aspect", "isAttr": true, "type": "String" },
       { "name": "mode",   "isAttr": true, "type": "String" },
       { "name": "text",   "isAttr": true, "type": "String" },
       { "name": "codings", "isMany": true, "type": "Coding" }
     ]
   }
   ```

The full type hierarchies are: **terminology** — `Annotatable` (extends) + `Annotations` → `Annotation` → `Coding`; **fhir-mapping** — `MappedElement` (extends) + `ResourceMappings` → `ResourceMapping` → `KeyElement` / `SearchParam`. The class diagrams for both are in [arc42/08 § Annotation and Mapping Data Model](arc42/08_crosscutting_concepts.md#annotation-and-mapping-data-model).

> **`tagAlias: lowerCase`** lowercases the *first* letter of a moddle PascalCase type name to produce the XML tag — so `Annotations` serializes as `<term:annotations>` and `ResourceMappings` as `<fhirmap:resourceMappings>`.
>
> **Note:** the moddle descriptor is the single source of truth for the schema. ARCHITECTURE.md's prose mentions an optional annotation `target` (FHIRPath) concept that is **not** defined in the shipped `clinical.json` — do not treat `target` as part of the `term:` schema.

### (c) The two properties-panel providers — the registration pattern

Both providers follow the identical bpmn-js-properties-panel idiom: the constructor takes injected `propertiesPanel` + `translate`, registers at `LOW_PRIORITY = 500`, declares `$inject`, and `getGroups(element)` returns a `(groups) => groups` transformer that, after an `is(element, type)` guard against a `TARGET_TYPES` allow-list, pushes a group. From [`TerminologyPropertiesProvider.js`](../packages/terminology/src/properties-panel/TerminologyPropertiesProvider.js):

```javascript
export default function TerminologyPropertiesProvider(propertiesPanel, translate) {
  propertiesPanel.registerProvider(500 /* LOW_PRIORITY */, this);
  this._translate = translate;
}
TerminologyPropertiesProvider.$inject = ['propertiesPanel', 'translate'];

TerminologyPropertiesProvider.prototype.getGroups = function (element) {
  const translate = this._translate;
  return function (groups) {
    if (!TARGET_TYPES.some(type => is(element, type))) return groups;
    groups.push({
      id: 'clinical-terminology',
      label: translate('Klinische Annotation'),
      entries: [ { id: 'clinical-domain', component: ClinicalDomainEntry,
        isEdited: () => !!element.businessObject.get('term:clinicalDomain') } ]
    });
    return groups;
  };
};
```

(The user-facing label string above — `'Klinische Annotation'` — is reproduced verbatim from the repo source; the panel's UI label strings in this repo are German and are kept here unchanged so the snippet stays faithful to the file.)

Each entry is `{ id, component, isEdited }` where `component` is a Preact component (`htm/preact`). The DI module — the object actually consumed as an `additionalModules` entry — is tiny ([`properties-panel/index.js`](../packages/terminology/src/properties-panel/index.js)):

```javascript
import TerminologyPropertiesProvider from './TerminologyPropertiesProvider.js';
export default {
  __init__: ['terminologyPropertiesProvider'],
  terminologyPropertiesProvider: ['type', TerminologyPropertiesProvider]
};
```

Entry components read/write the moddle via `useService('modeling')` ([`ClinicalDomainEntry.js`](../packages/terminology/src/properties-panel/entries/ClinicalDomainEntry.js)):

```javascript
const bo = element.businessObject;
const value = bo.get('term:clinicalDomain') || '';
modeling.updateModdleProperties(element, bo, { 'term:clinicalDomain': val || undefined });
```

> **The two providers have different `TARGET_TYPES` allow-lists.** Terminology targets the task types (incl. `ScriptTask` and `BusinessRuleTask`) plus `SubProcess`, the two data references (`DataObjectReference`/`DataStoreReference`), and start/end/intermediate-throw/catch events — but **not** gateways. fhir-mapping targets a *narrower* task set (the same task types **minus** `ScriptTask` and `BusinessRuleTask`) plus `SubProcess`, the two data references, and `MessageFlow` — gateways and events are **not** in fhir-mapping's list.

### Package exports and the two import styles

Both packages use the canonical three-subpath `exports` plus a barrel that re-exports the descriptor and panel module as named exports, so consumers have two equivalent import styles. terminology: `"."` → `./src/index.js`; `"./moddle"` → `./src/moddle/clinical.json`; `"./properties-panel"` → `./src/properties-panel/index.js`; plus `"./providers/presets"`. fhir-mapping has the same minus presets.

```javascript
// subpath style
import descriptor from '@forschungsgruppe-digital-health/terminology/moddle';
import panel      from '@forschungsgruppe-digital-health/terminology/properties-panel';

// named (barrel) style — what the README quick start uses
import {
  TerminologyModdleDescriptor, TerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/terminology';
import {
  FhirMappingModdleDescriptor, FhirMappingPropertiesPanelModule
} from '@forschungsgruppe-digital-health/fhir-mapping';
```

A consumer wires both extensions exactly as the abstract types describe — `moddleExtensions` keyed by prefix registers the XML schema (a), `additionalModules` registers the panel providers (c) (see [README § Quick Start](../README.md#quick-start)):

```javascript
const modeler = new BpmnModeler({
  additionalModules: [ BpmnPropertiesPanelModule, BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule, FhirMappingPropertiesPanelModule ],
  moddleExtensions: { term: TerminologyModdleDescriptor, fhirmap: FhirMappingModdleDescriptor }
});
```

### The real annotated `<extensionElements>` (from this repo)

From [`examples/minimal/lung-cancer-staging-annotated.bpmn`](../examples/minimal/lung-cancer-staging-annotated.bpmn) — both namespaces are declared on `<bpmn2:definitions>` (`xmlns:term="https://clinical-bpmn.org/terminology/v1"`, `xmlns:fhirmap="https://clinical-bpmn.org/fhir-mapping/v1"`), `term:clinicalDomain` rides as a foreign attribute, and the `<term:annotations>` and `<fhirmap:resourceMappings>` containers sit as independent siblings inside `<bpmn2:extensionElements>`:

```xml
<bpmn2:task id="Task_Staging" name="Perform TNM Staging" term:clinicalDomain="staging">
  <bpmn2:extensionElements>

    <!-- Terminology annotations (term: namespace) -->
    <term:annotations>
      <term:annotation aspect="clinicalContent" mode="descriptive"
                       text="Clinical TNM staging to determine tumor stage">
        <term:coding system="http://snomed.info/sct" code="254292007"
                     display="Tumor staging (tumor staging)"/>
        <term:coding system="http://loinc.org" code="21908-9"
                     display="Stage group.clinical Cancer"/>
      </term:annotation>
    </term:annotations>

    <!-- FHIR resource mappings (fhirmap: namespace) -->
    <fhirmap:resourceMappings>
      <fhirmap:resourceMapping resourceType="Observation"
                               interaction="create" direction="output">
        <fhirmap:keyElement path="Observation.status"
                            semanticRole="trigger" fixedValue="final"/>
      </fhirmap:resourceMapping>
    </fhirmap:resourceMappings>

  </bpmn2:extensionElements>
</bpmn2:task>
```

The two namespaces are fully independent; a non-clinical BPMN tool ignores both and round-trips them on re-save.

---

## 8. Validating an extension

This repo ships a **deterministic conformance gate** (the decision lives in the CLI tool, never in any model or agent), wired to npm scripts and run identically in the terminal, git hooks, VS Code tasks, and agent skills. The full table is in [CONTRIBUTING.md § Conformance and Quality Checks](../CONTRIBUTING.md#conformance-and-quality-checks) and [AGENTS.md § Quality gate](../AGENTS.md). The three layers map onto the concepts in this primer:

```bash
npm run lint:bpmn        # bpmnlint (recommended + correctness)        — BLOCKING (structure)
npm run check:roundtrip  # moddle parse -> serialize is stable          — BLOCKING (extension data)
npm run check:xsd        # xmllint vs OMG BPMN20.xsd                     — INFORMATIONAL (standard core)
npm run check:conformance # = lint:bpmn && check:roundtrip && check:xsd
npm run check:packages   # npm/bpmn.io publishing conventions           — BLOCKING
npm run verify           # = check:packages && check:conformance && npm test  (the full gate; pre-push runs this)
```

- **bpmnlint — structure (blocking).** `npm run lint:bpmn` runs `node tools/lint-bpmn.mjs` with the stock `bpmnlint:recommended` + `bpmnlint:correctness` rulesets (§6e concept) and proves valid BPMN structure: connectedness, start/end events, no implicit splits, no dangling refs. This repo does **not** ship a custom `bpmnlint-plugin-*`.
- **moddle roundtrip — extension data (blocking).** `npm run check:roundtrip` runs `node tools/moddle-roundtrip.mjs`, which proves your `term:`/`fhirmap:` data survives `fromXML` → `toXML` unchanged and that the serialization is stable. This is the round-trip test idea: parse the XML into business objects with your moddle descriptor registered, serialize back, and assert the extension content is byte-stable. It is **blocking on instability**; moddle parse warnings (extension content not described by the model) are non-fatal *unless* you add `--strict`: `node tools/moddle-roundtrip.mjs --strict` promotes them to failures. **This is the authoritative check that your moddle descriptor (§7a) is correct** — not the XSD.
- **XSD core — standard core (informational), with the lax caveat.** `npm run check:xsd` runs `bash tools/validate-xsd.sh` (xmllint vs the OMG `BPMN20.xsd`). It is **informational by default**: because the standard XSD accepts *anything* inside `<extensionElements>` via `processContents="lax"` (§4), a green XSD does **not** mean your extensions are valid — that verdict comes from the moddle roundtrip. It does confirm the BPMN *core* still matches the standard schema; `bash tools/validate-xsd.sh --strict` enforces the core when you need standard conformance. (This is also why the repo attaches clinical extensions to flow elements/data references and never to `<definitions>` — see the BPMN21-416 caveat in §4.)
- **package conventions (blocking).** `npm run check:packages` runs `node tools/check-package-conventions.mjs` to enforce npm/bpmn.io publishing rules (name prefix, ESM, license, entry point, peer dependencies, registry config).

To register a new `.bpmn` location for these checks, edit `ROOTS` in `tools/bpmn-files.mjs` (the single file-discovery source). The agent skill **`skills/bpmn-conformance`** (`SKILL.md`) orchestrates exactly these same tools and then explains the results; companion skills `skills/moddle-extension-review` and `skills/bpmn-naming-publishing` review descriptor and packaging changes. Before opening a PR, run `npm run verify` and follow the PR checklist in [CONTRIBUTING.md § Pull Requests](../CONTRIBUTING.md#pull-requests).

> **Hard rule reminder (from [AGENTS.md](../AGENTS.md)):** a moddle descriptor change that renames or removes a type or property is a **breaking (MAJOR)** change and needs human sign-off; clinical data goes only under your custom prefix inside `<extensionElements>`, never in the `bpmn:`/`bpmndi:` namespace.

---

## 9. Further reading

### bpmn.io

- [bpmn.io — project homepage](https://bpmn.io/) — the three toolkits (bpmn-js, dmn-js, form-js).
- [bpmn-js toolkit landing page](https://bpmn.io/toolkit/bpmn-js/) and the [bpmn-js Walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/) — the canonical guided tour of bpmn-js internals (DI/modules, import/export, rendering).
- [demo.bpmn.io](https://demo.bpmn.io/) — live reference modeler (shows the watermark and full feature set).
- Core packages: [bpmn-js](https://github.com/bpmn-io/bpmn-js) ([LICENSE](https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/LICENSE)), [diagram-js](https://github.com/bpmn-io/diagram-js), [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle), [moddle](https://github.com/bpmn-io/moddle), [moddle-xml](https://github.com/bpmn-io/moddle-xml).
- Extension packages: [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel), [bpmn-js-element-templates](https://github.com/bpmn-io/bpmn-js-element-templates) (+ the [element-templates](https://github.com/bpmn-io/element-templates) spec), [bpmnlint](https://github.com/bpmn-io/bpmnlint), [bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint), [bpmnlint-utils](https://github.com/bpmn-io/bpmnlint-utils).
- Examples: [bpmn-js-examples](https://github.com/bpmn-io/bpmn-js-examples) (incl. [custom-meta-model](https://github.com/bpmn-io/bpmn-js-examples/tree/main/custom-meta-model), [custom-modeling-rules](https://github.com/bpmn-io/bpmn-js-examples/tree/main/custom-modeling-rules)), and the standalone [custom-rendering](https://github.com/bpmn-io/bpmn-js-example-custom-rendering), [custom-controls](https://github.com/bpmn-io/bpmn-js-example-custom-controls), [custom-elements](https://github.com/bpmn-io/bpmn-js-example-custom-elements), and [bpmnlint-plugin-example](https://github.com/bpmn-io/bpmnlint-plugin-example).
- [awesome-bpmn-io](https://github.com/bpmn-io/awesome-bpmn-io) — curated index of libraries, extensions, and learning resources.
- [bpmn.io community forum](https://forum.bpmn.io/) and the docs source repo [docs.bpmn.io](https://github.com/bpmn-io/docs.bpmn.io) (archived on GitHub as of 2023-10-23; the formerly canonical docs site at `docs.bpmn.io` is currently unreachable, so prefer the GitHub source or the Wayback Machine for cached versions).
- npm: [bpmn-js on npm](https://www.npmjs.com/package/bpmn-js), [bpmn-io npm org](https://www.npmjs.com/org/bpmn-io).

### OMG BPMN standard

- [BPMN 2.0.2 specification — versioned landing page](https://www.omg.org/spec/BPMN/2.0.2/) and the [About-BPMN page](https://www.omg.org/spec/BPMN/2.0.2/About-BPMN); the normative [2.0.2 PDF](https://www.omg.org/spec/BPMN/2.0.2/PDF).
- [OMG BPMN program home page](https://www.omg.org/bpmn/).
- The official schemas (under `https://www.omg.org/spec/BPMN/20100501/`): [BPMN20.xsd](https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd), [Semantic.xsd](https://www.omg.org/spec/BPMN/20100501/Semantic.xsd), [BPMNDI.xsd](https://www.omg.org/spec/BPMN/20100501/BPMNDI.xsd), [DI.xsd](https://www.omg.org/spec/BPMN/20100501/DI.xsd), [DC.xsd](https://www.omg.org/spec/BPMN/20100501/DC.xsd).
- [OMG BPMN issue tracker](https://issues.omg.org/issues/spec/BPMN/2.0) — home of issue BPMN21-416 (the `tDefinitions`/`extensionElements` gap).
- [ISO/IEC 19510 — OMG-hosted PDF](https://www.omg.org/spec/BPMN/ISO/19510/PDF) — the international-standard form of BPMN 2.0/2.0.1.
- [BPMN 2.0 by Example, Version 1.0 (non-normative), June 2010](http://www.omg.org/spec/BPMN/20100601/10-06-02.pdf) (http only — the https variant currently 404s; OMG catalog entry: [dtc/10-06-02](https://www.omg.org/cgi-bin/doc?dtc/10-06-02)).
