# 2. Architecture Constraints

_Documents organizational, technical, and regulatory constraints that limit architectural freedom and must be considered during design._

> These constraints are derived from the repository (manifests, moddle descriptors, workflows, `AGENTS.md`, `CONTRIBUTING.md`). Items that are not unambiguously derivable from the code are marked `_Requires human input_`. See [1. Introduction and Goals](01_introduction_and_goals.md) for the motivation and [4. Solution Strategy](04_solution_strategy.md) for the decisions made within these constraints.

## 2.1 Technical Constraints

### Foundational standards

| Constraint | Source / evidence | Consequence for the architecture |
|---|---|---|
| Clinical semantics MUST be carried in **BPMN 2.0 `<extensionElements>`** under custom namespaces — never by altering the `bpmn:`/`bpmndi:` core or structure | `AGENTS.md` (Hard rules); both moddle descriptors `extends` core types via `extensionElements` | Annotated models stay valid BPMN 2.0; non-clinical tools ignore and preserve the extensions on round-trip |
| Two **fixed XML namespaces** with reserved prefixes: `term:` → `https://clinical-bpmn.org/terminology/v1`, `fhirmap:` → `https://clinical-bpmn.org/fhir-mapping/v1` | `packages/terminology/src/moddle/clinical.json`, `packages/fhir-mapping/src/moddle/fhir-mapping.json` (`uri`/`prefix`) | The two concerns stay decoupled in XML; prefixes/URIs are part of the public contract |
| Renaming/removing a moddle **type or property is a breaking (MAJOR) change** and needs human sign-off | `AGENTS.md` (Hard rules) | Moddle descriptors are a versioned API surface, not internal detail |
| Built on the **bpmn.io stack** (bpmn-js modeler + properties panel) as the host | peer dependencies; `examples/vanilla` | Libraries are bpmn-js *extension* modules (`additionalModules` / `moddleExtensions`), not standalone apps |

### Language, runtime & tooling

| Constraint | Value | Source / evidence |
|---|---|---|
| Language | **Raw ESM JavaScript + JSDoc, no TypeScript** | `"type": "module"` in every package manifest; `AGENTS.md` ("JS + JSDoc, no TypeScript") |
| **No build step** for the libraries | Packages publish raw `src/` (`"main": "src/index.js"`) | `AGENTS.md`; `release-please.yml` ("Raw-src publish (no build step)"); only the demo app is built |
| Node.js runtime | **`>=18`** (CI matrix: Node 18 + 20) | root `package.json` `engines`; `ci.yml`, `deploy.yml` matrix |
| Package manager / topology | **npm workspaces** monorepo; install requires **`--legacy-peer-deps`** (overlapping bpmn-js peer ranges) | root `package.json` `workspaces`; `AGENTS.md`; all workflows run `npm ci --legacy-peer-deps` |
| Test framework | **Vitest** (`vitest run` per package) | root devDependency `vitest@^3.1.1`; package `test` scripts |
| Conformance tooling | Deterministic Node/shell CLIs under `tools/` (bpmnlint, moddle roundtrip via `bpmn-moddle`, XSD via `xmllint`, package conventions) | `tools/`; root scripts; `ci.yml` conformance job |

### Peer-dependency ranges (host compatibility contract)

```text
bpmn-js                      >= 15.0.0   (terminology, fhir-mapping, demo)
bpmn-js-properties-panel     >= 5.0.0    (terminology, fhir-mapping, demo)
@bpmn-io/properties-panel    >= 3.0.0    (terminology, fhir-mapping, demo)
vue                          >= 3.3.0    (demo package only)
@forschungsgruppe-digital-health/terminology   >= 0.1.0  (demo, optional peer)
@forschungsgruppe-digital-health/fhir-mapping  >= 0.1.0  (demo, optional peer)
```

Source: `packages/*/package.json` `peerDependencies` / `peerDependenciesMeta`. These open-ended `>=` ranges are the cause of the mandatory `--legacy-peer-deps` install flag.

### Distribution

| Constraint | Value | Source / evidence |
|---|---|---|
| Registry | Published to **GitHub Packages** (`https://npm.pkg.github.com`) by a **decoupled `publish.yml`** workflow (`on: release: published`, idempotent — skips already-published versions), not by `release-please.yml` | `publishConfig.registry` in each package; `.github/workflows/publish.yml` |
| Package scope | **`@forschungsgruppe-digital-health/*`** (scope must equal the owning org for GitHub Packages) | package names; `release-please.yml` comment on `scope` |
| Versioning | **Linked versions** across `terminology` / `fhir-mapping` (the `demo` package is excluded because it is not listed in `release-please-config.json`), automated by **release-please** (Conventional-Commits → SemVer); tags/releases are **per-component** (`include-component-in-tag: true`, e.g. `terminology-v0.1.x`), not one consolidated `v<version>` tag | `release-please-config.json` (`linked-versions`, `node-workspace`, `include-component-in-tag`) |
| Demo distribution | Demo app deployed to **GitHub Pages** on push to `main` | `deploy.yml` (builds `examples/vanilla`, uploads `docs/`) |
| License | **Apache-2.0** | `license` field in root + all packages; `LICENSE` |

## 2.2 Organizational Constraints

| Constraint | Detail | Source / evidence |
|---|---|---|
| Ownership / context | Research prototype of the **MiHUB project, TU Dresden / Forschungsgruppe Digital Health (FGDH)** | `README.md` status banner |
| Maturity | **Pre-1.0**; two publishable packages (`terminology`, `fhir-mapping`) at `0.1.0` plus the private `demo` package; first release cut (`v0.1.2`) | package `version` fields; `CONTRIBUTING.md`; `README.md` |
| Production use | **Not for production** — under active development, not production-hardened nor independently security-reviewed | `README.md` status banner |
| Repository topology | Single public monorepo on GitHub (`forschungsgruppe-digital-health/bpmn-js-clinical-semantics`); `main` is the protected stable branch | root `package.json` `repository`; `CONTRIBUTING.md` |
| Funding / programme frame | _Requires human input: formal MiHUB deliverable scope, funding body and reporting obligations are not derivable from this repository._ |
| Team / roles | _Requires human input: team size, roles and decision authority (no CODEOWNERS/CONTRIBUTORS file detected)._ |

## 2.3 Convention Constraints

| Constraint | Rule | Source / evidence |
|---|---|---|
| Commits | **Conventional Commits**; scope = package name (`terminology`, `fhir-mapping`, `demo`) — also drives release-please versioning | `AGENTS.md`; `CONTRIBUTING.md` |
| Module format | **ESM only** (`"type": "module"`); JS + JSDoc, no TypeScript | `AGENTS.md`; package manifests |
| Package naming | `@forschungsgruppe-digital-health/*` (or `bpmn-js-*` / `bpmnlint-plugin-*`) | `AGENTS.md`; enforced by `tools/check-package-conventions.mjs` |
| Conformance gate | Every check is a deterministic CLI in `tools/`; the **decision lives in the tool, never the model**. Same scripts run in terminal, git hooks, VS Code, and CI | `AGENTS.md`; root scripts; `ci.yml` |

### Gate layers and severity

| Gate | Script | Severity |
|---|---|---|
| BPMN structure (bpmnlint) | `npm run lint:bpmn` | **Blocking** |
| Moddle roundtrip (`term:`/`fhirmap:` lossless + stable) | `npm run check:roundtrip` | **Blocking** on instability; parse warnings non-fatal (`--strict` promotes) |
| XSD core (OMG `BPMN20.xsd` via `xmllint`) | `npm run check:xsd` | **Informational** by default (standard XSD cannot validate extensions); `--strict` enforces |
| Package conventions (npm/bpmn.io publishing rules) | `npm run check:packages` | **Blocking** |
| Production dependency audit (no high/critical CVEs in shipped deps) | `npm audit --omit=dev --audit-level=high` | **Blocking** (CI) |

Aggregate entry points: `npm run check:conformance` (lint + roundtrip + xsd), `npm run verify` (packages + conformance + tests). Hooks are wired via `prepare` → `core.hooksPath` (`.githooks/pre-commit`, `.githooks/pre-push`).

## 2.4 Regulatory / Data Constraints

| Constraint | Rule | Source / evidence |
|---|---|---|
| Clinical data placement | Clinical data MUST live only inside `<extensionElements>` under a custom prefix; visual/layout info belongs in `bpmndi`, not in clinical extensions | `AGENTS.md` (Hard rules) |
| Test/example data | **Synthetic data only** — obviously artificial content; never commit real patient data | `AGENTS.md` (Hard rules) |
| Formal medical-device / data-protection regime | _Requires human input: this is a non-production research prototype; any MDR/IVDR, GDPR or institutional governance classification is not derivable from the repository._ |

---

[← Architecture index](../ARCHITECTURE.md)
