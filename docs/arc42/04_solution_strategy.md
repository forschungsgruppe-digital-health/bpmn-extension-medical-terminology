# 4. Solution Strategy

_Summarizes the fundamental design decisions and strategies that shape the
extension and its evolution._

## Design decisions

**One publishable extension package.** The repository keeps the published
terminology implementation in `extension/`, with the bpmn-js demo and the
terminology lint plugin as private/supporting workspaces. This keeps the
consumer-facing API focused on one package:
`@forschungsgruppe-digital-health/terminology`.

**A stable, dedicated XML namespace.** The descriptor uses the `term:` prefix
and URI `https://clinical-bpmn.org/terminology/v1`. The namespace is a format
contract, not a release counter. Ordinary package releases must not silently
change it because existing diagrams depend on the URI.

**BPMN `extensionElements` as the persistence mechanism.** Terminology data is
stored in standard BPMN `extensionElements`. This preserves BPMN core structure
and gives tools that understand the descriptor typed objects a safe place to
edit.

**Provider and adapter separation.** `TerminologyProvider` exposes the
application-facing contract. `SnomedCtProvider` and `FhirProvider` implement
that contract and delegate transport details to `SnowstormAdapter` and
`FhirTerminologyAdapter`. `StaticProvider` and `FallbackProvider` cover local
and package-backed data. New terminology systems can be added without changing
the registry.

**Registry as a facade.** `TerminologyRegistry` manages provider identity,
lookup, registration events, search, lookup, validation, and cross-provider
search. The properties panel and integrator code depend on this abstraction
rather than on one server implementation.

**FHIR CodeSystem resources as terminology data.** Bundled or discovered FHIR
packages contribute `CodeSystem` JSON resources. The extension converts their
concepts into static providers, preserves each concrete `CodeSystem.url` in
returned codings, and can optionally fall back to a live FHIR terminology
server. This is a terminology-provider mechanism, not a second BPMN data model.

**Raw ESM publishing.** The package publishes `src/` directly, with JSON and
subpath exports declared in `extension/package.json`. There is no library
transpile or bundle step; the demo is the buildable application.

**Deterministic conformance.** The verdict lives in the tools: BPMN linting,
moddle roundtrip, generated-schema drift, extension schema checks, core-XSD
validation, and package conventions are wired to npm scripts and CI. This
avoids different architectural decisions being made by different agents or
environments.

**Conventional Commits and Release Please.** Release Please maintains the
release PR and updates the package, lint plugin, descriptor version, and XSD.
Publishing is handled independently by `publish.yml` when a GitHub Release is
published. The rationale for versioning is recorded in
[ADR-0001](../adr/0001-versioning-and-release-please.md); bundled defaults are
recorded in [ADR-0002](../adr/0002-bundled-terminology-defaults.md).

These strategies are summarized in [chapter 9](09_architecture_decisions.md)
and in the repository [ADR directory](../adr/).

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](03_context_and_scope.md) · [Next →](05_building_block_view.md)
