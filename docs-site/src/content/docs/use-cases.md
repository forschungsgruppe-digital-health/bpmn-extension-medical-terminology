---
title: Use cases
description: The clinical-pathway modelling problem this extension solves, who it is for, worked scenarios, what the annotations are good for downstream, and what it deliberately does not do.
---

## The problem: a label is not a concept

BPMN 2.0 is a good notation for clinical pathways. Hospitals, guideline groups and research projects use
it to draw what happens to a patient: who does what, in which order, with which documents, and where the
decisions are. The models are readable, they are portable, and there is an ecosystem of editors for them.

What a BPMN model does not contain is the *meaning* of its own boxes. A task labelled `CT-Thorax` is a
string. So is `CT Thorax`, `CT chest`, `Thorax-CT mit KM` (German for a chest CT with contrast medium)
and `CTTh`. To a person reading the diagram all of those denote the same procedure. To any program
reading the file they are five unrelated strings.

That gap has practical consequences:

- **Two models of the same pathway cannot be compared.** Different modellers, different labels, no way to
  tell mechanically that two tasks mean the same thing.
- **A model cannot be checked against a data source.** You cannot ask "does our data warehouse actually
  record the observations this pathway assumes?" if the pathway names observations in prose.
- **A model cannot be connected to a record system.** Knowing that a step produces a *discharge summary*
  is not the same as knowing that it produces a document whose class code an XDS registry will accept.
- **Translation breaks everything.** A German model and its English translation become two different
  models, because the only machine-readable content in each was the label.

This extension closes that gap in the smallest way that works: it lets a modeller attach coded
terminology to a BPMN element, and it stores those codes in the BPMN file itself.

```xml title="The essential shape"
<bpmn2:task id="Task_Staging" name="Perform TNM Staging">
  <bpmn2:extensionElements>
    <mt:annotations>
      <mt:annotation id="mt-ann-3" text="Clinical TNM staging to determine tumor stage">
        <mt:coding system="http://snomed.info/sct"
                     version="http://snomed.info/sct/32506021000036107/version/20260731"
                     code="254292007"
                     display="Tumor staging (tumor staging)"/>
        <mt:coding system="http://loinc.org"
                     version="2.82"
                     code="21908-9"
                     display="Stage group.clinical Cancer"/>
      </mt:annotation>
    </mt:annotations>
  </bpmn2:extensionElements>
  <!-- ordinary BPMN continues here, untouched -->
</bpmn2:task>
```

The label stays. The diagram stays. The layout stays. Everything the extension adds lives inside
`bpmn:extensionElements` under its own `mt:` namespace, which is exactly the place BPMN 2.0 reserves for
this kind of addition. A tool that does not know the namespace can still open and save the model, and a
tool that does can read the annotations as typed objects. Whether a foreign editor actually preserves
unknown extension content when it writes the file back is a property of that editor;
[Compatibility](/compatibility/) goes into what can and cannot be relied on.

## Who this is for

### Pathway modellers

You draw clinical pathways in a bpmn-js-based editor and you want the model to survive contact with the
rest of the informatics landscape. You are not going to hand-edit XML, and you do not want to memorise
code systems.

What you get is a **Medical terminology** group in the properties panel of the selected element, with a
search box over the configured terminology systems: type `pneumonia`, pick the concept, and the system
URI, code, display and version are filled in for you. You can attach several codings to one annotation
(the SNOMED procedure *and* the OPS billing code, say), and several annotations to one element when the
element genuinely carries more than one coded statement. See [the properties panel](/properties-panel/)
for what the group can and cannot do today.

### Medical informaticians and terminology people

You care about which code system, which version, and whether the codes survive a round trip. The data
model is deliberately thin and deliberately familiar: an annotation has an id and optional text, a coding
has `system`, `version`, `code` and `display`. Those four fields are the fields of a FHIR `Coding`, in the
same order and with the same meaning, which makes the mapping to a FHIR resource mechanical rather than
interpretive.

You also get control over where the codes come from. Out of the box the SNOMED CT, LOINC, ICD-10-GM, OPS
and ATC providers all talk to one public FHIR terminology server; you can point every provider at your
institution's server instead, add code systems the package has never heard of, or run entirely offline
against FHIR terminology packages installed with your application. See [Configuration](/configuration/),
the generated [defaults table](/configuration/defaults/) and [Package discovery](/configuration/discovery/).

### Tool builders

You are building the thing that consumes the models — a validator, a repository, an analysis pipeline, a
generator. You want a stable file format and a way to read it that is not a regular expression.

The file format is specified twice: as the moddle descriptor the editor uses
([`extension/src/moddle/medical-terminology.json`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/moddle/medical-terminology.json))
and as a generated XSD you can validate against without any JavaScript at all ([Schema](/schema/)). The
two are kept in step by a check that fails the build if they drift. For reading annotations in code, the
package exports helpers such as `getAnnotations` — see the [API reference](/api/).

## Worked scenarios

The three scenarios below all come from one synthetic model that ships with the repository,
[`examples/valid/lung-cancer-staging-annotated.bpmn`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/examples/valid/lung-cancer-staging-annotated.bpmn).
It is the diagram the demo opens by default. All data in it is synthetic.

### Scenario 1 — make the clinical steps comparable

The pathway is a lung-cancer treatment decision: stage the tumour, branch on the stage, then either
resect or give chemotherapy, then follow up. Each clinical step carries one annotation with the codes that
pin down what it is:

| Task | Coding | Code | Display |
|---|---|---|---|
| Perform TNM Staging | SNOMED CT | `254292007` | Tumor staging (tumor staging) |
| Perform TNM Staging | LOINC | `21908-9` | Stage group.clinical Cancer |
| Surgical Resection | SNOMED CT | `359615001` | Partial lobectomy of lung (procedure) |
| Surgical Resection | OPS | `5-324` | Simple lobectomy and bilobectomy of the lung |
| Systemic Chemotherapy | SNOMED CT | `367336001` | Chemotherapy (procedure) |
| Systemic Chemotherapy | ATC | `L01XA01` | Cisplatin |
| Follow-up Assessment | SNOMED CT | `390906007` | Follow-up encounter (procedure) |
| Follow-up Assessment | LOINC | `18776-5` | Plan of care note |

Note what the two codings on one task are doing. They are not redundant: SNOMED CT says *what kind of
thing this is*, OPS says *how this is coded for German procedure classification*, ATC says *which
substance*. Each answers a different downstream question, and the annotation keeps them together as one
statement about one task rather than scattering them.

With that in place, "do these two hospitals' pathways contain the same staging step?" becomes a set
comparison over `(system, code)` pairs instead of a reading exercise.

### Scenario 2 — make the documents exchangeable

Two data objects in the same model are documents: an MRI scan report going into staging, and a discharge
letter coming out of follow-up. Documents have a second, separate coding problem — not what they contain,
but how a document registry classifies them.

```xml title="examples/valid/lung-cancer-staging-annotated.bpmn (excerpt)"
<bpmn2:dataObjectReference id="DataObj_MRI" name="MRI Scan Report">
  <bpmn2:extensionElements>
    <mt:annotations>
      <mt:annotation id="mt-ann-1"
                       text="MRI scan report of the thorax as input document for TNM staging">
        <mt:coding system="http://loinc.org"
                     version="2.82" code="18748-4" display="Diagnostic imaging study"/>
        <mt:coding system="http://ihe-d.de/CodeSystems/IHEXDStypeCode"
                     version="2020-02-07T07:55:58" code="ERGE" display="Diagnostic imaging results"/>
      </mt:annotation>
      <mt:annotation id="mt-ann-2">
        <mt:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode"
                     version="2021-06-25T13:44:47" code="BEF" display="Clinical reports"/>
      </mt:annotation>
    </mt:annotations>
  </bpmn2:extensionElements>
</bpmn2:dataObjectReference>
```

Two details are worth pointing out, because they are the reason the data model is shaped the way it is.

First, this element carries **two annotations, not one**. The content statement ("this is a diagnostic
imaging study, and in IHE-D terms its type is `ERGE`") and the classification statement ("its XDS class is
`BEF`") are separate assertions, and keeping them separate means a consumer can process one without
having to guess which coding in a flat list was meant for it.

Second, the second annotation has **no `text`** — text is optional. An annotation whose meaning is fully
carried by its code does not need prose, and prose that repeats the display value only goes stale.

The discharge letter is annotated the same way, with LOINC `18842-5` (Discharge summary), KDL `AD010101`
(Medical discharge report) and XDS class `BRI` (Physician letters). A pipeline that generates document
metadata from the pathway now has everything it needs per document, taken from the model rather than from
a spreadsheet maintained beside it.

### Scenario 3 — annotate a decision that has no code

The gateway in the middle of the model splits on tumour stage. There is no single code that means "stage
I–II versus stage III–IV, therefore operable versus not", and inventing one would be worse than useless.

```xml
<bpmn2:exclusiveGateway id="Gateway_Split" name="Tumor Stage?">
  <bpmn2:extensionElements>
    <mt:annotations>
      <mt:annotation id="mt-ann-4"
                       text="Treatment decision based on TNM stage: Stage I-II (operable) vs. Stage III-IV (inoperable)"/>
    </mt:annotations>
  </bpmn2:extensionElements>
</bpmn2:exclusiveGateway>
```

A text-only annotation is a first-class case, not a degenerate one. Codings are optional on an annotation,
so the modeller can record the clinical intent of a decision point in a structured slot — always in the
same place, always retrievable by the same API — even when no terminology covers it. When terminology
*does* become available later, the codings can be added to the annotation that is already there.

## What the annotations are good for downstream

The extension's job ends when the codes are in the file. What makes that worth doing is what other things
can then do with the file.

### Validation

The repository ships a bpmnlint rule, `annotation-requires-id`, which reports any `mt:Annotation` whose
`id` is missing, empty or does not match `[A-Za-z0-9._-]+`. The rule lives in the repository as the
private workspace plugin `extension/lint/bpmnlint-plugin-terminology/`; the repository's own
`.bpmnlintrc` enables it with `plugin:terminology/recommended`, and the conformance gate
(`npm run check:conformance`) runs it over every `.bpmn` file in the repository.

:::note
That plugin is not published as a separate npm package and is not part of the published extension
tarball, so a project that wants the rule in its own CI today has to take a copy of it from the
repository.
:::

For tooling that is not JavaScript, `schema/medical-terminology.xsd` is generated from the moddle
descriptor and can validate the extension elements directly. A generation check fails the build if the
schema and the descriptor drift apart, so the XSD is a real contract rather than documentation that rots.
Its scope is structure only — element nesting and attribute names, not "an annotation must have an id",
which is what the lint rule is for. See [Schema](/schema/).

### Exchange and preservation

Because annotations are plain BPMN 2.0 extension elements, the annotated file *is* the exchange format.
There is no sidecar to keep in sync and nothing to re-import. The repository's conformance gate includes a
moddle round-trip check that parses each fixture, serialises it, re-parses and re-serialises it, and fails
if the two serialisations differ or if a registered extension element was dropped along the way — so "the
codes survive a save" is a checked property and not a hope.

### Analysis

Once a corpus of pathway models carries codes, ordinary questions become queries: which SNOMED procedures
appear across all our pathways, which pathways touch a given LOINC observation, which document classes a
given department's processes produce, how two sites' versions of one pathway differ. Reading the codes out
of a model in code is a call to `getAnnotations` on the element's business object; see the
[API reference](/api/).

### Mapping to FHIR

`mt:coding` uses exactly the fields of a FHIR `Coding` — `system`, `version`, `code`, `display` — so
turning an annotation into a `CodeableConcept`, or into the coded element of an `ActivityDefinition`,
`PlanDefinition` or `DocumentReference`, is a field-for-field transformation.

:::note
That transformation is **yours to write**. This package stores and searches terminology; it does not
generate FHIR resources, and an earlier mapping model was retired rather than shipped half-built. What it
guarantees is that the data is in a shape that makes the mapping trivial.
:::

## What you get without a network

It matters for planning whether annotating requires a live terminology server. The answer is: partly.

SNOMED CT, LOINC, ICD-10-GM, OPS and ATC are queried from a FHIR terminology server at runtime. **No
content from those terminologies is bundled with the package** — no concepts, no display names, no
hierarchies. That is deliberate: those terminologies carry licence conditions (an Affiliate licence via
BfArM/MLDS for SNOMED CT, the LOINC Copyright Notice and License for LOINC, and the BfArM terms of use for
ICD-10-GM and OPS), and shipping their content would push those obligations onto every consumer of this
package.

Openly licensed content, by contrast, *is* available offline. The package bundles the CodeSystem resources
of the HL7 terminology FHIR package — 897 code systems and just over 20,000 concepts, almost all of them
with display text and most with a definition — and the IHE-D XDS class and type code systems (15 and 38
concepts) and the German KDL document-class list (557 concepts) come from FHIR packages installed
alongside it. So in scenario 2 the IHE-D XDS codings can be picked with the network unplugged, as can a
KDL code for the discharge letter; the LOINC codings on those same documents, and everything in
scenario 1, cannot.

Exact provider identifiers, endpoints and default versions are on [Configuration
defaults](/configuration/defaults/), which is generated from the code. Licensing is discussed further in
[Background](/background/).

## Non-goals

Being clear about the edges is more useful than a longer feature list.

- **It is not a BPMN editor or a process engine.** bpmn-js is a peer dependency supplied by your
  application; nothing here executes a pathway or evaluates a gateway.
- **It does not operate a terminology server.** It queries one you configure. It ships no server, no
  proxy, and no CORS workaround — if the terminology endpoint does not permit your browser origin, that is
  infrastructure your deployment has to provide. Both shipped adapters do accept a `fetchFn`, so routing
  requests through something of your own is possible; see [Adapters](/extending/adapters/).
- **It does not license terminology content for you.** Reaching SNOMED CT through this extension does not
  grant you the right to use SNOMED CT.
- **It does not judge clinical correctness.** Nothing checks that the code you attached is the *right*
  code, that the pathway is clinically sound, or that a coding is still current in the published edition.
  Validation here is structural.
- **It does not touch BPMN core or BPMN-DI.** Terminology never changes element types, flows, or layout,
  and there is deliberately only this one extension namespace and one persistence model.
- **It holds no patient data.** Annotations describe process steps and document classes — model-level
  metadata, not records. The fixtures and demo content are synthetic.

There are also current gaps, as opposed to deliberate exclusions. The properties panel offers the group on
16 BPMN element types — tasks and their specialisations, subprocesses, exclusive gateways, data object and
data store references, and start, end and intermediate events. Other gateway types and message flows can
hold annotations in the XML but have no panel group, so on those the annotations have to be written
programmatically. Editing a saved annotation in place is not implemented — it can only be removed and
added again — and undo does not currently cover adding or removing an annotation. These are known and
scheduled; see [the properties panel](/properties-panel/) for the precise behaviour and
[the roadmap](/roadmap/) for status.

## Is this the right tool for you?

| You want to… | Fit |
|---|---|
| Attach coded clinical meaning to pathway models in a bpmn-js editor | Yes — this is the core case |
| Keep the codes inside the `.bpmn` file, with no sidecar | Yes |
| Search SNOMED CT, LOINC, ICD-10-GM, OPS or ATC from inside the modeller | Yes, against a terminology server you configure |
| Annotate document classes offline (IHE-D XDS, KDL, HL7 terminology) | Yes, from bundled and installed FHIR packages |
| Add a code system nobody has heard of | Yes — [write a provider](/extending/providers/) |
| Validate annotated models in CI, in or outside JavaScript | Yes — a bpmnlint rule in the repository and a generated XSD |
| Generate FHIR resources from an annotated pathway | Not shipped; the data model is built to make it easy to write |
| Execute or simulate the pathway | Out of scope |
| Get a terminology server, or a licence to use one | Out of scope |

## Next steps

- [Configuration](/configuration/) — providers, servers, and the options that matter first.
- [The properties panel](/properties-panel/) — what the modeller actually sees, and its current limits.
- [Package discovery](/configuration/discovery/) — shipping terminology content with your build.
- [Extending](/extending/) — the bpmn.io concepts behind the extension, and how to add your own.
- [Architecture](/architecture/) — how the pieces fit together, in arc42 form.
