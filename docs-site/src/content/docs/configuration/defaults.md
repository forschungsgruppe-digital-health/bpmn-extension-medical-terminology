---
title: "Default configuration"
description: "Every value the extension uses when you call createDefaultTerminologyModule with no arguments."
editUrl: false
---

:::note
This page is generated from `extension/src/config/terminology-config.js` and
`extension/src/properties-panel/config.js` by `tools/generate-config-defaults.mjs`,
and a `--check` run in CI fails when the code and docs disagree. It is therefore
the authoritative list of defaults; the prose pages link here rather than repeating values.
:::

These are the values in effect when you call
[`createDefaultTerminologyModule`](/api/functions/createdefaultterminologymodule/) or
[`createDefaultTerminologyConfig`](/api/functions/createdefaultterminologyconfig/) with no
arguments. Every one of them can be overridden — see [Configuration](/configuration/).
For a worked example with a real server, see [Connecting a terminology server](/configuration/terminology-server/).

## Terminology server

| Setting | Default |
| --- | --- |
| `fhirBaseUrl` | — |

No terminology server is preconfigured, so the default configuration contacts no
server at all. SNOMED CT, LOINC, ICD-10-GM, OPS and ATC are licensed content: set
`serverConfig.fhirBaseUrl` to a server you are licensed to use. The content it serves is
licensed by its publishers, not by this package — see [Licensing](/licensing/).

## Providers contacted over the network

None by default.

With a configured server and SNOMED CT edition, for example
`serverConfig: { fhirBaseUrl: 'https://terminology.example.org/fhir' }` and
`snomedConfig: { edition: '11000274103' }` (German National Edition), the
SNOMED CT provider is registered as follows. Without `snomedConfig.edition` (or an explicit
`snomedConfig.valueSetUri`) it stays disabled, so the server cannot silently answer from an
edition you are not licensed for.

| Id | Display name | Code system | Value set | `$lookup` version | Version label |
| --- | --- | --- | --- | --- | --- |
| `snomed-ct` | SNOMED CT | `http://snomed.info/sct` | `http://snomed.info/sct/11000274103?fhir_vs` | `http://snomed.info/sct/11000274103` | — |
| `snomed-ct` | SNOMED CT | `http://snomed.info/sct` | `http://snomed.info/sct/11000274103/version/20260815?fhir_vs` | `http://snomed.info/sct/11000274103/version/20260815` | `http://snomed.info/sct/11000274103/version/20260815` |

The first row is `snomedConfig: { edition }` alone, the second adds
`editionVersion: '20260815'`. Each coding stores the release the server reports
for it, for example `http://snomed.info/sct/11000274103/version/20260815`. The provider has a version label
only when `editionVersion` pins a release; only then are stored codings of another release
marked "Version unavailable".

Every `$expand` request of the SNOMED CT provider over FHIR sends `activeOnly=true`, so
searches return active concepts only; `snomedConfig.expandParameters` is merged over it.
The Snowstorm transport has no default branch: without `snomedConfig.branch` it stays
disabled, because `MAIN` holds the International Edition.

:::caution[Breaking change: Snowstorm needs a branch]
Earlier releases defaulted to `branch: 'MAIN'`. A `transport: 'snowstorm'` configuration without
`snomedConfig.branch` now leaves SNOMED CT disabled; add the branch of the edition your licence
covers, for example `'MAIN/SNOMEDCT-DE'`.
:::

## FHIR-backed code systems

These are registered only once `serverConfig.fhirBaseUrl` is set. Each is then served
by that server through the FHIR `$expand` and `$lookup` operations.

| Id | Display name | Code system URI | Value set | Release |
| --- | --- | --- | --- | --- |
| `loinc` | LOINC | `http://loinc.org` | `http://loinc.org/vs` | Server's current release |
| `icd-10-gm` | ICD-10-GM | `http://fhir.de/CodeSystem/bfarm/icd-10-gm` | `http://fhir.de/ValueSet/bfarm/icd-10-gm` | Server's current release |
| `ops` | OPS | `http://fhir.de/CodeSystem/bfarm/ops` | `http://fhir.de/ValueSet/bfarm/ops` | Server's current release |
| `atc` | ATC | `http://fhir.de/CodeSystem/bfarm/atc` | `http://fhir.de/ValueSet/bfarm/atc` | Server's current release |

Release: the server's current release; each coding stores the release the server reports
(`used-codesystem` in `$expand`, the `version` output of `$lookup`). No release is pinned,
because a hard-coded year stops working once a server drops that release. To pin one, see
[Pin a release](/configuration/terminology-server/#pin-a-release).

`loinc` shows only codes that match the `codePattern` `^\d{1,7}-\d$`; set
`fhirProviderOverrides: [{ id: 'loinc', codePattern: null }]` to show every code the value set
expands.
This default is new: earlier releases also offered LOINC Parts and Answers.

:::caution[Breaking change: ATC is ATC-GM]
The `atc` provider uses the BfArM ATC-GM, `http://fhir.de/CodeSystem/bfarm/atc` with the value set
`http://fhir.de/ValueSet/bfarm/atc`, instead of the WHO ATC (`http://www.whocc.no/atc`). New codings
carry the ATC-GM system URI; existing codings with the WHO ATC system URI remain valid data.
:::

## Code systems bundled with the package

These need no network access. `hl7.terminology.r4` is generated by
`tools/generate-hl7-code-systems.mjs`, which leaves out code systems owned by third parties
(SNODENT, the ADA tooth codes, the NUCC provider taxonomy and the W3C colour codes).
Automatic package discovery
(the Vite plugin, `fdh-terminology-discover` and `packageAutoDiscovery`) leaves them out as
well; only an explicit package selection imports them. IHE XDS and KDL are imported
directly from their installed FHIR packages, whose manifests declare no licence; DVMD states
GPL-3.0-or-later for the KDL in its implementation guide. See
[Licensing](/licensing/) and the package's `THIRD_PARTY_NOTICES.md`.

| Id | Display name | Package | Package version |
| --- | --- | --- | --- |
| `hl7-terminology-r4-package` | hl7.terminology.r4 (7.5.0) | `hl7.terminology.r4` | `7.5.0` |
| `ihe-xds-class` | de.ihe-d.terminology (3.0.1) — IHEXDSclassCode | `de.ihe-d.terminology` | `3.0.1` |
| `ihe-xds-type` | de.ihe-d.terminology (3.0.1) — IHEXDStypeCode | `de.ihe-d.terminology` | `3.0.1` |
| `kdl` | dvmd.kdl.r4 (2026.0.0) — CodeSystem Klinische Dokumentenklassen-Liste 2026 | `dvmd.kdl.r4` | `2026.0.0` |

## Lazy provider loader

Disabled by default, because no terminology server is configured. It is enabled with
`serverConfig.fhirBaseUrl` or an explicit `loaderConfig.fhirBaseUrl`.

## Properties panel

These are the defaults in
[`DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG`](/api/variables/default_terminology_properties_config/)
when you use `TerminologyPropertiesPanelModule` or call
[`createTerminologyPropertiesPanelModule`](/api/functions/createterminologypropertiespanelmodule/)
with no arguments. Override them via `createTerminologyPropertiesPanelModule(options)` — see
[Properties panel options](/properties-panel/#options).

| Setting | Default |
| --- | --- |
| `showAnnotations` | `true` |
| `showBadges` | `true` |
| `includeTypes` | `[]` |
| `excludeTypes` | `[]` |
| `serverSearchDebounceMs` | `300` |
| `serverSearchMinLength` | `3` |

`serverSearchDebounceMs` and `serverSearchMinLength` apply only to providers that query a
terminology server (`sourceType: 'api'` or `remoteSearch: true`); see
[Search throttling](/configuration/terminology-server/#search-throttling).
Both defaults are new: earlier releases searched from the first character on every keystroke.
`serverSearchMinLength: 1` and `serverSearchDebounceMs: 0` restore that behaviour.

Default `targetTypes`:

- `bpmn:Task`
- `bpmn:UserTask`
- `bpmn:ServiceTask`
- `bpmn:SendTask`
- `bpmn:ReceiveTask`
- `bpmn:ManualTask`
- `bpmn:ScriptTask`
- `bpmn:BusinessRuleTask`
- `bpmn:SubProcess`
- `bpmn:ExclusiveGateway`
- `bpmn:DataObjectReference`
- `bpmn:DataStoreReference`
- `bpmn:IntermediateThrowEvent`
- `bpmn:IntermediateCatchEvent`
- `bpmn:StartEvent`
- `bpmn:EndEvent`
- `bpmn:SequenceFlow`

To change the terminology server, disable or override any of the provider IDs above,
switch to offline-only mode, or configure authentication, continue with
[Configuration options](/configuration/).
