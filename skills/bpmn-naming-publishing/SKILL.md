---
name: bpmn-naming-publishing
description: Check the terminology package against npm/bpmn.io publishing conventions before a release or when editing extension/package.json. Verifies name prefix, ESM, license, entry points, peer dependencies, and registry config.
---

# Naming & publishing conventions

The deterministic check decides; you explain and propose the diff.

## Run

```bash
npm run check:packages        # node tools/check-package-conventions.mjs
```

## What it enforces

**Errors (block):**

- Package name uses an accepted prefix: `@forschungsgruppe-digital-health/*`,
  `bpmn-js-*`, or `bpmnlint-plugin-*`.
- `"type": "module"` — the repo ships raw ESM, no build step.
- A `license` is declared (`Apache-2.0`).
- An entry point exists (`main` and/or `exports`).

**Warnings (advisory):**

- No `exports` map (recommended over bare `main`).
- No `peerDependencies` — bpmn-js modules should declare `bpmn-js`,
  `bpmn-js-properties-panel`, `@bpmn-io/properties-panel`.
- No `repository.directory` (monorepo provenance).
- No `publishConfig.registry` (this repo publishes to GitHub Packages —
  `https://npm.pkg.github.com`).

## When proposing fixes

- Prefer an `exports` map mirroring the siblings: `"."`, `"./moddle"`,
  `"./properties-panel"`.
- The `terminology` package is the only published workspace. The `demo` workspace
  is private and not published.
- Declared bpmn-js peer ranges must remain compatible with the demo.

Present a concrete `package.json` diff, then re-run `npm run check:packages` to
confirm zero errors before opening the PR.
