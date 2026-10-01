# Architecture

This repository publishes one raw-ESM package:
`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology`.
The private `demo/` application verifies its bpmn-js integration.

## System overview

```text
BPMN host application
├── moddle descriptor          reads and writes mt: XML
├── properties-panel module    lets a modeller edit annotations
└── terminology services
    ├── registry               exposes configured providers
    ├── providers              search, lookup, validate, hierarchy
    └── adapters               FHIR or Snowstorm HTTP transport
```

Clinical semantics are stored only as `mt:` elements below
`bpmn:extensionElements`. The namespace URI is
`https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1`.
BPMN core and BPMN-DI remain unchanged. The descriptor at
`extension/src/moddle/medical-terminology.json` is the source of truth for the generated
XSD and namespace reference.

Terminology providers are independent from persistence. A provider may use a remote FHIR
or Snowstorm server, bundled FHIR CodeSystem data, an installed terminology package, or an
application-specific source. The selected coding is copied into the BPMN file; opening the
file does not require the original provider to be available.

## Repository boundaries

| Area | Responsibility |
| --- | --- |
| `extension/` | Published moddle, services, providers, adapters, panel, and Vite integration |
| `demo/` | Private integration example |
| `schema/` | Generated XML Schema |
| `examples/` | Synthetic valid and invalid BPMN fixtures |
| `tools/` | Deterministic package, documentation, and conformance checks |

## Quality boundaries

`npm run verify` checks package conventions, release-version consistency, generated
terminology data, BPMN linting, moddle round-trip stability, informational BPMN-core XSD
validation, and the Vitest suite.

Renaming or removing a moddle type or property changes the serialized contract and needs
explicit maintainer approval. A breaking format change requires a new namespace version and
a documented migration path.

## Decisions

Formal decisions and their consequences are recorded in [`docs/adr/`](adr/):

- [ADR-0001](adr/0001-versioning-and-release-please.md) — release and format versions;
- [ADR-0002](adr/0002-bundled-terminology-defaults.md) — bundled defaults;
- [ADR-0003](adr/0003-bound-automatic-package-discovery.md) — discovery boundaries;
- [ADR-0004](adr/0004-namespace-authority-and-versioning.md) — namespace authority.

The older detailed arc42 chapters remain in `docs/arc42/` as internal background but are no
longer published on the user documentation site.
