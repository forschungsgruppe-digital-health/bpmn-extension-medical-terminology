# ADR-0002: Bundle the default terminology packages

- **Status:** accepted
- **Date:** 2026-08-21
- **Deciders:** maintainers

## Context

`createDefaultTerminologyServices()` is intended to work in a consumer
application without package-specific setup. The demo had been providing the
terminology package dependencies and Vite discovery configuration, which meant
that the published extension did not provide its advertised package defaults
on its own.

Discovery remains useful for arbitrary terminology packages selected by a
consumer, but it is a build-time integration and must not be required for the
extension's own defaults.

## Decision

We declare the default FHIR terminology packages as runtime dependencies of
`@forschungsgruppe-digital-health/terminology` and create their preset providers
from the default service configuration without requiring `packageProviderOptions`
or a discovery result.

The Vite package-discovery plugin remains an optional mechanism for additional
consumer-installed packages.

## Consequences

- Installing the extension is sufficient to register the bundled HL7
  Terminology, IHE XDS, and KDL providers.
- The demo does not need a terminology-specific Vite plugin or package wiring
  to use these defaults.
- The default HL7 CodeSystems are included in the application bundle, which
  increases bundle size; lazy loading or a curated HL7 subset can be revisited
  separately without changing the zero-configuration provider contract.
- Arbitrary consumer-installed packages still require explicit build-time
  discovery because browser applications cannot enumerate unknown
  `node_modules` files at runtime.

## Alternatives considered

- **Keep the packages in `demo/package.json`** — rejected because consumers of
  the published extension would not receive the default providers.
- **Require the Vite discovery plugin for all packages** — rejected because
  built-in defaults should not require application code or bundler setup.
- **Discover arbitrary packages at browser runtime** — rejected because npm
  installation does not add unknown package resources to the browser module
  graph and browser code cannot scan the filesystem.
