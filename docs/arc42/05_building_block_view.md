# 5. Building Block View

_Shows the static decomposition into packages, modules, and key runtime
components._

## Level 1: repository building blocks

```mermaid
graph TB
    EXT["@forschungsgruppe-digital-health/terminology<br/>extension/<br/>published raw ESM"]
    DEMO["clinical-bpmn-demo<br/>demo/<br/>private bpmn-js integration"]
    LINT["bpmnlint-plugin-terminology<br/>extension/lint/<br/>workspace plugin"]
    FIX["examples/valid<br/>examples/invalid"]
    TOOLS["tools/<br/>deterministic conformance and package checks"]
    EXT --> DEMO
    EXT --> LINT
    EXT --> FIX
    TOOLS --> FIX
    TOOLS --> EXT
```

## Terminology provider architecture

```mermaid
classDiagram
    class TerminologyProvider {
        <<interface>>
        +id: string
        +displayName: string
        +systemUri: string
        +version?: string
        +capabilities: TerminologyCapabilities
        +search(term, options?) SearchResult
        +lookup(code) Concept
        +validate(code) ValidationResult
        +getHierarchy(code) HierarchyResult
    }
    class TerminologyRegistry {
        -providers: Map
        -listeners: Map
        +register(provider)
        +unregister(id)
        +getProvider(id)
        +findProviderBySystem(uri)
        +listProviders()
        +search(term, providerId)
        +searchAll(term)
        +lookup(code, providerId)
        +validate(code, providerId)
    }
    class SnomedCtProvider {
        -adapter: SnowstormAdapter
        -branch: string
        +eclQuery(ecl, term?)
    }
    class FhirProvider {
        -adapter: FhirTerminologyAdapter
    }
    class StaticProvider {
        -concepts: Concept[]
        +getAll()
    }
    class FallbackProvider {
        -primaryProvider: TerminologyProvider
        -fallbackProvider: TerminologyProvider
    }
    class SnowstormAdapter {
        +search(params)
        +lookup(code)
        +getParents(code)
        +getChildren(code)
    }
    class FhirTerminologyAdapter {
        +search(params)
        +lookup(code)
    }
    class Concept {
        +code: string
        +display: string
        +system: string
        +version?: string
        +active?: boolean
    }
    TerminologyRegistry "1" --> "*" TerminologyProvider : manages
    TerminologyProvider <|-- SnomedCtProvider
    TerminologyProvider <|-- FhirProvider
    TerminologyProvider <|-- StaticProvider
    TerminologyProvider <|-- FallbackProvider
    SnomedCtProvider --> SnowstormAdapter : uses
    FhirProvider --> FhirTerminologyAdapter : uses
    TerminologyProvider ..> Concept : returns
```

## Level 2: published package

```text
extension/
├── src/index.js                         public ESM exports
├── src/core/
│   ├── TerminologyProvider.js            provider contract
│   ├── TerminologyRegistry.js            provider facade
│   ├── types.js                          JSDoc types and constants
│   └── fhir-version.js                   active FHIR version metadata
├── src/adapters/
│   ├── SnowstormAdapter.js               SNOMED CT REST transport
│   └── FhirTerminologyAdapter.js         FHIR $expand/$lookup transport
├── src/providers/
│   ├── SnomedCtProvider.js
│   ├── FhirProvider.js
│   ├── StaticProvider.js
│   ├── FallbackProvider.js
│   └── presets/index.js                  bundled package presets
├── src/services/
│   ├── AnnotationHelper.js               term: object CRUD
│   ├── TerminologyServices.js             service/module factories
│   ├── FhirCodeSystemLoader.js            FHIR CodeSystem loading
│   ├── CodeSystemProviderFactory.js       CodeSystem → provider
│   ├── PackageProviderDiscovery.js        package grouping/filtering
│   ├── TerminologyProviderLoader.js        lazy FHIR provider loading
│   └── PackageMetadata.js                 provider labels and metadata
├── src/config/terminology-config.js       defaults and overrides
├── src/moddle/clinical.json               term: descriptor
├── src/properties-panel/                  bpmn-js editing provider and entries
└── src/vite/                              package discovery plugin
```

### `term:` moddle building block

`extension/src/moddle/clinical.json` declares:

- `Annotations`, an `Element` container with many `Annotation` values.
- `Annotation`, an `Element` with `id`, optional `text`, and many `Coding`
  values.
- `Coding`, an `Element` with `system`, optional `version`, `code`, and
  optional `display` attributes.

The descriptor uses lower-case XML tag aliases. The schema counterpart is
`schema/clinical-semantics.xsd`.

### Properties-panel building block

`TerminologyPropertiesProvider` registers at low priority and contributes the
“Clinical annotations” group for supported tasks, subprocesses, gateways,
events, data references, and other `TARGET_TYPES`. `AnnotationListEntry` edits
`term:Annotations` and `term:Coding` values. `AnnotationHelper` lazily creates
`bpmn:ExtensionElements` and wires `$parent` links before bpmn-js commits the
change through `modeling.updateModdleProperties`.

### Providers and defaults

The default configuration can register:

- SNOMED CT through FHIR or Snowstorm transport.
- FHIR terminology providers for LOINC, ICD-10-GM, OPS, and ATC.
- Package-backed providers for HL7 Terminology R4, IHE XDS class/type codes,
  and KDL.
- Additional static, FHIR, package, or fallback providers supplied by the
  consumer.

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](04_solution_strategy.md) · [Next →](06_runtime_view.md)
