---
title: Support
description: Report bugs and security issues and understand the project's support boundary and response targets.
---

This package is actively developed research software, not a supported production service.
Only the latest published extension version receives fixes; there is no long-term-support
branch. See the [version matrix](/version-matrix/) for the current release and tested stack.

## Before reporting a problem

Check these common cases first:

- no terminology sources in the panel: register both the properties-panel module and a
  terminology module;
- request blocked by CORS or redirected: use a redirect-free server whose CORS policy allows
  your origin, or route the requests through a backend you operate; see
  [Troubleshooting](/configuration/terminology-server/#troubleshooting);
- plain Node import fails: consume the raw-ESM package through a bundler;
- annotation edits participate in bpmn-js undo/redo; see
  [properties-panel behavior](/properties-panel/#add-an-annotation);
- GitHub Packages returns `E401`: check the registry scope and token described under
  [Compatibility](/compatibility/#installation).

## Report a bug or request a feature

Open a GitHub
[issue](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues)
and include:

- package, bpmn-js, properties-panel, and bundler versions;
- expected and actual behaviour;
- the smallest reproducible configuration and BPMN file;
- relevant console errors with credentials and internal hostnames removed.

Use only obviously synthetic clinical data. Never attach patient data, realistic patient
identifiers, credentials, or access tokens to an issue, screenshot, or example.

## Response targets

These are best-effort targets for this research project, not a service-level agreement:

| Request | Target |
| --- | --- |
| Public bug report or support question | Initial triage within 10 working days |
| Private security report | Acknowledgement within 5 working days |
| Confirmed security report | Assessment and remediation plan within 30 days |
| Feature request | Reviewed during backlog triage; no response or implementation deadline |

An initial triage may be a request for more information, a classification, or a pointer to an
existing issue. It does not promise a fix. Maintainer availability, university holidays, and
project funding may extend these times.

## Report a security issue

Do not disclose an unfixed vulnerability in a public issue. Follow the repository's
[security policy](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/SECURITY.md),
which contains the current private reporting route, scope, and response targets.

## Licence and terminology content

The extension source code is MIT licensed, but that licence does **not** grant rights to
external medical terminologies (SNOMED CT®, LOINC®, ICD-10-GM, OPS, ATC, or bundled FHIR
packages). Integrating applications must also preserve the `bpmn.io` watermark.

See [Licensing & terminology rights](/licensing/) for the full breakdown of publisher
licences, what the public demo does, and `bpmn.io` terms. The npm package ships the MIT
`LICENSE` and a `THIRD_PARTY_NOTICES.md` with the terms of every bundled source.

## Project and funding

This package is developed by **Technische Universität Dresden, Forschungsgruppe Digital Health**
as part of **MiHUB – Medical Informatics Hub**, a Digital Progress Hub (Digitaler
FortschrittsHub Gesundheit) of the German Medical Informatics Initiative (MII).

MiHUB is funded by the German Federal Ministry of Research, Technology and Space
(Bundesministerium für Forschung, Technologie und Raumfahrt, BMFTR) under grant number
**01ZZ2506A** (01/2026 – 12/2029). The responsibility for the content of this publication lies
with the authors.

- Project: <https://mihubx.de/mihub/>
- Funding record: [Förderkatalog des Bundes, FKZ 01ZZ2506A](https://foerderportal.bund.de/foekat/jsp/SucheAction.do?actionMode=view&fkz=01ZZ2506A)
- Funder: BMFTR ([ROR 04pz7b180](https://ror.org/04pz7b180))

For development and pull requests, see [Contributing](/contributing/).
