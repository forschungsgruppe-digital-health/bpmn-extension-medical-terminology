---
description: Re-run feature inventarization across the workspaces, diff against the previous snapshot, report new/changed/removed features.
allowed-tools: Task, Read, Grep, Glob, Write, Bash
---

# Inventory Update

> **Detection / analysis only.** This command re-runs the inventory and records a
> diff. It NEVER deletes a row and NEVER decides recommendations
> (Keep / Refactor / Drop / publish-or-not) — those need human input on scope and
> the release roadmap. New rows land as `[PROPOSED]`; the snapshot and every
> maturity rating require human review before they are trusted. It does not edit
> source, moddle descriptors, or `package.json`.

Scope: the npm-workspaces ESM monorepo of bpmn-js extension libraries —
`packages/terminology` (`term:`), `packages/fhir-mapping` (`fhirmap:`) and
`packages/demo`, plus the conformance tooling under `tools/`. Plain JS + JSDoc
(no TypeScript), Vitest. See `AGENTS.md`.

## Steps

1. Read the previous snapshot `feature-inventory.md` (if it exists). This is
   the only committed inventory artifact; if it is absent, treat this as the
   first run (no diff — everything is new).
2. Launch the `feature-inventarist` subagent for a full repository scan. It
   returns a Feature Inventory Matrix as a Markdown message (it does not write a
   file) using stable Feature IDs of the form `F-<PKG>-<NAME>` where `<PKG>` is
   `TERM`, `FHIRMAP`, `VUE`, or `TOOL` (e.g. `F-TERM-SNOMED-PROVIDER`,
   `F-FHIRMAP-MODDLE`, `F-VUE-USE-TERMINOLOGY`, `F-TOOL-ROUNDTRIP`).
3. Diff the new scan against the previous snapshot by Feature ID: which features
   are new, changed, or removed?
4. For **NEW** features: add as `[PROPOSED]` rows (preliminary maturity only).
5. For **CHANGED** features — e.g. source path moved, a moddle type or property
   renamed (`prefix:Type`), an `exports` entry / `src/index.js` re-export changed,
   a properties-panel provider/entry moved, or test coverage changed: flag for
   review with an old/new comparison. If a change renames or removes a moddle
   type or property, mark it as a potential **breaking (MAJOR)** change — flag
   only; do not recommend the change (the descriptor needs human sign-off).
6. For **REMOVED** features: mark with `Status: removed YYYY-MM-DD` (do NOT delete
   the row — keep the history). A symbol may still be reachable via the moddle
   model at runtime, a dynamic import, an example, or a downstream consumer, so
   treat removal as PROVISIONAL.
7. Update the statistics block at the end of the document (counts per package and
   per kind: package exports, moddle types, properties-panel entries, terminology
   providers/adapters, Vue composables, conformance tools).
8. Write the updated matrix to `feature-inventory.md` and commit with
   `chore(inventory): update feature inventory for {date}`.

## Guardrails

- **Synthetic data only.** This is a healthcare-adjacent repo (PII-sensitive). Use
  only the synthetic content already in the repo as examples; never invent
  realistic patient data or paste real-looking clinical identifiers into the
  snapshot.
- Mark every maturity rating **PRELIMINARY** (R0–R4 is a generic scale, not a
  release gate). Mark every "unused" / "not exported" claim **PROVISIONAL**.
- Do not "reconcile" a divergence between `package.json` `exports` and
  `src/index.js` — record it as a Note.

## Related skills (cross-reference, do not duplicate)

- `skills/bpmn-conformance` — runs the actual gate (`npm run check:conformance`).
  Point the inventory at it for any `.bpmn` or moddle-descriptor row instead of
  re-running validation here.
- `skills/moddle-extension-review` — the authority on whether a moddle
  type/property/namespace is well-formed; reference it for moddle-type rows.
- `skills/bpmn-naming-publishing` — the authority on package/publishing
  conventions (`npm run check:packages`); reference it for export / `package.json`
  rows.
