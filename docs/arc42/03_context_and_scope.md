# 3. Context and Scope

_Defines system boundaries, identifies external interfaces, communication partners, and clarifies what is inside versus outside the system._

## Package Overview

```mermaid
graph TB
    subgraph "Monorepo: bpmn-js-clinical-semantics"
        subgraph "Package: @forschungsgruppe-digital-health/terminology"
            direction TB
            TR[TerminologyRegistry]
            TP_IFACE["TerminologyProvider\n(Interface)"]
            SA[SnowstormAdapter]
            FTA[FhirTerminologyAdapter]
            SNOMED[SnomedCtProvider]
            FHIRP[FhirProvider]
            STATIC[StaticProvider]
            PRESETS["Presets\nIHE XDS classCode\nIHE XDS typeCode\nKDL"]
            TMODDLE["moddle: clinical.json\n(term: namespace)"]
            TPANEL["TerminologyProperties\nProvider"]
            THELPER[AnnotationHelper]
        end

        subgraph "Package: @forschungsgruppe-digital-health/fhir-mapping"
            direction TB
            FMODDLE["moddle: fhir-mapping.json\n(fhirmap: namespace)"]
            FPANEL["FhirMappingProperties\nProvider"]
            FHELPER[MappingHelper]
            FTYPES["Types\nFHIR_RESOURCE_TYPES\nSEMANTIC_ROLES"]
        end

        subgraph "Package: @forschungsgruppe-digital-health/demo"
            direction TB
            UT[useTerminology]
            UFM[useFhirMapping]
        end
    end

    subgraph "Consumer App"
        BPMN["bpmn-js Modeler"]
        PP["Properties Panel"]
    end

    subgraph "External Services"
        SNOW["Snowstorm\n(SNOMED CT Server)"]
        FHIRS["FHIR Terminology\nServer"]
    end

    TR --> TP_IFACE
    SNOMED --> |implements| TP_IFACE
    FHIRP --> |implements| TP_IFACE
    STATIC --> |implements| TP_IFACE
    PRESETS --> |creates| STATIC
    SNOMED --> |uses| SA
    FHIRP --> |uses| FTA
    SA --> |REST| SNOW
    FTA --> |FHIR API| FHIRS
    TPANEL --> |reads/writes| TMODDLE
    TPANEL --> |searches via| TR
    FPANEL --> |reads/writes| FMODDLE

    BPMN --> |additionalModules| TPANEL
    BPMN --> |additionalModules| FPANEL
    BPMN --> |moddleExtensions| TMODDLE
    BPMN --> |moddleExtensions| FMODDLE
    PP --> TPANEL
    PP --> FPANEL

    UT --> TR
    UFM --> FHELPER

    style TMODDLE fill:#2563eb,color:#fff
    style FMODDLE fill:#7c3aed,color:#fff
    style TR fill:#059669,color:#fff
    style TP_IFACE fill:#059669,color:#fff
```

## Business Context

_Requires human input_ — institutional actors (e.g. clinical modeller, terminology steward, hospital/IHE registry operator) and the business artefacts exchanged (clinical pathway models, terminology bindings, FHIR mappings) are not derivable from code/config.

## Technical Context

External interfaces (communication partners) of the system:

| Partner | Relationship | Channel / Operation | Local adapter / entry point |
| --- | --- | --- | --- |
| Snowstorm (SNOMED CT server) | outbound | REST | `SnowstormAdapter` (`packages/terminology/src/adapters/SnowstormAdapter.js`) |
| FHIR terminology server | outbound | FHIR `$expand` / `$lookup` | `FhirTerminologyAdapter` (`packages/terminology/src/adapters/FhirTerminologyAdapter.js`) |
| Host bpmn-js modeler | in-process | `additionalModules` / `moddleExtensions` | `examples/vanilla/src/app.js` |

---

[← Architecture index](../ARCHITECTURE.md)
