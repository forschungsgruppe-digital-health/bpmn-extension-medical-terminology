# 6. Runtime View

_Describes important runtime interactions in the host bpmn-js application and
in the conformance tools._

The package has no server or long-running process. Runtime execution occurs
inside a consumer's bpmn-js modeler, while the repository tools execute as
short-lived Node.js processes.

## Scenario 1 — Load an annotated diagram

The host registers the descriptor and imports BPMN XML:

```js
const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    createTerminologyPropertiesPanelModule(),
    createDefaultTerminologyModule()
  ],
  moddleExtensions: {
    mt: TerminologyModdleDescriptor
  }
});

await modeler.importXML(annotatedBpmn);
```

`bpmn-moddle` materializes `mt:Annotations`, `mt:Annotation`, and
`mt:Coding` values inside `bpmn:extensionElements`. Without the descriptor,
the host cannot provide typed terminology objects; the conformance roundtrip
tool reports parse warnings for unknown content.

## Scenario 2 — Select and edit an element

```mermaid
sequenceDiagram
    actor User
    participant Panel as Properties panel
    participant Provider as TerminologyPropertiesProvider
    participant Entry as Annotation entry
    participant ModelingHelper as AnnotationModeling
    participant Modeling as bpmn-js modeling
    participant BO as businessObject

    User->>Panel: select supported BPMN element
    Panel->>Provider: getGroups(element)
    Provider->>Provider: check TARGET_TYPES
    Provider-->>Panel: clinical terminology group
    Panel->>Entry: render current values
    Entry->>Helper: getAnnotations(BO)
    Helper-->>Entry: mt: values
    User->>Entry: add, edit, or remove annotation
    Entry->>ModelingHelper: saveAnnotation/deleteAnnotation
    ModelingHelper->>BO: create or update containers and child objects
    Entry->>Modeling: updateModdleProperties(...)
    Modeling-->>Panel: command-stack change and re-render
```

`AnnotationModeling` creates `bpmn:ExtensionElements` and `mt:Annotations`
lazily. Created objects receive `$parent` links. bpmn-js therefore owns
undo/redo and serialization rather than the entry component mutating XML
directly.

## Scenario 3 — Render badges and generated comments

The terminology services module includes the diagram module. Badges are
rendered for annotated BPMN elements without adding badge data to XML. When a
user enables **Show terminology as BPMN comments**, the comment visibility
service creates linked `bpmn:TextAnnotation` and `bpmn:Association` elements.
The annotation carries `mt:GeneratedComment` so the service can recognize it;
comment text is regenerated from the ordered `mt:` annotation data when it
changes. The preview has no line-count limit and is capped at 350 diagram units
wide. The complete clinical data remains in `mt:`.

## Scenario 4 — Serialize and check a roundtrip

The demo uses `modeler.saveXML({ format: true })` for its XML preview and
download. The conformance tool performs the same operation without a modeler:

1. Discover `.bpmn` files under `examples/valid/` and `docs/`.
2. Parse each file with `mt` registered.
3. Serialize to XML A.
4. Parse A and serialize again to XML B.
5. Require A and B to be identical.
6. Compare `<mt:...>` element counts to detect dropped extension elements.
7. Report parse warnings; `--strict` promotes warnings to failures.

The command is `npm run check:roundtrip`, and it is part of
`npm run check:conformance` and `npm run verify`.

## Scenario 5 — Search terminology

Integrator code calls the registry:

```js
const result = await terminologyRegistry.search('pneumonia', 'snomed-ct');
const concept = await terminologyRegistry.lookup('169069000', 'snomed-ct');
```

The registry delegates to the selected provider. The default SNOMED provider
is a `FhirProvider` configured for the Ontoserver FHIR endpoint and uses FHIR
`$expand`/`$lookup`. When an integrator explicitly selects Snowstorm transport,
the default factory instead registers a `SnomedCtProvider`. `StaticProvider`
searches in-memory concepts. Package providers are built from FHIR
`CodeSystem` resources and preserve each resource's canonical URL in returned
concepts.

## Scenario 6 — Discover package-backed CodeSystems

The bundled HL7 preset imports its generated CodeSystem module directly and
does not depend on Vite APIs. The Vite plugin remains an optional build-time
path for additional consumer-selected packages: it finds selected
`CodeSystem` JSON resources, filters them by exact canonical `CodeSystem.url`,
and exposes a virtual module and optional global. The default service factory
groups discovered resources by package, creates one provider per package, and
combines those providers with the built-in defaults. Explicit
`include`/`exclude` settings fail fast when a configured canonical URL does not
exist.

## Error and edge behavior

- Provider registration rejects duplicate provider IDs.
- Registry lookup of an unknown provider reports the available IDs.
- Adapter failures are propagated to the caller; production retry,
  authentication, and availability policy belong to the host application.
- A missing package CodeSystem can cause a preset to be skipped or discovery
  to report a configuration error.
- The demo catches import/bootstrap failures and logs them; it does not define
  a production error UI.

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](05_building_block_view.md) · [Next →](07_deployment_view.md)
