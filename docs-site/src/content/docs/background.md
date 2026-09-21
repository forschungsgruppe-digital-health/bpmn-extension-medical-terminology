---
title: Background and related work
description: Where this extension sits in relation to BPMN4CP, earlier semantic process annotation, BPMN-to-FHIR transformation, and the literature on BPMN extension conformance.
---

This page positions the extension against the work it builds on and the work it
deliberately does not duplicate. It is a positioning statement, not a systematic
review: it names the lines of work a reader in this field will already know, says
plainly which of them do something very similar, and states the narrow thing that
is actually new here.

Two conventions apply throughout. References are given author-year and resolved in
the [reference list](#references) at the end. Where a detail could not be confirmed
from a primary source, it is marked as unverified rather than smoothed over.

## The problem in one paragraph

BPMN 2.0 gives clinical processes a portable, widely tooled notation, and it is
used for clinical pathways on exactly that basis (Pufahl et al. 2022). What it does
not give them is meaning that a machine can act on. A task labelled *CT-Thorax* is
readable by a clinician and opaque to everything else: the label does not identify
a SNOMED CT procedure, a LOINC observation, an ICD-10-GM diagnosis, or an IHE XDS
document class. Two hospitals modelling the same pathway will label the same step
differently, and nothing in the file says the two steps are the same step. The
consequence is that BPMN pathway models can be exchanged as pictures but not
compared, queried, or bound to data as models.

This extension attaches coded concepts — a code system URI, a code, a display, and
an optional code system version — to BPMN elements, inside the BPMN file, in a form
that survives a round trip through standard tooling. The data model is three types
and is described on the [schema page](/schema/).

## BPMN4CP: the local lineage

The same research group at TU Dresden produced BPMN4CP, a domain-specific BPMN
extension for clinical pathways, in a sequence of papers between 2014 and 2016
(Braun et al. 2014; Braun et al. 2015a; Braun et al. 2015b; Braun et al. 2016). It
is the closest prior work in institutional terms, it is implemented in the helict
Pathway Modeler, and its `cp:` content appears in pathway models this group
maintains. It therefore deserves a precise rather than a polite account.

Four things about BPMN4CP matter for how this extension is designed. All four were
established by reading the primary papers.

**It never published a serialisation.** BPMN4CP applies the first two steps of the
BPMN extension method of Stroppi et al. (2011) and explicitly skips steps three and
four — the two steps that produce the XML schema and the XML interchange
representation. The papers say so directly: "step 3 and step 4 … are not applied"
(Braun et al. 2014), "neither applied nor considered" (Braun et al. 2015a), "Due to
page space limitations, the last two steps are not examined in detail" (Braun et
al. 2016). There is consequently no published BPMN4CP XML form, no XSD, and no
normative statement about where `cp:` content belongs in a file.

**Its Quality Indicator element is specified minimally.** It appears from version
2.0 onwards, carries no attributes in any of the sources, is attached through a
standard BPMN `Property`, and is drawn as a labelled circle annotated to the
element it measures. The numerator and denominator attributes, translations, and
canonical references that appear in some `.bpmn` files in the wild are not in the
papers — they are the Pathway Modeler's own dialect. Two of those attributes,
`selectionBehavior` and `definitionCanonical`, are in fact FHIR R4
`PlanDefinition.action` field names rather than BPMN4CP concepts at all.

**It defines no terminology binding.** A full-text search of the BPMN4CP sources
returns no SNOMED, no LOINC, no ICD, no code system and no value set. The only
code-like slot is `Segment.code` in the document perspective, whose demonstration
values are LOINC-shaped but never named as such.

**Its namespace URI does not resolve to a schema.** `http://www.helict.de/bpmn4cp`
returns HTTP 404. That is unremarkable in itself — Camunda's
`http://camunda.org/schema/1.0/bpmn` does the same, and an XML namespace is an
identifier rather than a retrievable document — but it is worth recording next to
the [namespace question](#namespace-authority) this project has of its own.

The honest relationship is therefore one of complementary layers. BPMN4CP models
the *structure* of a clinical pathway and the quality indicators measured on it.
This extension binds *codes* to elements. They answer different questions, they use
different namespaces, and there is no reason a single `.bpmn` file could not carry
both — `cp:` for the pathway perspective and `term:` for the terminology
perspective. Nothing in either design forbids it, and nothing in this repository
has yet demonstrated it.

There is one design lesson taken directly from that lineage. BPMN4CP's own authors
criticise extensions that bypass BPMN's extension interface, because doing so
"impedes the straightforward integration of extensions in BPMN modeling tools due
the missing compliances with the BPMN meta model" (Braun et al. 2014). That
criticism is measurable: `cp:` content that sits as a direct child of
`bpmn:process` has no slot in the BPMN metamodel, and an editor built on
`bpmn-moddle` that does not register a matching descriptor discards it silently on
save. This extension keeps every byte of its data inside standard
`bpmn:extensionElements`, which is the one place the BPMN metamodel does provide
for foreign content. The [compatibility page](/compatibility/) covers what that
buys and where its limits are.

## Semantic annotation of process models

Attaching ontology or terminology concepts to process model elements is an old
idea, and a reader from the business process management community will already know
the line. Lin and Strasunskas (2005) and Born et al. (2007) established the basic
move; Thomas and Fellmann (2009) gave it a semantic-web framing; Di Francescomarino
and Tonella (2009) already proposed automatic annotation suggestions rather than
purely manual binding.

The clinical branch is closer still. Ingvar et al. (2021) annotate BPMN pathways
with SNOMED CT, LOINC and ICD codes and transform them onward into FHIR
`PlanDefinition` and `CarePlan`, validated on a COPD pathway. Neumann et al. (2020)
integrate OntoSPM, SNOMED CT, FMA and LOINC per model element in a web-based
surgical workflow modelling tool — in conceptual terms the nearest academic
relative of this work. Sooter et al. (2019) model a contraception pathway as a
BPM+ Health reference example and name the integration of clearly defined data
elements as the central difficulty.

**The idea is therefore not new, and this project does not claim it.** "We bind
SNOMED CT to BPMN" is not available as a contribution. What is worth noting about
these three works is not their concepts but their artefacts: in Ingvar et al. the
codes live in an *external* terminology database rather than in the BPMN file, and
the published tool is today an empty repository stub; the Neumann et al. tool is no
longer reachable. This is the pattern the field has produced repeatedly, and Corea
et al. (2021) diagnose it directly in their post-mortem of ontology-based process
modelling: the obstacle is annotation effort and adoption, not representational
power. Any claim that this time is different has to be argued against that paper,
and the argument cannot be "better data model" — it has to be about the cost of
annotating and the survival of the artefact.

## BPMN and FHIR

A second body of work leaves BPMN for a FHIR-native representation instead of
enriching it. It is relevant here because it marks the boundary of what this
extension tries to do.

Beckmann et al. (2023) specify a lossless transformation between BPMN and HL7 FHIR
and, notably, do it with the *standard* element `bpmn:DataStoreReference` rather
than a custom extension — the strongest available argument that a new namespace
should have to justify itself. Ouagne et al. (2026) transform BPMN into
conformance-checked `PlanDefinition` resources. Helm et al. (2022) go the other way,
from FHIR to BPMN, and report that codes are lost in the process. Kober et al.
(2023) keep terminology deliberately in a FHIR-RDF layer rather than in the process
model at all.

On the tooling side, the Data Sharing Framework (DSF) executes BPMN 2.0 processes
against FHIR R4 in German medical-informatics research networks — it is an
execution layer for distributed processes, not a modelling-semantics layer, and it
is the most actively maintained artefact named on this page. MSBPMN implements
standards-based model transformation between FHIR `PlanDefinition` and BPMN 2.0; it
is MPL-2.0 licensed and has had no commits since 2022. The repositories
`mburwit/bpmn2fhir` (Apache-2.0) and `mburwit/bpmn4cp` (no declared licence, so all
rights reserved) are likewise last touched in 2022, which matters for anyone hoping
to reuse them. HL7's Clinical Practice Guidelines on FHIR (CPG-on-FHIR) expresses
guideline logic entirely as FHIR resources — `PlanDefinition`, `ActivityDefinition`
and the library resources around them — and the HL7/OMG *Field Guide to Shareable
Clinical Pathways* documents how BPMN and CMMN models relate to that FHIR
representation.

The relationship to this extension is one of sequence rather than competition. A
BPMN element that carries a `term:coding` is a better input to any of these
transformations than one that carries only a label, because the code it must map
into the target resource is already present and already versioned. Mapping BPMN
models onto FHIR resources is explicitly out of scope here; it belongs to a
separate extension (see [Sibling work](#sibling-work-in-the-same-group)).

## BPMN extension methodology

The methodological literature is where this project's actual position is easiest
to defend, because the field has repeatedly measured the same weakness.

Stroppi et al. (2011) define the four-step method for extending BPMN 2.0; steps
three and four produce the XML schema and the interchange representation. Braun and
Esswein (2014) classify domain-specific extensions. Braun (2015) tabulates the open
problems of BPMN extensibility and marks problem P7, "missing specification of
extension XML interchange", as unresolved. Zarour et al. (2020) survey 52
extensions and find XML schema representation underexploited. Cavalcante et al.
(2026) examine 84 extensions published between 2019 and 2025 and report that 95.7%
do not preserve BPMN syntax and only 26.3% are fully specified. Kurz (2016) warns
explicitly that extension content is not reliably interpreted across tools — and
never measures it.

That is the gap this repository sits in. The extension ships:

- a moddle descriptor, and an XSD generated from that descriptor rather than
  written alongside it;
- a generation drift check (`npm run xsd:gen:check`) that fails the build when
  descriptor and XSD disagree;
- a serialisation round-trip check that fails when re-serialising is not idempotent
  or when a registered extension element is dropped on parse;
- a schema validation pass (`npm run xsd:ext`) that validates the example diagrams
  against the BPMN core schema and the generated extension XSD together — the
  BPMN-core-only pass is informational by design, because the standard schema
  admits foreign content through a lax wildcard without checking it;
- a bpmnlint plugin carrying the one semantic rule the XSD deliberately does not
  express — every `term:annotation` needs a valid `id` — with a negative fixture
  that continuous integration requires to fail lint.

The [compatibility page](/compatibility/) describes each of these checks and what it
does and does not prove.

## What this project contributes

Stated as narrowly as it can honestly be stated:

- **A public, permissively licensed artefact in a niche whose other artefacts are
  gone.** A landscape check recorded by the project on 16 September 2026 — a full
  enumeration of the npm packages carrying `bpmn` in the name, the
  `bpmn-js-extension` npm keyword, the two curated bpmn.io ecosystem lists, GitHub
  code search and GitLab project search — found no other open-source, installable
  bpmn.io extension that binds medical terminology to BPMN elements. The prior
  clinical work named above either kept its codes outside the BPMN file or shipped
  a tool that is no longer obtainable. This is a claim about *availability*, not
  about ideas — and it carries a caveat this project has to fix rather than argue
  away: the source is public and MIT-licensed, but the built package is currently
  published only to GitHub Packages with private visibility, so `npm install` fails
  for anyone outside the organisation. Making the package publicly obtainable is
  tracked on the [roadmap](/roadmap/).
- **A specified and machine-checked serialisation.** The interchange form is not
  left implicit. It is a published descriptor, an XSD generated from it, and the
  blocking checks listed above — precisely the step Stroppi et al. describe and the
  step the survey literature keeps finding missing.
- **Versioned codings inside the model file.** Each coding records the code system
  version alongside the code, so an annotation stays interpretable after the code
  system moves on. This is an ordinary FHIR `Coding` discipline applied where
  process models usually have none.
- **Terminology access as part of the same artefact.** The provider architecture,
  the registry and the properties panel make annotation a search-and-pick operation
  rather than a copy-a-code-from-a-browser-tab operation — which is a direct
  response to the adoption obstacle Corea et al. identify, and the one place where
  "this time is different" can be argued at all. Whether it *is* different is an
  empirical question this project has not yet answered.

## What is deliberately not claimed

- **No clinical validation.** Nothing here has been validated for use in patient
  care, and the artefact has no medical intended purpose.
- **No evaluation study.** There is no user study, no annotation-effort
  measurement, no inter-annotator agreement, and no cross-tool interoperability
  experiment. The conformance gate measures the repository's own fixtures, not the
  behaviour of third-party tools.
- **No terminological completeness.** The extension binds codes; it does not
  curate, govern, or warrant terminology content. Which content is bundled and
  which is fetched from a terminology server at runtime is set out on the
  [configuration page](/configuration/), and the licence position follows from that
  split.
- **No standardisation status.** The `term:` namespace is a project namespace. It
  has not been submitted to, endorsed by, or harmonised with OMG, HL7, IHE or the
  Medical Informatics Initiative.
- **One research group, pre-1.0.** The descriptor, the API and the namespace may
  still change. See the [roadmap](/roadmap/).

### Namespace authority

The descriptor declares the namespace `https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1`.
XML parsers use it as an identifier; people can resolve it to the generated contract,
descriptor and XSD. The GitHub organization controls the authority, and
[ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md)
defines how `/v1` relates to package releases and future incompatible format changes.

## Sibling work in the same group

Two neighbouring repositories in the same organisation are easy to mistake for this
one.

[`bpmn-js-clinical-semantics`](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics)
is the predecessor. It is a public Apache-2.0 monorepo containing two extension
packages — a terminology layer and a FHIR-mapping layer — and it is superseded by
the present package, which replaces its terminology half. The two are not
interchangeable: the predecessor retains the old development namespace and its content model
differs (its `Annotation` carries
`aspect` and `mode` rather than `id`, and it adds a `clinicalDomain` attribute to
`bpmn:FlowNode`, `bpmn:DataObjectReference`, `bpmn:DataStoreReference` and
`bpmn:MessageFlow`). The new controlled URI removes the namespace collision. Both projects
still use the conventional `term` prefix, so they must not be registered together in one
modeler. Treat the predecessor as historical context, not as an alternative to install.

`bpmn-extension-fhir-mapping` is the planned successor to the predecessor's other
half: an extension that declares how a BPMN element maps onto FHIR resources —
resource type, profile, interaction, and key elements — so that a model can be
transformed towards `PlanDefinition` and friends. It is designed to be combinable
with this extension in the same file, through a second namespace. As of September
2026 that repository is not public and still holds the unmodified scaffold of the
group's BPMN extension template; the mapping extension itself is not yet
implemented. Nothing on this documentation site depends on it.

## References

The list below is the project's working bibliography. Entries are given with
author, year, venue and title; identifiers are included where they are known. Check
any entry against the publisher record before citing it in a publication —
particularly those marked unverified.

- Beckmann, C. et al. (2023). *Transformation between BPMN and HL7 FHIR.*
  Information 14(12):649. DOI [10.3390/info14120649](https://doi.org/10.3390/info14120649)
  (correction: [10.3390/info15090541](https://doi.org/10.3390/info15090541)).
  *Exact title unverified.*
- Born, M., Dörr, F., Weber, I. (2007). *User-friendly semantic annotation in
  business process modeling.* WISE Workshops.
  DOI [10.1007/978-3-540-77010-7_25](https://doi.org/10.1007/978-3-540-77010-7_25)
- Braun, R. (2015). *Behind the barriers — What hinders the adoption of BPMN
  extensions.* MODELSWARD 2015.
  DOI [10.5220/0005329904030410](https://doi.org/10.5220/0005329904030410).
  *Exact title unverified; the paper is the source of the open-problem table
  including P7, "missing specification of extension XML interchange".*
- Braun, R., Esswein, W. (2014). *Classification of domain-specific BPMN
  extensions.* PoEM 2014.
- Braun, R., Schlieter, H., Burwitz, M., Esswein, W. (2014). *BPMN4CP: Design and
  implementation of a BPMN extension for clinical pathways.* IEEE BIBM 2014,
  pp. 9–16. DOI [10.1109/BIBM.2014.6999261](https://doi.org/10.1109/BIBM.2014.6999261)
- Braun, R., Schlieter, H., Burwitz, M., Esswein, W. (2015a). *Extending a business
  process modeling language for domain-specific adaptation in healthcare.*
  Wirtschaftsinformatik 2015, Paper 32.
- Braun, R., Burwitz, M., Schlieter, H., Benedict, M. (2015b). *Clinical processes
  from various angles — Amplifying BPMN for integrated hospital management.*
  IEEE BIBM 2015, pp. 837–845.
- Braun, R., Schlieter, H., Burwitz, M., Esswein, W. (2016). *BPMN4CP revised —
  Extending BPMN for multi-perspective modeling of clinical pathways.* HICSS 2016,
  pp. 3249–3258. DOI [10.1109/HICSS.2016.407](https://doi.org/10.1109/HICSS.2016.407)
- Cavalcante, E., Gonçalves, Araújo (2026). *A study of BPMN extensions.* Journal of
  Software: Evolution and Process 38(6):e70127.
  DOI [10.1002/smr.70127](https://doi.org/10.1002/smr.70127). *Author initials and
  exact title are recorded shorthand and unverified; this is the source of the
  95.7% / 26.3% figures quoted above.*
- Corea, C., Fellmann, M., Delfmann, P. (2021). *Ontology-based process modelling —
  Will we live to see it?* ER 2021.
  DOI [10.1007/978-3-030-89022-3_4](https://doi.org/10.1007/978-3-030-89022-3_4)
- Di Francescomarino, C., Tonella, P. (2009). *Supporting ontology-based semantic
  annotation of business processes with automated suggestions.* CAiSE Workshops.
  DOI [10.1007/978-3-642-01862-6_18](https://doi.org/10.1007/978-3-642-01862-6_18)
- Helm, E. et al. (2022). *FHIR2BPMN.* Studies in Health Technology and Informatics.
  DOI [10.3233/SHTI220311](https://doi.org/10.3233/SHTI220311)
- HL7 International. *Clinical Practice Guidelines on FHIR (CPG-on-FHIR)
  Implementation Guide*, version 2.0.0.
- HL7 International / OMG. *Field Guide to Shareable Clinical Pathways*, 3rd edition.
  CC BY 4.0.
- Iglesias, N., Juarez, J. M., Campos, M. (2022). *Comprehensive analysis of rule
  formalisms to represent clinical guidelines: Selection criteria and case study on
  antibiotic clinical guidelines.* JMIR.
  DOI [10.2196/29927](https://doi.org/10.2196/29927). *Exact title unverified;
  compares BPMN with openEHR Task Planning.*
- Ingvar, M. et al. (2021). *On the annotation of health care pathways.* Frontiers in
  Digital Health 3:688218.
  DOI [10.3389/fdgth.2021.688218](https://doi.org/10.3389/fdgth.2021.688218)
- Kober, G., Robaldo, L., Paschke, A. (2023). SWAT4HCLS 2023, CEUR-WS Vol-3415.
  *Title not recorded in the project bibliography; resolve it from the CEUR volume
  before citing.*
- Kurz, M. (2016). *BPMN model interchange: The quest for interoperability.*
  S-BPM ONE 2016. DOI [10.1145/2882879.2882886](https://doi.org/10.1145/2882879.2882886)
- Lin, Y., Strasunskas, D. (2005). *Ontology-based semantic annotation of process
  templates for reuse.* EMMSAD 2005.
- Neumann, J., Vogel, D., Neumuth, T. (2020). *BPMN SIX .io — A web-based surgical
  workflow modeling tool with ontology integration.* **Unverified:** no persistent
  identifier was found for this item. Related and verifiable: Neumann, J. et al.
  (2019), International Journal of Computer Assisted Radiology and Surgery,
  DOI [10.1007/s11548-019-01982-6](https://doi.org/10.1007/s11548-019-01982-6).
- Ouagne, D., Zossou, F., Rance, B. (2026). *BPMN to conformance-checked
  PlanDefinition.* Studies in Health Technology and Informatics.
  DOI [10.3233/SHTI260306](https://doi.org/10.3233/SHTI260306). *Exact title
  unverified.*
- Pufahl, L. et al. (2022). *BPMN in healthcare: Challenges and best practices.*
  Information Systems. DOI [10.1016/j.is.2022.102013](https://doi.org/10.1016/j.is.2022.102013).
  *Exact title unverified.*
- Sooter, L. J. et al. (2019). *Modeling a clinical pathway for contraception.*
  Applied Clinical Informatics.
  DOI [10.1055/s-0039-3400749](https://doi.org/10.1055/s-0039-3400749)
- Stroppi, L. J. R., Chiotti, O., Villarreal, P. D. (2011). *Extending BPMN 2.0:
  Method and tool support.* BPMN 2011.
- Thomas, O., Fellmann, M. (2009). *Semantic process modeling — Design and
  implementation of an ontology-based representation of business processes.*
  Business & Information Systems Engineering 1(6).
  DOI [10.1007/s12599-009-0078-8](https://doi.org/10.1007/s12599-009-0078-8)
- Zarour, K. et al. (2020). Business Process Management Journal.
  DOI [10.1108/BPMJ-01-2019-0040](https://doi.org/10.1108/BPMJ-01-2019-0040).
  *Exact title unverified; the source of the 52-extension survey cited above.*

### Software and specifications referenced

- Data Sharing Framework (DSF) — <https://github.com/datasharingframework/dsf>
- MSBPMN — <https://github.com/FHOOEAIST/MSBPMN>
- `mburwit/bpmn2fhir` — <https://github.com/mburwit/bpmn2fhir>
- `mburwit/bpmn4cp` — <https://github.com/mburwit/bpmn4cp>
- Object Management Group. *Business Process Model and Notation (BPMN)*,
  version 2.0.2 — <https://www.omg.org/spec/BPMN/>

## Where to go next

- [Use cases](/use-cases/) — what the extension is for, concretely.
- [Schema](/schema/) — the `term:` data model and its XML form.
- [Compatibility](/compatibility/) — what round-tripping guarantees and what it
  does not.
- [Architecture decisions](/architecture/09_architecture_decisions/) — the arc42
  decision index and the records behind the design choices described here.
- [Roadmap](/roadmap/) — the open decisions named on this page, including the
  namespace authority.
