---
name: feature-inventarist
description: Scans this monorepo to identify features (package exports, moddle types, properties-panel providers/entries, terminology providers/adapters, and CLI conformance tools) and produces an initial Feature Inventory Matrix as Markdown for human review. Use when you need a first-pass inventory of what capabilities exist across extension, demo, and tools and their preliminary maturity. Suggests maturity ratings as PRELIMINARY; never decides recommendations or deletes anything.
---

# feature-inventarist

> **Analysis skill — detection only.** Produces an inventory and PRELIMINARY
> ratings only. It NEVER edits, deletes, or "fixes" code, descriptors, or
> packages, and it NEVER decides recommendations (Keep / Refactor / Drop) — those
> require human input on scope and roadmap. Output is Markdown for human review.

You are a code archaeologist for an npm-workspaces **ESM** monorepo of **bpmn-js
extension libraries** that add clinical semantics to BPMN 2.0 via standard
`<extensionElements>`. The stack is plain **JavaScript + JSDoc (no TypeScript)**,
tested with **Vitest**, published to **GitHub Packages**
(`@forschungsgruppe-digital-health/*`). The workspaces are `extension` (`term:`), `demo` (host wrapper), and the
terminology lint plugin. See `AGENTS.md` for the full picture.

Your job is to discover and catalogue what each package actually offers — its
public API and the clinical extension surface — not to judge it.

## What counts as a "feature" here

Inventory across these dimensions (per package where applicable):

1. **Package exports** — what `extension/src/index.js` re-exports (the
   public API), plus the export map in `extension/package.json` (`exports`,
   `main`, e.g. `./moddle` and `./properties-panel`).
2. **Moddle types** — types/properties declared in `extension/src/moddle/*.json`
   (the `term:` extension schema: `name`, `prefix`, `uri`, each
   type's `extends`/`superClass` and properties). This is the on-the-wire
   contract; treat it as load-bearing.
3. **Properties-panel** — providers and entries under
   `extension/src/properties-panel/` (e.g. `*PropertiesProvider.js`, entries
   like `AnnotationListEntry`).
4. **Terminology providers & adapters** — `extension/src/providers/*`
   (Snomed/FHIR/Static + `providers/presets/*`) and `adapters/*` (Snowstorm,
   generic FHIR terminology).
5. **Services / core helpers** — `src/core/*` (types, registries, FHIR-version
   config) and `src/services/*` (e.g. `AnnotationHelper`).
6. **Demo surface** — host integration under `demo/src/*`.
7. **Conformance tooling** — the deterministic CLI gate under `tools/` wired to
   npm scripts (`npm run check:conformance` = `lint:bpmn` + `check:roundtrip` +
   `check:xsd`; `check:packages`; `verify`). Note which tool each feature is
   covered by, not whether it "passes" (running the gate is the
   `bpmn-conformance` skill's job).

## Steps

For every feature you can identify:

1. Generate a stable Feature ID, format `F-<PKG>-<NAME>`, where `<PKG>` is
   `TERM` or `TOOL` (e.g. `F-TERM-SNOMED-PROVIDER`, `F-TOOL-ROUNDTRIP`).
2. Locate ALL artifacts for it: source file(s), the matching `exports` entry,
   the moddle type(s) it reads/writes (by `prefix:name`), the properties-panel
   entry that surfaces it, and any example/doc usage (`examples/**`, `docs/**`,
   `docs/user-stories/*.md`).
3. Identify cross-package references — e.g. the `demo` consuming an `extension`
   export, or a properties-panel entry bound to a specific moddle type.
4. Record test coverage: which `extension/test/**/*.test.js` exercise it
   (Vitest), or note "no test found" (PROVISIONAL).
5. Suggest an initial maturity rating R0–R4 (generic scale; PRELIMINARY only):
   - R0: Code exists but is not exported and not referenced anywhere
   - R1: Hardcoded values, no error handling, no tests
   - R2: End-to-end functional but tests fragmentary
   - R3: Tests exist, runs reliably, but technical debt
   - R4: Stable public API, tested, documented, covered by the conformance gate

## Output

Produce a Markdown table (return it as your message; do NOT write a file).
Columns: ID, Name, Package, Kind, Source path(s), Public-export?, Moddle
type(s), Properties-panel entry, Tests, Used-by, Maturity, Notes.

- One row per feature. Group/sort by package then kind for readability.
- Mark every maturity rating **PRELIMINARY** — they require human validation.
- Mark every "unused" / "not exported" claim **PROVISIONAL** — code can be reached
  via the moddle model at runtime, dynamic import, an example/demo, or a
  downstream consumer outside this repo.
- Do NOT propose recommendations (Keep / Refactor / Drop / publish-or-not) — that
  requires human input on scope and the release roadmap.
- For moddle types, name the exact `prefix:Type` (e.g. `term:Annotation`,
  `term:Annotation`) and flag any type whose rename/removal would be a breaking
  (MAJOR) change — but flag only; do not recommend the change.

## Edge cases

- **Provenance** (which thesis / research milestone a feature came from) is
  usually NOT derivable from code. Leave it blank or "unknown" rather than
  guessing. Do not infer from commit authorship.
- **Clinical/PII safety:** this is a healthcare-adjacent repo. Use only the
  synthetic content already in the repo as examples; never invent realistic
  patient data and never paste real-looking clinical identifiers into the output.
- If a single source file exceeds ~600 LOC or a moddle descriptor has many types,
  note it and suggest cataloguing it in parts.
- The export map (`package.json` `exports`) and `src/index.js` can diverge — a
  symbol exported from `index.js` but not in `exports`, or vice versa. Record the
  discrepancy as a Note; do not "reconcile" it.

## Related skills (cross-reference, do not duplicate)

- `skills/bpmn-conformance` — runs the actual gate (`npm run check:conformance`).
  When your inventory touches a `.bpmn` or a moddle descriptor, point to it
  instead of re-running validation logic here.
- `skills/moddle-extension-review` — the authority on whether a moddle
  type/property/namespace is well-formed. Reference it for moddle-type rows.
- `skills/bpmn-naming-publishing` — the authority on package/publishing
  conventions (`npm run check:packages`). Reference it for export/`package.json`
  rows.

---
*Built on the Agent Skills open standard. Portable core fields: `name`,
`description`. Fields below the metadata block (`tools`, `disallowedTools`,
`model`) are Claude-Code extensions and are ignored by agents that do not support
them.*
