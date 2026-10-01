---
title: Support
description: Report bugs and security issues and understand the project's support boundary and response targets.
---

This package is pre-1.0 research software, not a supported production service. Only the
latest released `0.x` version receives fixes; there is no long-term-support branch.

## Before reporting a problem

Check these common cases first:

- no terminology sources in the panel: register both the properties-panel module and a
  terminology module;
- request blocked by CORS or redirected: route it through a backend you operate;
- plain Node import fails: consume the raw-ESM package through a bundler;
- annotation cannot be edited or undone: these are current
  [properties-panel limitations](/properties-panel/#known-limitations);
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

The source code is MIT licensed. Terminology content keeps the licence of its publisher:

| Content | How it is used | What the application owner must check |
| --- | --- | --- |
| HL7 Terminology, IHE XDS, and KDL defaults | Bundled and searchable offline | The licence and attribution in each source package or resource |
| SNOMED CT, LOINC, ICD-10-GM, OPS, and ATC defaults | Requested from a terminology server at runtime | Publisher licence, server terms, and permitted territory/use |
| A package or server added by the host | Chosen by the integrating application | Redistribution and access rights for that source |

The extension's MIT licence does not grant rights to external terminology content. A selected
concept stores only its system URI, code, optional version, and display in the BPMN file; that
does not replace the publisher's terms.

For development and pull requests, see [Contributing](/contributing/).
