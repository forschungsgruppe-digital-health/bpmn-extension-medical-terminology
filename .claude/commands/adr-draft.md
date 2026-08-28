---
description: Draft an ADR for a proposed architectural decision
allowed-tools: Read, Write, Grep, Glob
---

# ADR Draft: $ARGUMENTS

Draft an Architecture Decision Record for: $ARGUMENTS

This repository records formal decisions as numbered Markdown files in
`docs/adr/`. The arc42 chapter
[`docs/arc42/09_architecture_decisions.md`](../../docs/arc42/09_architecture_decisions.md)
indexes accepted ADRs. Do not append new decisions to an arc42 chapter and do
not invent another directory.

1. Read `docs/adr/TEMPLATE.md`, the relevant existing ADRs, and
   `docs/arc42/04_solution_strategy.md`.
2. Number the new file sequentially using the highest existing
   `docs/adr/NNNN-*.md` number.
3. Write a self-contained English ADR with status **proposed**, context,
   decision, alternatives, consequences, and links to affected code/docs.
4. Cite current repository facts: the single published `extension/` package,
   private `demo/`, `term:` namespace, FHIR terminology providers and
   CodeSystem resources, raw ESM, Vitest, deterministic conformance scripts,
   and GitHub Packages workflows as relevant.
5. If the decision touches a moddle descriptor, BPMN conformance, or publishing,
   link the corresponding skill:
   `skills/moddle-extension-review/SKILL.md`,
   `skills/bpmn-conformance/SKILL.md`, or
   `skills/bpmn-naming-publishing/SKILL.md`.
6. Link the new ADR from `docs/arc42/09_architecture_decisions.md` when the
   decision is accepted; do not mark it accepted yourself.

Guardrails:

- Do not change source code, descriptors, package manifests, fixtures, or tools
  while drafting.
- A renamed or removed moddle type/property is a breaking MAJOR change and
  requires maintainer sign-off.
- Clinical examples must be synthetic only; never include real or realistic
  patient data.
