# Security Policy

> **Status: research prototype, under active development — not for production use.** These
> libraries are intended for **synthetic data only**;
> never send real patient data to this project or to its maintainers.

## Supported versions

This project is an actively developed research artefact. Only the latest published version of
the extension package (`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology`)
receives security fixes; there is no long-term-support branch. The private demo workspace
(`bpmn-medical-terminology-demo`) is not a published package and is out of scope for releases and
advisories.

## Reporting a vulnerability

Please report security issues **privately** — do **not** open a public issue for an unfixed
vulnerability.

- **Preferred:** open a private
  [GitHub security advisory](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/security/advisories/new)
  ("Report a vulnerability").
- The maintainers (TU Dresden / Forschungsgruppe Digital Health) aim to **acknowledge within 5
  working days** and to share an assessment and remediation plan within **30 days**.
- Include: affected package and version, a description, reproduction steps, and impact. Use **only
  synthetic data** in any reproduction.

## Scope

**In scope:** the publishable `extension` package, the moddle parse/serialize path,
and the build/release/CI
configuration (`.github/workflows/`, `release-please`).

**Out of scope:** the private demo app under `demo/`, documentation-only issues, and anything that would
require committing real patient data (prohibited — see below). General code-quality and lint findings
go through normal issues/PRs, not this process.

## Data handling

This is a healthcare-adjacent project. **Only synthetic clinical data with obviously artificial
content** may appear anywhere — in the repository, issues, pull requests, or reproductions. Never
commit or transmit real patient data or realistic clinical identifiers. See the hard rules in
[AGENTS.md](AGENTS.md).

## Supply chain

GitHub Actions are pinned to commit SHAs; production-dependency advisories are gated at `high` in CI
(`npm audit --omit=dev --audit-level=high`) and tracked via Dependabot. Releases publish to GitHub
Packages through the `release-please` workflow.

### Known audit finding: `hl7.fhir.r4.core` (GHSA-qg8x-2hq5-hwf3)

`npm audit` reports the critical advisory
[GHSA-qg8x-2hq5-hwf3](https://github.com/advisories/GHSA-qg8x-2hq5-hwf3), "Malicious code in
hl7.fhir.r4.core". It also flags every FHIR package that depends on it (`hl7.terminology.r4`,
`hl7.fhir.uv.extensions.r4`, `dvmd.kdl.r4` and `de.ihe-d.terminology`). This is a **registry name
collision**, not a compromised dependency:

- The advisory covers the unrelated package published under that name on the public npm registry.
- This repository never installs that package. `extension/package.json` declares
  `hl7.fhir.r4.core` as a tarball URL on the FHIR package registry
  (`https://packages.simplifier.net/hl7.fhir.r4.core/4.0.1`). `package-lock.json` pins that
  `resolved` URL together with its `integrity` hash.
- `npm audit` matches advisories by package name only, so it cannot tell the two sources apart.

The production audit gate in `validate.yml` removes exactly this finding before it enforces
`high`, and only when two conditions hold: the advisory is the package's only finding, and the
lockfile resolves the package from Simplifier. Do not "fix" the finding with `npm audit fix`, an
override, or a different source. Treat a changed `resolved` URL or `integrity` value for
`hl7.fhir.r4.core` as a real supply-chain incident. Consumers of the published package see the
same finding in their own audit. The same check applies to them: their lockfile must resolve
`hl7.fhir.r4.core` from `packages.simplifier.net`.
