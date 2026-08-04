---
name: dead-code-detector
description: Identify unused exports, dead modules, uncalled functions, and orphaned moddle types / properties-panel entries across the npm-workspaces ESM packages (terminology, fhir-mapping, demo). Use before refactoring or trimming a grown package. Detection only — reports candidates with confidence levels and a suggested action; never deletes or edits anything.
---

# dead-code-detector

> **Read-only skill.** Detection, not deletion. Never delete or modify any file,
> export, descriptor, or `package.json`. Your output is a report of candidates for
> **mandatory human review** — the decision is the maintainer's, not yours.

You find code that is no longer used in this monorepo: raw-ESM bpmn-js extension
libraries, plain JavaScript + JSDoc (no TypeScript), Vitest, moddle descriptors and
properties-panel providers. There is no build step for the libraries (`main` points
straight at `src/index.js`), so "reachability" is purely about ESM `import`/`export`
graphs, the `exports` map of each `package.json`, and the bpmn-js/moddle wiring — not
about a bundler's tree-shaking output.

## What counts as a use here (read before grepping)

A symbol is **live** if any of these reach it; treat each as a real reference even
when there is no static `import`:

- Re-exported from a package's `src/index.js` or named in its `package.json`
  `exports` map (e.g. `./moddle`, `./properties-panel`, `./providers/presets`). A
  subpath export is a **public entry point** — assume external consumers import it.
- Referenced by string from a moddle descriptor (`packages/*/src/moddle/*.json`):
  `name`, `superClass`, `type`, and `extends` values bind types/properties by name,
  not by import. A moddle type with no descriptor reference may still be data on
  existing `.bpmn` files — that is `term:`/`fhirmap:` extension content, not dead code.
- Registered into bpmn-js / properties-panel by convention rather than by direct call
  (a `*PropertiesProvider`, a module's `__init__`/`$inject`, a group/entry factory
  pulled in by the panel). Grep the `properties-panel/` dirs and `index.js` wiring
  before declaring an entry orphaned.
- Used only from `examples/` (vanilla, minimal) or from a `test/*.test.js` /
  `*.spec.js`. Test- or example-only usage means **not dead**, but flag it as
  "covered only by tests/examples" so a human can judge intent.

## Steps

Run from the repo root. Prefer the workspace graph over guesses.

- **Unused exports / dead modules (JS).** Build the import graph across
  `packages/*/src/**` and the `exports`/`main` entry points. Flag an exported symbol
  when no other module, no `index.js` re-export, no `exports` subpath, and no
  test/example imports it. Flag a `.js` file when nothing imports it and it is not an
  entry point. If `knip` or `ts-prune` is available you may run it, but verify each
  hit by hand — JSDoc-only JS confuses some tools.
- **Uncalled functions / unreachable branches.** Within a module, find top-level or
  exported functions with zero call sites in the workspace, tests, and examples.
- **Orphaned moddle types/properties.** For each type/property in
  `packages/*/src/moddle/*.json`, check whether it is referenced by another descriptor
  entry, by a properties-panel provider, by `examples/**/*.bpmn`, or by tests.
  Removing/renaming a moddle type or property is a **breaking (MAJOR)** change and
  needs human sign-off — never propose it as a quick cleanup.
- **Orphaned properties-panel entries.** Groups/entries defined but never returned by
  a provider, or providers never registered into a panel module.
- **Unused dependencies.** Compare each `packages/*/package.json` `dependencies` /
  `peerDependencies` against actual imports. `bpmn-js` / `bpmn-js-properties-panel`
  are **peers** — absence of a direct import does not make them unused.
- **Cross-package check.** terminology ↔ fhir-mapping ↔ demo: does an export consumed
  by another package still exist on both ends? Does `demo` (the Vue composables) reference
  terminology/fhir-mapping exports that were removed or renamed?

## Confidence levels

- **HIGH** — definitely unused: a non-exported local function with zero call sites; a
  `.js` module imported by nothing and not an entry point.
- **MEDIUM** — likely unused: exported but no `import`, no `index.js` re-export, no
  `exports` subpath, and no test/example reference found in the workspace.
- **LOW** — possibly unused: reachable only as a public API (named in `exports` /
  `index.js`) so an external `@forschungsgruppe-digital-health/*` consumer may import
  it; or a moddle type that may still exist as extension data on out-of-repo `.bpmn`
  files. Treat all LOW items as "keep unless the maintainer confirms".

## Output

Return the report **as your final message** (do not write a file unless explicitly
asked). For each candidate give: package + file path, symbol/type name, kind
(export / module / function / moddle type / panel entry / dependency), confidence,
the evidence (where you looked and found nothing), and a suggested action — e.g.
"delete after human review", "keep: named in `exports`", "keep: moddle data, breaking
to remove", "covered only by tests/examples". Group by confidence, HIGH first.

Then stop. Never delete, edit, or rename anything — including descriptors and
`package.json` files (`Edit`/`Write` are out of scope for this skill).

## Guardrails specific to this repo

- Healthcare/clinical context: any `.bpmn` you inspect must be **synthetic data only**
  (obviously artificial content). Never put real or realistic patient data — even as
  an example of "found content" — in your report.
- Moddle descriptor and `package.json` changes require human review; this skill only
  surfaces candidates, it does not act.
- Cross-reference the repo's own skills when a candidate touches their domain:
  `skills/moddle-extension-review` (moddle type/property changes),
  `skills/bpmn-naming-publishing` (`package.json` `exports`/entry points), and
  `skills/bpmn-conformance` (whether `.bpmn`/descriptor content is still valid). See
  `AGENTS.md` → "Agent skills" for the trigger/gate mapping.
