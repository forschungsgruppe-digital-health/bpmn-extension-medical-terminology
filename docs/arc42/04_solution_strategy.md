# 4. Solution Strategy

_Summarizes fundamental design decisions and strategies that form the cornerstones of the system architecture and shape its evolution._

## Design Decisions

**Monorepo with npm workspaces.** The two publishable packages (`terminology`, `fhir-mapping`) share a development lifecycle and are versioned together, but are published independently to GitHub Packages. A consumer that only needs terminology annotations does not pull in the FHIR mapping code, and vice versa. The private `demo` package (a Vue 3 wrapper) is optional and is not published.

**Separate XML namespaces.** Terminology annotations use the `term:` prefix (URI `https://clinical-bpmn.org/terminology/v1`) and FHIR mappings use the `fhirmap:` prefix (URI `https://clinical-bpmn.org/fhir-mapping/v1`). This keeps the two concerns decoupled in the BPMN XML and allows each layer to evolve independently.

**BPMN 2.0 extensionElements as the persistence mechanism.** Rather than inventing a sidecar format, both annotation layers use standard BPMN `extensionElements`. This means the annotated XML is still valid BPMN 2.0, can be opened in any compliant tool, and the annotations survive round-trip editing in tools that do not understand them.

**Provider/Adapter pattern for terminology access.** The `TerminologyProvider` interface defines a uniform contract (search, lookup, validate, getHierarchy). Concrete providers (`SnomedCtProvider`, `FhirProvider`, `StaticProvider`) implement this interface and optionally delegate to protocol-specific adapters (`SnowstormAdapter`, `FhirTerminologyAdapter`). This two-layer design means a new terminology system can often be added by configuring an existing adapter rather than writing an entirely new provider.

**Registry as a facade.** The `TerminologyRegistry` aggregates all providers and exposes `search`, `searchAll`, `lookup`, and `validate` as a single entry point. The properties panel depends on this abstraction, not on individual providers (Dependency Inversion Principle).

**No-build / raw-ESM publishing.** The packages ship their `src/` directly: each manifest declares `"type": "module"`, points `main` at `src/index.js`, and resolves every `exports` subpath to a file under `src/` (e.g. `./moddle` → `./src/moddle/*.json`). There is no compile or bundle step in the published artifact — consumers bring their own bundler and tree-shake what they import. This keeps the build surface minimal and the published code identical to the source.

**Deterministic conformance gate — the decision lives in the tool, never the model.** A single set of CLIs under `tools/` is the one authority on whether a change conforms, and it runs identically from the terminal, git hooks, VS Code tasks, and CI. The gate combines bpmnlint structural checks (blocking), a moddle roundtrip that fails on extension-data instability (blocking), XSD core validation (informational), and package-convention checks (blocking). Because the same tooling decides everywhere, conformance does not depend on which environment or which agent ran it.

**Conventional Commits + release-please as the release strategy.** Commits follow Conventional Commits; release-please maintains the release PR and creates per-component tags/releases (`include-component-in-tag: true`, e.g. `terminology-v0.1.0`), while the two publishable packages keep one linked version (`linked-versions` + `node-workspace`). Publishing is decoupled into `publish.yml` (triggered on release publication, idempotent); `release-please.yml` only maintains the PR and tags.

The rationale and trade-offs behind these strategies are logged as decisions in [chapter 9](09_architecture_decisions.md).

---

[← Architecture index](../ARCHITECTURE.md)
