# ADR-0003: Bound automatic terminology package discovery

- **Status:** accepted
- **Date:** 2026-09-10
- **Deciders:** maintainers

## Context

The terminology package depends on FHIR core and implementation-guide packages
through the bundled terminology packages. A broad dependency traversal in the
Vite discovery plugin imported every `CodeSystem-*.json` resource it found.
That placed technical dependencies and unrelated resources in the virtual
module and application bundle, even though `createDefaultTerminologyModule()`
only needs the bundled HL7, IHE XDS, and KDL presets.

## Decision

Automatic package discovery is limited to:

- `hl7.terminology.r4`;
- `de.ihe-d.terminology`, restricted to the IHE XDS class and type
  CodeSystems;
- `dvmd.kdl.r4`, restricted to the KDL CodeSystem.

The filter is applied during build-time package traversal and resource-file
selection, before JSON resources become Vite imports. The runtime applies the
same policy to bundler-exposed automatic registries as a defense-in-depth
measure. Parallel versions of the allowed packages remain separate registry
entries and providers.

Packages outside this allowlist are not automatically discovered. Consumers
that intentionally need them must provide them through explicit
`packageDiscovery` configuration or an explicit Vite package selection.

## Consequences

- FHIR core and extension packages are not imported, parsed as CodeSystem
  resources, bundled, or registered as providers by default discovery.
- The default virtual module contains only resources used by the bundled
  providers.
- Explicit package configuration remains available for arbitrary terminology
  packages and can select all of their resources.
- The allowlist and the selected IHE/KDL resource files are part of the
  default discovery contract and must be updated if bundled presets change.
