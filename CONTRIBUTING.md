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
| `extension/` | Published `@forschungsgruppe-digital-health/bpmn-extension-medical-terminology` package |
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

The published package is `@forschungsgruppe-digital-health/bpmn-extension-medical-terminology` and
uses GitHub Packages (`https://npm.pkg.github.com`). Check the prospective
archive before release:

```bash
cd extension
npm pack --dry-run
```

Changes land through pull requests into `dev`. Promote a release through a
separate `dev` to `main` pull request; release-please manages versions and
tags. Do not push directly to `main`.

### Version consistency and release handoff

`extension/package.json` is the version reference for each checkout. Release
Please updates the coupled artifacts listed in
[ADR-0001](docs/adr/0001-versioning-and-release-please.md), including citation
metadata and both extension/lint-plugin entries in the root lockfile. Run
`npm run check:versions` to compare them; it is also part of `npm run verify`,
the pre-push hook, PR validation, and the publish gate. The publish gate additionally
checks that the release tag equals `terminology-v<package version>`.
Manual publish retries run from the `main` workflow, require an existing release
tag as input, and check out that tag rather than publishing the current `main`
working tree. The same tag/version gate applies to automatic and manual runs.

After every release:

1. Check the release tag and successful publish workflow on `main`.
2. Open a pull request with **base `dev`, head `main`** to bring the release
   manifest, package versions, lockfile, schema and changelog back to development.
3. Wait for validation and merge using a **merge commit**, preserving the shared
   ancestry. Do not squash or rebase the release handoff.
4. Update the local `dev` checkout and run `npm run check:versions` before starting
   the next release cycle. Do not manually invent the next package version.

If a correction accompanies the handoff, create a branch from `dev`, merge
`origin/main` into it, add the correction and open its PR into `dev`; preserve
that merge history as well. Existing release tags are immutable. Corrections to
already released metadata take effect in the next release.

The namespace URI, medical CodeSystem versions, dependency versions, the CFF
schema version, historical changelog entries and synthetic test versions do not
track the extension's package version. The private demo has its own version.
