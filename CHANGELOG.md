# Changelog

All notable repository-level and cross-cutting changes to this project are documented in
this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Monorepo note.** Per-package version history is authoritative and is generated
> automatically by [release-please](https://github.com/googleapis/release-please) in the
> extension package's own `CHANGELOG.md` once a release is cut. Tagged
> releases are also listed under
> [GitHub Releases](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/releases).
> This root changelog records repository-wide and cross-cutting changes (documentation,
> tooling, governance, repository structure) that are not tied to a single package version.

## [Unreleased]

### Added

- Root `CHANGELOG.md` (this file) and `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).

### Changed

- Removed the legacy `term:clinicalDomain` descriptor property and its
  properties-panel configuration; terminology semantics now consist only of
  annotations and codings under `bpmn:extensionElements`. This is a breaking
  descriptor/API change and requires a major release.
- Removed the obsolete public `ASPECTS`, `MODES`, and `TRANSFORMS` constants
  that belonged to the retired mapping model.
- Removed the deprecated `TerminologyRegistry.searchAll()` method; callers
  select a provider explicitly with `search(term, providerId)`.
- Bundled terminology defaults no longer depend on Vite's `import.meta.glob`;
  HL7 CodeSystems are generated as one static JSON resource and additional
  package discovery remains an explicit Vite/host integration.
- Consolidated the narrative documentation under [`docs/`](docs/) as the single point of
  truth — the arc42 architecture docs (`docs/ARCHITECTURE.md` + `docs/arc42/`) and the
  BPMN/bpmn.io extension primer (`docs/EXTENDING.md`). Only the conventional
  files remain at the repository root (`README.md`, `LICENSE`, `CONTRIBUTING.md`,
  `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`).
- The bpmn-js integration is now the private, unpublished `demo` workspace. The
  publishable package is `@forschungsgruppe-digital-health/terminology`.

[Unreleased]: https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/compare/terminology-v0.1.0...HEAD
