---
title: Roadmap
description: The near-term release themes, the open work in the issue tracker, and what this project deliberately does not try to be.
---

This page describes where the extension is going. It is written to be honest rather than
reassuring: the project is a research artefact built at TU Dresden, Forschungsgruppe Digital
Health, inside the MiHUB project (BMFTR grant `01ZZ2506A`, running 2026 to 2029), and almost
all of its commits come from one person. Treat everything below as **indicative, not a
commitment**. No dates are promised, and no release is guaranteed to contain a particular item.

The [issue tracker](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues)
is authoritative. If this page and an issue disagree, believe the issue.

:::note[Where the known limitations are described]
This page lists what is *planned*. Current properties-panel behavior, including target
configuration, editing, undo/redo, and generated comments, is documented on the
[properties panel](/properties-panel/) page. Bundler and peer-version constraints are on
[Compatibility](/compatibility/).
:::

## Near-term themes

Five themes are in view. They are ordered by what blocks what, not by size, and none of them
has a settled design unless this page says so.

### 1. Improve package access and adoption

Stable releases are published through GitHub Packages; release candidates are staged on npm.
The exact access available to a consumer depends on registry configuration, package permissions,
and whether a candidate has been published from its stage.

The remaining work is to make the installation route straightforward for external adopters and
add a clean-project install/import smoke test. Tracked in
[#36](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/36).

See [Compatibility](/compatibility/) for current registry instructions and
[NPM staging](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/dev/docs/NPM-STAGING.md)
for release-candidate handling.

### 2. A citable release with a DOI

[`CITATION.cff`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CITATION.cff)
and [`codemeta.json`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/codemeta.json)
carry synchronized release versions, but neither carries a DOI. For a research artefact that
is a real gap: a reader of a paper or a project report cannot cite a specific, archived version
of the software with a persistent identifier.

The plan is to enable the Zenodo–GitHub integration, cut a release to mint a concept DOI, record
the DOI in both metadata files, and keep their version fields in lockstep through release-please's
`extra-files` mechanism so the drift cannot recur. See
[how to cite the project today](/support/) for the interim guidance. Tracked in
[#36](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/36).

### 3. Publish the namespace contract

The authority and versioning policy are decided in
[ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md).
The descriptor now uses the organization-controlled, versioned Pages URI
`https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1`.
Its [namespace reference](/ns/terminology/v1/) is generated from the descriptor and publishes
the JSON descriptor and XSD beside the human-readable contract.

The namespace decision is settled and recorded in ADR-0004; the descriptor and generated
reference use the organization-controlled `/v1` URI. Issue
[#35](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/35)
remains open only until the documentation is merged to `main`, Pages deploys, and the public URI
and machine-readable artifacts are verified live.

### 4. Connect the MII terminology service

Issue [#34](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/34)
tracks a verified integration with the Medizininformatik-Initiative terminology service. Access
requires an appropriate client certificate; the intended architecture keeps the certificate and
private key behind a host-operated backend rather than in browser code. The extension ships no
proxy, and tests must continue to use synthetic data without credentials.

### 5. Documentation

This site is part of that theme. The remaining documentation work in the tracker is
[#37](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/37),
which assembles the literature this work has to be positioned against and asks for two written
artefacts: a related-work section, and a decision record answering the question every reviewer
asks first — why a custom extension rather than `bpmn:documentation`, `bpmn:Property`, a
`CategoryValue`, or an existing standard element. That issue also contains a venue table for a
possible publication; it notes that only one of the deadlines in it has been verified and that
the rest are extrapolated from previous years.

## Open work

Every open issue, with a faithful English summary. The issue bodies themselves are in German.

| # | Title | Summary |
|---|---|---|
| [#1](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/1) | Internationalisation der Extension-Oberfläche | Translation is partial: the group label, selected messages, comment toggle, and badge description use the host `translate` service, while many form labels and buttons are still English literals. The issue tracks completing localization without coupling terminology-content language to request `Accept-Language`. |
| [#34](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/34) | Connect and configure the MII terminology server | The remaining work is a verified MII terminology-service integration. Read access requires client-certificate handling through a host-operated backend; certificates must not reach browser code. The extension ships no proxy, and tests must remain credential-free and synthetic. |
| [#35](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/35) | Namespace authority and `/v1` versioning | The decision is settled in [ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md). Remaining work is to merge the documentation, deploy Pages, verify the public URI and artifacts, then close the issue. |
| [#36](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/36) | Adoption and citability | Remaining adoption work includes a clear external installation route, a clean-project package smoke test, DOI and citation metadata, and reducing the project's bus factor through maintenance policy and another person with commit rights. |
| [#37](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/37) | Related work and publication targets | The issue tracks related-work literature, a decision record comparing a custom extension with standard BPMN constructs, and publication venue research. Deadlines in the issue are not all verified. |

## Non-goals

These are not oversights or "not yet" items. They are boundaries the project keeps on purpose,
and they follow the scope recorded in the
[architecture documentation](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/tree/main/docs/arc42).

- **A BPMN editor or a process engine.** The host application supplies bpmn-js; this package is
  an extension to it, never a replacement for it.
- **Operating a terminology server.** Neither a SNOMED CT server nor a FHIR terminology server
  is shipped, hosted or operated here. Which server to use, and under which licence, is the
  adopting organisation's decision — see [configuration](/configuration/).
- **A proxy.** The package makes requests from wherever the host runs it. Whether those requests
  go to a CORS-enabled service directly or through a backend route the host owns is an
  integration decision; no proxy ships with the package and none is required by it.
- **Maintaining or redistributing licensed terminology content.** What is bundled and what is
  fetched at runtime is spelled out on the [support](/support/) page, and the difference matters
  legally.
- **A second extension namespace or an alternative persistence model.** Clinical semantics live
  in `mt:` elements under `bpmn:extensionElements` and nowhere else. BPMN core and BPMN-DI
  structures are never modified to carry clinical meaning.
- **Patient data, clinical workflow execution, or production hosting.** This is a research
  prototype. Only obviously synthetic clinical data belongs anywhere near it — in the
  repository, in an issue, or in a reproduction.

## How the roadmap changes

There is no release train and no planning cadence to point at. Work is picked up when the
project it serves needs it. The most effective way to move something up the list is to open an
issue that shows a concrete use of the extension and what it blocks — see
[support](/support/) for what makes a report actionable, and
[contributing](/contributing/) if you would like to send a change rather than a report.
