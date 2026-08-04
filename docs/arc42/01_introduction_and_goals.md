# 1. Introduction and Goals

_Captures relevant requirements, driving forces, business goals, quality objectives, and stakeholder expectations that shape the system's architecture._

This document describes the design decisions, component architecture, data model, and project structure of **bpmn-js-clinical-semantics**. It is intended for contributors, integrators, and anyone interested in understanding how the libraries work under the hood.

For usage instructions, see the [README](../../README.md). For contributor workflow, see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Motivation and Background

### The Gap Between BPMN and Clinical Semantics

BPMN 2.0 has become the standard notation for modelling clinical pathways in hospitals, cancer centers, and health networks. Multidisciplinary teams use it to document diagnostic, staging, therapy, follow-up, palliative, preventive, and rehabilitation workflows. However, standard BPMN elements carry no clinical semantics. A `Task` labelled "CT-Thorax" is just a human-readable string: there is no machine-readable link to a SNOMED CT procedure code, no classification as an IHE XDS document type, and no mapping to a FHIR `DiagnosticReport` resource.

This limitation makes BPMN diagrams unreliable as a single source of truth for clinical process automation, decision support, and interoperability. When clinical pathways are revised, downstream systems (EHR integration engines, clinical data repositories, document registries) cannot determine whether a BPMN element has changed semantically or merely been relabelled. Regulatory audits, cross-institutional pathway comparisons, and automated conformance checking all require formalised semantics that plain BPMN cannot provide.

### The Problem in Practice

Consider a university hospital modelling its lung cancer diagnostic pathway. The pathway includes tasks like "CT-Thorax mit Kontrastmittel", data objects like "CT-Befundbericht", and decision gateways evaluating malignancy. Without formal annotations, three concrete problems arise:

1. **No interoperability.** A pathway exchange between institutions loses its meaning because the clinical codes behind each element are not embedded in the BPMN XML. Institution A uses SNOMED CT; institution B uses OPS. Neither can automatically map the other's process elements.

2. **No FHIR bridge.** Modern health IT infrastructure speaks FHIR. A BPMN task that creates a diagnostic report should declare which FHIR resource it produces (`DiagnosticReport`), which profile constrains it (e.g. MII KDS), and which key elements it populates (`DiagnosticReport.status = final`). Without this, the gap between process model and implementation must be bridged manually.

3. **No document classification.** Clinical document management systems rely on standardised type codes (IHE XDS classCode/typeCode, KDL). When a BPMN data object represents a clinical report, its document class should be part of the model, not a separate mapping table that drifts out of sync.

### How This Project Addresses It

**bpmn-js-clinical-semantics** closes these gaps by adding two optional, standards-based annotation layers to any BPMN model:

1. **Terminology annotations** (`term:` namespace) enrich BPMN elements with codes from SNOMED CT, LOINC, ICD-10-GM, OPS, IHE XDS, KDL, or any other code system. Each annotation carries an aspect (what facet is being annotated), a mode (descriptive vs. prescriptive), optional free text, and zero or more coded entries with their code system URI.

2. **FHIR resource mappings** (`fhirmap:` namespace) declare which FHIR resource type, profile, interaction pattern, and key elements a BPMN element represents. This enables downstream tooling to generate FHIR transaction bundles, StructureMap references, or SearchParameter queries directly from the process model.

Both annotation layers are stored as BPMN 2.0 `extensionElements` in the standard XML format. Non-clinical BPMN tools simply ignore them; clinical tools can read and process them. The approach preserves full backwards compatibility with every BPMN 2.0 engine and viewer.

## Quality Goals

The following quality goals are enforced by the conformance tooling and are the architectural drivers for the annotation design:

- **Backwards compatibility** with non-clinical BPMN 2.0 tools — annotations live in `extensionElements` and are ignored by engines and viewers that do not understand them.
- **Lossless, stable extension serialization** — clinical annotations survive a moddle read/write roundtrip without loss or reordering.
- **BPMN structural conformance** — annotated models remain valid BPMN 2.0 (bpmnlint structure plus XSD core validation).

These goals and the checks that enforce them are detailed in [chapter 10](10_quality_requirements.md). A prioritised/weighted quality tree (relative weighting and trade-offs between these goals) is _Requires human input_.

## Stakeholders

The project is owned by **TU Dresden / Forschungsgruppe Digital Health (FGDH)**. The documentation addresses the audiences named above: **contributors** (working on the libraries) and **integrators** (embedding the annotations in their own BPMN tooling). Concrete stakeholder roles, expectations, and decision authority are _Requires human input_ (no `CODEOWNERS` or `CONTRIBUTORS` file exists in the repository).

---

[← Architecture index](../ARCHITECTURE.md)  ·  [Developer primer (EXTENDING.md)](../EXTENDING.md)
