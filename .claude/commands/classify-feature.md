---
description: Classify a single feature: read code, propose maturity, dependencies, and a Feature Inventory row for human review.
allowed-tools: Read, Grep, Glob, Bash
---

# Classify Feature: $ARGUMENTS

> **Analysis only — detection, never mutation.** This command reads code and
> proposes a classification. It NEVER edits, deletes, renames, or "fixes" source,
> moddle descriptors, or `package.json`, and it NEVER decides a recommendation
> (Keep / Refactor / Drop / publish-or-not) — those require human input on scope
> and the release roadmap. Output is Markdown returned as your message for human
> review. Do not write a file.

Argument format: a path or a Feature ID, e.g. `extension/src/providers` or
`F-TERM-SNOMED-PROVIDER`. Feature ID format is `F-<PKG>-<NAME>` where `<PKG>` is
`TERM` or `TOOL`. Mirror the `feature-inventarist` skill so a single
classification slots straight into a full inventory.

This is an npm-workspaces **ESM** monorepo of **bpmn-js extension libraries**
(`extension` → `term:`, `demo` → host wrapper). Plain **JavaScript + JSDoc, no TypeScript**;
tested with **Vitest**; clinical data lives only in BPMN `<extensionElements>`
under the custom prefix. See `AGENTS.md`.

1. **Locate** every artifact for this feature across the dimensions that count here:
   - Source file(s) under `extension/src/**` and `demo/src/**` (and `tools/**` for
     `TOOL` features).
   - The matching entry in `src/index.js` re-exports and the `exports` map in
     `extension/package.json` (`./moddle`, `./properties-panel`,
     …). Note any divergence between the two as a finding;
     do not reconcile it.
   - The moddle type(s) it reads/writes, by exact `term:Type`
     (`extension/src/moddle/*.json`, e.g. `term:Annotation`).
   - The properties-panel provider/entry that surfaces it
     (`extension/src/properties-panel/**`, e.g. `*PropertiesProvider.js`,
       `AnnotationListEntry`).
   - Example/doc usage: `examples/**`, `docs/**`.

2. **Analyze maturity:**
   - Run the relevant Vitest specs if any exist (`extension/test/**/*.test.js`)
     and report what is covered; if none, mark coverage `no test found` (PROVISIONAL).
   - Look for TODO/FIXME, hardcoded values (URLs, terminology codes, FHIR
     versions), and missing error handling.
   - Check in-code documentation (JSDoc on the public surface).
   - For a `.bpmn` or a moddle descriptor, do NOT re-implement validation — defer
     to `skills/bpmn-conformance` (`npm run check:conformance`) and report which
     layer (bpmnlint / roundtrip / XSD) covers it, not a pass/fail you invented.

3. **Identify dependencies:**
   - Other features/exports called by this one (intra- and cross-package, e.g. a
     `demo` consuming an `extension` export).
   - External surfaces: terminology adapters (Snowstorm / generic FHIR terminology
     servers), the moddle namespace/prefix it binds to, peer dependencies
     (`bpmn-js`, `@bpmn-io/properties-panel`, Vue).
   - The conformance tool that covers it (`lint:bpmn` / `check:roundtrip` /
     `check:xsd` / `check:packages`), per the quality gate in `AGENTS.md`.

4. **Propose (PRELIMINARY — generic R0–R4 scale, requires human validation):**
   - A maturity rating with reasoning. R0: exists but not exported/referenced ·
     R1: hardcoded, no error handling, no tests · R2: end-to-end functional, tests
     fragmentary · R3: tested, runs reliably, has tech debt · R4: stable public
     API, tested, documented, covered by the conformance gate.
   - Suggested test-coverage gaps.
   - If the feature is a moddle type/property, flag whether a rename/removal would
     be a **breaking (MAJOR)** change and that descriptor files need human sign-off
     — flag only; do not propose the change. See `skills/moddle-extension-review`
     and `skills/bpmn-naming-publishing`.

5. **Output:** Return ONE Feature Inventory row (Markdown table) plus the reasoning,
   as your message — do NOT write or append to a file. Columns: ID, Name, Package,
   Kind, Source path(s), Public-export?, Moddle type(s), Properties-panel entry,
   Tests, Used-by, Maturity, Notes. Mark every maturity rating **PRELIMINARY** and
   every "unused"/"not exported" claim **PROVISIONAL** (code may be reached via the
   moddle model at runtime, dynamic import, an example/demo, or a downstream
   consumer outside this repo).

Clinical/PII safety: healthcare-adjacent repo — use only the synthetic content
already present as examples; never invent realistic patient data or paste
real-looking clinical identifiers into the output.

DO NOT make a Keep / Refactor / Drop / publish-or-not recommendation — that
requires human input on pilot scope and the release roadmap.
