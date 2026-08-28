# 12. Glossary

_Defines technical and domain terms as they are used in this repository._

## BPMN and bpmn.io

| Term | Definition |
|---|---|
| **BPMN 2.0** | OMG Business Process Model and Notation. The standard process-model format extended by this package without changing its core structure. |
| **`extensionElements`** | The standard BPMN container used for foreign application data. Terminology data is stored here under `term:`. |
| **bpmn-js** | The bpmn.io modeler/viewer that hosts the extension as an additional module and moddle extension. |
| **bpmn-moddle / moddle** | The metamodel layer that parses BPMN XML into typed business objects and serializes them back to XML. |
| **moddle descriptor** | JSON declaring a namespace, prefix, types, inheritance, and properties. The current descriptor is `extension/src/moddle/clinical.json`. |
| **businessObject** | The moddle object backing a BPMN element; helpers and properties-panel entries read and update it. |
| **properties panel** | The bpmn-js sidebar to which `TerminologyPropertiesProvider` contributes editing entries. |

## `term:` terminology model

| Term | Definition |
|---|---|
| **`term:` namespace** | Prefix for `https://clinical-bpmn.org/terminology/v1`, the public XML namespace of this package. |
| **`Annotations`** | `Element` container holding many `Annotation` values under `extensionElements`. |
| **`Annotation`** | A terminology statement with an ID, optional free text, and zero or more codings. |
| **`Coding`** | A code-system URI, code, optional display, and optional version serialized as a `term:Coding`. |
| **Concept** | The internal provider result shape containing at least `system`, `code`, and `display`, with optional version, active status, and properties. |

## Providers and FHIR terminology

| Term | Definition |
|---|---|
| **TerminologyProvider** | Common contract for search, lookup, validation, capabilities, and optional hierarchy access. |
| **TerminologyRegistry** | Facade that registers providers and delegates search, lookup, validation, and provider metadata operations. |
| **SnowstormAdapter** | REST client used by `SnomedCtProvider` for SNOMED search, lookup, and hierarchy operations. |
| **FhirTerminologyAdapter** | Client for FHIR terminology `$expand` and `$lookup` operations. |
| **FhirProvider** | Generic provider for a CodeSystem hosted on a FHIR terminology server. |
| **StaticProvider** | In-memory provider for small or package-loaded concept collections. |
| **FallbackProvider** | Provider that prefers one provider and falls back to another when the primary cannot answer. |
| **FHIR R4** | HL7 Fast Healthcare Interoperability Resources release used by the package's JSDoc types and bundled terminology resources. |
| **CodeSystem** | FHIR resource defining codes and their meanings; package discovery converts its concepts into static terminology providers. |
| **ValueSet** | FHIR resource or expansion used by terminology-server search/configuration, distinct from the BPMN annotation model. |
| **SNOMED CT** | Clinical terminology accessed through the SNOMED system URI `http://snomed.info/sct`. |
| **LOINC** | Laboratory and observation terminology configured through `FhirProvider`. |
| **ICD-10-GM** | German ICD-10 modification configured as a FHIR-hosted provider. |
| **OPS** | German procedure classification configured as a FHIR-hosted provider. |
| **ATC** | Anatomical Therapeutic Chemical medication classification configured as a FHIR-hosted provider. |
| **IHE XDS class/type codes** | Package-backed document classification CodeSystems supplied as default providers. |
| **KDL** | German clinical document classification terminology supplied as a package-backed provider. |

## Build, release, and conformance

| Term | Definition |
|---|---|
| **Raw ESM** | The extension publishes JavaScript source with `"type": "module"` and no library build step. |
| **Package discovery** | Vite-time loading and filtering of installed FHIR `CodeSystem` JSON resources by package name and canonical URL. |
| **Moddle roundtrip** | Parse → serialize A → parse A → serialize B, requiring stable A/B output and no dropped known `term:` elements. |
| **Conformance gate** | The npm-scripted lint, roundtrip, schema, XSD, and package checks aggregated by `check:conformance` and `verify`. |
| **Release Please** | Release automation that maintains release PRs and updates configured extension artifacts. |
| **GitHub Packages** | The npm registry at `https://npm.pkg.github.com` used for the published package. |
| **GitHub Pages** | Static hosting used for the private demo build published from `demo/dist`. |
| **Synthetic data** | Artificial fixture content permitted by the repository; real or realistic patient data is prohibited. |

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](11_risks_and_technical_debt.md)
