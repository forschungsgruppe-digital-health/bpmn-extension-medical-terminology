# Concept: Mapping BPMN Patient Pathways to Synthea Generic Module Framework Modules

> ⚠️ **Status: concept / proposal — not implemented.** This document describes a *possible*
> future extension and a design for discussion. Nothing here ships yet. Section 11 lists the
> open decisions that need human input before any implementation begins. As with the rest of
> this repository, only **synthetic** clinical data is used in examples — never real patient
> data.

## 1. Summary

This concept proposes a third bpmn.io extension layer for **bpmn-js-clinical-semantics** — a
`synthea:` annotation namespace plus a properties-panel provider and a deterministic
**exporter** — that turns a clinically annotated BPMN process model (a patient pathway) into a
valid [Synthea Generic Module Framework (GMF)][gmf] module (JSON). The result lets
[Synthea][synthea] generate synthetic, longitudinal patient populations that traverse the
pathway exactly as modelled.

Crucially, the layer **reuses the two existing annotation layers** rather than duplicating
them: the [`term:` terminology layer](../../packages/terminology/) supplies the clinical
`codes`, and the [`fhirmap:` FHIR-mapping layer](../../packages/fhir-mapping/) hints/validates
the GMF state type. So a single annotated BPMN diagram becomes the one source of truth for
*meaning* (`term:`), *FHIR shape* (`fhirmap:`), and *generation* (`synthea:`).

## 2. Motivation and context

- **BPMN models clinical pathways; Synthea generates synthetic patients.** Clinical pathways
  (e.g. the MiHUB lung-cancer pathway) are routinely drawn in BPMN. Synthea's GMF is the
  de-facto way to describe a patient's progression as a state machine and emit realistic
  synthetic FHIR. Bridging the two means a pathway authored *visually* in bpmn-js can be
  compiled into a runnable Synthea module — and thence into synthetic FHIR Bundles for testing
  the patient portal, demos, and research, without touching real data.
- **It fits this repo's trajectory.** The repo already adds clinical semantics to BPMN purely
  via standard `<extensionElements>` (`term:`, `fhirmap:`) — see
  [docs/EXTENDING.md](../EXTENDING.md) and
  [docs/arc42/08](../arc42/08_crosscutting_concepts.md). A `synthea:` layer is the
  natural next worked example of "extending bpmn.io", and it can lean on what is already there.
- **It serves the wider MiHUB goal.** Synthetic pathway-conformant patients are useful input
  for the patient portal's FHIR compartments and for SMART-on-FHIR smoke tests. This concept is
  the BPMN-side complement of the existing *BPMN → GMF* exploration in the lung-cancer pathway
  work.

## 3. Background

### 3.1 Synthea GMF in brief

A GMF **module** is a JSON document describing a progression of **states** and the
**transitions** between them. Top-level fields: `name`, optional `remarks`, `gmf_version`, and
a `states` object. Exactly one state has `"type": "Initial"` (the entry point); a `Terminal`
state ends the module. Modules live in Synthea under `src/main/resources/modules/` and can be
authored in JSON or with the graphical [Module Builder][builder].

**State types** (each state object carries a `type` and exactly one transition):

| Group | State types |
|---|---|
| Control / flow | `Initial`, `Terminal`, `Simple`, `Guard`, `Delay`, `SetAttribute`, `Counter`, `CallSubmodule` |
| Encounter | `Encounter`, `EncounterEnd` |
| Conditions / allergies | `ConditionOnset`, `ConditionEnd`, `AllergyOnset`, `AllergyEnd` |
| Medications / care | `MedicationOrder`, `MedicationEnd`, `CarePlanStart`, `CarePlanEnd` |
| Clinical acts / results | `Procedure`, `Observation`, `MultiObservation`, `DiagnosticReport`, `ImagingStudy`, `Device`, `VitalSign`, `Symptom` |
| Outcome | `Death` |

Clinical states reference terminology through a `codes` array of `{ "system", "code",
"display" }` objects (systems such as `SNOMED-CT`, `LOINC`, `RxNorm`). They attach to a visit
via `target_encounter` (the *name* of an `Encounter` state) and can persist a result into a
patient variable via `assign_to_attribute`.

**Transitions** are properties *on a state*:

| Transition property | Shape | BPMN analogue (see §5.2) |
|---|---|---|
| `direct_transition` | `"TargetStateName"` | single outgoing sequence flow |
| `distributed_transition` | `[{ "distribution": 0.x, "transition": "S" }, …]` | random split (probabilities) |
| `conditional_transition` | `[{ "condition": {…}, "transition": "S" }, …]` | exclusive (XOR) gateway with conditions |
| `complex_transition` | `[{ "condition": {…}, "distributions": [{…}] }, …]` | condition **and** probability (inclusive) |
| `lookup_table_transition` | CSV-backed probabilities by attribute | (advanced; out of v1 scope) |

**Conditions / logic** (used by `Guard.allow` and in `conditional`/`complex` transitions) are
objects with a `condition_type`: `Age`, `Gender`, `Attribute`, `Observation`, `Active
Condition`, `Symptom`, `PriorState`, `Date`, plus the combinators `And`, `Or`, `Not`, `At
Least`, `At Most`, and the literals `True` / `False`.

### 3.2 The repository's extension pattern (what we mirror)

Each existing layer is the same three things, and the new layer would be too:

| Piece | `term:` (terminology) | `fhirmap:` (FHIR mapping) | **`synthea:` (proposed)** |
|---|---|---|---|
| Moddle descriptor (XML schema for `<extensionElements>`) | `clinical.json` | `fhir-mapping.json` | `synthea-gmf.json` |
| Properties-panel provider | `TerminologyPropertiesProvider` | `FhirMappingPropertiesProvider` | `SyntheaPropertiesProvider` |
| Service / export helper | `AnnotationHelper` | `MappingHelper` (+ JSON export) | `ModuleExporter` (BPMN → module JSON) |

All annotations are stored under a custom prefix inside `<extensionElements>`, so non-clinical
BPMN tools ignore them — the repo's load-bearing invariant.

## 4. Goals and scope

**In scope (v1 concept):**

- A `synthea:` moddle extension (working name; see §11) for state/transition/module metadata.
- A "Synthea (GMF)" properties-panel group on BPMN flow nodes and sequence flows.
- A deterministic **exporter**: annotated BPMN process → one GMF module JSON.
- Reuse of `term:` for `codes` and `fhirmap:` for state-type hints.
- A validation step that checks the emitted module against the GMF JSON schema.

**Out of scope (for now):** full GMF parity (`Physiology`, telemedicine routing,
`lookup_table_transition`), GMF → BPMN round-trip import, and actually running Synthea (we
*emit and validate* modules; running them is the user's pipeline).

**Hard boundaries (unchanged repo rules):** clinical data lives only in `<extensionElements>`
under the custom prefix — never in `bpmn:`/`bpmndi:` and never by altering BPMN core structure;
synthetic data only; a moddle descriptor change is a breaking change needing human sign-off.

## 5. Mapping design (the core)

The exporter walks the BPMN `Process`, turns each **flow node** into a GMF **state**, and turns
each node's **outgoing sequence flows** (shaped by any gateway) into that state's **transition**.

### 5.1 BPMN element → GMF state

The state type is taken from a `synthea:stateType` annotation on the node; codes come from the
node's existing `term:` annotation; `fhirmap:resourceType` (if present) validates the choice.

| BPMN construct | GMF state | Notes |
|---|---|---|
| `bpmn:StartEvent` | `Initial` | exactly one per process; becomes the module's initial state |
| `bpmn:EndEvent` / terminate | `Terminal` | a process may have several ends → several `Terminal` states |
| `bpmn:Task`/`Activity` + `synthea:stateType` | the named clinical/control state | e.g. `Encounter`, `ConditionOnset`, `MedicationOrder`, `Procedure`, `Observation`, `CarePlanStart`, … |
| `bpmn:Task` with no `stateType` | `Simple` | pass-through node (pure routing/label) |
| `bpmn:CallActivity` | `CallSubmodule` | `submodule` = the called element / referenced process |
| `bpmn:IntermediateCatchEvent` (timer) | `Delay` | duration from the timer definition or `synthea:delay` |
| node flagged `synthea:stateType = Guard` | `Guard` | `allow` = the structured `synthea:condition` (§5.3) |

**Encounter scoping.** Clinical states need a `target_encounter` (the name of an active
`Encounter` state). Two candidate strategies (decision in §11): (a) *implicit* — the exporter
tracks the most recently opened `Encounter` while walking the flow; (b) *explicit* — a
`synthea:targetEncounter` reference points at a specific `Encounter` node. The properties panel
would offer the explicit reference and fall back to implicit.

### 5.2 BPMN sequence flow / gateway → GMF transition

| BPMN | GMF transition | Rule |
|---|---|---|
| Single outgoing flow | `direct_transition` | target = the next node's state name |
| `bpmn:ExclusiveGateway` (XOR) with `conditionExpression`s | `conditional_transition` | each branch → `{ condition, transition }`; the gateway **default flow** → trailing entry with no `condition` (fallback) |
| Flows carrying `synthea:probability` (random split) | `distributed_transition` | `[{ distribution, transition }]`; must sum to 1.0 (lint check) |
| `bpmn:InclusiveGateway` / branches with **both** condition and probability | `complex_transition` | `[{ condition, distributions: [{…}] }]` |
| `bpmn:ParallelGateway` (AND) | **no direct GMF analogue** | GMF runs one linear state machine per patient — see §11 (sequentialize, push into a submodule, or fail the export with a clear lint error) |

Gateways are **not** states themselves; they shape the *transition* of the node that precedes
them. (An alternative — modelling a gateway as a `Simple`/`Guard` state that carries the
transition — is noted as a trade-off in §11.)

### 5.3 Conditions

A `bpmn:conditionExpression` on a sequence flow cannot be auto-translated from free text into a
GMF condition reliably. Instead, the properties panel offers a **structured condition builder**
that produces a `synthea:condition` (a `condition_type` plus operands) mirroring GMF's logic
types. The exporter emits that structured condition; the human-readable BPMN
`conditionExpression` stays as the on-diagram label. Example produced object:

```json
{ "condition_type": "Attribute", "attribute": "cancer_stage", "operator": "==", "value": "IV" }
```

### 5.4 Codes and terminology reuse (the key synergy)

Codes are **not re-entered** in the `synthea:` layer. The GMF `codes` array for a clinical state
is populated from the same element's `term:` annotations, mapping the terminology system to the
GMF system string:

| `term:` system | GMF `system` | Typical GMF states |
|---|---|---|
| SNOMED CT | `SNOMED-CT` | `ConditionOnset`, `Procedure`, `Encounter`, `Symptom` |
| LOINC | `LOINC` | `Observation`, `DiagnosticReport`, `VitalSign` |
| RxNorm | `RxNorm` | `MedicationOrder` |

This keeps **one source of truth for codes** (the terminology layer) and prevents drift between
"what the element means" and "what Synthea emits". A clinical state whose element has no `term:`
code is flagged by the panel/exporter.

## 6. Moddle schema sketch (`synthea:`)

Illustrative only — a real descriptor needs human sign-off (breaking-change rule). It mirrors
[`fhir-mapping.json`](../../packages/fhir-mapping/src/moddle/). Note it deliberately does **not**
redefine `codes` (sourced from `term:`).

```jsonc
{
  "name": "Synthea",
  "uri": "https://clinical-bpmn.org/synthea-gmf/v1",
  "prefix": "synthea",
  "xml": { "tagAlias": "lowerCase" },
  "types": [
    { "name": "GmfElement", "extends": ["bpmn:FlowNode", "bpmn:SequenceFlow", "bpmn:Process"], "properties": [] },

    { "name": "Module", "superClass": ["Element"], "properties": [
      { "name": "name",       "isAttr": true, "type": "String" },
      { "name": "gmfVersion", "isAttr": true, "type": "String" },
      { "name": "remarks",    "isAttr": true, "type": "String" }
    ]},

    { "name": "State", "superClass": ["Element"], "properties": [
      { "name": "stateType",         "isAttr": true, "type": "String" },   // Encounter | ConditionOnset | …
      { "name": "encounterClass",    "isAttr": true, "type": "String" },
      { "name": "wellness",          "isAttr": true, "type": "Boolean" },
      { "name": "targetEncounter",   "isAttr": true, "type": "String" },   // id/ref of an Encounter node
      { "name": "assignToAttribute", "isAttr": true, "type": "String" },
      { "name": "submodule",         "isAttr": true, "type": "String" },   // for CallSubmodule
      { "name": "delay",             "type": "Delay" },
      { "name": "allow",             "type": "Condition" }                 // for Guard
    ]},

    { "name": "Transition", "superClass": ["Element"], "properties": [
      { "name": "type",         "isAttr": true, "type": "String" },        // direct | distributed | conditional | complex
      { "name": "distribution", "isAttr": true, "type": "Real" },
      { "name": "condition",    "type": "Condition" }
    ]},

    { "name": "Condition", "superClass": ["Element"], "properties": [
      { "name": "conditionType", "isAttr": true, "type": "String" },
      { "name": "attribute",     "isAttr": true, "type": "String" },
      { "name": "operator",      "isAttr": true, "type": "String" },
      { "name": "value",         "isAttr": true, "type": "String" }
    ]},

    { "name": "Delay", "superClass": ["Element"], "properties": [
      { "name": "quantity", "isAttr": true, "type": "Real" },
      { "name": "unit",     "isAttr": true, "type": "String" }
    ]}
  ]
}
```

## 7. Properties-panel design

A **"Synthea (GMF)"** group appears for the relevant elements, mirroring
`TerminologyPropertiesProvider` / `FhirMappingPropertiesProvider`:

- **On flow nodes:** a *State Type* dropdown (only the types valid for that element kind);
  contextual fields (`encounterClass`/`wellness` for `Encounter`, `targetEncounter`,
  `assignToAttribute`, `submodule` for call activities, `delay` for `Delay`).
- **On sequence flows / gateways:** a *Transition Type* select, a *Distribution* number, and the
  structured *Condition builder* (§5.3).
- **Validation cues:** warn when a clinical state has no `term:` codes; warn when distributed
  branches don't sum to 1.0; disallow state types that don't fit the element.

## 8. Export pipeline (BPMN → module JSON)

1. Locate the `Process` and its (single) `StartEvent`.
2. For each flow node, build a GMF state: `type` from `synthea:stateType`, `codes` from `term:`,
   plus `synthea:`/`fhirmap:` fields; default to `Simple`.
3. For each node, compute its transition from the outgoing flows and any gateway (§5.2).
4. Assemble `states` keyed by a sanitized, unique state name (derived from the node name/id).
5. Emit `{ name, gmf_version, states }`.
6. **Validate** the JSON against Synthea's module schema and report problems.

**Packaging (decision in §11):** either a new `@forschungsgruppe-digital-health/synthea-export`
package, or a `synthea` package that bundles the moddle + panel + exporter. A `tools/`
validator (e.g. `check:synthea`) could emit and schema-validate modules as part of the
existing deterministic conformance gate — *the decision lives in the tool, not the model*.

## 9. Worked example (synthetic)

A minimal annotated lung-cancer pathway fragment (synthetic, illustrative names) and the module
it would export:

```
(Start) → [Encounter: "Oncology visit"] → [ConditionOnset: "Lung cancer (synthetic)"]
        → <XOR: cancer_stage> ──IV──→ [MedicationOrder: "Palliative therapy"] → (End)
                              └─I/II─→ [Procedure: "Resection (synthetic)"]    → (End)
```

```json
{
  "name": "synthetic_lung_cancer_pathway",
  "remarks": ["SYNTHETIC example — generated from a BPMN pathway. Not medical advice."],
  "gmf_version": 2,
  "states": {
    "Initial":            { "type": "Initial", "direct_transition": "Oncology_visit" },
    "Oncology_visit":     { "type": "Encounter", "encounter_class": "ambulatory",
                            "codes": [{ "system": "SNOMED-CT", "code": "000000", "display": "Oncology consultation (SYNTHETIC)" }],
                            "direct_transition": "Lung_cancer_dx" },
    "Lung_cancer_dx":     { "type": "ConditionOnset", "target_encounter": "Oncology_visit",
                            "assign_to_attribute": "lung_cancer",
                            "codes": [{ "system": "SNOMED-CT", "code": "000001", "display": "Lung cancer (SYNTHETIC)" }],
                            "conditional_transition": [
                              { "condition": { "condition_type": "Attribute", "attribute": "cancer_stage", "operator": "==", "value": "IV" },
                                "transition": "Palliative_therapy" },
                              { "transition": "Resection" }
                            ] },
    "Palliative_therapy": { "type": "MedicationOrder",
                            "codes": [{ "system": "RxNorm", "code": "000002", "display": "Palliative therapy (SYNTHETIC)" }],
                            "direct_transition": "End" },
    "Resection":          { "type": "Procedure", "target_encounter": "Oncology_visit",
                            "codes": [{ "system": "SNOMED-CT", "code": "000003", "display": "Lung resection (SYNTHETIC)" }],
                            "direct_transition": "End" },
    "End":                { "type": "Terminal" }
  }
}
```

Every code above is a placeholder (`000000…`) — real modules would pull real codes from the
`term:` layer.

## 10. Validation, conformance and testing

- **Schema validation** of every emitted module (the GMF JSON schema / Module Builder import).
- **Round-trip smoke test:** load the module into Synthea and confirm it generates without error
  (kept out of CI if Synthea is too heavy; runnable locally).
- **Exporter unit tests** (Vitest) covering each BPMN → state/transition rule, following the
  repo's "characterize current behaviour first" rule for any later refactor.
- Wire the validator into the conformance gate so a broken mapping fails fast.

## 11. Open questions / decisions needing human input

- **Namespace & URI:** `synthea:` vs `gmf:`; the descriptor URI and `gmf_version` target.
- **Packaging:** a standalone `synthea-export` package vs. folding it into a `synthea` package;
  whether the exporter ships as a library function, a CLI, or both.
- **Concurrency:** how to treat `bpmn:ParallelGateway` (sequentialize / submodule / reject).
- **Gateways as states vs. transition-shapers** (§5.2 trade-off).
- **Encounter scoping:** implicit "active encounter" vs. explicit `targetEncounter` references.
- **Condition builder coverage:** which GMF logic types to support in v1.
- **GMF surface in v1:** which subset of state types to implement first (the lung-cancer pathway
  needs `Encounter`, `ConditionOnset`, `MedicationOrder`, `Procedure`, `Observation`).
- **Round-trip:** whether to support GMF → BPMN import later.

_These are deliberately left open; they require human/clinical and architectural judgement and
an ADR before implementation._

## 12. Relationship to other work

- The **MiHUB lung-cancer pathway** explores BPMN → GMF directly; this concept generalises that
  into a reusable bpmn.io extension.
- The **patient portal** can consume the synthetic FHIR that Synthea generates from these
  modules (FHIR compartments, SMART smoke tests).
- It composes with the existing [`term:`](../../packages/terminology/) and
  [`fhirmap:`](../../packages/fhir-mapping/) layers and would become a sixth worked example in
  [docs/EXTENDING.md](../EXTENDING.md).

## 13. References

- Synthea — Generic Module Framework: [overview][gmf], [States][states], [Transitions][trans],
  and the [Module Builder][builder].
- [Synthea project][synthea] (synthetic patient generator).
- OMG BPMN 2.0 specification — <https://www.omg.org/spec/BPMN/2.0.2/>.
- This repo: [docs/EXTENDING.md](../EXTENDING.md),
  [docs/ARCHITECTURE.md](../ARCHITECTURE.md),
  [docs/arc42/08](../arc42/08_crosscutting_concepts.md),
  [`packages/terminology`](../../packages/terminology/),
  [`packages/fhir-mapping`](../../packages/fhir-mapping/).

[synthea]: https://github.com/synthetichealth/synthea
[gmf]: https://github.com/synthetichealth/synthea/wiki/Generic-Module-Framework
[states]: https://github.com/synthetichealth/synthea/wiki/Generic-Module-Framework:-States
[trans]: https://github.com/synthetichealth/synthea/wiki/Generic-Module-Framework:-Transitions
[builder]: https://synthetichealth.github.io/module-builder/
