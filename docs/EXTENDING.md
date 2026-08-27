# Extending bpmn.io — A Developer Primer for the Terminology Extension

This primer is for a developer who is new to BPMN and [bpmn.io](https://bpmn.io/)
but needs to understand and extend the terminology extension in this
repository. It introduces BPMN 2.0 and its XML representation, the standard
extension mechanism, the bpmn.io toolkit, and the main extension points used
here: a moddle model extension, a properties-panel provider, and a bpmnlint
plugin.

For project usage, start with the [README](../README.md). For architecture and
design rationale, see [ARCHITECTURE.md](ARCHITECTURE.md). For setup, quality
gates, and release workflow, see [CONTRIBUTING.md](../CONTRIBUTING.md). The
repository rules in [AGENTS.md](../AGENTS.md) define the hard boundary that
clinical data belongs only in `term:` elements under BPMN
`<extensionElements>`.

## Table of Contents

1. [Introduction](#1-introduction)
2. [BPMN in a nutshell](#2-bpmn-in-a-nutshell)
3. [BPMN XML structure](#3-bpmn-xml-structure)
4. [Extending BPMN and BPMN XML](#4-extending-bpmn-and-bpmn-xml)
5. [What is bpmn.io](#5-what-is-bpmnio)
6. [The five ways to extend bpmn.io](#6-the-five-ways-to-extend-bpmnio)
   - [Moddle model extension](#a-moddle-model-extension)
   - [bpmn-js module](#b-bpmn-js-module-renderer-rules-palette-and-context-pad)
   - [Properties-panel provider](#c-properties-panel-provider)
   - [Element templates](#d-element-templates)
   - [bpmnlint plugin](#e-bpmnlint-plugin)
7. [This repository as a worked example](#7-this-repository-as-a-worked-example)
8. [Validating an extension](#8-validating-an-extension)
9. [Further reading](#9-further-reading)

## 1. Introduction

**Who this is for.** You write web frontends or tooling and have been asked to
work on `@forschungsgruppe-digital-health/terminology`. You may know JavaScript
but not yet know how BPMN semantics, BPMN XML, bpmn-moddle, and bpmn-js fit
together.

**What you can do after reading.** You will be able to:

- read a `.bpmn` file and identify its namespaces and semantic/layout layers;
- explain why custom terminology data belongs in standard
  `<extensionElements>`;
- distinguish moddle data-model extensions, bpmn-js modules, properties-panel
  providers, element templates, and bpmnlint plugins;
- find the descriptor, panel provider, provider services, and lint rule in this
  repository;
- make a compatible terminology change and run the deterministic quality gate.

This repository publishes one raw-ESM package under `extension/`. The
`demo/` workspace is a private bpmn-js integration example, and
`extension/lint/bpmnlint-plugin-terminology/` is a private workspace containing
the terminology lint plugin used by the repository-level configuration.

## 2. BPMN in a nutshell

**Business Process Model and Notation (BPMN)** is a graphical notation
maintained by the [Object Management Group (OMG)](https://www.omg.org/bpmn/).
It is intended to be understandable as a process diagram while remaining
precise enough for software tooling. BPMN is independent of a particular
editor or execution engine.

- BPMN 2.0 was released in January 2011.
- The current OMG maintenance revision is **2.0.2**; see the
  [BPMN 2.0.2 specification page](https://www.omg.org/spec/BPMN/2.0.2/).
- BPMN is also published as ISO/IEC 19510. The ISO form corresponds to the
  BPMN 2.0.1 specification; see the
  [OMG-hosted ISO PDF](https://www.omg.org/spec/BPMN/ISO/19510/PDF).

The core element kinds commonly encountered in a process are:

- **Activities** — units of work such as `task`, `subProcess`, and
  `callActivity`;
- **Events** — things that happen, including start, intermediate, and end
  events;
- **Gateways** — branching or merging, such as exclusive and parallel
  gateways;
- **Sequence flows** — directed connectors that order activities and events;
- **Data** — data objects, data stores, and their associations;
- **Collaboration constructs** — participants and `messageFlow` connectors.

The semantic elements are usually contained by a `<process>` or
`<collaboration>`. A BPMN document also contains diagram-interchange elements
that describe how those semantics are laid out.

## 3. BPMN XML structure

A BPMN file carries semantics and layout in one XML document, but they use
different namespaces. The root is `<definitions>` (XSD type `tDefinitions`) and
its `targetNamespace` is required.

| Layer | Conventional prefix | Namespace URI | Specification |
|---|---|---|---|
| Semantic BPMN model | `bpmn` / `bpmn2` | `http://www.omg.org/spec/BPMN/20100524/MODEL` | BPMN |
| BPMN diagram interchange | `bpmndi` | `http://www.omg.org/spec/BPMN/20100524/DI` | BPMN |
| Generic diagram interchange | `di` | `http://www.omg.org/spec/DD/20100524/DI` | Diagram Definition |
| Diagram common primitives | `dc` | `http://www.omg.org/spec/DD/20100524/DC` | Diagram Definition |

Under `<definitions>` are root semantic elements such as a process or
collaboration and one or more `bpmndi:BPMNDiagram` elements. A
`bpmndi:BPMNPlane` identifies the semantic root. `bpmndi:BPMNShape` elements
refer to semantic elements with `bpmnElement` and contain `dc:Bounds`;
`bpmndi:BPMNEdge` elements contain `di:waypoint` points for connections.

The following skeleton shows the separation:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
    xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    targetNamespace="https://example.org/process">

  <process id="Process_1" isExecutable="false">
    <startEvent id="Start_1"/>
    <task id="Task_1" name="Do something"/>
    <endEvent id="End_1"/>
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1"/>
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End_1"/>
  </process>

  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane bpmnElement="Process_1">
      <bpmndi:BPMNShape bpmnElement="Task_1">
        <dc:Bounds x="160" y="80" width="100" height="80"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

The official schemas are hosted under
`https://www.omg.org/spec/BPMN/20100501/`: [BPMN20.xsd](https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd),
[Semantic.xsd](https://www.omg.org/spec/BPMN/20100501/Semantic.xsd),
[BPMNDI.xsd](https://www.omg.org/spec/BPMN/20100501/BPMNDI.xsd),
[DI.xsd](https://www.omg.org/spec/BPMN/20100501/DI.xsd), and
[DC.xsd](https://www.omg.org/spec/BPMN/20100501/DC.xsd).

## 4. Extending BPMN and BPMN XML

BPMN is designed to be extended without changing the standard model. The
standard hook is `<extensionElements>`, available on BPMN base elements.
Its XSD type accepts foreign child elements:

```xml
<bpmn2:task id="Task_1">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1" text="Synthetic terminology note"/>
    </term:annotations>
  </bpmn2:extensionElements>
</bpmn2:task>
```

### Foreign namespaces and prefixes

Foreign child elements inside `<extensionElements>` must use a namespace other
than the BPMN model namespace. This repository uses only:

```xml
xmlns:term="https://clinical-bpmn.org/terminology/v1"
```

Do not invent terminology elements in the `bpmn:` namespace. Foreign
attributes are also permitted directly on BPMN elements because the BPMN base
type has an `xsd:anyAttribute` wildcard. This extension does not use foreign
attributes; terminology data is kept in `term:` child elements under
`extensionElements`.

`processContents="lax"` means a validator checks foreign content against a
known schema when one is available and otherwise tolerates it. A conformant
consumer can therefore preserve an extension it does not understand while
continuing to read the BPMN core.

### BPMN metamodel extensions

The BPMN metamodel also defines `Extension`, `ExtensionDefinition`,
`ExtensionAttributeDefinition`, and `ExtensionAttributeValue`. These formal
metamodel concepts are distinct from the practical XML wildcard. In bpmn-js,
a moddle descriptor is normally the useful implementation: it tells
bpmn-moddle which foreign types and properties to parse and serialize.

One XSD caveat is worth knowing: `tDefinitions` is a standalone type and does
not have an `extensionElements` child, even though the CMOF base model has one.
This is tracked as OMG issue
[BPMN21-416](https://issues.omg.org/issues/spec/BPMN/2.0). This repository
avoids the gap by placing terminology extensions on flow elements and data
references, not directly under `<definitions>`.

### Preserve a valid BPMN core

An extension must not change the BPMN core or BPMN-DI structures. The model
must remain readable by a consumer that ignores `term:` content.
`mustUnderstand="false"` (the default) communicates that an extension may be
ignored; this repository does not require a consumer to understand terminology
annotations in order to open the BPMN process.

### BPMN conformance classes

BPMN 2.0 defines four broad conformance points:

1. Process Modeling Conformance, including descriptive, analytic, and common
   executable sub-levels;
2. Process Execution Conformance;
3. BPEL Process Execution Conformance;
4. Choreography Modeling Conformance.

This repository and bpmn-js focus on process modeling and interchange. They do
not provide a workflow execution engine.

## 5. What is bpmn.io

[bpmn.io](https://bpmn.io/) is an open-source project for web-based tooling for
BPMN, DMN, and forms. The BPMN toolkit relevant here is
[bpmn-js](https://github.com/bpmn-io/bpmn-js), which combines:

- **bpmn-moddle**, the semantic model that reads and writes BPMN XML;
- **moddle** and **moddle-xml**, the metamodel and XML serialization layers;
- **diagram-js**, the visual/editor infrastructure for rendering, modeling,
  rules, palette, and context pad.

Each graphical element has a `businessObject` containing its semantic
bpmn-moddle object. Dependency injection (DI) wires services and modules.
`additionalModules` is the main way an embedding application adds editor
services.

Other useful bpmn.io components include:

- [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel),
  which adds an editable sidebar;
- [bpmn-js-element-templates](https://github.com/bpmn-io/bpmn-js-element-templates),
  which binds reusable JSON templates to element fields;
- [bpmnlint](https://github.com/bpmn-io/bpmnlint), a CLI/library for diagram
  rules, and [bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint),
  which integrates linting into a modeler.

The [bpmn-js Walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/) and
[bpmn-js examples](https://github.com/bpmn-io/bpmn-js-examples) are the best
starting points for internals and extension patterns.

When embedding bpmn-js, also observe the
[bpmn-js license](https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/LICENSE):
the bpmn.io watermark must remain visible and must not be removed or obscured.

## 6. The five ways to extend bpmn.io

| Extension type | Purpose | Mechanism | Persisted in BPMN XML? |
|---|---|---|---|
| **(a) Moddle model extension** | Add a namespace and custom types/attributes | JSON descriptor passed as `moddleExtensions` | Yes, as foreign attributes/elements |
| **(b) bpmn-js module** | Change rendering, rules, palette, or context-pad behavior | diagram-js DI module in `additionalModules` | Usually no |
| **(c) Properties-panel provider** | Add editable sidebar groups and entries | Provider registered with `propertiesPanel` | Indirectly, through the business object |
| **(d) Element templates** | Offer reusable pre-configured property sets | JSON templates and a templates provider | Yes, for bound values |
| **(e) bpmnlint plugin** | Add custom validation rules | `bpmnlint-plugin-<name>` referenced by `.bpmnlintrc` | No |

This repository uses (a), (c), and (e). It deliberately does not add custom
rendering or element templates.

### (a) Moddle model extension

A descriptor adds a namespace and types to the BPMN metamodel. Its common
top-level keys are `name`, `uri`, `prefix`, and `types`.

- `extends` adds properties to an existing BPMN type without creating a new
  XML element.
- `superClass: ["Element"]` defines a custom element that can live under
  `<extensionElements>`.
- `isAttr: true` serializes a property as an XML attribute.
- `isMany: true` makes a repeating child collection.

The descriptor in this repository is
[`extension/src/moddle/clinical.json`](../extension/src/moddle/clinical.json):

```json
{
  "name": "ClinicalTerminology",
  "uri": "https://clinical-bpmn.org/terminology/v1",
  "prefix": "term",
  "types": [
    {
      "name": "Annotations",
      "superClass": [ "Element" ],
      "properties": [
        { "name": "values", "isMany": true, "type": "Annotation" }
      ]
    },
    {
      "name": "Annotation",
      "superClass": [ "Element" ],
      "properties": [
        { "name": "id", "isAttr": true, "type": "String" },
        { "name": "text", "isAttr": true, "type": "String" },
        { "name": "codings", "isMany": true, "type": "Coding" }
      ]
    },
    {
      "name": "Coding",
      "superClass": [ "Element" ],
      "properties": [
        { "name": "system", "isAttr": true, "type": "String" },
        { "name": "version", "isAttr": true, "type": "String" },
        { "name": "code", "isAttr": true, "type": "String" },
        { "name": "display", "isAttr": true, "type": "String" }
      ]
    }
  ]
}
```

Register it under its prefix:

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { TerminologyModdleDescriptor }
  from '@forschungsgruppe-digital-health/terminology';

const modeler = new BpmnModeler({
  moddleExtensions: { term: TerminologyModdleDescriptor }
});
```

The descriptor is the source of truth. Do not document or emit properties
that are not present there. A descriptor change that renames or removes a type
or property is a breaking change and requires human sign-off.

### (b) bpmn-js module: renderer, rules, palette, and context pad

A bpmn-js module is a diagram-js DI module passed to `additionalModules`.
`__init__` lists services to instantiate, and registrations use DI entries:
`['type', Class]` for a class or `['value', instance]` for an existing value.

```js
import CustomContextPad from './CustomContextPad.js';
import CustomPalette from './CustomPalette.js';

const customModule = {
  __init__: [ 'customContextPad', 'customPalette' ],
  customContextPad: [ 'type', CustomContextPad ],
  customPalette: [ 'type', CustomPalette ]
};

const modeler = new BpmnModeler({
  additionalModules: [ customModule ]
});
```

Common services include a `BaseRenderer` implementation, a `RuleProvider`,
and palette/context-pad providers implementing `getPaletteEntries()` or
`getContextPadEntries()`. The canonical
[custom rendering](https://github.com/bpmn-io/bpmn-js-example-custom-rendering)
and
[custom modeling rules](https://github.com/bpmn-io/bpmn-js-examples/tree/main/custom-modeling-rules)
examples show these patterns. The terminology extension does not change
rendering or modeling controls.

### (c) Properties-panel provider

A properties-panel provider registers a group transformer. The host must add
the official panel modules, configure `propertiesPanel.parent`, and import
the panel CSS:

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import TerminologyPropertiesPanelModule
  from '@forschungsgruppe-digital-health/terminology/properties-panel';
import '@forschungsgruppe-digital-health/terminology/properties-panel.css';

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule
  ]
});
```

A provider receives injected services and returns a `(groups) => groups`
transformer:

```js
class ExampleProvider {
  constructor(propertiesPanel) {
    propertiesPanel.registerProvider(500, this);
  }

  getGroups(element) {
    return groups => groups;
  }
}

ExampleProvider.$inject = [ 'propertiesPanel' ];
```

In this repository,
[`TerminologyPropertiesProvider.js`](../extension/src/properties-panel/TerminologyPropertiesProvider.js)
adds the “Clinical annotations” group. Its entries edit
the `term:Annotations` collection through `modeling.updateModdleProperties`.
The panel currently targets tasks,
subprocesses, exclusive gateways, data references, and start, end, and
intermediate events.

### (d) Element templates

Element templates are reusable JSON definitions that bind configured values to
BPMN element fields. They are supplied through
[bpmn-js-element-templates](https://github.com/bpmn-io/bpmn-js-element-templates)
and a properties-panel provider. The terminology extension has no element
template files; use the upstream
[element templates specification](https://github.com/bpmn-io/element-templates)
when a future requirement needs this extension point.

### (e) bpmnlint plugin

A bpmnlint rule is a factory returning an object with `check(node, reporter)`.
The `is` and `isAny` helpers come from
[bpmnlint-utils](https://github.com/bpmn-io/bpmnlint-utils):

```js
const { is } = require('bpmnlint-utils');

module.exports = function () {
  function check(node, reporter) {
    if (is(node, 'bpmn:ManualTask')) {
      reporter.report(node.id, 'Manual tasks are not allowed here');
    }
  }

  return { check };
};
```

Plugins are named `bpmnlint-plugin-<name>` and referenced as
`plugin:<name>/...` in `.bpmnlintrc`. The current repository plugin lives at
[`extension/lint/bpmnlint-plugin-terminology/`](../extension/lint/bpmnlint-plugin-terminology/).
Its `annotation-requires-id` rule checks that every `term:Annotation` has a
non-empty ID containing only letters, numbers, dots, underscores, and hyphens:

```json
{
  "extends": [
    "bpmnlint:recommended",
    "bpmnlint:correctness",
    "plugin:terminology/recommended"
  ],
  "moddleExtensions": {
    "term": "./extension/src/moddle/clinical.json"
  }
}
```

The plugin workspace is intentionally private and uses the module format
expected by bpmnlint. The published package is the terminology extension, not
the lint plugin.

## 7. This repository as a worked example

The root is an npm-workspaces repository with one publishable extension, a
private demo, and a private lint-plugin workspace. The extension is raw ESM
JavaScript with JSDoc and is tested with Vitest.

| Concern | Current artifact |
|---|---|
| Published package | [`extension/`](../extension/) — `@forschungsgruppe-digital-health/terminology` |
| Private integration demo | [`demo/`](../demo/) |
| Terminology lint plugin | [`extension/lint/bpmnlint-plugin-terminology/`](../extension/lint/bpmnlint-plugin-terminology/) |
| Synthetic valid fixtures | [`examples/valid/`](../examples/valid/) |
| Synthetic negative fixtures | [`examples/invalid/`](../examples/invalid/) |
| Deterministic checks | [`tools/`](../tools/) |

### The `term:` descriptor

The three current descriptor types are:

1. `Annotations`, an `Element` container with many `Annotation` values;
2. `Annotation`, an `Element` with an `id`, optional `text`, and many
   `Coding` values;
3. `Coding`, an `Element` with `system`, optional `version`, `code`, and
   optional `display` attributes.

The lower-case tag alias means the types serialize as
`term:annotations`, `term:annotation`, and `term:coding`. A normal annotated
element therefore looks like this:

```xml
<bpmn2:task id="Task_Synthetic" name="Synthetic imaging review">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1"
                       text="Synthetic terminology annotation">
        <term:coding system="http://snomed.info/sct"
                     code="9990001"
                     display="Synthetic procedure concept"/>
        <term:coding system="http://loinc.org"
                     code="9990002"
                     display="Synthetic observation concept"/>
      </term:annotation>
    </term:annotations>
  </bpmn2:extensionElements>
</bpmn2:task>
```

The example is deliberately synthetic. In real models, coding systems and
codes must be governed by the application or terminology owner.

### Properties-panel integration

The public module is exported from
[`extension/src/properties-panel/index.js`](../extension/src/properties-panel/index.js).
`AnnotationListEntry` provides annotation and coding CRUD. The helper in
[`extension/src/services/AnnotationHelper.js`](../extension/src/services/AnnotationHelper.js)
creates `bpmn:ExtensionElements` and the `term:Annotations` container lazily,
maintains parent links, generates IDs, and reads or removes annotations.

### Terminology providers

The package separates the provider contract from protocol-specific adapters:

- `StaticProvider` supports local concepts and FHIR `CodeSystem` snapshots;
- `FhirProvider` and `FhirTerminologyAdapter` use FHIR terminology operations;
- `SnomedCtProvider` and `SnowstormAdapter` support SNOMED CT transport;
- `FallbackProvider` combines a package snapshot with a live provider;
- `TerminologyRegistry` presents a unified search, lookup, validation, and
  hierarchy facade.

The default configuration includes SNOMED CT, FHIR terminology providers for
systems such as LOINC, ICD-10-GM, OPS, and ATC, and bundled package-backed
providers. The package discovery service and the Vite plugin discover
installed FHIR terminology package resources as `CodeSystem` JSON and filter
them by exact canonical `CodeSystem.url`. See the
[README package-discovery section](../README.md#package-discovery-with-vite)
for consumer configuration.

## 8. Validating an extension

The quality gate is deterministic and is wired to npm scripts, CI, and local
hooks. It separates BPMN structure, terminology serialization, generated
schema checks, and package conventions:

```bash
npm run lint:bpmn             # bpmnlint structure and terminology rules
npm run check:roundtrip       # moddle parse -> serialize stability
npm run xsd:gen:check         # generated terminology XSD is current
npm run xsd:ext               # extension XSD checks
npm run check:xsd             # BPMN-core XSD check (informational)
npm run check:conformance     # all conformance checks above
npm run check:packages        # npm/bpmn.io publishing conventions
npm test                      # Vitest workspaces
npm run verify                # packages + conformance + tests
```

### bpmnlint — BPMN structure and terminology rules

`npm run lint:bpmn` runs [`tools/lint-bpmn.mjs`](../tools/lint-bpmn.mjs), which
discovers BPMN files under `examples/valid/` and `docs/` and invokes bpmnlint
with the repository `.bpmnlintrc`. The standard rules check BPMN correctness
such as connectedness, start/end events, implicit splits, and references. The
terminology plugin additionally checks annotation IDs. The negative fixtures
can be checked separately with `npm run lint:invalid`. A custom file list can
be passed to the script.

### Moddle roundtrip — extension data

`npm run check:roundtrip` runs
[`tools/moddle-roundtrip.mjs`](../tools/moddle-roundtrip.mjs). For each fixture
it:

1. parses XML with the shipped `term:` descriptor;
2. serializes it to XML;
3. parses and serializes the result again;
4. requires the second serialization to equal the first; and
5. compares the number of `term:` elements before and after parsing.

Serialization instability or dropped extension elements fails the check.
Unknown extension warnings are non-fatal by default and can be promoted with
`node tools/moddle-roundtrip.mjs --strict`. This is the authoritative check
for the terminology descriptor; the BPMN XSD cannot prove the shape of
foreign extension content.

### Generated extension schema

`npm run xsd:gen:check` verifies the generated terminology schema is current,
and `npm run xsd:ext` validates extension-specific schema expectations. These
checks complement, rather than replace, the moddle roundtrip.

### BPMN-core XSD — informational

`npm run check:xsd` runs `tools/validate-xsd.sh` against the OMG
`BPMN20.xsd`. The standard schema accepts foreign content under
`<extensionElements>` with `processContents="lax"`, so a green XSD result
confirms the BPMN core but does not validate the terminology model. Use
`bash tools/validate-xsd.sh --strict` when a strict core-schema result is
needed.

### Package conventions and the full gate

`npm run check:packages` runs
[`tools/check-package-conventions.mjs`](../tools/check-package-conventions.mjs)
against the published package. It checks the package name, ESM setup, license,
entry points, peer dependencies, and registry configuration.

Before opening a pull request, run `npm run verify`. If a change renames or
removes a descriptor type or property, stop for maintainer sign-off because it
is a breaking change.

## 9. Further reading

### bpmn.io

- [bpmn.io project homepage](https://bpmn.io/)
- [bpmn-js toolkit](https://bpmn.io/toolkit/bpmn-js/) and
  [Walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/)
- [Live reference modeler](https://demo.bpmn.io/)
- [bpmn-js](https://github.com/bpmn-io/bpmn-js),
  [diagram-js](https://github.com/bpmn-io/diagram-js),
  [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle),
  [moddle](https://github.com/bpmn-io/moddle), and
  [moddle-xml](https://github.com/bpmn-io/moddle-xml)
- [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel)
- [bpmn-js-element-templates](https://github.com/bpmn-io/bpmn-js-element-templates)
- [bpmnlint](https://github.com/bpmn-io/bpmnlint),
  [bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint), and
  [bpmnlint-utils](https://github.com/bpmn-io/bpmnlint-utils)
- [bpmn-js examples](https://github.com/bpmn-io/bpmn-js-examples) and the
  [awesome-bpmn-io index](https://github.com/bpmn-io/awesome-bpmn-io)

### OMG BPMN standard

- [BPMN 2.0.2 specification](https://www.omg.org/spec/BPMN/2.0.2/)
- [OMG BPMN program home](https://www.omg.org/bpmn/)
- [Official BPMN schemas](https://www.omg.org/spec/BPMN/20100501/)
- [OMG BPMN issue tracker](https://issues.omg.org/issues/spec/BPMN/2.0)
- [ISO/IEC 19510 PDF](https://www.omg.org/spec/BPMN/ISO/19510/PDF)
