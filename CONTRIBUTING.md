# Contributing

## Setup

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
```

Use Node.js 24 or later.

## Layout

| Path | Purpose |
|---|---|
| `extension/` | Published `@forschungsgruppe-digital-health/terminology` package |
| `demo/` | Private bpmn-js integration demo |
| `examples/valid/` | Synthetic BPMN fixtures |
| `examples/invalid/` | Negative BPMN fixtures |
| `tools/` | Conformance and publishing checks |

## Commands

```bash
npm test
npm run build --workspace=demo
npm run check:conformance
npm run check:packages
npm run generate:hl7:check
npm run verify
npm run dev
```

`npm run verify` is the required local quality gate. BPMN-core XSD validation
is informational because the standard schema does not validate foreign
extension content; moddle roundtrip stability and BPMN linting are blocking.
When the `hl7.terminology.r4` dependency changes, regenerate the checked-in
HL7 CodeSystem resource with `npm run generate:hl7`.

## Terminology extension rules

Clinical data belongs only in `term:` elements under
`bpmn:extensionElements`. Do not change BPMN core structures or BPMN-DI data
for clinical semantics. Examples and tests must use clearly synthetic data.

Moddle descriptor changes live in `extension/src/moddle/clinical.json`.
Renaming or removing a moddle type or property is a breaking change and needs
human approval.

## Publishing

The published package is `@forschungsgruppe-digital-health/terminology` and
uses GitHub Packages (`https://npm.pkg.github.com`). Check the prospective
archive before release:

```bash
cd extension
npm pack --dry-run
```

Changes land through pull requests into `dev`. Promote a release through a
separate `dev` to `main` pull request; release-please manages versions and
tags. Do not push directly to `main`.
