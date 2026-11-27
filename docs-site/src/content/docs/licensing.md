---
title: Licensing and terminology rights
description: Licence boundaries for the extension source code, medical terminologies, the public demo, and bpmn.io.
---

:::caution[You are responsible for terminology licences]
The **MIT licence** covers only this extension's source code. It does **not** grant permission
to use, host, redistribute, or deploy any medical terminology or classification. Before using
a terminology in your own application or in production, your organisation must obtain and
comply with the respective publisher's licence and terms of use.
:::

## Extension source code

The source code in this repository is published under the
[MIT License](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/LICENSE)
(© Technische Universität Dresden, Forschungsgruppe Digital Health).

## Medical terminologies and code systems

This package ships **no** SNOMED CT®, LOINC®, ICD-10-GM, OPS, or ATC code system — no display
names, descriptions, or hierarchies from them, apart from the few SNOMED CT and LOINC identifiers
in HL7 concepts and the display names HL7 gives five LOINC codes, described below — and it
**preconfigures no terminology server**.
These terminologies become available only once you set `serverConfig.fhirBaseUrl` to a server
you are licensed to use; SNOMED CT additionally needs `snomedConfig.edition`, the edition your
licence covers (see [Default configuration](/configuration/defaults/) and
[Connecting a terminology server](/configuration/terminology-server/)). Depending on how a
source is connected, different licensing duties apply:

| Content | How it is used | What the integrating organisation must check |
| --- | --- | --- |
| **SNOMED CT®** | Queried at runtime from the server you configure, for the edition you configure | Valid **SNOMED CT Affiliate License** for that edition (in Germany administered via BfArM / MLDS) and server terms |
| **LOINC®** | Queried at runtime from the server you configure | [LOINC Copyright Notice and License](https://loinc.org/license) and attribution requirements |
| **ICD-10-GM & OPS** | Queried at runtime from the server you configure | BfArM download and usage conditions, including the source statements below (ICD-10-GM builds on the WHO's ICD-10 and the Australian ICD-10-AM) |
| **ATC-GM** (the built-in `atc` provider, `http://fhir.de/CodeSystem/bfarm/atc`) | Queried at runtime from the server you configure | WIdO & BfArM terms of use, including the mandatory statement below. The WHO Collaborating Centre's terms apply instead if you configure WHO ATC (`http://www.whocc.no/atc`) yourself |
| **Public terminology servers** (for example `tx.fhir.de`) | Contacted only if you configure them | The operator's terms of use and privacy statement, in addition to the publishers' licences |
| **HL7 Terminology** (`hl7.terminology.r4`) | Bundled and searchable offline | CC0-1.0 for HL7's own content. Code systems owned by third parties (SNODENT, ADA tooth codes, NUCC provider taxonomy, W3C colour codes) are left out of the bundle, and default [package discovery](/configuration/discovery/) leaves them out too. Packages you select explicitly are not filtered: if you import these code systems that way, you need their owners' licences. A few bundled code systems excerpt other standards and keep their copyright statements (see below) |
| **IHE XDS** (`de.ihe-d.terminology` 3.0.1) | Imported from a dependency and searchable offline | The package declares no licence; check the terms of IHE Deutschland e.V. before redistributing |
| **KDL** (`dvmd.kdl.r4` 2026.0.0) | Imported from a dependency and searchable offline | [GPL-3.0-or-later](https://www.gnu.org/licenses/gpl-3.0.html), as stated by DVMD e.V. in the KDL 2026 guide (the package manifest declares no licence). If you ship a bundle that contains it, include the GPL text, the DVMD copyright and no-warranty notice, and a pointer to the source |
| **Custom packages or servers added by the host** | Configured by the integrating application | Access, redistribution, and bundling rights for every added source |

**Excerpts from other standards in HL7 Terminology.** These bundled code systems (all under
`http://terminology.hl7.org/CodeSystem/`) excerpt or adapt other standards. Each keeps its
copyright statement unchanged in `CodeSystem.copyright`:

- DICOM PS3.16 (© National Electrical Manufacturers Association): `audit-event-type` and
  `dicom-audit-lifecycle`;
- ISO TS 21089-2017 (ISO): `iso-21089-lifecycle`;
- ASTM E1762-95: `contractsignertypecodes`, an example set based on that standard;
- IHE International: `endpoint-connection-type` (some IHE content) and `time-period-ranges`
  (adapted from IHE content under CC BY 4.0).

**SNOMED CT and LOINC identifiers in HL7 Terminology.** HL7's own concepts use a few
identifiers from these terminologies, and the bundle keeps them: 13 bundled code systems use the
SNOMED CT concept `900000000000013009` (Synonym) 308 times as `designation.use`, and
`v3-ActCode` contains five LOINC codes with the display names given in HL7's code system. The
package's `THIRD_PARTY_NOTICES.md` lists them.

**KDL licence.** The KDL CodeSystem (`http://dvmd.de/fhir/CodeSystem/kdl`) that the bundled
presets import is copyright 2013–2018 DMI GmbH & Co. KG and, since 2018, DVMD e.V. DVMD e.V.
makes it freely available under the GNU General Public License, version 3 or (at your option)
any later version, without any warranty. The GPL covers only the KDL content; this extension's
source code is MIT-licensed. Unmodified source:
<https://packages.simplifier.net/dvmd.kdl.r4/2026.0.0>.

### Publisher copyright and trademark notices

Applications that use these terminologies must show the publishers' notices. The package's
`THIRD_PARTY_NOTICES.md` contains them, and the demo shows them. The example diagrams carry them
only as XML comments, which do not survive an import (see
[Public demo and privacy](#public-demo-and-privacy)).

- **SNOMED CT®** (the notice that clause 8.3.1 of the SNOMED CT Affiliate License prescribes):

  > This material includes SNOMED Clinical Terms® (SNOMED CT®) which is used by permission of
  > the International Health Terminology Standards Development Organisation (IHTSDO). All
  > rights reserved. SNOMED CT®, was originally created by The College of American
  > Pathologists. "SNOMED" and "SNOMED CT" are registered trademarks of the IHTSDO.

  The IHTSDO trades as SNOMED International. As BfArM permits, "This material" may read "This
  software", "This application" or "This document", and the German version may be used
  instead. Clause 8.3.2 also requires licensees to state, in all media on which their product
  is distributed, the version and date of the International Release it contains. Any use requires
  a valid Affiliate License (in Germany via the Federal Institute for Drugs and Medical Devices,
  **BfArM**, through MLDS).

- **LOINC®:**

  > This material contains content from LOINC (<http://loinc.org>). LOINC is copyright ©
  > Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC)
  > Committee and is available at no cost under the license at <http://loinc.org/license>.
  > LOINC® is a registered United States trademark of Regenstrief Institute, Inc.

- **ICD-10-GM** (source statement for Band 1, Systematisches Verzeichnis, from the annex to
  BfArM's download conditions as of 1 August 2025, verbatim):

  > Die vorliegende Ausgabe beruht
  >
  > (1) auf der vollständigen amtlichen Fassung der Internationalen statistischen
  > Klassifikation der Krankheiten und verwandter Gesundheitsprobleme, 10. Revision, und
  >
  > (2) auf der australischen ICD-10-AM, First Edition.
  >
  > Die englischsprachige Originalausgabe zu (1) wurde 1992 von der Weltgesundheitsorganisation
  > (WHO) veröffentlicht als International Statistical Classification of Diseases and Related
  > Health Problems, Tenth Revision, Geneva, WHO, Vol. 1, 1992; die englischsprachige
  > Originalausgabe zu (2) wurde 1998 vom australischen National Centre for Classification in
  > Health veröffentlicht als Volume 1 of The International Statistical Classification of
  > Diseases and Related Health Problems, 10th Revision, Australian Modification (ICD-10-AM),
  > First Edition.
  >
  > © zu (1): Weltgesundheitsorganisation (WHO) 1992
  >
  > © zu (2): Commonwealth of Australia 1998
  >
  > Der Generaldirektor der Weltgesundheitsorganisation (WHO) hat die Übersetzungsrechte für
  > eine deutschsprachige Ausgabe an das Bundesinstitut für Arzneimittel und Medizinprodukte
  > (BfArM) vergeben, das für die Übersetzung allein verantwortlich ist.
  >
  > Das Commonwealth of Australia hat die Übersetzungsrechte für eine deutschsprachige Ausgabe
  > an das Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) vergeben, das für die
  > Übersetzung allein verantwortlich ist.
  >
  > Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag
  > des Bundesministeriums für Gesundheit (BMG)
  >
  > Die Erstellung bzw. der Druck erfolgt unter Verwendung der maschinenlesbaren Fassung des
  > Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM).

  Cite the release stored with each coding, for example ICD-10-GM 2026, and show display texts
  unchanged. The annex prescribes a separate source statement for Band 2 (Alphabetisches
  Verzeichnis); include it as well if your server returns terms from the alphabetical index.

- **OPS** (source statement from the annex to BfArM's download conditions as of 1 August 2025,
  verbatim):

  > Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag
  > des Bundesministeriums für Gesundheit (BMG)
  >
  > Die Erstellung bzw. der Druck erfolgt unter Verwendung der maschinenlesbaren Fassung des
  > Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM).

  Cite the release stored with each coding, for example OPS 2026, and show display texts
  unchanged.

- **ATC-GM** (mandatory statement, verbatim):

  > Das Wissenschaftliche Institut der AOK (WIdO) ist Urheber der ATC-GM mit DDD, die auf dem
  > vom WHO Collaborating Centre for Drug Statistics Methodology herausgegebenen Werk mit dem
  > Titel „ATC Index with DDDs and Guidelines for ATC Classification and DDD Assignment“
  > beruht. Die amtliche Veröffentlichung erfolgt durch das Bundesinstitut für Arzneimittel und
  > Medizinprodukte (BfArM).

- **KDL:** Copyright 2013–2018 DMI GmbH & Co. KG; since 2018 DVMD e.V. GPL-3.0-or-later; the
  KDL is provided without any warranty.

:::note[ATC default changed to ATC-GM]
The built-in `atc` provider now uses the German ATC-GM published by BfArM instead of the WHO ATC
(`http://www.whocc.no/atc`). This is a breaking change for new codings, which carry the ATC-GM
system URI. Codings already stored with the WHO system remain valid data; for them, and if you
configure WHO ATC yourself, the terms of the WHO Collaborating Centre for Drug Statistics
Methodology apply.
:::

### Public terminology servers

A terminology server you connect has its own terms of use, separate from the publishers'
licences for the content it serves. HL7 Deutschland's public server `https://tx.fhir.de/fhir`,
for example, permits use for FHIR tooling, software development, validation and non-commercial
research, and it needs a prior arrangement for high-volume automated querying. For SNOMED CT it
requires a valid Affiliate Licence. Its [start page](https://tx.fhir.de/de) adds that it is not
meant to be the primary terminology server of a production system and that it serves validation
only; this project has no confirmation from HL7 Deutschland that interactive searches, such as
the demo's optional live search, fit that role. Read its [terms of use](https://tx.fhir.de/de/terms),
[licence page](https://tx.fhir.de/de/licenses) and
[privacy statement](https://hl7.de/datenschutz/) before you connect it.

### What is stored in `.bpmn` files

When a modeller selects a concept, the extension writes its code system URI, code, version,
and display text into `bpmn:extensionElements`. The version is the release the server reports.
For SNOMED CT over FHIR it is the URI of that release of the edition, for example
`http://snomed.info/sct/11000274103/version/20260815`; over Snowstorm it names the concept's own
module and effective time (`http://snomed.info/sct/<moduleId>/version/<effectiveTime>`). Storing
selected codes in a process file does **not** replace or waive the terminology publisher's
licence terms; include the notices above when you pass such files on.

## Public demo and privacy

By default the [live demo](/demo/) contacts **no terminology server**. If a build offers it, a
visitor can switch on an optional live search on `tx.fhir.de`; until then the demo sends nothing
there (see [Optional live search](#optional-live-search)).

- By default, searches cover only the bundled code systems (HL7 Terminology, IHE XDS, KDL).
  SNOMED CT is not searchable in the public demo (the Pages workflows set no
  `VITE_OPT_IN_SNOMED_EDITION`); LOINC, ICD-10-GM, OPS, and ATC only with the optional live
  search below.
- The example diagrams contain a few SNOMED CT, LOINC, OPS, ATC-GM, KDL and IHE XDS codes,
  stored as annotations, for illustration. The SNOMED CT codes refer to the German National
  Edition, release `http://snomed.info/sct/11000274103/version/20260815`. Which International
  Release that edition contains, whose version and date clause 8.3.2 asks to state, has not
  been confirmed yet; the demo and the examples therefore name only the German release so far.
- The `.bpmn` files of the examples carry the SNOMED CT, LOINC, OPS, ATC-GM and KDL notices as
  XML comments. bpmn-js drops XML comments when it imports a diagram, so the demo adds the notices
  back to its XML view and to the file it downloads. Diagrams that your own application saves
  contain no notices unless your application adds them.
- The demo is for **preview and evaluation only** — not for clinical, operational, or
  production workflows. Never enter real patient data, and never use personal data as a search
  term.
- The demo runs in the browser and sends no diagrams to any server. Searches leave the browser
  only with the live search switched on, and then go only to `tx.fhir.de`. The demo is hosted
  on GitHub Pages; GitHub processes technical data such as the visitor's IP address when the
  page loads (see the
  [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)).
  Responsible for the demo: Technische Universität Dresden, Forschungsgruppe Digital Health
  ([Impressum](https://tu-dresden.de/impressum)).
- The demo build includes `THIRD_PARTY_LICENSES.txt` with the licences of every bundled npm
  package, including the full GPL-3.0 text for the KDL, whose package ships no licence file.
- To try the demo against a terminology server you are allowed to use, build it locally with
  `demo/.env.local`, as described in
  [Try it in the demo](/configuration/terminology-server/#try-it-in-the-demo). A server
  configured there takes precedence, and the demo then offers no live search. Never publish a
  build made that way. Enable SNOMED CT there only with a licence for the edition.

### Optional live search

The live search is **off by default**. A build offers it only for a server named in
`VITE_OPT_IN_FHIR_BASE_URL` whose operator the consent dialog identifies. The dialog names an
operator only for `tx.fhir.de`; for any other host the demo offers no live search. The Pages
workflow takes the server from the repository variable `DEMO_OPT_IN_FHIR_BASE_URL`, and the
`docs-preview` workflow builds its review artifact from the same variable; while that variable
is unset or empty, neither offers a live search.

The demo's banner and dialogs are German when the browser prefers German over English, otherwise
English, with a DE | EN switch in the banner and in each dialog. The labels below are the English
ones, with the German label in brackets.

*Live search…* (*Live-Suche…*) in the demo's banner opens a separate consent dialog; accepting the licence
notice does not switch it on. Before the visitor decides, the dialog states:

- what is sent: the search term and the code system and, as with any web request, the IP
  address, the time, browser details, and the address of the demo;
- the recipient: HL7 Deutschland e.V., Luisenstraße 65, 10117 Berlin, which operates
  `tx.fhir.de` and processes the requests as its own controller, with links to its privacy
  statement, terms of use, and licence page;
- the purpose (showing live search results in the demo) and the legal basis, consent under
  Art. 6(1)(a) GDPR, which is voluntary;
- that Technische Universität Dresden neither receives nor stores search terms, and that the
  choice is kept only in the browser tab's session storage;
- how to withdraw consent, the data subject rights, and who is responsible for the demo.

After consent, the demo searches LOINC, ICD-10-GM, OPS, and ATC on `https://tx.fhir.de/fhir`,
directly from the visitor's browser. The consent is kept in the tab's session storage until the
visitor turns the live search off or closes the tab; a reopened or duplicated tab may restore
it, and the banner then shows that the live search is on. While the live search is on, *Live
search details* (*Details zur Live-Suche*) in the banner reopens this information, and *Turn off
live search* (*Live-Suche ausschalten*) withdraws
the consent at any time and removes these providers. To respect
`tx.fhir.de`'s terms on automated querying, a search is sent only from three characters on and
about 300 ms after typing stops, and repeated searches are answered from a cache.

**SNOMED CT unlock.** The demo can also offer SNOMED CT on top of the live search, to licensed
users only. A build enables this with `VITE_OPT_IN_SNOMED_EDITION` (the module id of the
edition) and optionally `VITE_OPT_IN_SNOMED_EDITION_VERSION` (a release, `YYYYMMDD`); both take
effect only together with `VITE_OPT_IN_FHIR_BASE_URL`. Only `11000274103`, the German National
Edition, is accepted: the self-declaration describes that edition and use in Germany alone, so
any other module id offers no unlock. *SNOMED CT…* then appears in the banner once the live
search is on. It opens a dialog with three statements, none of them pre-ticked:

- the visitor holds a SNOMED CT Affiliate Licence that covers the edition, or uses SNOMED CT as
  an end user under such a licence;
- the visitor uses SNOMED CT in the demo only in Germany;
- the visitor uses it only to evaluate the extension, not for patient care, and enters no
  patient data.

*Unlock SNOMED CT* (*SNOMED CT freischalten*) stays disabled until all three are ticked. The self-declaration is not
verified and grants no licence. It is kept in the tab's session storage, bound to the server
host and the edition, and ends with *Lock SNOMED CT* (*SNOMED CT sperren*) or *Turn off live
search*, and usually when
the tab is closed (a reopened or duplicated tab may keep it). The Pages workflows set no
`VITE_OPT_IN_SNOMED_EDITION`, so the public demo does not offer this unlock.

## bpmn.io watermark

This extension targets [bpmn.io](https://bpmn.io). `bpmn-js` is a peer dependency and is not
distributed with this package. `bpmn-js` is published under MIT terms with one additional
condition: the code that renders the **bpmn.io watermark** must not be removed or altered, and
the watermark must stay fully visible and unobstructed in any website or application that uses
it. See <https://bpmn.io/license/>.
