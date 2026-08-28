---
name: arc42-generator
description: Derives an arc42 architecture documentation skeleton from the current bpmn-js terminology repository. Fills only claims supported by current code, manifests, descriptors, tooling, and docs.
---

# arc42-generator

Generate or refresh the official arc42 12-section documentation for this
repository. The current layout is one Markdown file per chapter under
`docs/arc42/`, indexed by `docs/ARCHITECTURE.md`.

## Evidence and scope

Use only current repository evidence:

- `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, and
  `docs/adr/`
- root, `extension/`, and `demo/` package manifests
- `extension/src/moddle/clinical.json`
- `extension/src/` providers, adapters, services, properties-panel modules, and
  Vite plugin
- `tools/`, `.githooks/`, and `.github/workflows/`
- `schema/`, `examples/valid/`, and `examples/invalid/`

This repository has one published package,
`@forschungsgruppe-digital-health/terminology`, a private `demo/` workspace,
and the terminology lint plugin workspace under
`extension/lint/bpmnlint-plugin-terminology`. It has one `term:` namespace:
`https://clinical-bpmn.org/terminology/v1`.

FHIR terminology servers and FHIR `CodeSystem` resources are valid current
concepts: document `FhirProvider`, `FhirTerminologyAdapter`, package-backed
CodeSystems, and the Vite discovery path. Do not invent removed legacy
packages, namespaces, UI layers, or old example paths.

## No speculation

When a claim is not derivable, write:

```text
> ⚠️ HUMAN INPUT REQUIRED — not derivable from current repository evidence.
```

Mark code-derived prose as draft requiring verification and cite its source
file. Do not invent goals, stakeholders, infrastructure, service levels,
regulatory classifications, or rationale that is not written down.

## Current arc42 sections

1. Introduction and Goals
2. Architecture Constraints
3. Context and Scope
4. Solution Strategy
5. Building Block View
6. Runtime View
7. Deployment View
8. Crosscutting Concepts
9. Architecture Decisions
10. Quality Requirements
11. Risks and Technical Debt
12. Glossary

Use the existing filenames and `# N. Title` headings. Refresh in place; do not
overwrite documented material merely to restyle it. Chapter 9 links to the
formal accepted ADRs in `docs/adr/`:

- `docs/adr/0001-versioning-and-release-please.md`
- `docs/adr/0002-bundled-terminology-defaults.md`

## Current architecture facts

- Clinical semantics are stored only as `term:` content under BPMN
  `extensionElements`; BPMN core and BPMN-DI are not changed.
- The moddle descriptor declares `Annotations`, `Annotation`, and `Coding`;
  use the actual properties in
  `extension/src/moddle/clinical.json`.
- Provider building blocks are `TerminologyProvider`, `TerminologyRegistry`,
  `SnomedCtProvider`, `FhirProvider`, `StaticProvider`, `FallbackProvider`,
  Snowstorm/FHIR adapters, package presets, and package discovery.
- The default configuration covers SNOMED, FHIR-hosted systems, and bundled
  package-backed terminology. Preserve the distinction between a FHIR
  terminology provider and the BPMN annotation model.
- The properties-panel integration is under
  `extension/src/properties-panel/`; the private integration app is under
  `demo/`.
- The conformance commands are `lint:bpmn`, `check:roundtrip`, `xsd:gen:check`,
  `xsd:ext`, `check:xsd`, and `check:packages`, aggregated by
  `check:conformance` and `verify`.
- The published package is raw ESM and targets Node.js `>=22` for repository
  tooling. There is no library build step; the demo is built with Vite.
- Distribution is GitHub Packages for the extension and GitHub Pages for the
  demo. There is no Docker, Kubernetes, database, or application server here.

## Output requirements

For refresh mode, keep one file per section under `docs/arc42/` and keep the
index links in `docs/ARCHITECTURE.md` correct. Add a provenance note to files
created or substantially filled:

```text
Updated from current repository evidence. Code-derived claims require
verification; unresolved decisions are marked HUMAN INPUT REQUIRED.
```

Prefer Mermaid diagrams for context, building blocks, and distribution. Never
copy real or realistic patient data into architecture documentation.

## Related checks

- `skills/bpmn-conformance/SKILL.md`
- `skills/moddle-extension-review/SKILL.md`
- `skills/bpmn-naming-publishing/SKILL.md`

The architecture generator documents and cites these checks; it does not
modify source code, descriptors, package manifests, fixtures, or tools.
