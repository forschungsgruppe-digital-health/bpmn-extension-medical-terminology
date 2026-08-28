# 2. Architecture Constraints

_Documents organizational, technical, and data constraints that limit
architectural freedom._

## 2.1 Technical constraints

| Constraint | Evidence | Architectural consequence |
|---|---|---|
| Clinical semantics belong only in BPMN 2.0 `extensionElements` under a custom namespace; BPMN core and BPMN-DI must not be changed | `AGENTS.md`; `extension/src/moddle/clinical.json` | The extension augments standard BPMN elements instead of replacing them or introducing a sidecar format |
| The public namespace is `term:` → `https://clinical-bpmn.org/terminology/v1` | `extension/src/moddle/clinical.json`; `schema/clinical-semantics.xsd` | The prefix and URI are serialized-data contracts and must remain stable |
| Renaming or removing a moddle type or property is a breaking MAJOR change and requires human sign-off | `AGENTS.md`; `skills/moddle-extension-review/SKILL.md` | Descriptor changes are reviewed as public API changes |
| The package integrates with bpmn-js and the bpmn-js properties panel | `extension/package.json` peer dependencies; `demo/src/app.js` | The published artifact is an extension module, not a standalone editor |
| FHIR terminology is an integration boundary, not a second BPMN mapping model | `FhirProvider`, `FhirTerminologyAdapter`, package discovery services | FHIR resources are queried or loaded as terminology data; BPMN persistence remains `term:` only |

### Language, runtime, and topology

| Constraint | Value | Evidence |
|---|---|---|
| Module format | Raw ESM JavaScript with JSDoc; no TypeScript source | root and `extension/package.json` use `"type": "module"`; package entry points target `src/` |
| Library build | No library build step; `extension/src/` is published | `extension/package.json`; `tools/check-package-conventions.mjs` |
| Node.js | `>=22` | root `package.json`; `.github/workflows/validate.yml` and `pages.yml` |
| Package manager | npm workspaces; local and CI installation uses `--legacy-peer-deps` | root `package.json`; `AGENTS.md`; workflows |
| Workspaces | `extension`, `demo`, and `extension/lint/bpmnlint-plugin-terminology` | root `package.json` |
| Unit tests | Vitest in the published extension workspace | root scripts and `extension/package.json` |
| BPMN tooling | bpmn-js, bpmn-moddle, bpmnlint, and the repository tools under `tools/` | root `package.json`; `tools/` |

### Host compatibility contract

The published package declares these peer dependencies:

```text
bpmn-js                      >= 15.0.0
bpmn-js-properties-panel     >= 5.0.0
@bpmn-io/properties-panel    >= 3.0.0
```

The host application supplies those dependencies. The extension supplies its
own terminology providers, adapters, properties-panel provider, moddle
descriptor, CSS, and Vite plugin.

## 2.2 Distribution and process constraints

| Constraint | Evidence |
|---|---|
| The package name is `@forschungsgruppe-digital-health/terminology` | `extension/package.json`; enforced by `tools/check-package-conventions.mjs` |
| Publication targets GitHub Packages at `https://npm.pkg.github.com` | `extension/package.json` `publishConfig`; `.github/workflows/publish.yml` |
| Release Please tracks the `extension` workspace and updates the extension, lint plugin, descriptor version, and XSD | `release-please-config.json`; `.release-please-manifest.json` |
| Publishing is decoupled from release creation and is triggered by a published GitHub Release | `.github/workflows/publish.yml`; `.github/workflows/release-please.yml` |
| Changes land through pull requests into `dev`; releases are promoted through `main` | `AGENTS.md`; `CONTRIBUTING.md` |
| Only synthetic clinical data may be committed | `AGENTS.md` |

## 2.3 Quality-gate constraints

The deterministic gate is the authority, not an agent's interpretation:

| Gate | Command | Role |
|---|---|---|
| BPMN and terminology lint | `npm run lint:bpmn` | Blocking structural and terminology rules |
| Moddle roundtrip | `npm run check:roundtrip` | Blocking stability and known-extension loss checks |
| Generated XSD drift | `npm run xsd:gen:check` | Blocking generated-schema consistency |
| Extension XSD checks | `npm run xsd:ext` | Validates the custom schema |
| BPMN core XSD | `npm run check:xsd` | Informational by default because the standard XSD permits foreign extension content |
| Package conventions | `npm run check:packages` | Blocking publishability checks for `extension/` |
| Aggregate verification | `npm run verify` | Package checks + conformance + Vitest |

The same scripts are used from the terminal, git hooks, VS Code tasks, and
GitHub Actions where applicable.

## 2.4 Data and regulatory constraints

Terminology annotations may contain clinical vocabulary, but repository
fixtures and examples must be obviously synthetic. The repository does not
define a production medical-device, privacy, availability, or authentication
classification; those are deployment-specific human decisions.

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](01_introduction_and_goals.md) · [Next →](03_context_and_scope.md)
