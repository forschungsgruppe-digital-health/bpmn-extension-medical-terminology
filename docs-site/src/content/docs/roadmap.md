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
This page lists what is *planned*. What is *currently missing or surprising* is documented on
the [properties panel](/properties-panel/) page (undo, editing in place, the integration trap)
and on the [compatibility](/compatibility/) page (bundler-only consumption, peer-dependency
ranges). Read those before filing an issue — several of the sharper edges are already known
and tracked.
:::

## Near-term themes

Five themes are in view. They are ordered by what blocks what, not by size, and none of them
has a settled design unless this page says so.

### 1. Make the package installable from a public registry

Today the package is published to GitHub Packages with private visibility, and it is not on
npmjs.com. An `npm install` by anyone outside the organisation fails with `E401 Unauthorized`.
Every other theme on this page is worth less until that is fixed, because nobody outside the
owning organisation can obtain the artefact at all.

The decision to make is *where*: npmjs.com, which is the ordinary route for bpmn.io modules,
or GitHub Packages switched to public visibility. Tracked in
[#36](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/36).

The same issue carries a second item that belongs with it: a continuous-integration smoke test
that installs the packed tarball into an empty project and imports it. That is the only check
that would have caught the current gap between what the package claims as its entry point and
what a consumer's toolchain can actually resolve. See
[compatibility](/compatibility/) for what resolves today and what does not.

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

Issue [#35](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/35)
can close after the changed descriptor and documentation are merged to `main`, Pages deploys,
and the public URI and machine-readable artifacts have been verified live.

### 4. Complete the annotation editing loop

The properties panel can add and remove annotations, but not edit one in place, and its add and
remove operations do not participate in the bpmn-js command stack in a way that undo can reverse.
In a clinical annotation tool that matters more than it sounds: correcting a wrong code means
deleting the annotation and retyping it, and a mis-click cannot be taken back with `Ctrl+Z`.

Two issues cover this. [#3](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/3)
asks for editing an existing annotation on a working copy, committed through the command stack
so that cancel and undo both behave, with the annotation's identifier staying stable. Its
acceptance criteria explicitly require undo and redo to restore the complete previous and
following state, which is the part that is missing today.
[#4](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/4)
covers the error-handling half: reusing the host's own validation and error mechanisms instead
of the panel keeping a parallel error display of its own, while preserving the structured
request-error information the adapters already produce.

See [properties panel](/properties-panel/) for exactly what the current behaviour is.

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
| [#1](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/1) | Internationalisation of the extension interface | Labels, placeholders, tooltips and error messages in the terminology UI are hard-coded English; only the group title currently goes through bpmn-js's `translate` service. The goal is that a host application can translate the whole surface, with today's English text as the fallback when no translation is supplied. The proposal is to reuse the existing `translate(template, replacements)` service rather than introduce a second, parallel language mechanism. Terminology *content* language and the `Accept-Language` of server requests stay a separate concern. |
| [#2](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/2) | Configure the annotatable BPMN element types | The set of element types that get the terminology group is fixed in a private `TARGET_TYPES` list (see [properties panel](/properties-panel/)); consumers cannot narrow or widen it. The issue proposes extending the existing properties configuration and the public type definitions, validating type names, and defining what an empty list means and how inheritance is handled — `is(element, 'bpmn:Task')` also matches specialised tasks. Annotations already present on elements that a configuration hides must survive load and save. Two decisions are open: type names only or predicate functions as well, and whether a configured list replaces or extends the defaults. |
| [#3](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/3) | Edit existing terminology annotations | Stored annotations can currently only be deleted and re-created, so a small correction means retyping the whole annotation. The issue asks for editing a working copy — text plus each coding's system, code, version and display — with changes applied on save through the bpmn-js command stack rather than by mutating the business object up front, so that cancel and undo both work. Open: whether the annotation identifier is editable (proposal: keep it stable), and what happens to unsaved changes when the selection moves to another element. |
| [#4](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/4) | Reuse the host application's error handling | The terminology UI manages its own search and form errors, which risks two competing error displays in a host application. The issue asks for the public mechanisms of the supported panel versions to be used instead — entry-level `validate`, `useError`, and `propertiesPanel.setErrors` are named as concrete entry points — while distinguishing field validation from asynchronous provider and network failures, since not every search failure is a model error. The structured request-error information must be preserved and not swallowed. Open: whether technical errors reach the host through an event or a callback. |
| [#16](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/16) | Unify the naming scheme in the dropdown | Package-backed and server-backed providers label themselves differently, and server names come from configuration rather than from the server's own metadata. The issue proposes a single documented label scheme covering both, fetching `CodeSystem` title and version by canonical URL where available, with a defined fallback chain (configured label, then canonical URI, then provider id) and no invented version when none is known. Metadata must be cached and loaded asynchronously so an offline or permission-restricted server cannot block search, and label metadata must never rewrite already-stored codings. |
| [#17](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/17) | Visualising annotated elements in the diagram | Nothing in the diagram currently shows which elements carry terminology annotations. The issue is a design decision first: badge, icon or marker versus a permanent short label versus details on selection or hover; bpmn-js overlays versus a custom SVG renderer, with the question of whether the indicator must survive an SVG export treated explicitly. It must cover zero, one and many annotations, stay correct across import, change, undo and removal, and remain reachable by keyboard and screen reader — hover alone is not sufficient. BPMN core and BPMN-DI must stay untouched. |
| [#34](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/34) | Connect and configure the MII terminology server | The extension offers generic FHIR providers but no documented, verified connection to the Medizininformatik-Initiative's terminology service. The issue notes that a base URL is not enough: read access requires a suitable client certificate, which a bearer header does not substitute for. The proposed route is mutual TLS through a backend the host operates, so the certificate and private key never reach the browser; direct browser use would additionally require the server to permit the browser origin through CORS, and this package ships no proxy. Code system and value set URIs and their versions are to be configured explicitly and checked against what the service actually offers. Automated tests must keep working from synthetic fixtures with no credentials. See [configuration](/configuration/) for the options this would build on. |
| [#35](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/35) | Namespace authority and the `/v1` versioning rule | The declared namespace authority is an unregistered domain, and a second public repository publishes an incompatible content model under the same URI and prefix. The issue asks for a decision record settling the authority, a namespace scheme for the whole extension family, the trigger and migration meaning of a `/v1` to `/v2` advance, and the resolution of the collision — and observes that if the URI is to change, doing it before there are external users is by far the cheapest option. |
| [#36](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/36) | Adoption and citability | Four things stand between the repository and outside use: the package cannot be installed by anyone outside the organisation, the namespace authority is unsettled (deferred to #35), there is no DOI and the citation metadata has drifted, and the project has a bus factor of one. The issue proposes a concrete order — citation metadata and DOI first because they depend on nothing else, then a public package plus an install-and-import smoke test, then the namespace decision, then a written maintenance policy and a second person with commit rights. |
| [#37](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/37) | Related work and publication targets | The repository currently cites no literature at all. The issue is a reading and positioning list covering prior work on binding terminology to process models, work on BPMN-to-FHIR transformation, and the methodological literature on BPMN extensions and their conformance — together with a table of possible publication venues. Its tasks are a related-work section, a decision record justifying a custom extension over the existing standard BPMN constructs, and a venue decision. It records that only one deadline in the table has been verified and the others are extrapolated. |

## Non-goals

These are not oversights or "not yet" items. They are boundaries the project keeps on purpose,
and they follow the scope recorded in the [architecture documentation](/architecture/).

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
  in `term:` elements under `bpmn:extensionElements` and nowhere else. BPMN core and BPMN-DI
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
