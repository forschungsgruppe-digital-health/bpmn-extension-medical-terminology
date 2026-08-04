---
description: Draft an ADR for a proposed architectural decision
allowed-tools: Read, Write, Grep, Glob
---

# ADR Draft: $ARGUMENTS

Draft an Architecture Decision Record for: $ARGUMENTS

This repo records design decisions inside the arc42 docs under `docs/arc42/`, not
in a separate `docs/adr/` tree. Decision rationale currently lives in
`docs/arc42/04_solution_strategy.md`; formal ADRs are collected in
`docs/arc42/09_architecture_decisions.md` (see its header note). Add the new ADR
as a self-contained section appended to that file — do not invent a new directory or
template that the repo does not have.

1. Read `docs/arc42/09_architecture_decisions.md` and `docs/arc42/04_solution_strategy.md`
   first, to match existing tone and avoid duplicating a decision already captured in
   the solution strategy.
2. Number the ADR sequentially: scan `docs/arc42/09_architecture_decisions.md` for the
   highest existing `ADR-NNNN` heading and use the next one (start at `ADR-0001` if none).
3. Append a new section to `docs/arc42/09_architecture_decisions.md` with this structure:
   - **Title:** `## ADR-NNNN — <decision> [PROPOSED]`
   - **Context:** why this decision is needed now (what in the codebase or constraints
     forces it). Reference concrete repo facts where relevant: npm-workspaces ESM monorepo
     (`packages/terminology`, `packages/fhir-mapping`, `packages/demo`), plain JS + JSDoc
     (no TypeScript), Vitest, moddle descriptors (`packages/*/src/moddle/*.json`) +
     properties-panel providers, GitHub Packages publishing under
     `@forschungsgruppe-digital-health`, the deterministic conformance gate
     (`npm run check:conformance` / `check:packages` / `verify`) and git hooks.
   - **Options considered:** minimum 3, each with pros/cons.
   - **Decision:** the chosen option, marked **[PROPOSED]**.
   - **Consequences:** positive and negative, including impact on the conformance gate,
     moddle namespaces/prefixes (`term:`, `fhirmap:`), publishing/versioning (a renamed or
     removed moddle type/property is a breaking MAJOR change), and backward compatibility
     of serialized BPMN extension data.
4. Cross-link related material: the relevant arc42 section(s) under `docs/arc42/`,
   `AGENTS.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, affected `packages/*`, moddle
   descriptors, and any prior `ADR-NNNN` in the same file.
5. If the decision touches a moddle descriptor, BPMN conformance, or package/publishing
   conventions, cross-reference the matching repo skill so reviewers run the right gate:
   `skills/moddle-extension-review/SKILL.md`, `skills/bpmn-conformance/SKILL.md`, or
   `skills/bpmn-naming-publishing/SKILL.md`.
6. Output: a PR-ready ADR section, English, ready for human review.

Guardrails:
- Detection/drafting only. Do NOT change code, moddle descriptors, package configs, or the
  conformance tooling — propose, do not implement.
- Mark the decision **[PROPOSED]** only. Never mark it **[ACCEPTED]**; acceptance is a
  human decision. Moddle/descriptor and breaking-change decisions in particular require
  human sign-off (see AGENTS.md "Hard rules").
- Healthcare/clinical context: synthetic data only, PII-sensitive. Never put real patient
  data in the ADR or in any example it cites.
