# ADR-0001: One SemVer across all extension artifacts, namespace URI excluded

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:** maintainers

## Context

Release Please owns the package version (`extension/package.json` + the manifest).
The extension's data, however, lives in several artifacts that should agree on a
single version so a consumer can tell which release a file came from:

- the published package (`extension/package.json`),
- the lint plugin (`extension/lint/bpmnlint-plugin-terminology/package.json`),
- the moddle descriptor (`extension/src/moddle/clinical.json`),
- the extension schema (`schema/clinical-semantics.xsd`).

The same release identity is also recorded in `CITATION.cff`, `codemeta.json`,
and the extension/lint-plugin workspace entries in the root `package-lock.json`.

There is a trap: the moddle descriptor's namespace `uri`
(`https://clinical-bpmn.org/terminology/v1`) embeds a version, but that is the
**data-format contract** version. Auto-bumping it on every release would change
the XML namespace and break every diagram already in the wild (AGENTS.md lists
changing the `uri` under "ask first"). So the release SemVer and the namespace
contract version are two different things and must not be conflated.

## Decision

We keep **one SemVer** across the package, the lint plugin, the descriptor, and
the XSD, applied automatically by Release Please — and we leave the namespace
`uri` alone.

- The descriptor gains a `version` field (package SemVer, not the namespace).
- `tools/moddle-to-xsd.mjs` stamps `descriptor.version` into the generated XSD on
  a line annotated with `x-release-please-version`, so the XSD version always
  derives from the descriptor (and the drift guard `xsd:gen:check` ties them
  together).
- `release-please-config.json` lists `extra-files` so one release bumps, in
  lockstep: the lint-plugin `package.json` (json updater), the descriptor's
  `version` (json updater), and the XSD line (generic updater) — alongside the
  `extension/package.json` it already owns.
- The namespace `uri` is changed **by hand only**, as a deliberate breaking
  change to the data format (a new ADR when that happens).

### Release metadata and lockfile consistency

`extra-files` also targets `CITATION.cff` (`yaml`, `$.version`),
`codemeta.json` (`json`, `$.version`) and both coupled workspace versions in
`package-lock.json`. Both lock entries are explicit: when a root lockfile updater
is present, the `node-workspace` plugin skips its automatic root-lock update.
Updating only the lint-plugin entry would therefore leave the extension stale.

`npm run check:versions` compares all these values with `extension/package.json`
in the current checkout and rejects missing or mismatched versions. It runs in
`verify`, PR validation and publishing; publishing also checks the release tag.
The check needs no network access and accepts a consistent future release PR
before that release exists. `xsd:gen:check` continues to validate the full
generated schema, including its namespace and structure.

The private demo retains its independent version (its lock entry must match it).
Namespace versions, dependency/CodeSystem versions, `cff-version`, and historical
or synthetic versions are outside the release lockstep. Prose links to the package
manifest rather than repeating its current version.

Every release on `main` is returned to `dev` through a PR merged with a merge
commit; see the [release handoff](../../CONTRIBUTING.md#version-consistency-and-release-handoff).
Existing tags are never rewritten to repair old metadata.

## Consequences

- A reader of any coupled release artifact sees the same version; CI rejects
  drift between package, manifest, lint plugin, descriptor, schema, citation
  metadata and lockfile. The schema-generation check also rejects structural drift.
- The namespace stays stable across ordinary releases — diagrams keep parsing.
- Cost: the descriptor carries a `version` field that moddle ignores, and the XSD
  carries a version comment. Both verified harmless (round-trip is clean).

## Alternatives considered

- **An `xml` updater on a schema `version` attribute** — rejected: release-please
  attribute/namespace handling is less certain than the generic text updater, and
  a silent miss would leave the XSD stale. The annotated comment + drift guard is
  more robust.
- **Separate Release Please components with the `linked-versions` plugin** —
  rejected as heavier (multiple changelogs/tags) than this template needs; one
  component with `extra-files` keeps a single version, changelog, and tag.
