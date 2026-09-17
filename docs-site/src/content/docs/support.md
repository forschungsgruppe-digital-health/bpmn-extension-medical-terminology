---
title: Support
description: How to report a bug or a security issue, how to cite the project, what the licence situation is, and what response you can realistically expect.
---

This is a research prototype maintained by a small group at TU Dresden, Forschungsgruppe Digital
Health, as part of the MiHUB project. It is not a supported product, and this page tries to be
straight with you about what that means in practice — including where the documented support
routes do not currently work.

## Before you file anything

A few behaviours are known, documented and already tracked. Checking these first saves everyone
time:

- **`Ctrl+Z` does not undo adding or removing an annotation**, and an existing annotation cannot
  be edited in place. Both are described on the [properties panel](/properties-panel/) page and
  tracked on the [roadmap](/roadmap/).
- **The panel shows a terminology group but no search results.** This is almost always the
  integration trap: the properties-panel module was registered without the terminology module
  alongside it. Type a search term and the entry says so — "No terminology registry configured
  (demo without live provider)." — and the fix is on the [properties panel](/properties-panel/)
  page.
- **A plain Node `import` of the package fails.** The package is consumed through a bundler. This
  is structural, not a bug; see [compatibility](/compatibility/).
- **`npm install` fails with `E401 Unauthorized`.** The package is not on npmjs.com and its
  GitHub Packages visibility is private, so it cannot currently be installed from outside the
  owning organisation. Install from a checkout of the repository in the meantime. This is the
  first item on the [roadmap](/roadmap/).
- **Searches fail against a terminology server.** Check the error's `kind` first — see the
  checklist below. A redirect or a CORS rejection is a configuration problem at the server or the
  host, not a defect in the package; [configuration](/configuration/) covers the request routing.

## Reporting a bug

Open an issue in the
[issue tracker](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues).
That is the only public channel — GitHub Discussions is not enabled on the repository.

There is no issue template, so include these yourself. The first four are what make a report
reproducible; the rest usually decide whether it can be diagnosed at all.

- **Versions.** The version of this package, plus `bpmn-js`, `bpmn-js-properties-panel` and
  `@bpmn-io/properties-panel`. A surprising number of reports resolve to a peer-dependency range
  — see [compatibility](/compatibility/).
- **Your bundler and its version.** Vite, webpack, Rollup or esbuild, and whether you use the
  package's Vite plugin or the discovery CLI. See [discovery](/configuration/discovery/).
- **What you expected and what happened.** Separately, in that order.
- **A minimal reproduction.** The smallest BPMN XML that shows the problem, with the `term:`
  content included, and the smallest module and provider configuration that still reproduces it.
- **Your provider configuration**, with any base URLs, credentials or internal hostnames removed.
  Say *that* you use a FHIR server or a SNOMED CT server rather than *which* one, if the address
  is sensitive.
- **The console output**, including the whole error. Terminology request failures carry structured
  fields worth quoting explicitly: `error.kind` (one of `network`, `timeout`, `aborted`,
  `redirect`, `authorization`, `server`, `data`), `error.host` and, where the server answered,
  `error.status`. Those three fields usually identify the failure class immediately.

:::danger[Synthetic data only]
Use **only obviously synthetic clinical data** in a reproduction — invented names, invented
identifiers, invented codes. Never paste real patient data or realistic clinical identifiers into
an issue, a pull request or any message to the maintainers. This applies to screenshots as well as
to XML.
:::

Feature requests are welcome in the same tracker. The most persuasive ones describe the modelling
situation you are in and what the missing capability blocks, rather than proposing an API.

## Reporting a security issue

The repository's
[`SECURITY.md`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/SECURITY.md)
is the policy of record. Its substance:

- **Do not open a public issue for an unfixed vulnerability.**
- In scope: the publishable extension package, the moddle parse and serialise path, and the build,
  release and continuous-integration configuration.
- Out of scope: the private demo application, documentation-only problems, and anything that would
  require committing real patient data. General code-quality and lint findings go through ordinary
  issues and pull requests.
- The project is pre-1.0. Only the latest released `0.x` version receives security fixes; there is
  no long-term-support branch.
- The stated targets are acknowledgement within **5 working days** and an assessment with a
  remediation plan within **30 days**.

:::caution[The private reporting form is not currently enabled]
`SECURITY.md` asks you to open a private GitHub security advisory. That route is **not available
right now**: private vulnerability reporting is switched off for the repository, so the "Report a
vulnerability" form the policy links to cannot be used.

Until it is enabled, report privately by contacting the maintainers directly — through
[Forschungsgruppe Digital Health at TU Dresden](https://tu-dresden.de/bu/wirtschaft/winf/digital-health),
or via the maintainers' GitHub profiles linked from
[`CITATION.cff`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CITATION.cff).
Describe the issue, its impact and how to reproduce it, using synthetic data only. A maintainer
can then open the advisory from the repository side. Do not post the details in a public issue in
the meantime.
:::

On supply chain: GitHub Actions are pinned to commit hashes, and continuous integration fails on
any high or critical advisory in the shipped production dependencies. One known false positive is
filtered explicitly — an unrelated malicious npm package shares a name with a data-only FHIR
package this project obtains from Simplifier, and the filter applies only when the lockfile still
resolves that name to the Simplifier URL, because the audit tool cannot tell the two registries
apart.

## Code of conduct

The project adopts the Contributor Covenant 2.1; the full text is in
[`CODE_OF_CONDUCT.md`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CODE_OF_CONDUCT.md).
It applies to the repository, issues, pull requests and any other project channel, and to anyone
representing the project in public.

Reports go privately to the maintainers. Note that the code of conduct itself says a dedicated
reporting address has not yet been published; until one is, raise concerns privately with the
maintainers at TU Dresden, Forschungsgruppe Digital Health.

## Citing the project

Citation metadata lives in
[`CITATION.cff`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CITATION.cff),
with broader machine-readable metadata in
[`codemeta.json`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/codemeta.json).
The software is by Marcel Susky and Jost Hickmann (TU Dresden, Forschungsgruppe Digital Health),
licensed MIT, and the work is funded by the German Federal Ministry of Research, Technology and
Space under grant `01ZZ2506A` (MiHUB, 2026–2029).

:::caution[There is no DOI yet, and the citation file's version has drifted]
`CITATION.cff` carries no `doi:` field, and its `version` field still reads `0.1.0` while the
released version has moved well past that; `codemeta.json` carries no version at all. Until that
is fixed there is no archived, versioned identifier to cite.

In the meantime, cite the repository together with the **specific release tag** you used, for
example `terminology-v0.1.9`, and the date you retrieved it. A tag is at least resolvable and
immutable, which a bare repository URL is not.

Minting a concept DOI through Zenodo and recording it in both metadata files is a decided
near-term item — see the [roadmap](/roadmap/).
:::

## Licence and terminology content

### The code

MIT, © Technische Universität Dresden, Forschungsgruppe Digital Health. The full text is in
[`LICENSE`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/LICENSE).

One honest caveat: the published package's `files` list includes only `src` and `README.md`, so
the MIT licence text is **not currently inside the published tarball**. The licence applies
regardless — the repository states it, and the package manifest declares `"license": "MIT"` — but
if your organisation's review process reads licences out of installed packages, it will not find
one there.

### The bpmn.io watermark

bpmn-js is a peer dependency and is not distributed with this package. It is MIT-licensed with one
additional condition: the code rendering the bpmn.io watermark must not be removed or altered, and
the watermark must remain fully visible and unobstructed in any application that uses it. This
applies to the demo in this repository and to any application built on this extension. See
<https://bpmn.io/license/>.

### What terminology content actually ships

This distinction matters legally, so it is worth being precise. Two different things are going on.

**Bundled with the package.** A generated resource in the package source carries **897 FHIR
`CodeSystem` resources with roughly 20,000 concepts**, of which about 19,800 carry a `display`
and about 16,500 carry a `definition`. It is generated by `tools/generate-hl7-code-systems.mjs`
from the installed `hl7.terminology.r4` package (version 7.1.0, declared **CC0-1.0**), and a
drift guard in continuous integration fails the build if the generated file and the dependency
disagree. Alongside it, three further code systems are imported directly from the package's own
dependencies and are therefore part of what a consumer's bundler pulls in:

| Content | Source package | Concepts |
|---|---|---|
| HL7 Terminology (THO) code systems | `hl7.terminology.r4` 7.1.0 (CC0-1.0) | ~20,000 across 897 code systems |
| IHE-D XDS `classCode` | `de.ihe-d.terminology` 3.0.1 | 15 |
| IHE-D XDS `typeCode` | `de.ihe-d.terminology` 3.0.1 | 38 |
| KDL, the German clinical document class list | `dvmd.kdl.r4` 2025.0.1 | 557 |

So the package **does** ship display names and definitions — for these code systems. The README's
statement that the extension "ships no SNOMED CT, LOINC or ICD-10 content — no display names,
descriptions, hierarchies or excerpts" is true as written, because it is about those three
terminologies specifically; read as a claim about the package as a whole it would be wrong.

A caution on the last three rows: the `hl7.terminology.r4` package declares CC0-1.0 in its
manifest, but the `de.ihe-d.terminology` and `dvmd.kdl.r4` packages declare **no SPDX licence
field**, and the KDL code system carries a DVMD copyright statement. They are openly distributed
FHIR packages, but if you redistribute an application containing them, check the publishers'
terms yourself rather than relying on this page.

**Fetched at runtime, not shipped.** The package contains **no SNOMED CT, LOINC, ICD-10-GM, OPS
or ATC content** — no codes, no display names, no descriptions, no hierarchies, no excerpts. For
those terminologies it stores only the system identifier and the code you selected, and it
retrieves everything else at runtime from a terminology server **you configure and you license**.
Using them therefore requires the respective publishers' licences: an Affiliate Licence via
BfArM/MLDS for SNOMED CT, the LOINC Copyright Notice and Licence for LOINC, and the BfArM terms
of use for ICD-10-GM. This project neither operates such a server nor grants any right to the
content it serves. [Configuration](/configuration/) covers how to point the extension at your own.

## Maintenance and what to expect

- **Who maintains it.** Marcel Susky, with Jost Hickmann as a contributor, at TU Dresden,
  Forschungsgruppe Digital Health.
- **Response times.** The only stated targets are the security ones above: acknowledgement within
  5 working days, assessment within 30. For ordinary issues and pull requests there is no service
  level, and there would be no point pretending otherwise — a single maintainer on a funded
  research project answers when the project allows. Expect days rather than hours, and expect it
  to depend on the time of year.
- **Supported versions.** Pre-1.0. Only the latest released `0.x` gets fixes; there is no
  long-term-support branch, and breaking changes are possible between minor versions while the
  version stays below 1.0.
- **Bus factor.** The overwhelming majority of commits come from one person. The project knows
  this and tracks it, together with the countermeasures — a second person with commit rights, a
  written maintenance policy, and anchoring the artefact in a context that outlives an individual
  post. See the [roadmap](/roadmap/).
- **Not for production.** The repository describes itself as a research prototype under active
  development, intended for synthetic data only. Treat it accordingly.

If you want to help rather than report, [contributing](/contributing/) has the setup, the quality
gates and the review conventions.
