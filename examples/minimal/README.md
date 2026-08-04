# Minimal Example: Lung Cancer Treatment Decision

This directory contains a minimal, self-contained example that demonstrates the mapping between BPMN process models and FHIR R4 resources. It is intended for onboarding new developers and for testing the `fhirmap:` extension.

## Clinical Scenario

A simplified lung cancer treatment pathway based on TNM staging:

```mermaid
flowchart LR
    %% ── BPMN Process: Lung Cancer Treatment Decision ──

    Start((" "))
    MRI[/"MRI Scan Report"/]
    Staging["Perform<br/>TNM Staging"]
    GwSplit{"Tumor Stage?"}
    Surgery["Surgical<br/>Resection"]
    Chemo["Systemic<br/>Chemotherapy"]
    GwJoin{" "}
    Followup["Follow-up<br/>Assessment"]
    DL[/"Discharge Letter"/]
    EndEvt(((" ")))

    %% Sequence flows
    Start --> Staging --> GwSplit
    GwSplit -->|"Stage I-II"| Surgery --> GwJoin
    GwSplit -->|"Stage III-IV"| Chemo --> GwJoin
    GwJoin --> Followup --> EndEvt

    %% Data associations (dotted = data flow)
    MRI -.->|input| Staging
    Followup -.->|output| DL

    %% ── BPMN Text Annotations: semantic bindings ──

    N1>"LOINC 18748-4 · IHE ERGE · BEF<br/>fhirmap: DocumentReference read input"]
    N2>"SNOMED 254292007 · LOINC 21908-9<br/>fhirmap: Observation + ServiceRequest"]
    N3>"SNOMED 359615001 · OPS 5-324<br/>fhirmap: Procedure"]
    N4>"SNOMED 367336001 · ATC L01XA01<br/>fhirmap: MedicationRequest"]
    N5>"SNOMED 390906007 · LOINC 18776-5<br/>fhirmap: CarePlan"]
    N6>"LOINC 18842-5 · KDL AD010101 · BRI<br/>fhirmap: DocumentReference create output"]

    N1 -.-> MRI
    N2 -.-> Staging
    N3 -.-> Surgery
    N4 -.-> Chemo
    N5 -.-> Followup
    N6 -.-> DL
```

After TNM staging determines the tumor stage, the pathway branches: early-stage (I–II) patients receive surgical resection (lobectomy), while advanced-stage (III–IV) patients receive platinum-based chemotherapy. Both paths converge into a follow-up assessment.

The process also demonstrates BPMN data objects: an MRI scan report serves as input to the staging task, and a discharge letter is produced as output of the follow-up assessment. Both map to FHIR DocumentReference resources.

## Files

| File | Description |
|---|---|
| `lung-cancer-staging.bpmn` | Plain BPMN 2.0 XML — the base process with no clinical extensions. Start here to understand the BPMN structure. |
| `lung-cancer-staging-fhir.json` | FHIR R4 transaction Bundle — the same pathway expressed as FHIR resources (PlanDefinition, ActivityDefinitions, ObservationDefinition, ValueSet, DocumentReferences). |
| `lung-cancer-staging-annotated.bpmn` | Annotated BPMN 2.0 XML — the base process enriched with `term:` (terminology) and `fhirmap:` (FHIR mapping) extension elements. |

## BPMN ↔ FHIR Mapping

| BPMN Element | BPMN Type | FHIR Resource | Key Details |
|---|---|---|---|
| `DataObj_MRI` | DataObjectReference | DocumentReference | MRI scan report input (LOINC 18748-4, IHE XDS ERGE) |
| `Task_Staging` | Task | Observation, ServiceRequest | TNM stage output (LOINC 21908-9), ServiceRequest for staging order |
| `Gateway_Split` | XOR Gateway | PlanDefinition.action (selectionBehavior=exactly-one) | Nested actions with FHIRPath applicability conditions |
| `Task_Surgery` | Task | Procedure | Lobectomy (SNOMED 359615001, OPS 5-324) |
| `Task_Chemo` | Task | MedicationRequest | Cisplatin (ATC L01XA01) |
| `Task_Followup` | Task | CarePlan | Follow-up care plan |
| `DataObj_DischargeLetter` | DataObjectReference | DocumentReference | Discharge letter output (LOINC 18842-5, KDL AD010101) |

## Information Model (UML Class Diagram)

The following class diagram shows the FHIR R4 resource types produced or consumed by the process. Each class carries a `<<stereotype>>` indicating the BPMN element type and interaction pattern. Attributes are annotated with their value source: `terminologyBinding` resolves at runtime from `term:coding`, while `fixedValue` is a FHIR-structural constant.

```mermaid
classDiagram
    direction TB

    class DocumentReference {
        <<bpmn DataObjectReference>>
        +type : CodeableConcept «terminologyBinding → documentType»
        +category : CodeableConcept «terminologyBinding → documentClass»
        +status : code «fixedValue»
        +content.attachment.contentType : string «fixedValue»
    }

    class Observation {
        <<bpmn Task · create · output>>
        +code : CodeableConcept «terminologyBinding → clinicalContent»
        +valueCodeableConcept : CodeableConcept «terminologyBinding → clinicalContent»
        +status : code «fixedValue»
    }

    class ServiceRequest {
        <<bpmn Task · create · output>>
        +code : CodeableConcept «terminologyBinding → clinicalContent»
        +intent : code «fixedValue»
    }

    class Procedure {
        <<bpmn Task · create · output>>
        +code : CodeableConcept «terminologyBinding → clinicalContent»
        +bodySite : CodeableConcept «terminologyBinding»
        +status : code «fixedValue»
    }

    class MedicationRequest {
        <<bpmn Task · create · output>>
        +medicationCodeableConcept : CodeableConcept «terminologyBinding → clinicalContent»
        +intent : code «fixedValue»
        +status : code «fixedValue»
    }

    class CarePlan {
        <<bpmn Task · create · output>>
        +category : CodeableConcept «terminologyBinding → clinicalContent»
        +title : string «fixedValue»
        +status : code «fixedValue»
        +intent : code «fixedValue»
    }

    DocumentReference ..> Observation : input to staging
    Observation ..> Procedure : Stage I-II
    Observation ..> MedicationRequest : Stage III-IV
    Procedure ..> CarePlan : converge
    MedicationRequest ..> CarePlan : converge
    CarePlan ..> DocumentReference : output from follow-up
```

## Instance Data (UML Object Diagram)

Concrete attribute values for each FHIR resource instance in this example. Each object carries its terminology codes and fixed values as populated from the annotated BPMN.

```mermaid
classDiagram
    direction TB

    class DataObj_MRI {
        <<DocumentReference>>
        direction = input
        interaction = read
        type.coding.system = "http://loinc.org"
        type.coding.code = "18748-4"
        type.coding.display = "Diagnostic imaging study"
        category.coding.system = "http://ihe-d.de/.../IHEXDSclassCode"
        category.coding.code = "BEF"
        category.coding.display = "Clinical reports"
        status = "current"
        content.attachment.contentType = "application/pdf"
    }

    class Task_Staging_Obs {
        <<Observation>>
        interaction = create
        direction = output
        code.coding.system = "http://loinc.org"
        code.coding.code = "21908-9"
        code.coding.display = "Stage group.clinical Cancer"
        valueCodeableConcept.coding.system = "http://snomed.info/sct"
        valueCodeableConcept.coding.code = "254292007"
        status = "final"
    }

    class Task_Staging_SR {
        <<ServiceRequest>>
        interaction = create
        direction = output
        code.coding.system = "http://snomed.info/sct"
        code.coding.code = "254292007"
        code.coding.display = "Tumor staging"
        intent = "order"
    }

    class Task_Surgery {
        <<Procedure>>
        interaction = create
        direction = output
        code.coding.system = "http://snomed.info/sct"
        code.coding.code = "359615001"
        code.coding.display = "Partial lobectomy of lung"
        status = "completed"
    }

    class Task_Chemo {
        <<MedicationRequest>>
        interaction = create
        direction = output
        medicationCodeableConcept.coding.system = "http://www.whocc.no/atc"
        medicationCodeableConcept.coding.code = "L01XA01"
        medicationCodeableConcept.coding.display = "Cisplatin"
        intent = "order"
        status = "active"
    }

    class Task_Followup {
        <<CarePlan>>
        interaction = create
        direction = output
        category.coding.system = "http://snomed.info/sct"
        category.coding.code = "390906007"
        category.coding.display = "Follow-up encounter"
        title = "Follow-up Lung Cancer"
        status = "active"
        intent = "plan"
    }

    class DataObj_DischargeLetter {
        <<DocumentReference>>
        direction = output
        interaction = create
        type.coding.system = "http://loinc.org"
        type.coding.code = "18842-5"
        type.coding.display = "Discharge summary"
        category.coding.system = "http://ihe-d.de/.../IHEXDSclassCode"
        category.coding.code = "BRI"
        category.coding.display = "Physician letters"
        status = "current"
        content.attachment.contentType = "application/pdf"
    }

    DataObj_MRI ..> Task_Staging_Obs : input
    DataObj_MRI ..> Task_Staging_SR : input
    Task_Staging_Obs ..> Task_Surgery : Stage I-II
    Task_Staging_Obs ..> Task_Chemo : Stage III-IV
    Task_Surgery ..> Task_Followup : join
    Task_Chemo ..> Task_Followup : join
    Task_Followup ..> DataObj_DischargeLetter : output
```

## FHIR Bundle Structure

```
Bundle (transaction)
├── PlanDefinition           — the pathway (references all ActivityDefinitions)
│   ├── action: TNM-Staging  → definitionCanonical → ActivityDefinition/tnm-staging
│   ├── action: Treatment Decision (selectionBehavior=exactly-one)
│   │   ├── action: Surgery  → definitionCanonical → ActivityDefinition/surgery
│   │   └── action: Chemo    → definitionCanonical → ActivityDefinition/chemo
│   └── action: Follow-up   → definitionCanonical → ActivityDefinition/followup
├── ActivityDefinition/tnm-staging     (kind: ServiceRequest)
│   └── observationResultRequirement → ObservationDefinition
├── ObservationDefinition/tnm-stage
│   └── validCodedValueSet → ValueSet
├── ValueSet/tnm-stage-group           (SNOMED CT stage codes)
├── ActivityDefinition/surgery         (kind: ServiceRequest, code: lobectomy)
├── ActivityDefinition/chemo           (kind: MedicationRequest, product: cisplatin)
├── ActivityDefinition/followup        (kind: CarePlan)
├── DocumentReference/mri-report       (input to staging: MRI scan report)
└── DocumentReference/discharge-letter (output of follow-up: Discharge Letter)
```

All `definitionCanonical` and `reference` values resolve within the Bundle via `urn:uuid:` fullUrls.

## Extension Elements in the Annotated BPMN

The annotated BPMN uses two independent XML namespaces:

**`term:` (terminology annotations)** — codes from SNOMED CT, LOINC, OPS, ATC on each task, with `id` and optional free text. The `term:` namespace is purely semantic — it carries no FHIR paths or transforms.

**`fhirmap:` (FHIR resource mappings)** — declares which FHIR resource type, profile, interaction, and key elements each BPMN task or data object produces/consumes. Key elements use FHIRPath paths, semantic roles (trigger, classifier, payload), and one of: `fixedValue` (FHIR-structural constants like status/intent) or `terminologyBinding`+`id` (resolved from `term:annotation` by id).

Both namespaces extend `DataObjectReference` in addition to `FlowNode`, so data objects like the MRI report and discharge letter carry the same annotation structure as tasks.

Example from `Task_Staging`:

```xml
<bpmn2:task id="Task_Staging" name="Perform TNM Staging" term:clinicalDomain="staging">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1"
                       text="Clinical TNM staging ...">
        <term:coding system="http://snomed.info/sct" code="254292007" display="Tumor staging"/>
        <term:coding system="http://loinc.org" code="21908-9" display="Stage group.clinical Cancer"/>
      </term:annotation>
    </term:annotations>
    <fhirmap:resourceMappings>
      <fhirmap:resourceMapping resourceType="Observation" interaction="create" direction="output">
        <fhirmap:keyElement path="Observation.code" semanticRole="classifier"
                           terminologyBinding="term-ann-1"/>
        <fhirmap:keyElement path="Observation.status" semanticRole="trigger"
                           fixedValue="final"/>
      </fhirmap:resourceMapping>
    </fhirmap:resourceMappings>
  </bpmn2:extensionElements>
</bpmn2:task>
```

Example from `DataObj_MRI` (data object with DocumentReference mapping):

```xml
<bpmn2:dataObjectReference id="DataObj_MRI" name="MRI Scan Report" term:clinicalDomain="diagnostics">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1" mode="prescriptive"
                       text="MRI scan report of the thorax ...">
        <term:coding system="http://loinc.org" code="18748-4" display="Diagnostic imaging study"/>
      </term:annotation>
    </term:annotations>
    <fhirmap:resourceMappings>
      <fhirmap:resourceMapping resourceType="DocumentReference" interaction="read" direction="input">
        <fhirmap:keyElement path="DocumentReference.type" semanticRole="classifier"
                           terminologyBinding="term-ann-1"/>
        <fhirmap:keyElement path="DocumentReference.status" semanticRole="trigger"
                           fixedValue="current"/>
      </fhirmap:resourceMapping>
    </fhirmap:resourceMappings>
  </bpmn2:extensionElements>
</bpmn2:dataObjectReference>
```

## How to Use

**View the plain BPMN** — open `lung-cancer-staging.bpmn` in the demo app or any BPMN viewer to see the process structure without clinical annotations.

**View the annotated BPMN** — open `lung-cancer-staging-annotated.bpmn` in the demo app. The terminology panel and FHIR mapping panel will display the annotations on each element.

**Inspect the FHIR Bundle** — open `lung-cancer-staging-fhir.json` in any FHIR viewer or JSON editor. The PlanDefinition.action hierarchy mirrors the BPMN process flow.

**Run programmatic tests:**

```bash
# From the repo root
npm test
```

## Terminology Systems Used

| System | URI | Used For |
|---|---|---|
| SNOMED CT | `http://snomed.info/sct` | Clinical procedures, substances, body structures |
| LOINC | `http://loinc.org` | Observation codes, care plan notes, document types |
| OPS | `http://fhir.de/CodeSystem/bfarm/ops` | German procedure codes |
| ATC | `http://www.whocc.no/atc` | Medication classification |
| IHE XDS classCode | `http://ihe-d.de/CodeSystems/IHEXDSclassCode` | Document class (BEF, BRI) |
| IHE XDS typeCode | `http://ihe-d.de/CodeSystems/IHEXDStypeCode` | Document type (ERGE) |
| KDL | `http://dvmd.de/fhir/CodeSystem/kdl` | German clinical document types |
