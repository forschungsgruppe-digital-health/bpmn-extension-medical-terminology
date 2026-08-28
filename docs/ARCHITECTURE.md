# Architecture

This document is the index to the complete arc42 architecture documentation for
`@forschungsgruppe-digital-health/terminology`. It describes the package,
moddle data model, providers, bpmn-js integration, distribution, quality gates,
and design decisions.

For usage instructions, see the [README](../README.md). For contributor
workflow, see [CONTRIBUTING.md](../CONTRIBUTING.md). Formal decisions are
maintained in [`docs/adr/`](adr/).
For a from-scratch developer primer on BPMN, bpmn.io, and extending this
package, see [EXTENDING.md](EXTENDING.md). The dated terminology scope is
captured in the [terminology user story](user-stories/terminology-extension-mvp.md).

Terminology annotations use the `term:` namespace
`https://clinical-bpmn.org/terminology/v1` and are attached exclusively in
standard BPMN `extensionElements`. The extension does not modify BPMN core
elements or BPMN-DI data.

## Chapters

| # | Chapter | File |
|---|---|---|
| 1 | Introduction and Goals | [arc42/01_introduction_and_goals.md](arc42/01_introduction_and_goals.md) |
| 2 | Architecture Constraints | [arc42/02_architecture_constraints.md](arc42/02_architecture_constraints.md) |
| 3 | Context and Scope | [arc42/03_context_and_scope.md](arc42/03_context_and_scope.md) |
| 4 | Solution Strategy | [arc42/04_solution_strategy.md](arc42/04_solution_strategy.md) |
| 5 | Building Block View | [arc42/05_building_block_view.md](arc42/05_building_block_view.md) |
| 6 | Runtime View | [arc42/06_runtime_view.md](arc42/06_runtime_view.md) |
| 7 | Deployment View | [arc42/07_deployment_view.md](arc42/07_deployment_view.md) |
| 8 | Crosscutting Concepts | [arc42/08_crosscutting_concepts.md](arc42/08_crosscutting_concepts.md) |
| 9 | Architecture Decisions | [arc42/09_architecture_decisions.md](arc42/09_architecture_decisions.md) |
| 10 | Quality Requirements | [arc42/10_quality_requirements.md](arc42/10_quality_requirements.md) |
| 11 | Risks and Technical Debt | [arc42/11_risks_and_technical_debt.md](arc42/11_risks_and_technical_debt.md) |
| 12 | Glossary | [arc42/12_glossary.md](arc42/12_glossary.md) |

The deterministic quality gate is `npm run verify`. It combines package
convention checks, BPMN and terminology conformance, schema checks, and the
Vitest suite.
