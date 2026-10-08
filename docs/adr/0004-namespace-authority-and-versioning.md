# ADR-0004: GitHub Pages owns versioned extension namespaces

- **Status:** accepted
- **Date:** 2026-09-21
- **Deciders:** maintainers
- **Issue:** [#35](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/35)

## Context

The terminology extension needs a stable, globally unique XML namespace under
an authority controlled by the publisher. The identifier should also resolve to
the human- and machine-readable format contract.

Package SemVer cannot identify the serialized format because it is not written
into BPMN files. The descriptor's `version` field is package-release metadata,
not an XML format discriminator.

## Decision

### Authority and terminology namespace

GitHub Pages under the owning GitHub organization is the namespace authority.
The terminology extension uses:

```text
https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1
```

The conventional prefix is `mt`. The URI resolves to a human-readable
contract. The Moddle descriptor and XSD are published beside it as
`medical-terminology.json` and `medical-terminology.xsd`.

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

The controlled authority starts at `/v1`, establishing the first public format
contract for this package.

### Generated documentation and drift prevention

`extension/src/moddle/medical-terminology.json` remains the source of truth.

- `tools/moddle-to-xsd.mjs` generates the XSD.
- `tools/generate-namespace-docs.mjs` generates the namespace reference and
  stages the machine-readable descriptor and XSD for Astro Starlight.
- CI checks both generated artifacts and rejects namespace drift.
- BPMN fixtures, tests, the demo and architecture documentation use the same
  URI and are covered by the conformance and documentation gates.

## Consequences

- The namespace is controlled by the organization and resolves to maintained
  documentation.
- BPMN files remain independent of npm release cadence.
- A future incompatible format can coexist with `/v1`, at the cost of retaining
  the old Pages route and making migration behavior explicit.
- GitHub organization, repository and Pages-path continuity are now operational
  requirements for the serialized format.

## Alternatives considered

- **Use an unversioned namespace.** Rejected because a detached BPMN file does
  not carry the npm package version; an explicit format-major makes a future
  incompatible contract distinguishable.
- **Use a URN.** Rejected because the project wants a directly resolvable,
  citable contract with its XSD and descriptor.
