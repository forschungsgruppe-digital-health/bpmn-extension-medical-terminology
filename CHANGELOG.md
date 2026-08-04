# Changelog

All notable repository-level and cross-cutting changes to this project are documented in
this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Monorepo note.** Per-package version history is authoritative and is generated
> automatically by [release-please](https://github.com/googleapis/release-please) in each
> package's own `CHANGELOG.md` under [`packages/`](packages/) once a release is cut. Tagged
> releases are also listed under
> [GitHub Releases](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/releases).
> This root changelog records repository-wide and cross-cutting changes (documentation,
> tooling, governance, repository structure) that are not tied to a single package version.

## [Unreleased]

### Added

- Root `CHANGELOG.md` (this file) and `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).

### Changed

- Consolidated the narrative documentation under [`docs/`](docs/) as the single point of
  truth — the arc42 architecture docs (`docs/ARCHITECTURE.md` + `docs/arc42/`) and
  the BPMN/bpmn.io extension primer (`docs/EXTENDING.md`). Only the conventional
  files remain at the repository root (`README.md`, `LICENSE`, `CONTRIBUTING.md`,
  `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`).
- The Vue 3 integration is now the private, unpublished
  `@forschungsgruppe-digital-health/demo` package (renamed from `vue`). The publishable
  packages are `@forschungsgruppe-digital-health/terminology` and
  `@forschungsgruppe-digital-health/fhir-mapping`.

[Unreleased]: https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/compare/v0.1.2...HEAD
