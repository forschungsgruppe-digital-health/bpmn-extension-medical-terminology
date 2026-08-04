---
name: test-generator
description: Write Vitest characterization tests that pin the CURRENT behavior of a bpmn-js extension module (providers, registries, moddle/properties-panel glue, mapping helpers) before refactoring it. Use before any non-trivial refactor in packages/terminology, packages/fhir-mapping, or packages/demo. Detection/analysis only — captures behavior as tests; never "fixes" observed bugs and never edits the code under test.
---

# Characterization tests before a refactor

Before refactoring legacy or grown code, pin its **CURRENT** behavior in tests —
not the ideal behavior. The tests are a safety net for the refactor, so they must
faithfully encode what the code does today, including quirks.

This is an **analysis-only** task. You add tests; you do **not** change the module
under test, and you do **not** "fix" bugs you notice. A green run after the refactor
is the only signal that the refactor preserved behavior.

## Where things live (this repo)

ESM monorepo, plain JavaScript + JSDoc (no TypeScript), tested with **Vitest**
(`vitest run` per package; `npm test` runs all workspaces). Tests sit under
`packages/<pkg>/test/**`, mirroring `packages/<pkg>/src/**`, and import the unit
under test by relative path (e.g. `../../src/providers/StaticProvider.js`).

Typical units you will characterize:

- **terminology** — `core/TerminologyRegistry`, `core/TerminologyProvider`,
  `providers/*` (StaticProvider, FhirProvider, SnomedCtProvider, presets),
  `adapters/*` (FhirTerminologyAdapter, SnowstormAdapter),
  `services/AnnotationHelper`.
- **fhir-mapping** — `services/MappingHelper`, `core/types`, the `fhirmap:` glue.
- **moddle + properties-panel** — `src/moddle/*.json` descriptors and the
  `properties-panel/` providers/entries that read and write the `<extensionElements>`
  (`term:` / `fhirmap:`) onto BPMN business objects.

## Approach

1. **Read the module** and identify its public entry points (exported classes/
   functions, the methods the rest of the codebase calls). Skim the existing
   `test/` neighbor for the file to match style and reuse helpers/fixtures.
2. **Exercise it with representative inputs.** Reuse existing synthetic fixtures /
   sample concept lists from sibling tests rather than inventing new shapes. For
   moddle/properties-panel code, drive it the way the panel does: build (or load)
   a business object, run the read/write path, and assert on the resulting
   `extensionElements` values.
3. **Capture outputs verbatim** — warts and all. Pin exact return values, thrown
   errors, ordering, and edge cases (empty input, missing system/code, async
   resolution/rejection). Async providers return Promises — `await` them.
4. **Write the tests** with Vitest (`describe`/`it`/`expect`, `async` where the
   unit is async). One behavior per `it`; name each test after the behavior it pins.
5. **Run until green:** `npm test --workspace=packages/<pkg>` (or `vitest run` in
   the package). Only once green is the module safe to hand back for refactoring.

## Hard guardrails

- **Never edit the code under test.** This skill only adds test files.
- **Never "fix" an observed bug inside a characterization test.** If behavior looks
  wrong, encode the *current* behavior and add a `// FIXME(characterization):`
  comment describing the suspected defect. Fixing it is a separate, reviewed change.
- **Synthetic data only.** Use obviously artificial codes/displays/systems (e.g.
  `http://example.com/cs`, `Max Mustermann-Testpatient`). Never put real patient
  data — even realistic-looking synthetic data — in a test or fixture (PII
  sensitivity; clinical domain).
- **Coverage is monotonic** — adding characterization tests must not drop existing
  coverage; do not delete or weaken existing tests.

## After the tests are green

If the change touches a moddle descriptor (`packages/*/src/moddle/*.json`) or any
`.bpmn`, the conformance gate is the other half of the safety net — run it and read
its report (`skills/bpmn-conformance/SKILL.md`):

```bash
npm run check:conformance      # bpmnlint + moddle roundtrip + XSD core
npm run verify                 # check:packages + check:conformance + all tests
```

For descriptor-shape questions see `skills/moddle-extension-review/SKILL.md`; for a
package's publish surface see `skills/bpmn-naming-publishing/SKILL.md`. Repo
conventions and the full gate are in `AGENTS.md`. A moddle change that renames or
removes a type/property is breaking and needs human sign-off — characterization
tests do not authorize it.
