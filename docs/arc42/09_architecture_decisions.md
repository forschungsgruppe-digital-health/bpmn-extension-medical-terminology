# 9. Architecture Decisions

_Documents important decisions and links to their authoritative rationale._

Formal decisions are maintained in the repository's [`docs/adr/`](../adr/)
directory. This chapter is the arc42 decision index; it does not replace the
ADRs.

## Accepted ADRs

| ADR | Decision | Scope |
|---|---|---|
| [ADR-0001](../adr/0001-versioning-and-release-please.md) | Keep one release SemVer across extension artifacts while leaving the `term:` namespace URI stable | Release automation, descriptor compatibility, generated XSD |
| [ADR-0002](../adr/0002-bundled-terminology-defaults.md) | Bundle default FHIR terminology packages as runtime dependencies and expose their providers without mandatory consumer discovery setup | Default service configuration and package-backed CodeSystems |

## Decision log

The following decisions are evidenced by the current code and configuration;
their rationale is summarized in [chapter 4](04_solution_strategy.md).

| ID | Decision | Evidence |
|---|---|---|
| D1 | Persist terminology annotations in standard BPMN `extensionElements` under `term:` | `AGENTS.md`; `extension/src/moddle/clinical.json` |
| D2 | Keep the namespace URI `https://clinical-bpmn.org/terminology/v1` stable across ordinary package releases | `clinical.json`; ADR-0001 |
| D3 | Publish one raw-ESM package, with the demo and lint plugin as supporting workspaces | root and `extension/package.json`; `release-please-config.json` |
| D4 | Separate provider contracts from protocol-specific adapters | `extension/src/core/`, `src/providers/`, `src/adapters/` |
| D5 | Aggregate providers behind `TerminologyRegistry` | `extension/src/core/TerminologyRegistry.js` |
| D6 | Treat FHIR `CodeSystem` JSON resources as package-backed terminology data | `src/services/CodeSystemProviderFactory.js`; `src/services/PackageProviderDiscovery.js` |
| D7 | Provide SNOMED, FHIR, static, fallback, and package-backed provider paths | `src/providers/`; `src/config/terminology-config.js` |
| D8 | Run deterministic lint, roundtrip, schema, package, and test gates | root `package.json`; `tools/`; `.githooks/`; `.github/workflows/` |
| D9 | Publish to GitHub Packages on a published GitHub Release, independently of release-please execution | `.github/workflows/publish.yml`; `.github/workflows/release-please.yml` |

## Recording future decisions

New significant decisions should be added as numbered files under
[`docs/adr/`](../adr/) using [`TEMPLATE.md`](../adr/TEMPLATE.md), then linked
from this chapter when accepted. A change that renames or removes a descriptor
type or property requires maintainer sign-off and the conformance/moddle review
workflow.

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](08_crosscutting_concepts.md) · [Next →](10_quality_requirements.md)
