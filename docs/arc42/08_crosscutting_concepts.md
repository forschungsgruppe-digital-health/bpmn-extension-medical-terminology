# 8. Crosscutting Concepts

_Explains fundamental technical solutions and patterns applied throughout the system that transcend individual building blocks._

## Annotation and Mapping Data Model

The following diagram shows both extension element hierarchies side by side. Both attach to BPMN elements via `extensionElements` and are fully independent of each other.

```mermaid
classDiagram
    class `bpmn:FlowNode` {
        +term:clinicalDomain?: string
    }

    class `term:Annotations` {
        +values: Annotation[0..*]
    }

    class `term:Annotation` {
        +aspect: string
        +mode: "descriptive" | "prescriptive"
        +text?: string
        +codings: Coding[0..*]
    }

    class `term:Coding` {
        +system: string
        +code: string
        +display?: string
        +version?: string
    }

    class `fhirmap:ResourceMappings` {
        +mappings: ResourceMapping[0..*]
    }

    class `fhirmap:ResourceMapping` {
        +resourceType: string
        +profile?: string
        +interaction?: string
        +direction?: string
        +structureMapRef?: string
        +keyElements: KeyElement[0..*]
        +searchParams: SearchParam[0..*]
    }

    class `fhirmap:KeyElement` {
        +path: string
        +semanticRole?: string
        +fixedValue?: string
        +terminologyBinding?: string
        +terminologyAspect?: string
    }

    class `fhirmap:SearchParam` {
        +name: string
        +value: string
    }

    `bpmn:FlowNode` "1" --> "0..1" `term:Annotations` : extensionElements
    `bpmn:FlowNode` "1" --> "0..1" `fhirmap:ResourceMappings` : extensionElements
    `term:Annotations` "1" --> "*" `term:Annotation`
    `term:Annotation` "1" --> "*" `term:Coding`
    `fhirmap:ResourceMappings` "1" --> "*" `fhirmap:ResourceMapping`
    `fhirmap:ResourceMapping` "1" --> "*" `fhirmap:KeyElement`
    `fhirmap:ResourceMapping` "1" --> "*" `fhirmap:SearchParam`

    style `term:Annotations` fill:#2563eb,color:#fff
    style `term:Annotation` fill:#2563eb,color:#fff
    style `term:Coding` fill:#2563eb,color:#fff
    style `fhirmap:ResourceMappings` fill:#7c3aed,color:#fff
    style `fhirmap:ResourceMapping` fill:#7c3aed,color:#fff
    style `fhirmap:KeyElement` fill:#7c3aed,color:#fff
    style `fhirmap:SearchParam` fill:#7c3aed,color:#fff
```

## Extending with a New Terminology System

### Option A: FHIR-hosted code system (no custom adapter)

```js
import { FhirProvider, TerminologyRegistry } from '@forschungsgruppe-digital-health/terminology';

const registry = new TerminologyRegistry();

registry.register(new FhirProvider({
  id: 'atc',
  displayName: 'ATC/DDD',
  systemUri: 'http://fhir.de/CodeSystem/bfarm/atc',
  baseUrl: 'https://fhir.bfarm.de/fhir'
}));
```

### Option B: Static code system (no server)

```js
import { StaticProvider } from '@forschungsgruppe-digital-health/terminology';

registry.register(new StaticProvider(
  'my-codes',
  'My Custom Codes',
  'http://example.com/my-codesystem',
  [
    { code: 'A1', display: 'Alpha One', system: 'http://example.com/my-codesystem' },
    { code: 'B2', display: 'Beta Two', system: 'http://example.com/my-codesystem' }
  ]
));
```

### Option C: Custom API (new adapter + provider)

```js
import { TerminologyProvider } from '@forschungsgruppe-digital-health/terminology';

class OncotreeProvider extends TerminologyProvider {
  get id() { return 'oncotree'; }
  get displayName() { return 'OncoTree'; }
  get systemUri() { return 'http://oncotree.mskcc.org'; }
  get capabilities() { return { search: true, lookup: true, hierarchy: true, validate: true }; }

  async search(term, options) {
    const res = await fetch(`https://oncotree.info/api/tumorTypes/search?query=${term}`);
    const data = await res.json();
    return {
      concepts: data.map(d => ({ code: d.code, display: d.name, system: this.systemUri })),
      total: data.length
    };
  }

  async lookup(code) {
    const res = await fetch(`https://oncotree.info/api/tumorTypes/${code}`);
    if (!res.ok) return null;
    const d = await res.json();
    return { code: d.code, display: d.name, system: this.systemUri };
  }
}

registry.register(new OncotreeProvider());
```

In all three cases, zero changes to existing library code are required (Open/Closed Principle).

## Generated XML

When annotations and mappings are added via the properties panel, they are persisted as standard BPMN 2.0 extension elements:

```xml
<bpmn2:dataObject id="DataObj_Befund" name="CT-Befundbericht"
                  xmlns:term="https://clinical-bpmn.org/terminology/v1"
                  xmlns:fhirmap="https://clinical-bpmn.org/fhir-mapping/v1"
                  term:clinicalDomain="diagnostics">
  <bpmn2:extensionElements>

    <!-- Terminology annotations -->
    <term:annotations>
      <term:annotation aspect="clinicalContent" mode="descriptive"
                       text="CT-Befund Thorax mit KM">
        <term:coding system="http://snomed.info/sct"
                     code="169069000" display="CT of chest (procedure)"/>
      </term:annotation>
      <term:annotation aspect="documentType" mode="prescriptive">
        <term:coding system="http://dvmd.de/fhir/CodeSystem/kdl"
                     code="DG020106" display="Ergebnis bildgebender Diagnostik"/>
      </term:annotation>
    </term:annotations>

    <!-- FHIR resource mapping -->
    <fhirmap:resourceMappings>
      <fhirmap:resourceMapping resourceType="DiagnosticReport"
                               interaction="create" direction="output">
        <fhirmap:keyElement path="DiagnosticReport.status"
                           semanticRole="trigger" fixedValue="final"/>
      </fhirmap:resourceMapping>
    </fhirmap:resourceMappings>

  </bpmn2:extensionElements>
</bpmn2:dataObject>
```

The two namespaces (`term:` and `fhirmap:`) are independent. Non-clinical BPMN tools will ignore them and preserve them on re-save.

## Design Principles

| Principle | Implementation |
|---|---|
| **Single Responsibility** | `TerminologyProvider` searches codes. `TerminologyAdapter` talks to servers. `TerminologyRegistry` manages providers. `AnnotationHelper` reads/writes XML. `MappingHelper` reads/writes FHIR mappings. Each class has one job. |
| **Open/Closed** | New terminology systems are added by implementing `TerminologyProvider` and calling `registry.register()`. No existing files are modified. `aspect` values are extensible strings, not a closed enum. |
| **Liskov Substitution** | `SnomedCtProvider`, `FhirProvider`, and `StaticProvider` are all interchangeable wherever `TerminologyProvider` is expected. The registry treats all providers identically. |
| **Interface Segregation** | `TerminologyProvider` has four methods (`search`, `lookup`, `validate`, `getHierarchy`), two of which have default implementations. The `capabilities` object declares which methods are meaningful. |
| **Dependency Inversion** | The properties panel depends on `TerminologyRegistry` (abstraction), not on `SnomedCtProvider` (implementation). Adapters are injected into providers via constructor configuration. |
| **Separation of Concerns** | Terminology annotations and FHIR mappings are separate packages with separate moddle namespaces. They can be used independently or together. |

---

[← Architecture index](../ARCHITECTURE.md)
