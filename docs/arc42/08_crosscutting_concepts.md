# 8. Crosscutting Concepts

_Explains technical concepts and patterns that apply across multiple building
blocks._

## BPMN extension data model

```mermaid
classDiagram
    class "BPMN element" as BPMN
    class "term:Annotations" as Annotations {
        +values: Annotation[0..*]
    }
    class "term:Annotation" as Annotation {
        +id: string
        +text?: string
        +codings: Coding[0..*]
    }
    class "term:Coding" as Coding {
        +system: string
        +version?: string
        +code: string
        +display?: string
    }
    BPMN "1" --> "0..1" Annotations : extensionElements
    Annotations "1" --> "*" Annotation
    Annotation "1" --> "*" Coding
```

The descriptor is the source of truth for the serialized shape. The public
namespace is `term:` → `https://clinical-bpmn.org/terminology/v1`. The helper
and properties panel operate on moddle business objects, not on raw XML.

## Provider extension model

There are three normal ways to add a terminology system:

### FHIR-hosted CodeSystem

```js
registry.register(new FhirProvider({
  id: 'atc',
  displayName: 'ATC',
  systemUri: 'http://www.whocc.no/atc',
  baseUrl: 'https://fhir.example.test'
}));
```

### Static or package-backed CodeSystem

```js
registry.register(createStaticProviderFromCodeSystem(codeSystem, {
  id: 'my-codes',
  displayName: 'My codes',
  systemUri: codeSystem.url
}));
```

### Custom API

Implement `TerminologyProvider`, or compose an adapter and provider that
converts the external API into `Concept` and `SearchResult` values. The
registry does not need to change.

## Package discovery

The Vite plugin and `PackageProviderDiscovery` use package names and exact
canonical `CodeSystem.url` values. A package can expose multiple CodeSystems;
the service factory creates an aggregate provider while preserving each
CodeSystem URL in selected codings. `exclude` takes precedence over `include`.
The default extension also bundles package-backed presets for common HL7,
IHE XDS, and KDL terminology resources. HL7's resource list is generated into
one JSON resource and loaded with a standard ESM import; Vite-only discovery is
reserved for additional packages.

## Separation of concerns and design principles

| Principle | Implementation |
|---|---|
| Single responsibility | Providers query concepts, adapters transport requests, the registry manages providers, helpers edit moddle objects, and the properties panel renders entries |
| Open/closed | New providers and package resources are registered/configured without modifying the registry |
| Liskov substitution | SNOMED, FHIR, static, fallback, and package providers share the provider contract |
| Dependency inversion | UI code depends on the registry and bpmn-js services, not on one remote server |
| Separation of persistence and lookup | `term:` XML stores annotations; provider/adapters resolve terminology separately |
| Stable public data contract | Descriptor types, properties, namespace URI, and package exports are reviewed as compatibility surfaces |

## Namespace and preservation rule

Clinical semantics must be represented by `term:` values under
`bpmn:extensionElements`; BPMN core and BPMN-DI structures remain untouched.
The descriptor extends supported BPMN types for the optional attribute and uses
`Element` subclasses for nested annotation data. This is the central
interoperability rule.

## Conformance and maintenance

The quality gate is one toolchain with multiple entry points:

```text
terminal / VS Code / git hooks / CI
        │
        ├── npm run lint:bpmn
        ├── npm run check:roundtrip
        ├── npm run xsd:gen:check
        ├── npm run xsd:ext
        ├── npm run check:xsd
        └── npm run check:packages
```

Vitest tests cover the extension package. JavaScript remains raw ESM and uses
JSDoc aliases for FHIR R4 structures and internal concepts.

## Clinical-data handling

Fixtures and examples use synthetic content only. Integrators must apply their
own data-protection, terminology licensing, authentication, and logging
controls when connecting to real systems.

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](07_deployment_view.md) · [Next →](09_architecture_decisions.md)
