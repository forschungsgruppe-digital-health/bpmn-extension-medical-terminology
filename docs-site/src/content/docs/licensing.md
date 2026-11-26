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

This package ships **no** SNOMED CT®, LOINC®, ICD-10-GM, OPS, or ATC content — no display
names, descriptions, hierarchies, or excerpts — and it **preconfigures no terminology server**.
These terminologies become available only once you set `serverConfig.fhirBaseUrl` to a server
you are licensed to use; SNOMED CT additionally needs `snomedConfig.edition`, the edition your
licence covers (see [Default configuration](/configuration/defaults/) and
[Connecting a terminology server](/configuration/terminology-server/)). Depending on how a
source is connected, different licensing duties apply:

| Content | How it is used | What the integrating organisation must check |
| --- | --- | --- |
| **SNOMED CT®** | Queried at runtime from the server you configure, for the edition you configure | Valid **SNOMED CT Affiliate License** for that edition (in Germany administered via BfArM / MLDS) and server terms |
| **LOINC®** | Queried at runtime from the server you configure | [LOINC Copyright Notice and License](https://loinc.org/license) and attribution requirements |
| **ICD-10-GM & OPS** | Queried at runtime from the server you configure | BfArM terms of use (and WHO copyright for ICD-10-derived content) |
| **ATC-GM** (the built-in `atc` provider, `http://fhir.de/CodeSystem/bfarm/atc`) | Queried at runtime from the server you configure | WIdO & BfArM terms of use, including the mandatory statement below. The WHO Collaborating Centre's terms apply instead if you configure WHO ATC (`http://www.whocc.no/atc`) yourself |
| **Public terminology servers** (for example `tx.fhir.de`) | Contacted only if you configure them | The operator's terms of use and privacy statement, in addition to the publishers' licences |
| **HL7 Terminology** (`hl7.terminology.r4`) | Bundled and searchable offline | CC0-1.0. Code systems owned by third parties (SNODENT, ADA tooth codes, NUCC provider taxonomy, W3C colour codes) are left out of the bundle, and default [package discovery](/configuration/discovery/) leaves them out too. Packages you select explicitly are not filtered: if you import these code systems that way, you need their owners' licences |
| **IHE XDS, KDL** (`de.ihe-d.terminology`, `dvmd.kdl.r4`) | Imported from dependencies and searchable offline | Neither package declares a licence; check the terms of IHE Deutschland e.V. and DVMD e.V. before redistributing |
| **Custom packages or servers added by the host** | Configured by the integrating application | Access, redistribution, and bundling rights for every added source |

### Publisher copyright and trademark notices

Applications that use these terminologies must show the publishers' notices. The package's
`THIRD_PARTY_NOTICES.md` contains them, and the example diagrams and the demo carry them.

- **SNOMED CT®:** This material includes SNOMED Clinical Terms® (SNOMED CT®) which is used by
  permission of SNOMED International. All rights reserved. SNOMED CT®, was originally created
  by The College of American Pathologists. "SNOMED" and "SNOMED CT" are registered trademarks
  of SNOMED International. Any use requires a valid Affiliate License (in Germany via the
  Federal Institute for Drugs and Medical Devices, **BfArM**, through MLDS).
- **LOINC®:** This material contains content from LOINC (<http://loinc.org>). LOINC is
  copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and
  Codes (LOINC) Committee and is available at no cost under the license at
  <http://loinc.org/license>. LOINC® is a registered United States trademark of Regenstrief
  Institute, Inc.
- **ICD-10-GM:** © WHO, BfArM. Die Erstellung erfolgt unter Verwendung der maschinenlesbaren
  Fassung des Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM). Cite the release
  stored with each coding, for example ICD-10-GM 2026.
- **OPS:** © BfArM. Die Erstellung erfolgt unter Verwendung der maschinenlesbaren Fassung des
  Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM). Cite the release stored with
  each coding, for example OPS 2026.
- **ATC-GM** (mandatory statement, verbatim): Das Wissenschaftliche Institut der AOK (WIdO) ist
  Urheber der ATC-GM mit DDD, die auf dem vom WHO Collaborating Centre for Drug Statistics
  Methodology herausgegebenen Werk mit dem Titel „ATC Index with DDDs and Guidelines for ATC
  Classification and DDD Assignment“ beruht. Die amtliche Veröffentlichung erfolgt durch das
  Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM).

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
research. It needs a prior arrangement for high-volume automated querying, and it is not meant to
be the primary terminology server of a production system. For SNOMED CT it requires a valid
Affiliate Licence. Read its [terms of use](https://tx.fhir.de/de/terms),
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
- The example diagrams contain a few SNOMED CT, LOINC, OPS, and ATC codes, stored as
  annotations, for illustration. They carry the publishers' notices; the SNOMED CT codes refer
  to the German National Edition.
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
  package.
- To try the demo against a terminology server you are allowed to use, build it locally with
  `demo/.env.local`, as described in
  [Try it in the demo](/configuration/terminology-server/#try-it-in-the-demo). A server
  configured there takes precedence, and the demo then offers no live search. Never publish a
  build made that way. Enable SNOMED CT there only with a licence for the edition.

### Optional live search

The live search is **off by default**. A build offers it only for a server named in
`VITE_OPT_IN_FHIR_BASE_URL` whose operator the consent dialog identifies. The dialog names an
operator only for `tx.fhir.de`; for any other host the demo offers no live search. The Pages
workflow takes the server from the repository variable `DEMO_OPT_IN_FHIR_BASE_URL`; while that
variable is unset or empty, the public demo offers no live search.

*Live search…* in the demo's banner opens a separate consent dialog; accepting the licence
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
search details* in the banner reopens this information, and *Turn off live search* withdraws
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

*Unlock SNOMED CT* stays disabled until all three are ticked. The self-declaration is not
verified and grants no licence. It is kept in the tab's session storage, bound to the server
host and the edition, and ends with *Lock SNOMED CT* or *Turn off live search*, and usually when
the tab is closed (a reopened or duplicated tab may keep it). The Pages workflows set no
`VITE_OPT_IN_SNOMED_EDITION`, so the public demo does not offer this unlock.

## bpmn.io watermark

This extension targets [bpmn.io](https://bpmn.io). `bpmn-js` is a peer dependency and is not
distributed with this package. `bpmn-js` is published under MIT terms with one additional
condition: the code that renders the **bpmn.io watermark** must not be removed or altered, and
the watermark must stay fully visible and unobstructed in any website or application that uses
it. See <https://bpmn.io/license/>.
