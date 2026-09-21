---
title: XML schema
description: "The term: namespace, the moddle content model, the generated XSD, and what happens to annotated files in tools that do not know the extension."
---

Everything this extension does ends up as XML inside a `.bpmn` file. That XML is the part
of the system most likely to outlive the editor that produced it, the npm package, and this
documentation, so it is specified here in full: the namespace, every type and every
property, where the elements attach, what the generated XSD does and does not check, and
what a tool that has never heard of this extension does with an annotated file.

## The namespace

| | |
|---|---|
| Namespace URI | `https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1` |
| Conventional prefix | `term` |
| Moddle package name | `ClinicalTerminology` |
| Tag alias | `lowerCase` |

The URI is defined in
[`extension/src/moddle/clinical.json`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/moddle/clinical.json)
and repeated in
[`schema/clinical-semantics.xsd`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/schema/clinical-semantics.xsd).
Its [generated namespace reference](/ns/terminology/v1/) publishes the exact
content model together with the machine-readable descriptor and XSD.
A document declares it like any other foreign namespace:

```xml
<bpmn:definitions
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:term="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1"
    id="Definitions_1"
    targetNamespace="https://example.invalid/bpmn/process">
```

:::note[A namespace URI is both identifier and documentation address]
XML parsers compare this URI as an identifier and do not fetch it while reading a BPMN file.
The project nevertheless publishes a human-readable contract at the same address so a person
following the identifier can inspect the format, descriptor and XSD. The authority and its
operational consequences are fixed by
[ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md).
:::

### Stability rules

The `/v1` in the URI is the **data-format contract version**, not the package version. The
two move independently and deliberately:

- A release bumps the package version and its coupled release metadata in lockstep. The
  descriptor's `version` field is package metadata and does not change the namespace.
- The namespace `uri` is **never** bumped automatically. Changing it would orphan every
  diagram already written, so it changes only by hand, as a deliberate breaking change,
  accompanied by its own architecture decision record.

The release coupling is recorded in
[ADR-0001](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0001-versioning-and-release-please.md);
the namespace authority and format-version policy are recorded in
[ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md).

## The content model

Three types, in a strict containment chain: a container, the annotations inside it, and the
codes inside each annotation. All three declare `superClass: ["Element"]`, which in moddle
terms means each one is a free-standing extension element rather than an addition to a BPMN
type. Because the descriptor sets `xml.tagAlias: "lowerCase"`, the moddle type `Annotations`
serialises as `<term:annotations>`, `Annotation` as `<term:annotation>` and `Coding` as
`<term:coding>`.

```text
bpmn:extensionElements
└── term:annotations                (container, at most one per element in practice)
    └── term:annotation *           (id, text)
        └── term:coding *           (system, version, code, display)
```

### `term:Annotations` — the container

The single wrapper element that holds an element's terminology annotations. It carries no
attributes of its own; it exists so that everything this extension writes sits under one
recognisable node inside `extensionElements`, next to whatever other vendors have put there.

| Property | XML form | Cardinality | Meaning |
|---|---|---|---|
| `values` | child elements `<term:annotation>` | 0..n | The annotations attached to the enclosing BPMN element. |

The `values` property name never appears in the XML. Moddle serialises a typed `isMany`
property as a bare repetition of the child type's own tag, which is why the container's
content is simply a sequence of `<term:annotation>` elements.

The writing helper
([`AnnotationHelper.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/services/AnnotationHelper.js))
creates `bpmn:extensionElements` and the container lazily, on the first annotation, and
reuses the existing container afterwards — so a normally-edited element has exactly one
`<term:annotations>`. The reader side looks up the container by `$type`, takes the first
match and ignores any others.

### `term:Annotation` — one clinical statement

One annotation is one statement about the BPMN element: free text, one or more codes, or
both. Several annotations on one element are the normal way to express several independent
facets — in the shipped example diagram a discharge-letter data object carries one annotation
for the document type and a second, code-only annotation for its IHE XDS class.

| Property | XML form | Type | Meaning |
|---|---|---|---|
| `id` | attribute `id` | `String` | Identifier of the annotation. Semantically required — see [Identifiers](#identifiers-and-uniqueness) — though the XSD leaves it optional. |
| `text` | attribute `text` | `String` | Optional human-readable note. Free text, not derived from any terminology. |
| `codings` | child elements `<term:coding>` | 0..n | The coded representations of this statement. |

An annotation is meaningful with text only, with codings only, or with both. The editor
refuses to save one that has neither — it answers with *"Please provide free text or at
least one coding before saving."* — but the format itself does not. A bare
`<term:annotation id="…"/>` is well-formed and schema-valid, and the shipped
`minimal-valid.bpmn` fixture contains exactly that, with a `text` attribute and no codings.

### `term:Coding` — one code in one code system

Deliberately shaped like the FHIR `Coding` datatype, minus `userSelected`. Each coding is
self-describing: a reader needs nothing but the element itself to know which terminology the
code came from.

| Property | XML form | Type | Meaning |
|---|---|---|---|
| `system` | attribute `system` | `String` | The canonical URI of the code system, e.g. `http://snomed.info/sct`, `http://loinc.org`, `http://dvmd.de/fhir/CodeSystem/kdl`. |
| `version` | attribute `version` | `String` | The code-system version the code was taken from. Format is whatever the code system itself uses. |
| `code` | attribute `code` | `String` | The code, verbatim. |
| `display` | attribute `display` | `String` | The display name as it was at annotation time. Informational — a reader that needs the current display should look it up. |

The `version` attribute is worth its own note, because its format varies by terminology and
all of these appear in the shipped example diagram:

```xml
<term:coding system="http://snomed.info/sct"
             version="http://snomed.info/sct/32506021000036107/version/20260731"
             code="254292007"
             display="Tumor staging (tumor staging)"/>
<term:coding system="http://loinc.org" version="2.82" code="21908-9"
             display="Stage group.clinical Cancer"/>
<term:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode"
             version="2021-06-25T13:44:47" code="BRI" display="Physician letters"/>
```

SNOMED CT uses a version URI, LOINC a release number, the IHE-D code systems a timestamp.
The schema treats all of them as opaque strings and does not attempt to normalise them.
Storing the version is what makes an annotation reproducible years later; it is also what
lets the properties panel flag a coding whose recorded version is no longer among the
versions its providers offer.

## Where the elements attach

At the format level, `term:annotations` may appear inside **any** `bpmn:extensionElements`.
The descriptor declares the three types as free-standing `Element`s; it does not `extend`
any BPMN type and adds no foreign attributes to BPMN elements. Nothing in the moddle model
or in the XSD restricts which BPMN element may carry the container.

What the shipped editor writes is narrower. `TerminologyPropertiesProvider` offers the
terminology group only for elements matching one of sixteen BPMN types
([`TerminologyPropertiesProvider.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/TerminologyPropertiesProvider.js)):

`bpmn:Task`, `bpmn:UserTask`, `bpmn:ServiceTask`, `bpmn:SendTask`, `bpmn:ReceiveTask`,
`bpmn:ManualTask`, `bpmn:ScriptTask`, `bpmn:BusinessRuleTask`, `bpmn:SubProcess`,
`bpmn:ExclusiveGateway`, `bpmn:DataObjectReference`, `bpmn:DataStoreReference`,
`bpmn:IntermediateThrowEvent`, `bpmn:IntermediateCatchEvent`, `bpmn:StartEvent`,
`bpmn:EndEvent`.

The match is a BPMN type-hierarchy check, so subtypes of a listed type are included too.
Notably **not** in the list: `bpmn:CallActivity`, `bpmn:ParallelGateway`,
`bpmn:InclusiveGateway`, `bpmn:BoundaryEvent`, `bpmn:SequenceFlow`, `bpmn:MessageFlow`,
`bpmn:Participant` and `bpmn:Lane`. Annotations on those elements are valid XML that this
library will read back faithfully — the editor simply will not offer a UI for creating them.
See [properties panel](/properties-panel/) for the editing side.

One placement is ruled out by BPMN itself rather than by this extension: `<bpmn:definitions>`
has no `extensionElements` child in the BPMN 2.0 XSD, so document-level terminology
annotations are not possible. Annotations live on flow elements and data references.

## A complete annotated file

This is
[`examples/valid/minimal-valid.bpmn`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/examples/valid/minimal-valid.bpmn)
in full — a conformance fixture, so it is checked by CI on every push. It is the smallest
complete document that carries the extension, diagram interchange included.

```xml title="examples/valid/minimal-valid.bpmn"
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:term="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1"
                  id="Definitions_valid"
                  targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Reviewed task">
      <bpmn:extensionElements>
        <term:annotations>
          <term:annotation id="term-ann-1" text="Synthetic reviewed task"/>
        </term:annotations>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_1" name="Done">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="160" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="250" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="412" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="196" y="118" />
        <di:waypoint x="250" y="118" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="118" />
        <di:waypoint x="412" y="118" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
```

Note what the extension did **not** do: no attribute was added to `<bpmn:task>`, no BPMN
element was replaced, and the diagram interchange section is untouched. The extension's
entire footprint in this document is the `<term:annotations>` block inside
`<bpmn:extensionElements>` plus the `xmlns:term` declaration on the root — delete those two
and what remains is a plain BPMN file.

A multi-code annotation on a data object, from the larger fixture
[`lung-cancer-staging-annotated.bpmn`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/examples/valid/lung-cancer-staging-annotated.bpmn):

```xml
<bpmn2:dataObjectReference id="DataObj_MRI" name="MRI Scan Report">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1"
                       text="MRI scan report of the thorax as input document for TNM staging">
        <term:coding system="http://loinc.org" version="2.82"
                     code="18748-4" display="Diagnostic imaging study"/>
        <term:coding system="http://ihe-d.de/CodeSystems/IHEXDStypeCode"
                     version="2020-02-07T07:55:58"
                     code="ERGE" display="Diagnostic imaging results"/>
      </term:annotation>
      <term:annotation id="term-ann-2">
        <term:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode"
                     version="2021-06-25T13:44:47"
                     code="BEF" display="Clinical reports"/>
      </term:annotation>
    </term:annotations>
  </bpmn2:extensionElements>
</bpmn2:dataObjectReference>
```

Both fixtures use only synthetic content. The `bpmn2:` prefix in the second file is just a
different prefix bound to the same BPMN model namespace — prefixes are local to a document
and carry no meaning.

## Identifiers and uniqueness

`term:Annotation/@id` is the stable handle for an annotation: the thing an external system,
a diff, or a traceability matrix refers to. Three rules govern it, and only one of them lives
in the schema.

**The character set.** Both the writer and the linter require the pattern
`^[A-Za-z0-9._-]+$` — ASCII letters, digits, dot, underscore and hyphen, at least one
character, no whitespace. This is enforced by
[`AnnotationHelper.isValidId`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/services/AnnotationHelper.js)
when editing and by the `annotation-requires-id` bpmnlint rule when checking a file.

**Generated identifiers.** When the editor creates an annotation without an explicit id it
mints `term-ann-1`, `term-ann-2`, … counting up from 1 to the first unused value. Where the
element registry is available it collects the identifiers of every element in the diagram
first, so generated ids are unique across the whole file, not just within one element. The
same collected set backs the panel's validation of an id you type yourself: a value already
used elsewhere in the diagram is rejected with *"ID must be unique across the diagram."*

**Uniqueness is not schema-enforced.** The XSD types `id` as `xsd:string`, not `xsd:ID`, so
an XML validator will happily accept two annotations with the same id. That is a conscious
consequence of generating the schema mechanically from the moddle descriptor; treat
uniqueness as a convention the tooling maintains, not as a guarantee the file format makes.

Separately, the editor rejects a coding whose `system|code` pair is already used anywhere in
the diagram. That is an editing-time rule about annotation hygiene, not a format constraint:
files containing repeated `system`/`code` pairs are valid and will load.

## The generated XSD

[`schema/clinical-semantics.xsd`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/schema/clinical-semantics.xsd)
exists for consumers that are not JavaScript: a Java pipeline, an XML editor, a validation
step in a document repository. It is **generated** from the moddle descriptor by
[`tools/moddle-to-xsd.mjs`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/tools/moddle-to-xsd.mjs),
never hand-edited, so it cannot drift from the model the JavaScript uses:

```bash
npm run xsd:gen         # regenerate schema/clinical-semantics.xsd
npm run xsd:gen:check   # exit 1 if the committed file is stale (the CI drift guard)
```

The mapping is mechanical: a moddle type becomes a global element plus a named complex type
(`term:tAnnotation`), `isAttr` properties become `xsd:attribute`, typed child properties
become `xsd:element ref`, and `isMany` becomes `maxOccurs="unbounded"`. The schema sets
`elementFormDefault="qualified"` and `attributeFormDefault="unqualified"`, which is why
elements are prefixed in instance documents and attributes are not.

### What it checks

- The three element names exist in the right namespace and nothing else does.
- Containment: `annotations` holds only `annotation`, `annotation` holds only `coding`.
- Attribute names: an undeclared attribute on any of the three elements is an error.
- Attribute types: all four coding attributes and both annotation attributes are
  `xsd:string`.

### What it deliberately does not check

:::caution[The XSD is a structure check, not a semantic one]
A file can pass the XSD and still be wrong in every way that matters clinically.
:::

- **Required attributes.** Every attribute is optional in the XSD, `id` included. A bare
  `<term:annotation/>` validates. "Required" is enforced by the bpmnlint rule, not the
  schema — the generated file says so in its own header comment, and it is why the lint gate
  is not optional in this project.
- **Identifier uniqueness**, as described above.
- **Vocabulary.** Nothing binds `system` to a list of permitted code-system URIs, or `code`
  to a value set. The schema cannot tell a real SNOMED CT concept id from a typo.
- **Placement.** The XSD declares three global elements; it says nothing about which BPMN
  elements may carry them. That is governed by the BPMN wildcard, described below.
- **Documentation.** The generated schema currently carries no `xsd:documentation`
  annotations, so a tool that renders schema documentation will show the structure and no
  prose. The prose is this page.

### Validating a file against BPMN core *and* the extension

The official `BPMN20.xsd` declares `<extensionElements>` with an
`<xsd:any namespace="##other" processContents="lax">` wildcard. "Lax" means a validator
checks foreign content *only if it already holds a schema for that namespace* — so
validating an annotated file against `BPMN20.xsd` alone reports success while checking
nothing inside `<term:annotations>`. To check both, import both schemas from a small driver
schema and validate against that. Place the driver at the repository root, where the two
relative paths below resolve:

```xml title="driver.xsd"
<?xml version="1.0" encoding="UTF-8"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:import namespace="http://www.omg.org/spec/BPMN/20100524/MODEL"
              schemaLocation="node_modules/bpmn-moddle/resources/bpmn/xsd/BPMN20.xsd"/>
  <xsd:import namespace="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1"
              schemaLocation="schema/clinical-semantics.xsd"/>
</xsd:schema>
```

```bash
xmllint --noout --schema driver.xsd examples/valid/minimal-valid.bpmn
# examples/valid/minimal-valid.bpmn validates
```

This is exactly what
[`tools/validate-xsd-ext.mjs`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/tools/validate-xsd-ext.mjs)
does in CI (`npm run xsd:ext`), except that it generates the extension schema on the fly from
the descriptor so the check can never run against a stale file, and it runs a canary first:
it feeds the validator a `<term:annotations>` element carrying a deliberately undeclared
attribute and fails the build unless xmllint rejects it *by name*. Without the canary a
silently failing schema import would turn every subsequent "valid" into a lie, because the
lax wildcard would skip the content entirely.

## Round-tripping, and what the conformance gate proves

The promise this format makes is that opening a file and saving it again does not damage it.
`npm run check:conformance` is the gate that keeps the promise. It chains the checks below over
the three fixtures in `examples/valid/`, and it is worth knowing what each one does and does
not establish.

| Check | Command | Fails the gate | What it proves |
|---|---|---|---|
| BPMN + terminology lint | `npm run lint:bpmn` | yes | Structural BPMN correctness plus `annotation-requires-id` over every fixture. |
| Moddle round trip | `npm run check:roundtrip` | yes, on unstable serialisation | Serialising a parsed file twice produces identical output. |
| XSD drift guard | `npm run xsd:gen:check` | yes | The committed XSD is exactly what the descriptor generates. |
| Core + extension XSD | `npm run xsd:ext` | yes | Every fixture validates against BPMN core *and* the extension schema, with the canary proving the extension schema is engaged. |
| Defaults drift guard | `npm run docs:defaults:check` | yes | The generated [default configuration](/configuration/defaults/) page still matches the code. |
| Namespace-reference drift guard | `npm run docs:namespace:check` | yes | The generated namespace reference still matches the moddle descriptor. |
| Namespace consistency | `npm run check:namespace` | yes | Descriptor, XSD, BPMN fixtures, and current documentation use the same controlled URI. |
| BPMN core XSD | `npm run check:xsd` | no | Fixtures are schema-valid BPMN. Informational by design; pass `--strict` to make it fail the run. |

The negative fixture under `examples/invalid/` is *not* part of this gate — the file set is
discovered from `examples/valid/` and `docs/` only. CI runs it separately, as a step that
fails if `npm run lint:invalid` unexpectedly passes.

The round-trip check
([`tools/moddle-roundtrip.mjs`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/tools/moddle-roundtrip.mjs))
is the one that speaks directly to file durability. For each fixture it parses with the
`term:` descriptor registered, serialises to *A*, re-parses *A* and re-serialises to *B*, and
fails if `A !== B`. It also counts `<term:` element openings in the input and in *A* and
reports any that were dropped. Note the severity difference: unstable serialisation always
fails the run, while a dropped element and any bpmn-moddle parse warning are reported but
fail only under `--strict`, which the default gate does not pass.

So the guarantee the gate enforces is precise: **for content this descriptor models, a
parse/serialise cycle is stable, and any loss is surfaced in the output.** It is not a claim
that arbitrary foreign content survives arbitrary tooling.

## Reading annotations without this library

Because the annotations are ordinary namespaced XML, any namespace-aware tool can read them.
With `xmllint`:

```bash
xmllint --shell examples/valid/lung-cancer-staging-annotated.bpmn <<'EOF'
setrootns
xpath //term:coding/@code
EOF
```

With `bpmn-moddle` in plain Node — this needs no bundler, because the `./moddle` export is a
plain JSON file and `bpmn-moddle` publishes a proper export map:

```js title="read-annotations.mjs"
import { readFileSync } from 'node:fs';
import { BpmnModdle } from 'bpmn-moddle';
import termDescriptor
  from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/moddle'
  with { type: 'json' };

const moddle = new BpmnModdle({ term: termDescriptor });
const { rootElement } = await moddle.fromXML(readFileSync(process.argv[2], 'utf8'));

for (const root of rootElement.rootElements) {
  for (const element of root.flowElements || []) {
    const container = element.extensionElements?.values
      ?.find((value) => value.$type === 'term:Annotations');

    for (const annotation of container?.values || []) {
      console.log(element.id, annotation.id, annotation.text ?? '');
      for (const coding of annotation.codings || []) {
        console.log('   ', coding.system, coding.code, coding.display ?? '');
      }
    }
  }
}
```

Run against the annotated fixture, the first few lines are:

```text
DataObj_MRI term-ann-1 MRI scan report of the thorax as input document for TNM staging
    http://loinc.org 18748-4 Diagnostic imaging study
    http://ihe-d.de/CodeSystems/IHEXDStypeCode ERGE Diagnostic imaging results
DataObj_MRI term-ann-2
    http://ihe-d.de/CodeSystems/IHEXDSclassCode BEF Clinical reports
Task_Staging term-ann-3 Clinical TNM staging to determine tumor stage
    http://snomed.info/sct 254292007 Tumor staging (tumor staging)
    http://loinc.org 21908-9 Stage group.clinical Cancer
```

The fixture carries nine annotations in total; the loop walks all of them.

:::note
`bpmn-moddle` 10 exports `BpmnModdle` as a **named** export. A default import
(`import BpmnModdle from 'bpmn-moddle'`) throws `does not provide an export named 'default'`.
:::

The rest of the package is not usable this way — see [compatibility](/compatibility/) for
why the main entry point requires a bundler.

## Forward compatibility

The question that decides whether this format is safe to adopt: what happens to an annotated
file in a tool that has never heard of the `term:` namespace?

**XML validators ignore it.** The `processContents="lax"` wildcard on
`<extensionElements>` instructs a validator to check foreign content only when it already
holds a schema for that namespace, and otherwise to accept it. A validator that knows only
`BPMN20.xsd` reports an annotated file as valid BPMN.

**bpmn.io-based tools preserve it verbatim.** This was measured rather than assumed. Parsing
`minimal-valid.bpmn` with a `BpmnModdle` instance that has **no** `term` descriptor
registered produces zero warnings; re-serialising reproduces both `<term:` elements together
with the `xmlns:term` declaration, unchanged. bpmn-moddle keeps unrecognised extension
content as generic elements and writes it back out. Since bpmn-moddle is the parser beneath
bpmn-js, any bpmn.io viewer or modeller that opens and saves such a file keeps the
annotations even without this package installed.

**Partially-known content is also preserved.** If a file uses the same namespace with
attributes this descriptor does not declare, parsing logs `unknown attribute <…>` warnings
but the attributes survive the round trip (their serialisation order may change, since
declared attributes are written first). They will, however, fail XSD validation against
`clinical-semantics.xsd`, which allows no undeclared attributes. This is not hypothetical —
see the note on the sibling library in [compatibility](/compatibility/).

**The annotations are never mandatory to understand.** This extension does not use BPMN's
formal `Extension` / `mustUnderstand` metamodel machinery. A consumer that ignores `term:`
content entirely still has a complete, correct BPMN process; nothing in the core model
depends on an annotation existing.

:::caution[The limit of the guarantee]
The preservation behaviour above is verified for bpmn-moddle, which covers the bpmn.io
family. Tools from other vendors that import BPMN into their own internal model and
re-export from it may drop extension content they do not recognise — that is a property of
each tool, not of this format, and this project has not tested them. If a file must survive
a round trip through a specific third-party tool, test that tool with
`examples/valid/minimal-valid.bpmn` before relying on it.
:::

## Related pages

- [Compatibility](/compatibility/) — versions, bundlers, and coexistence with other
  extensions.
- [Properties panel](/properties-panel/) — how annotations are created and what the editor
  enforces.
- [Extending](/extending/) — the moddle and bpmn.io background behind the design.
- [Architecture](/architecture/) — the arc42 documentation, including the namespace
  constraint.
- [Namespace v1](/ns/terminology/v1/) — the generated, authoritative structural reference.
