# ADR-0004: GitHub Pages owns versioned extension namespaces

- **Status:** accepted
- **Date:** 2026-09-21
- **Deciders:** maintainers
- **Issue:** [#35](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/35)

## Context

The terminology descriptor originally used
`https://clinical-bpmn.org/terminology/v1`. The project does not control that
domain, and the public predecessor repository `bpmn-js-clinical-semantics`
uses the same URI and `term` prefix for an incompatible content model. A file
could therefore not identify which model its `term:` content followed from the
namespace alone.

The package SemVer cannot resolve that ambiguity. It versions the npm software
but is not serialized into a BPMN file. The descriptor's `version` field is
also package-release metadata that bpmn-moddle ignores; it is not an XML format
discriminator.

No external users or persisted consumer BPMN files exist at the time of this
decision. The repository is still development software in the `0.x` series,
so this is the least costly point at which to establish the public contract.

## Decision

### Authority and terminology namespace

GitHub Pages under the owning GitHub organization is the namespace authority.
The terminology extension uses:

```text
https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1
```

The `term` prefix remains unchanged. The URI resolves to a human-readable
contract. The Moddle descriptor and XSD are published beside it as
`clinical.json` and `clinical-semantics.xsd`.

The repository name is consequently part of the serialized-data contract. The
repository and its Pages path must not be renamed or removed without preserving
the published namespace URLs.

### Extension-family convention

Every extension owns its namespace below its own repository Pages site:

```text
https://forschungsgruppe-digital-health.github.io/<repository>/ns/<extension>/v<format-major>
```

The companion FHIR-mapping extension will therefore use the same convention
under the `bpmn-extension-fhir-mapping` Pages site, with a distinct prefix and
URI. Extensions may coexist in one BPMN file because neither prefix nor URI is
shared.

### Format versions and package versions

The `/v1` segment is the major version of the serialized XML contract. It is
independent of the npm package SemVer and the descriptor's package `version`.

- Ordinary fixes and backward-compatible optional additions retain `/v1`.
- Removing or renaming a type or property, changing the meaning of existing
  serialized data, or otherwise making a valid existing file incompatible
  requires maintainer sign-off and a new namespace such as `/v2`.
- A new format namespace requires its own ADR, preserved documentation for the
  old URI, and an explicit decision about parallel reading and migration.
- Package releases remain in the `0.x` series until the maintainers deliberately
  declare a stable public release. Package SemVer does not alter the namespace
  automatically.

The new controlled authority starts at `/v1`, rather than `/v2`, because the
old URI was never an adopted public contract of this extension and there are no
consumer files to distinguish. The authority change establishes the first
public format contract.

### Migration and predecessor

Repository fixtures are updated in place. No compatibility alias, legacy
reader, or migration command is provided because there are no existing users or
external files.

Files created by `bpmn-js-clinical-semantics` must not be migrated by replacing
the URI. Its `Annotation` shape and BPMN attributes are incompatible and require
a semantic conversion if they ever need to be retained. Moving this extension
to the new URI resolves the public collision immediately; later deletion or
archival of the predecessor repository is a separate lifecycle task.

### Generated documentation and drift prevention

`extension/src/moddle/clinical.json` remains the source of truth.

- `tools/moddle-to-xsd.mjs` generates the XSD.
- `tools/generate-namespace-docs.mjs` generates the namespace reference and
  stages the machine-readable descriptor and XSD for Astro Starlight.
- CI checks both generated artifacts and rejects namespace drift.
- BPMN fixtures, tests, the demo and architecture documentation use the same
  URI and are covered by the conformance and documentation gates.

## Consequences

- The namespace is controlled by the organization and resolves to maintained
  documentation.
- The terminology and predecessor models are unambiguous even while both
  repositories remain public.
- BPMN files remain independent of npm release cadence.
- A future incompatible format can coexist with `/v1`, at the cost of retaining
  the old Pages route and making migration behavior explicit.
- GitHub organization, repository and Pages-path continuity are now operational
  requirements for the serialized format.

## Alternatives considered

- **Register `clinical-bpmn.org`.** Rejected because it adds ownership, renewal
  and hosting obligations without improving the repository-bound documentation.
- **Use an unversioned namespace.** Rejected because a detached BPMN file does
  not carry the npm package version; an explicit format-major makes a future
  incompatible contract distinguishable.
- **Use a URN.** Rejected because the project wants a directly resolvable,
  citable contract with its XSD and descriptor.
- **Keep the old URI and rely on deleting the predecessor.** Rejected because
  deletion cannot retract clones or serialized files and does not establish
  control over `clinical-bpmn.org`.
