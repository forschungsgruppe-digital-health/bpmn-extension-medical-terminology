# User Stories: Terminology Extension (`term:`)

> **Status:** implemented baseline with planned, human-confirmed follow-up
> scope  
> **Package:** `@forschungsgruppe-digital-health/terminology` (`extension/`)  
> **Moddle descriptor:** [`extension/src/moddle/clinical.json`](../../extension/src/moddle/clinical.json)  
> **Namespace:** `term`, `https://clinical-bpmn.org/terminology/v1`  
> **Date:** 2026-08-27

This document records the current terminology-extension behavior and the
smallest useful follow-up stories. It is a planning and traceability document,
not a promise that every future story is already implemented. Examples use
synthetic model data only.

## Current scope

The descriptor currently defines exactly three types:

- `Annotations`, a container with many `Annotation` values;
- `Annotation`, with `id`, optional `text`, and many `Coding` values;
- `Coding`, with `system`, optional `version`, `code`, and optional `display`.

Terminology content is persisted only as `term:` elements under BPMN
`extensionElements`. The properties panel currently exposes terminology
editing for tasks, subprocesses, exclusive gateways, data references, and
start, end, and intermediate events. Message flows are descriptor-supported
but do not currently have a terminology panel target.

## Epic 1: Core annotation model — implemented

### US-T01: Persist annotations on supported BPMN elements

**As a** clinical process modeler,  
**I want to** attach one or more coded terminology annotations to a BPMN
element,  
**so that** its clinical meaning can be exchanged as machine-readable data.

**Acceptance criteria:**

- A `term:annotations` element can be placed in
  `bpmn:extensionElements`.
- A `term:annotation` has a stable `id` and may have free-text `text`.
- Each annotation may contain multiple `term:coding` children.
- Each coding supports `system`, `code`, optional `version`, and optional
  `display`.
- The annotation data survives BPMN XML load/save round trips.
- Synthetic fixtures and tests cover multiple annotations and codings.

**Implementation evidence:** `clinical.json`, `AnnotationHelper.js`, and
`tools/moddle-roundtrip.mjs`.

### US-T02: Create, identify, and remove annotations

**As a** modeler,  
**I want to** add, edit, and remove annotations and codings,  
**so that** I can maintain terminology metadata without hand-editing XML.

**Acceptance criteria:**

- New annotations receive a generated `term-ann-*` ID when no ID is supplied.
- IDs are validated for allowed characters and uniqueness in the diagram.
- The helper creates missing `ExtensionElements` and `Annotations`
  containers lazily.
- The properties panel can edit annotation text and coding fields and remove
  annotations.
- Changes use bpmn-js modeling services and therefore participate in the
  command stack.

**Implementation evidence:** `AnnotationHelper.js` and
`AnnotationListEntry.js`.

## Epic 2: Properties-panel integration — implemented

### US-T03: Review and maintain annotations in the properties panel

**As a** bpmn-js modeler user,  
**I want to** see terminology metadata for the selected supported element,  
**so that** I can review coded meaning without opening the XML.

**Acceptance criteria:**

- The “Medical terminology” group appears only for the provider's supported
  target types.
- The group can show the annotation-list entry according to
  `TerminologyPropertiesPanelModule` configuration.
- Existing annotations display their text and codings.
- Empty or missing extension elements are handled without breaking the panel.

**Implementation evidence:** `TerminologyPropertiesProvider.js`,
`AnnotationListEntry.js`, and the properties-panel tests.

### US-T04: Search registered terminology providers

**As a** modeler,  
**I want to** search configured terminology providers while adding a coding,  
**so that** I can select a concept instead of copying fields manually.

**Acceptance criteria:**

- The annotation editor can use the optional `TerminologyRegistry`.
- Search results provide the coding `system`, `code`, `display`, and version
  when available.
- Provider failures produce an in-panel error rather than corrupting the BPMN
  model.
- A consumer can disable live loading or provide its own provider set.

**Implementation evidence:** `AnnotationListEntry.js`,
`TerminologyRegistry.js`, and `TerminologyServices.js`.

## Epic 3: Terminology providers — implemented

### US-T05: Use static and package-backed terminology

**As a** modeler working offline or with installed terminology content,  
**I want to** search local terminology snapshots,  
**so that** annotation does not always depend on a remote server.

**Acceptance criteria:**

- `StaticProvider` supports local concept collections.
- FHIR `CodeSystem` JSON can be converted to a static provider.
- Bundled presets expose the current installed terminology resources.
- Package discovery can group resources by package and filter by exact
  canonical `CodeSystem.url`.

**Implementation evidence:** `StaticProvider.js`,
`CodeSystemProviderFactory.js`, `providers/presets/`, and
`PackageProviderDiscovery.js`.

### US-T06: Query FHIR and SNOMED terminology services

**As a** modeler with a terminology service connection,  
**I want to** search and look up codes through supported terminology APIs,  
**so that** I can use authoritative or organization-provided terminology
  services.

**Acceptance criteria:**

- FHIR providers use the FHIR `$expand` and `$lookup` operations.
- The SNOMED provider supports FHIR transport and optional Snowstorm
  transport.
- Providers expose a common search, lookup, validation, and hierarchy
  contract through `TerminologyProvider`.
- Configuration supports default endpoints, overrides, custom fetch functions,
  and disabled providers.

**Implementation evidence:** `FhirTerminologyAdapter.js`,
`SnowstormAdapter.js`, `FhirProvider.js`, `SnomedCtProvider.js`, and
`terminology-config.js`.

### US-T07: Discover installed FHIR CodeSystem packages

**As a** consumer integrating the package with Vite,  
**I want to** discover selected installed FHIR terminology resources,  
**so that** the modeler can use package-backed providers without manually
  importing every CodeSystem.

**Acceptance criteria:**

- The Vite plugin exposes discovered FHIR `CodeSystem` JSON resources.
- Consumers can include or exclude packages and exact canonical URLs.
- A discovered package is represented by an aggregate provider while selected
  codings retain their concrete CodeSystem URL and version.
- Invalid package names or resource selectors fail with descriptive errors.

**Implementation evidence:** `vite/plugin.js`, `PackageProviderDiscovery.js`,
and the package-discovery tests.

## Epic 4: Validation and compatibility — implemented

### US-T08: Enforce valid terminology annotations

**As a** contributor,  
**I want to** lint terminology annotations and verify serialization,  
**so that** malformed extension data is caught before review.

**Acceptance criteria:**

- `.bpmnlintrc` loads `plugin:terminology/recommended`.
- `annotation-requires-id` rejects missing or invalid annotation IDs.
- Moddle roundtrip checking detects unstable serialization or dropped
  `term:` elements.
- Generated terminology schema and extension checks are part of
  `npm run check:conformance`.

**Implementation evidence:** `extension/lint/bpmnlint-plugin-terminology/`,
`tools/lint-bpmn.mjs`, `tools/moddle-roundtrip.mjs`, and the root
`package.json` scripts.

## Planned stories — require human confirmation

The following ideas are deliberately not part of the current descriptor or
acceptance criteria. They may be proposed later only after maintainers and
terminology stakeholders confirm the data model, compatibility policy, and UI
scope:

- richer governance metadata for annotations;
- additional panel targets such as `MessageFlow`;
- organization-specific terminology package presets;
- further FHIR version or language behavior beyond the current configuration.

Any approved descriptor change must update the descriptor, implementation,
tests, generated schema, and conformance documentation together. Renaming or
removing a descriptor type or property is a breaking change and requires
human sign-off.

---

[← Project README](../../README.md) ·
[Developer primer](../EXTENDING.md) ·
[Architecture](../ARCHITECTURE.md)
