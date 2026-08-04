# Architecture

This document is the index to the architecture documentation of **bpmn-js-clinical-semantics**. It describes the design decisions, component architecture, data model, and project structure of the libraries — for contributors, integrators, and anyone interested in understanding how they work under the hood.

For usage instructions, see the [README](../README.md). For contributor workflow, see [CONTRIBUTING.md](../CONTRIBUTING.md).

The architecture documentation follows the [arc42](https://arc42.org/) template (version 9). It is split into one Markdown file per arc42 chapter, located in the [`arc42/`](arc42/) directory.

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

**Status:** all 12 chapters carry content, last refreshed against the code on 2026-06-18.
Chapters 1, 3, 4, 5, 8 were written from the project's design notes; chapters 2, 6, 7, 9, 10, 11,
12 are **code-derived drafts** (generated and refreshed from the code, manifests, workflows and
moddle descriptors) that fill only what is derivable and mark the rest with _"Requires human
input"_ for a maintainer to complete.

> The arc42 template is licensed under Creative Commons. See [arc42.org](https://arc42.org/), the [official documentation](https://docs.arc42.org/), and the [template repository](https://github.com/arc42/arc42-template) for details on each chapter's purpose.
