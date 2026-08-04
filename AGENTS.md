# AGENTS.md — BPMN Extension Medical Terminology

This repository publishes one raw-ESM bpmn-js extension:
`@forschungsgruppe-digital-health/terminology`. Its source and tests live in
`extension/`; the private integration demo lives in `demo/`.

## Quality gate

Run `npm run verify` before release work. It combines:

- `npm run check:packages` — publish conventions for `extension/package.json`
- `npm run check:conformance` — BPMN linting, terminology moddle roundtrip, and
  informational BPMN-core XSD validation
- `npm test` — Vitest suite

Install dependencies with `npm install --legacy-peer-deps`.

## Hard rules

- Store clinical semantics only in `term:` elements under
  `bpmn:extensionElements`; never alter BPMN core or BPMN-DI structures.
- Commit only obviously synthetic clinical data.
- Renaming or removing a terminology moddle type or property is a breaking
  change and requires human sign-off.
- Keep the package ESM-only and preserve the
  `@forschungsgruppe-digital-health/terminology` package name.

## Repository layout

- `extension/` — published terminology package
- `demo/` — private bpmn-js example
- `examples/valid/` and `examples/invalid/` — BPMN fixtures
- `tools/` — deterministic conformance and package checks

Changes land through pull requests into `dev`; releases are promoted with a
separate `dev` to `main` pull request.
