# Security Policy

> **Status: research prototype, under active development — not for production use.** These
> libraries are intended for **synthetic data only**;
> never send real patient data to this project or to its maintainers.

## Supported versions

This project is pre-1.0 (`0.x`). Only the latest released `0.x` version of each published package
(`@forschungsgruppe-digital-health/terminology`) receives security fixes;
there is no long-term-support branch yet. The `@forschungsgruppe-digital-health/demo` package is
private/unpublished and is out of scope for releases and advisories.

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
