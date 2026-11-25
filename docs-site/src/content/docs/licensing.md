---
title: Licensing and terminology rights
description: Licence boundaries for the extension source code, medical terminologies, the public demo server, and bpmn.io.
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
names, descriptions, hierarchies, or excerpts. Depending on how a source is connected,
different licensing duties apply:

| Content | How it is used | What the integrating organisation must check |
| --- | --- | --- |
| **SNOMED CT®** | Queried from a terminology server at runtime | Valid **SNOMED CT Affiliate License** (in Germany administered via BfArM / MLDS) and server terms |
| **LOINC®** | Queried from a terminology server at runtime | [LOINC Copyright Notice and License](https://loinc.org/license) and attribution requirements |
| **ICD-10-GM & OPS** | Queried from a terminology server at runtime | BfArM terms of use (and WHO copyright for ICD-10-derived content) |
| **ATC** | Queried from a terminology server at runtime | WHO Collaborating Centre for Drug Statistics Methodology / WIdO & BfArM terms of use |
| **HL7 Terminology, IHE XDS, KDL** (`hl7.terminology.r4`, `de.ihe-d.terminology`, `dvmd.kdl.r4`) | Bundled and searchable offline | Licence and attribution requirements in each source FHIR package |
| **Custom packages or servers added by the host** | Configured by the integrating application | Access, redistribution, and bundling rights for every added source |

### Publisher copyright and trademark notices

- **SNOMED CT®:** SNOMED Clinical Terms® (SNOMED CT®) is copyrighted by and a registered
  trademark of **SNOMED International**. Production or operational use requires a valid
  Affiliate License (in Germany via the Federal Institute for Drugs and Medical Devices,
  **BfArM**, through MLDS).
- **LOINC®:** LOINC® is copyright © Regenstrief Institute, Inc. and the Logical Observation
  Identifiers Names and Codes (LOINC) Committee. All rights reserved. LOINC® is a registered
  trademark of Regenstrief Institute, Inc., governed by the
  [LOINC License](https://loinc.org/license).
- **ICD-10-GM & OPS:** Official German classifications published by **BfArM** on behalf of the
  Federal Ministry of Health (BMG). ICD-10-GM is based on ICD-10 published by the World Health
  Organization (WHO).
- **ATC:** Based on the Anatomical Therapeutic Chemical (ATC) classification by the *WHO
  Collaborating Centre for Drug Statistics Methodology* (in Germany published in cooperation
  with WIdO and BfArM).

### What is stored in `.bpmn` files

When a modeller selects a concept, the extension writes only its code system URI, code,
optional version, and display text into `bpmn:extensionElements`. Storing selected codes in a
process file does **not** replace or waive the terminology publisher's licence terms.

## Public demo and default test server

The live demo and the default development configuration query the public **CSIRO Ontoserver**
sandbox (`https://r4.ontoserver.csiro.au/fhir`).

- This server is for **preview, testing, and evaluation only** — not for clinical, operational,
  or production workflows.
- It is operated by CSIRO, not by Technische Universität Dresden, and comes with no availability
  or licensing guarantees.
- Never enter real patient data into the demo or send personal data to public terminology
  servers.
- Before relying on remote terminologies in your own application, connect a terminology server
  you control and hold the necessary publisher licences. See [Configuration](/configuration/).

## bpmn.io watermark

This extension targets [bpmn.io](https://bpmn.io). `bpmn-js` is a peer dependency and is not
distributed with this package. `bpmn-js` is published under MIT terms with one additional
condition: the code that renders the **bpmn.io watermark** must not be removed or altered, and
the watermark must stay fully visible and unobstructed in any website or application that uses
it. See <https://bpmn.io/license/>.
