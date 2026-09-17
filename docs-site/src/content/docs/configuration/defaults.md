---
title: "Default configuration"
description: "Every value the extension uses when you call createDefaultTerminologyModule with no arguments."
editUrl: false
---

:::note
This page is generated from `extension/src/config/terminology-config.js` by
`tools/generate-config-defaults.mjs`, and a `--check` run in CI fails when the two
disagree. It is therefore the authoritative list of defaults; the prose pages link here
rather than repeating values.
:::

These are the values in effect when you call
[`createDefaultTerminologyModule`](/api/functions/createdefaultterminologymodule/) or
[`createDefaultTerminologyConfig`](/api/functions/createdefaultterminologyconfig/) with no
arguments. Every one of them can be overridden — see [Configuration](/configuration/).

## Terminology server

| Setting | Default |
| --- | --- |
| `fhirBaseUrl` | `https://r4.ontoserver.csiro.au/fhir` |

The public Ontoserver instance is a convenience for getting started, not a service this
project operates or guarantees. Point `fhirBaseUrl` at a terminology server you control
before relying on it, and note that the licensed content it serves — SNOMED CT, LOINC,
ICD-10-GM, OPS, ATC — is licensed by whoever operates that server, not by this package.

## Providers contacted over the network

| Id | Display name | Code system | Source |
| --- | --- | --- | --- |
| `snomed-ct` | SNOMED CT | `http://snomed.info/sct` | r4.ontoserver.csiro.au |

## FHIR-backed code systems

Each of these is served by the terminology server above, through the FHIR
`$expand`, `$lookup` and `$validate-code` operations.

| Id | Display name | Code system URI | Value set | Pinned version |
| --- | --- | --- | --- | --- |
| `loinc` | LOINC | `http://loinc.org` | `http://loinc.org/vs` | — |
| `icd-10-gm` | ICD-10-GM | `http://fhir.de/CodeSystem/bfarm/icd-10-gm` | `http://fhir.de/ValueSet/bfarm/icd-10-gm` | `2020` |
| `ops` | OPS | `http://fhir.de/CodeSystem/bfarm/ops` | `http://fhir.de/ValueSet/bfarm/ops` | — |
| `atc` | ATC | `http://www.whocc.no/atc` | `http://www.whocc.no/atc/vs` | `2025.0.0` |

A pinned version means the expansion is requested for exactly that release of the code
system. Override it per provider if your server carries a different release.

## Code systems bundled with the package

These need no network access: the concepts ship inside the package, generated from
openly licensed FHIR packages by `tools/generate-hl7-code-systems.mjs`.

| Id | Display name | Package | Package version |
| --- | --- | --- | --- |
| `hl7-terminology-r4-package` | hl7.terminology.r4 (7.1.0) | `hl7.terminology.r4` | `7.1.0` |
| `ihe-xds-class` | de.ihe-d.terminology (3.0.1) — IHEXDSclassCode | `de.ihe-d.terminology` | `3.0.1` |
| `ihe-xds-type` | de.ihe-d.terminology (3.0.1) — IHEXDStypeCode | `de.ihe-d.terminology` | `3.0.1` |
| `kdl` | dvmd.kdl.r4 (2025.0.1) — CodeSystem Klinische Dokumentenklassen-Liste (Version 2025) | `dvmd.kdl.r4` | `2025.0.1` |

## Lazy provider loader

| Setting | Default |
| --- | --- |
| `fhirBaseUrl` | `https://r4.ontoserver.csiro.au/fhir` |
