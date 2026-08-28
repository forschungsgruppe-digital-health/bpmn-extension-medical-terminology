# 1. Introduction and Goals

_Captures the purpose, driving forces, quality objectives, and stakeholder
expectations that shape the architecture._

This document describes the design, component architecture, data model, and
project structure of
`@forschungsgruppe-digital-health/terminology`. It is intended for contributors
and integrators embedding the extension in a bpmn-js application.

For usage instructions, see the [README](../../README.md). For contributor
workflow and release procedures, see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Motivation and background

BPMN 2.0 gives clinical process models a portable notation, but standard BPMN
element labels do not identify the clinical concepts they describe. A task
labelled “CT-Thorax” is readable by a person but does not itself identify a
SNOMED CT procedure, a LOINC observation, an ICD-10-GM diagnosis, or a document
classification.

This extension adds an optional terminology layer without changing BPMN core
elements or BPMN-DI data. A BPMN element can carry a collection of
`term:Annotation` elements. An annotation has an optional text and zero or more
codings; each coding records a CodeSystem URI, code, display text, and optional
version.

The package also supplies terminology access at runtime. Providers can query
SNOMED CT through Snowstorm, query FHIR terminology servers, or search static
and package-backed FHIR `CodeSystem` resources. The same provider contract is
used by the bpmn-js properties panel and by integrator code.

All extension data is persisted as standard BPMN 2.0 `extensionElements`.
Applications that do not understand the `term:` namespace can still process the
BPMN core, while applications that register the descriptor can read and edit
the typed extension objects.

## Quality goals

The repository turns the following goals into deterministic checks:

- **BPMN compatibility:** clinical semantics remain in
  `bpmn:extensionElements` under the custom `term:` namespace.
- **Lossless and stable serialization:** terminology elements survive the
  moddle read/write roundtrip and repeated serialization is idempotent.
- **Structural conformance:** BPMN fixtures pass the configured bpmnlint rules;
  the standard BPMN XSD is also checked, informationally by default.
- **Usable integration:** the published package exposes the moddle descriptor,
  properties-panel module, provider APIs, default services, and Vite discovery
  through documented ESM entry points.
- **Reproducible maintenance:** package conventions, conformance checks, and
  tests are available through the same npm scripts used by hooks and CI.

The repository enforces pass/fail outcomes, not stakeholder priority weights or
performance targets. Those trade-offs require maintainer input.

## Stakeholders

The repository serves:

- **Integrators**, who register the extension in a bpmn-js modeler and consume
  terminology services.
- **Contributors**, who maintain providers, properties-panel integration,
  moddle serialization, and conformance tooling.
- **Terminology maintainers**, who supply or configure FHIR terminology servers
  and package-backed CodeSystem resources.
- **Project maintainers**, who review breaking descriptor changes and operate
  GitHub Packages and GitHub Pages release workflows.

Concrete institutional roles, service-level expectations, and regulatory
classifications are not specified by the repository and require human input.

---

[← Architecture index](../ARCHITECTURE.md) · [Next: Constraints →](02_architecture_constraints.md)
