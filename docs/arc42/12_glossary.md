# 12. Glossary

_Defines important domain and technical terms used by stakeholders to ensure consistent understanding and avoid ambiguity._

This glossary fixes the meaning of terms **as this repository uses them**. Where a term is also an industry standard, the definition is scoped to how it appears in the code, the moddle descriptors, and the tooling — not the full external specification. For deeper context see [3. Context and Scope](03_context_and_scope.md), [5. Building Block View](05_building_block_view.md), and [8. Crosscutting Concepts](08_crosscutting_concepts.md).

## 12.1 BPMN & bpmn.io stack

| Term | Definition in this repo |
|---|---|
| **BPMN 2.0** | Business Process Model and Notation, OMG standard. The notation in which clinical pathways are modelled. The libraries add semantics **without** altering the `bpmn:`/`bpmndi:` core; annotated models stay valid BPMN 2.0. |
| **`extensionElements`** | The standard BPMN 2.0 container in which both annotation layers persist their data. Non-clinical tools ignore and preserve it on round-trip. The sole persistence mechanism (no sidecar format). |
| **bpmn-js** | The bpmn.io BPMN modeler/viewer that hosts the libraries. A peer dependency (`>=15.0.0`); the libraries are bpmn-js _extension modules_, not standalone apps. |
| **diagram-js** | The underlying diagramming engine of bpmn-js (event bus, dependency-injection modules). The properties-panel providers and `additionalModules` plug into it. |
| **moddle / bpmn-moddle** | The bpmn.io metamodel layer that reads/writes typed objects from/to BPMN XML. `bpmn-moddle` (`^10.0.0`, dev) parses BPMN with the `term:`/`fhirmap:` extensions registered; used by the roundtrip conformance check. |
| **moddle descriptor** | A JSON metamodel that declares custom types, their properties (`isAttr`, `isMany`), and the namespace `prefix`/`uri`. This repo ships two: `clinical.json` (`term:`) and `fhir-mapping.json` (`fhirmap:`). Renaming/removing a type or property is a breaking (MAJOR) change. |
| **`businessObject`** | The moddle object backing a BPMN shape. `AnnotationHelper`/`MappingHelper` read and write annotations/mappings on the selected element's `businessObject`. |
| **properties panel** | The bpmn-js sidebar UI (`bpmn-js-properties-panel` `>=5.0.0`, `@bpmn-io/properties-panel` `>=3.0.0`). Each library contributes a provider that adds an editing group (e.g. "Klinische Annotation", "FHIR Resource Mapping"). |
| **`additionalModules` / `moddleExtensions`** | The two bpmn-js constructor hooks the libraries register through: `additionalModules` for the properties-panel providers, `moddleExtensions` for the `term:`/`fhirmap:` descriptors. |
| **bpmnlint** | The bpmn.io structural linter (`^11.12.1`). Runs via `tools/lint-bpmn.mjs` over `.bpmn` files to check BPMN _structure/correctness_ (disconnected nodes, missing start/end events, dangling references). |

## 12.2 The `term:` namespace (terminology annotations)

Namespace `term:` → URI `https://clinical-bpmn.org/terminology/v1` (descriptor `clinical.json`). Attaches to `bpmn:FlowNode`, `bpmn:DataObjectReference`, `bpmn:DataStoreReference`, `bpmn:MessageFlow`.

| Term | Definition in this repo |
|---|---|
| **Annotation** | One semantic statement about a BPMN element: an `aspect`, a `mode`, optional free `text`, and zero or more `Coding`s. An element may carry many. |
| **`aspect`** | The facet being annotated, an open string: `clinicalContent`, `documentClass`, `documentType`, `note`, `confidentiality`, `status`, `format`, `participant`, or custom. |
| **`mode`** | `descriptive` (documentation only) or `prescriptive` (normative, optionally with a mapping target). |
| **Coding** | A single coded value: `system` (code-system URI), `code`, optional `display`, optional `version`. The repo's unit of interoperable meaning. |
| **`clinicalDomain`** | Optional attribute added directly to the annotated element (e.g. `diagnostics`) via the `Annotatable` extension. |
| **TerminologyProvider** | Interface for a code-system backend: `search`, `lookup`, `validate`, `getHierarchy` plus a `capabilities` object. Implemented by `SnomedCtProvider`, `FhirProvider`, `StaticProvider`. |
| **TerminologyRegistry** | Facade aggregating providers; the panel depends on it (not on concrete providers). Exposes `search`, `searchAll`, `lookup`, `validate`. |
| **Adapter** | Protocol-specific client a provider delegates to: `SnowstormAdapter` (SNOMED CT REST) and `FhirTerminologyAdapter` (FHIR `$expand`/`$lookup`). |
| **Preset / static provider** | Factory-built offline `StaticProvider` for small, server-less code systems: `createIheXdsClassCodeProvider()`, `createIheXdsTypeCodeProvider()`, `createKdlProvider()`. |

## 12.3 The `fhirmap:` namespace (FHIR resource mapping)

Namespace `fhirmap:` → URI `https://clinical-bpmn.org/fhir-mapping/v1` (descriptor `fhir-mapping.json`). Independent of `term:`; attaches to the same BPMN element types.

| Term | Definition in this repo |
|---|---|
| **ResourceMapping** | Declares which FHIR resource a BPMN element represents: `resourceType`, optional `profile`, `interaction`, `direction`, `structureMapRef`, plus `keyElements` and `searchParams`. |
| **`resourceType`** | A FHIR R4 resource type (e.g. `Condition`, `Procedure`, `Observation`, `DiagnosticReport`, `DocumentReference`, `ServiceRequest`, `CarePlan`, `Composition`, `Bundle`). |
| **`profile`** | Canonical URL of the constraining FHIR profile (e.g. an MII KDS profile). |
| **`interaction`** | FHIR interaction type: `create`, `read`, `update`, `search`, `transaction`. |
| **`direction`** | Data-flow direction relative to the element: `input`, `output`, `input-output`. |
| **`structureMapRef`** | Canonical URL of a FHIR StructureMap for automated transformation. |
| **KeyElement** | A single element binding: a FHIRPath `path`, a `semanticRole`, optional `fixedValue`, and a `terminologyBinding` (+ `terminologyAspect`) linking it to a `term:` annotation. |
| **`semanticRole`** | The role a key element plays: `trigger`, `filter`, `classifier`, `identifier`, `payload`. |
| **SearchParam** | A FHIR SearchParameter (`name`/`value`) for `search`-type interactions. |
| **MappingHelper** | Service that reads/writes resource mappings on the `businessObject` and exports all mappings of a model as JSON. |

## 12.4 FHIR & clinical terminology

| Term | Definition in this repo |
|---|---|
| **FHIR R4** | HL7 Fast Healthcare Interoperability Resources, release 4 — the resource model the `fhirmap:` layer targets (resource types, profiles, interactions). |
| **FHIRPath** | The expression language used for `KeyElement.path` (e.g. `DiagnosticReport.status`) and as the addressing scheme for prescriptive annotation targets. |
| **Profile / StructureMap / SearchParameter** | FHIR conformance/transformation/query artefacts referenced by canonical URL from a `ResourceMapping` (`profile`, `structureMapRef`, `searchParams`). |
| **SNOMED CT** | Clinical terminology served by a Snowstorm server via `SnomedCtProvider`/`SnowstormAdapter`; system URI `http://snomed.info/sct`. |
| **LOINC** | Lab/observation codes, accessed as a FHIR-hosted code system via `FhirProvider`. |
| **ICD-10-GM** | German modification of ICD-10 (diagnoses), FHIR-hosted via `FhirProvider`. |
| **OPS** | Operationen- und Prozedurenschlüssel — German procedure classification, FHIR-hosted via `FhirProvider`. |
| **ATC** | Anatomical Therapeutic Chemical classification (medications), FHIR-hosted via `FhirProvider`. |
| **ICD-O-3** | International Classification of Diseases for Oncology, FHIR-hosted via `FhirProvider`. |
| **IHE XDS classCode / typeCode** | IHE Cross-Enterprise Document Sharing document-class/type vocabularies; shipped as built-in static presets (16 / 22 codes) for the `documentClass` / `documentType` aspects. |
| **KDL** | Klinische Dokumentenklassenliste (DVMD); built-in static preset (18 codes, full set loadable from FHIR); system URI `http://dvmd.de/fhir/CodeSystem/kdl`. |
| **MII KDS** | Medical Informatics Initiative Kerndatensatz — example source of `profile` canonical URLs (referenced, not bundled). |

## 12.5 Build, release & quality tooling

| Term | Definition in this repo |
|---|---|
| **Monorepo / npm workspaces** | Single repository with two publishable packages (`terminology`, `fhir-mapping`) plus the private `demo` package, managed as npm workspaces. Install requires `--legacy-peer-deps`. |
| **Raw ESM, no build step** | Packages ship `src/` directly (`"type": "module"`, `"main": "src/index.js"`); only the demo is built. JS + JSDoc, no TypeScript. |
| **Conformance gate** | The deterministic CLI checks under `tools/` whose verdict lives in the tool, never the model: `lint:bpmn` (bpmnlint, blocking), `check:roundtrip` (moddle lossless+stable, blocking on instability), `check:xsd` (OMG `BPMN20.xsd` via `xmllint`, informational by default), `check:packages` (publishing conventions, blocking). Aggregated as `check:conformance` and `verify`. |
| **Moddle roundtrip** | The `tools/moddle-roundtrip.mjs` check: parse → serialize (A) → re-parse → re-serialize (B), assert `A === B` (idempotent) and that no registered `term:`/`fhirmap:` element was dropped. |
| **Git hooks** | `pre-commit`/`pre-push` wired via `tools/setup-hooks.mjs` (npm `prepare` → `core.hooksPath`), running the same conformance scripts as terminal and CI. |
| **release-please** | Google's release automation (`release-please.yml`). Reads Conventional Commits, maintains a release PR, then tags + creates **per-component** GitHub Releases (`include-component-in-tag: true` → e.g. `terminology-v0.1.0`, `fhir-mapping-v0.1.0`). It does **not** publish — publishing is decoupled into `publish.yml`. |
| **`publish.yml` / decoupled publish** | A separate, idempotent workflow triggered `on: release: published` that publishes the package for the released component to GitHub Packages, skipping versions already on the registry. Decoupled from `release-please.yml`, which only tags/releases. |
| **Lockstep / linked versioning** | The two publishable packages share one version (currently `0.1.0`), kept in sync by release-please's `linked-versions` + `node-workspace` plugins (`updatePeerDependencies: true`). Tags/releases are emitted **per component** (`include-component-in-tag: true`), not as one consolidated `v<version>` tag. The `demo` package is not listed in `release-please-config.json`, so it is excluded from release-please. |
| **Conventional Commits** | Commit-message convention (`feat`/`fix`/…); scope = package name (`terminology`, `fhir-mapping`, `demo`); drives the release-please version bumps. |
| **GitHub Packages** | The npm registry (`https://npm.pkg.github.com`) the packages publish to; the `@forschungsgruppe-digital-health` scope must equal the owning org. |
| **GitHub Pages** | Where the interactive demo (`examples/vanilla`, built to `docs/`) is deployed on push to `main` via `deploy.yml`. |
| **Vitest** | The test runner (`vitest run`) used per package. |
| **Vue composables** | `useTerminology()` / `useFhirMapping()` from the `demo` package — reactive wrappers over the registry/mapping helper that follow the bpmn-js selection (Vue 3 only, optional). |

---

[← Architecture index](../ARCHITECTURE.md)
