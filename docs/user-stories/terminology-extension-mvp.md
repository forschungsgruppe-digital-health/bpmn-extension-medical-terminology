# User Stories: Terminology Extension (term:) — MVP

> **Package:** `packages/terminology`
> **Moddle descriptor:** `clinical.json` (prefix `term`, URI `https://clinical-bpmn.org/terminology/v1`)
> **Date:** 2026-04-27

These user stories define the minimum viable product for the terminology annotation extension. They follow INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) and include SMART acceptance criteria (Specific, Measurable, Achievable, Relevant, Time-bound within sprint scope).

---

## Epic 1: Core Annotation Model

### US-T01: Add terminology annotations to BPMN tasks

**As a** clinical process modeler,
**I want to** attach terminology annotations (SNOMED CT, LOINC, OPS, ATC codes) to BPMN task elements,
**so that** the clinical semantics of each process step are machine-readable and unambiguous.

**Acceptance Criteria:**

- A `term:annotations` element can be added inside `bpmn2:extensionElements` of any `bpmn:FlowNode`.
- Each `term:annotation` supports attributes: `aspect` (clinicalContent | documentClass | documentType | note), `mode` (descriptive | prescriptive), and `text` (free-text description).
- Each annotation can contain one or more `term:coding` children with `system`, `code`, `display`, and optional `version` attributes.
- Annotations persist correctly through BPMN XML save/load cycles (round-trip fidelity).
- Unit tests verify serialization and deserialization of annotations with multiple codings.

**Story Points:** 5

---

### US-T02: Add terminology annotations to BPMN data objects

**As a** clinical process modeler,
**I want to** annotate `DataObjectReference` and `DataStoreReference` elements with terminology codes,
**so that** data artifacts in clinical workflows (reports, documents, data stores) carry standardized metadata.

**Acceptance Criteria:**

- The `term:Annotatable` type extends both `bpmn:DataObjectReference` and `bpmn:DataStoreReference` (as defined in `clinical.json`).
- A `term:clinicalDomain` attribute can be set on data objects (e.g., "diagnostics", "documentation").
- `term:annotations` with `term:coding` children can be added to data object extension elements.
- The `aspect` attribute supports `documentClass` and `documentType` for document-oriented data objects.
- Round-trip test: annotated DataObjectReference survives XML save/load without data loss.

**Story Points:** 3

---

### US-T03: Define clinical domain classification on annotatable elements

**As a** clinical process modeler,
**I want to** assign a `clinicalDomain` attribute (e.g., "staging", "therapy", "diagnostics", "follow-up", "documentation") to tasks and data objects,
**so that** process elements can be filtered and grouped by clinical domain in the UI.

**Acceptance Criteria:**

- `term:clinicalDomain` is available as an XML attribute on all elements that extend `term:Annotatable` (FlowNode, DataObjectReference, DataStoreReference, MessageFlow).
- The attribute value is a free-text string (no fixed enumeration at model level).
- The constants `CLINICAL_DOMAINS` in `types.js` provide a recommended set of domain values for UI dropdowns.
- Test: setting and reading `clinicalDomain` on a task, a DataObjectReference, and a MessageFlow.

**Story Points:** 2

---

## Epic 2: Properties Panel UI

### US-T05: Display terminology annotations in the properties panel

**As a** clinical process modeler using the bpmn-js editor,
**I want to** see the terminology annotations of the selected BPMN element in a dedicated panel section,
**so that** I can review coded clinical metadata without reading raw XML.

**Acceptance Criteria:**

- When a `FlowNode` or `DataObjectReference` is selected, the properties panel shows a "Terminology" section.
- The section lists each annotation with its `aspect`, `mode`, and `text`.
- Each annotation displays its codings as: `display (system: code)`.
- The `clinicalDomain` attribute is displayed as an editable dropdown.
- Empty state: if no annotations exist, the section shows "No annotations" with an "Add" button.

**Story Points:** 8

---

### US-T06: Add and edit terminology annotations via the properties panel

**As a** clinical process modeler,
**I want to** add, edit, and remove terminology annotations through the properties panel UI,
**so that** I can annotate the process without editing XML manually.

**Acceptance Criteria:**

- An "Add Annotation" action creates a new `term:annotation` with default aspect "clinicalContent" and mode "descriptive".
- The user can set aspect (dropdown: clinicalContent, documentClass, documentType, note), mode (dropdown: descriptive, prescriptive), and text (free text).
- Codings can be added manually (system, code, display) or via terminology search (see US-T08).
- Removing an annotation deletes the `term:annotation` element and its children.
- All edits are undoable via the bpmn-js command stack.

**Story Points:** 8

---

## Epic 3: Terminology Provider Integration

### US-T07: Static terminology provider for offline coding

**As a** clinical process modeler working offline or in restricted environments,
**I want to** search and select codes from locally bundled terminology sets (ICD-10-GM, OPS, KDL),
**so that** I can annotate process elements without an external terminology server.

**Acceptance Criteria:**

- `StaticProvider` loads code systems from local JSON files (presets).
- `search(query)` returns matching concepts with system, code, display.
- `lookup(system, code)` returns the full concept for a given code.
- KDL codes are loaded from the FHIR CodeSystem JSON representation (`loadKdlFromFhir()`).
- Test: search returns correct results for ICD-10-GM, OPS, and KDL queries.

**Story Points:** 5

---

### US-T08: SNOMED CT terminology search via Snowstorm adapter

**As a** clinical process modeler,
**I want to** search SNOMED CT concepts through a connected Snowstorm server,
**so that** I can find and attach precise SNOMED CT codes to process elements.

**Acceptance Criteria:**

- `SnomedCtProvider` delegates search and lookup calls to `SnowstormAdapter`.
- `SnowstormAdapter.search(query)` calls the Snowstorm `/concepts` endpoint and returns mapped `Concept` objects.
- `SnowstormAdapter.lookup(code)` returns a single concept with its full display name.
- Connection errors are handled gracefully with meaningful error messages.
- Test: mocked Snowstorm API responses verify correct mapping to the internal `Concept` type.

**Story Points:** 5

---

### US-T09: FHIR terminology search via FHIR Terminology adapter

**As a** clinical process modeler,
**I want to** search ValueSets and look up codes via a standard FHIR Terminology Service ($expand, $lookup),
**so that** I can use any FHIR-compliant terminology server for annotation.

**Acceptance Criteria:**

- `FhirProvider` delegates to `FhirTerminologyAdapter`.
- `FhirTerminologyAdapter.search(query)` calls `ValueSet/$expand` with `filter` parameter and returns concepts.
- `FhirTerminologyAdapter.lookup(system, code)` calls `CodeSystem/$lookup` and extracts display, designation, and properties.
- The FHIR MIME type is taken from `fhir-version.js` (`application/fhir+json`).
- Test: mocked FHIR server responses verify correct mapping from `ValueSet.expansion.contains` and `Parameters` to `Concept`.

**Story Points:** 5

---

### US-T10: Terminology provider registry with dynamic provider selection

**As a** developer integrating the terminology extension,
**I want to** register multiple terminology providers and have the system select the appropriate provider for a given code system URI,
**so that** the UI can offer a unified search interface across SNOMED CT, LOINC, ICD, and local code systems.

**Acceptance Criteria:**

- `TerminologyRegistry` maintains a map of code system URIs to provider instances.
- `register(uri, provider)` adds a provider; `get(uri)` returns it.
- `search(uri, query)` delegates to the correct provider.
- A default provider can be set for URIs with no explicit registration.
- Test: registering multiple providers and verifying correct delegation for each URI.

**Story Points:** 3

---

## Epic 4: FHIR Version Support

### US-T11: Centralized FHIR version configuration for the terminology package

**As a** developer,
**I want to** switch between FHIR R4 and FHIR R5 in the terminology package by changing a single configuration,
**so that** the package can be upgraded to support newer FHIR versions without scattered code changes.

**Acceptance Criteria:**

- `fhir-version.js` exports `FHIR_R4`, `FHIR_R5` (frozen config objects), `ACTIVE_FHIR_VERSION`, and `FHIR_MIME_TYPE`.
- Changing `ACTIVE_FHIR_VERSION = FHIR_R5` updates all downstream behavior (API endpoints, MIME types).
- `@types/fhir` JSDoc typedefs in `types.js` provide type safety for FHIR R4 types (fhir4.Coding, fhir4.ValueSet, etc.).
- Tests verify R4 as default and that R5 config structure is valid.

**Story Points:** 2

---

## Story Map Summary

| Priority | Story | Points | Dependencies |
|----------|-------|--------|--------------|
| P0 | US-T01 Core annotation model | 5 | — |
| P0 | US-T02 Data object annotations | 3 | US-T01 |
| P0 | US-T03 Clinical domain attribute | 2 | US-T01 |
| P1 | US-T07 Static provider | 5 | — |
| P1 | US-T10 Provider registry | 3 | US-T07 |
| P1 | US-T08 SNOMED CT provider | 5 | US-T10 |
| P1 | US-T09 FHIR terminology adapter | 5 | US-T10 |
| P1 | US-T05 Properties panel (read) | 8 | US-T01, US-T10 |
| P2 | US-T06 Properties panel (write) | 8 | US-T05 |
| P2 | US-T11 FHIR version config | 2 | — |

**Total MVP Story Points:** 46

---

[← Project README](../../README.md)
