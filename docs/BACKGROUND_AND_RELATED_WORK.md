# Background and related work

This is an internal research note for maintainers and publications. It is intentionally not
part of the user documentation: a modeller should not need this context to evaluate or use
the package.

## Problem and scope

BPMN provides a portable notation for clinical processes, but a label such as “CT chest”
does not identify a machine-readable clinical concept. This extension stores a system URI,
code, optional version, and display on a BPMN element. It addresses annotation and
serialization only; it does not execute pathways, generate FHIR resources, or validate
clinical correctness.

## Closest lines of work

### BPMN4CP

BPMN4CP is the closest institutional predecessor. It extends BPMN for multiple perspectives
on clinical pathways, whereas this package binds terminology codes to otherwise ordinary BPMN
elements. The approaches are complementary and may coexist in one file under separate XML
namespaces.

The main design lesson adopted here is to use BPMN's extension interface consistently. All
`mt:` content sits below `bpmn:extensionElements`; the project also publishes the moddle
descriptor, generated XSD, namespace reference, and round-trip checks.

### Semantic process annotation

Semantic annotation of process models predates this package. Prior work covers ontology-backed
process modelling, automated annotation suggestions, and clinical pathway annotations using
SNOMED CT, LOINC, and ICD. This project does not claim the idea of attaching clinical codes to
BPMN as novel.

Its practical contribution is a maintained, installable bpmn-js extension that keeps versioned
codings in the BPMN file and combines serialization, terminology access, and a modeller-facing
editor.

### BPMN and FHIR

Other work transforms BPMN into FHIR `PlanDefinition` or `CarePlan`, transforms FHIR back
to BPMN, or executes BPMN processes against FHIR infrastructure. Those are downstream or
adjacent concerns. A coded BPMN element can be useful input to such a transformation, but the
mapping itself remains outside this repository.

## Research claims and limits

Claims about this artefact should stay narrow:

- it specifies a versioned terminology extension inside standard BPMN
  `extensionElements`;
- descriptor, generated XSD, examples, linting, and round-trip tests make the serialization
  mechanically checkable;
- providers and the properties panel reduce the manual work of finding and copying codes;
- selected codings remain in the model even when the original terminology source is offline.

Do not claim:

- clinical validation or suitability for patient-care decisions;
- an evaluation of annotation effort, usability, or inter-annotator agreement;
- complete interoperability across BPMN tools;
- ownership, completeness, or licensing of external terminology content;
- endorsement or standardisation by OMG, HL7, IHE, or the Medical Informatics Initiative.

The package is pre-1.0 research software. Any publication should distinguish repository tests
from empirical evaluation with users or third-party tools.

## Working bibliography

Verify publisher metadata before copying these entries into a publication.

- Born, M., Dörr, F., Weber, I. (2007). *User-friendly semantic annotation in
  business process modeling.* DOI
  [10.1007/978-3-540-77010-7_25](https://doi.org/10.1007/978-3-540-77010-7_25).
- Braun, R., Schlieter, H., Burwitz, M., Esswein, W. (2014). *BPMN4CP: Design and
  implementation of a BPMN extension for clinical pathways.* DOI
  [10.1109/BIBM.2014.6999261](https://doi.org/10.1109/BIBM.2014.6999261).
- Braun, R., Schlieter, H., Burwitz, M., Esswein, W. (2016). *BPMN4CP revised —
  Extending BPMN for multi-perspective modeling of clinical pathways.* DOI
  [10.1109/HICSS.2016.407](https://doi.org/10.1109/HICSS.2016.407).
- Corea, C., Fellmann, M., Delfmann, P. (2021). *Ontology-based process modelling —
  Will we live to see it?* DOI
  [10.1007/978-3-030-89022-3_4](https://doi.org/10.1007/978-3-030-89022-3_4).
- Di Francescomarino, C., Tonella, P. (2009). *Supporting ontology-based semantic
  annotation of business processes with automated suggestions.* DOI
  [10.1007/978-3-642-01862-6_18](https://doi.org/10.1007/978-3-642-01862-6_18).
- Helm, E. et al. (2022). *FHIR2BPMN.* DOI
  [10.3233/SHTI220311](https://doi.org/10.3233/SHTI220311).
- Ingvar, M. et al. (2021). *On the annotation of health care pathways.* DOI
  [10.3389/fdgth.2021.688218](https://doi.org/10.3389/fdgth.2021.688218).
- Kurz, M. (2016). *BPMN model interchange: The quest for interoperability.* DOI
  [10.1145/2882879.2882886](https://doi.org/10.1145/2882879.2882886).
- Stroppi, L. J. R., Chiotti, O., Villarreal, P. D. (2011). *Extending BPMN 2.0:
  Method and tool support.*
- Object Management Group. *Business Process Model and Notation (BPMN), Version
  2.0.2.* <https://www.omg.org/spec/BPMN/>.

Architecture rationale belongs in [ADRs](adr/); the current implementation boundary is
summarised in [ARCHITECTURE.md](ARCHITECTURE.md).
