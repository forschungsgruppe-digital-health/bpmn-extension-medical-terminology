# Contributing to bpmn-js-clinical-semantics

Thank you for your interest in contributing! This guide covers everything you need to know about development, testing, deployment, packaging, and releasing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Repository Layout](#repository-layout)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Conformance and Quality Checks](#conformance-and-quality-checks)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Requests](#pull-requests)
- [GitHub Pages Deployment](#github-pages-deployment)
- [Packaging and Publishing](#packaging-and-publishing)
- [Releasing with release-please](#releasing-with-release-please)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

---

## Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md) (based on the
Contributor Covenant, version 2.1). By participating you are expected to uphold it; please
report unacceptable behavior as described there. Notable repository-level changes are
recorded in the [CHANGELOG](CHANGELOG.md) (Keep a Changelog format).

---

## Development Setup

### Prerequisites

- **Node.js >= 18** (check with `node --version`)
- **npm >= 9** (ships with Node 18+)
- **Git**

### Initial Setup

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required because bpmn-js and bpmn-js-properties-panel have overlapping peer dependency ranges that npm's strict resolver cannot satisfy automatically.

### Verify the setup

```bash
npm test       # Run all tests (terminology + fhir-mapping)
npm run build  # Build the demo app to docs/
npm run dev    # Start the dev server at http://localhost:5173
```

---

## Repository Layout

This is a **monorepo** managed with [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces). The root `package.json` defines four workspaces:

| Workspace | Package name | Purpose |
|---|---|---|
| `packages/terminology` | `@forschungsgruppe-digital-health/terminology` | Terminology annotation engine, providers, adapters, moddle extension, properties panel |
| `packages/fhir-mapping` | `@forschungsgruppe-digital-health/fhir-mapping` | FHIR resource mapping, moddle extension, properties panel |
| `packages/demo` | `@forschungsgruppe-digital-health/demo` (private) | Vue 3 composables (optional framework integration), not published |
| `examples/vanilla` | `clinical-bpmn-demo` (private) | Interactive demo app, not published |

### Key files

| File | Purpose |
|---|---|
| `package.json` | Root workspace config, shared scripts, shared dev dependencies |
| `.github/workflows/ci.yml` | CI pipeline (lint, test, build on Node 18 + 20; BPMN conformance + conventions gate) |
| `.github/workflows/deploy.yml` | GitHub Pages deployment (tests + build + deploy) on push to `main` |
| `AGENTS.md` | Single-source operational context for AI agents (CLAUDE.md imports it) |
| `docs/ARCHITECTURE.md` | Design decisions, UML diagrams, data model, project structure |
| `tools/` | Deterministic conformance/convention checkers (see [Conformance and Quality Checks](#conformance-and-quality-checks)) |
| `.bpmnlintrc` | bpmnlint config (`recommended` + `correctness`) |
| `.githooks/` | Committed pre-commit / pre-push hooks (enabled via `core.hooksPath`) |
| `skills/` | Vendor-neutral agent skills that orchestrate the conformance tools |
| `packages/*/src/moddle/*.json` | BPMN moddle extension descriptors (XML schema) |
| `packages/*/test/` | Unit test directories |

### npm workspace commands

```bash
# Run a script in all workspaces
npm test                                           # test in all workspaces
npm run build                                      # build in all workspaces

# Run a script in a specific workspace
npm run test --workspace=packages/terminology      # test only terminology
npm run test --workspace=packages/fhir-mapping     # test only fhir-mapping

# Install a dependency in a specific workspace
npm install <pkg> --workspace=packages/terminology
```

---

## Development Workflow

### Running the demo

```bash
npm run dev
```

This starts the Vite dev server for `examples/vanilla/`. The demo includes a sample BPMN file (`examples/vanilla/public/sample.bpmn`) with pre-existing terminology annotations and FHIR mappings on a lung cancer diagnostic pathway.

### Making changes

1. Edit source files in `packages/*/src/`.
2. The Vite dev server has hot module replacement, so changes to the demo app and its imported package sources are reflected immediately.
3. Write or update tests in `packages/*/test/` to cover your changes.
4. Run `npm test` to verify.

### Adding a new source file

When adding new modules, ensure they are re-exported through the package's `src/index.js` if they should be part of the public API. Check the corresponding `test/index.test.js` to verify the export surface is tested.

---

## Coding Standards

### Language and style

- **Pure JavaScript with JSDoc type annotations.** No TypeScript in this project; we rely on JSDoc for editor IntelliSense and documentation.
- **ES modules** (`import`/`export`), not CommonJS. All packages have `"type": "module"` in their `package.json`.
- **No build step for libraries.** The packages export raw ES module source files. Consumers are expected to have their own bundler (Vite, webpack, Rollup, etc.).

### File naming

- Source files: `PascalCase.js` for classes, `camelCase.js` for utilities and helpers.
- Test files: mirror the source path with `.test.js` suffix, e.g., `src/core/TerminologyRegistry.js` is tested in `test/core/TerminologyRegistry.test.js`.
- Moddle descriptors: `kebab-case.json` (e.g. `clinical.json`, `fhir-mapping.json`).

### Code organisation

Each package follows a consistent structure:

```
packages/<name>/
├── src/
│   ├── core/           Type definitions, interfaces, registries
│   ├── adapters/       Protocol-specific API adapters (optional)
│   ├── providers/      Concrete terminology providers (optional)
│   ├── moddle/         BPMN moddle extension descriptor (JSON)
│   ├── properties-panel/  bpmn-js-properties-panel integration
│   ├── services/       Helper functions for reading/writing annotations
│   └── index.js        Public API barrel export
└── test/
    ├── core/
    ├── adapters/
    ├── providers/
    ├── services/
    └── index.test.js   Public API surface test
```

---

## Testing

### Test framework

Tests use [Vitest](https://vitest.dev/), which is installed as a root dev dependency and shared across all workspaces.

### Running tests

```bash
npm test                                           # All workspaces
npm run test --workspace=packages/terminology      # Single workspace
npx vitest --watch                                 # Watch mode (from a package directory)
```

### Writing tests

- **Unit tests only.** Tests mock external dependencies (fetch, bpmn-moddle) and do not require running servers.
- **Mock fetch for adapter/provider tests.** Pass a `fetchFn` parameter to providers and adapters to inject mock implementations. See `test/adapters/SnowstormAdapter.test.js` for examples.
- **Mock moddle for helper tests.** Create a minimal `{ create(type, props) { return { $type: type, ...props }; } }` mock. See `test/services/AnnotationHelper.test.js`.
- **Properties panel modules are excluded from unit tests** because they depend on bpmn-js peer dependencies that are not fully available in the test environment. UI-level testing should be done via the demo app or integration tests.
- **The `demo` package has no unit tests** for the same reason — its composables wrap a live bpmn-js modeler instance, so they are exercised through the demo app (`examples/vanilla`) rather than Vitest.

### Test coverage targets

Aim for coverage of all public API functions, all provider types (static, FHIR, SNOMED CT), all adapter request paths (search, lookup, hierarchy), and all helper CRUD operations (add, get, remove, export).

---

## Conformance and Quality Checks

Beyond unit tests, the repo ships a **deterministic conformance gate** for the
BPMN artifacts and the package metadata. The decision is made by CLI tools (not by
any AI/agent), and the **same npm scripts** run in CI, in the local git hooks and
in the VS Code tasks — so a green local run means a green CI run.

### Commands

```bash
npm run check:conformance   # bpmnlint + moddle roundtrip + XSD core (the gate)
npm run check:packages      # npm/bpmn.io packaging conventions
npm run verify              # check:packages + check:conformance + npm test (full)

# individual steps
npm run lint:bpmn                         # structural BPMN 2.0 (bpmnlint)
npm run check:roundtrip                   # term:/fhirmap: data is lossless & stable
node tools/moddle-roundtrip.mjs --strict  # treat roundtrip warnings as failures
npm run check:xsd                         # BPMN-core XSD validation (informational)
bash tools/validate-xsd.sh --strict       # fail on a schema-invalid core
```

Append file paths to scope a check, e.g. `node tools/moddle-roundtrip.mjs docs/sample.bpmn`.

### The three layers

| Layer | Tool | What it proves | Blocking |
|---|---|---|---|
| Structure | `bpmnlint` (`recommended` + `correctness`) | valid BPMN structure: connectedness, start/end events, no implicit splits, no dangling refs | yes |
| Extension data | `tools/moddle-roundtrip.mjs` | `term:`/`fhirmap:` content survives parse→serialize, output is stable | yes on instability; warnings non-fatal (use `--strict`) |
| Standard core | `tools/validate-xsd.sh` (xmllint vs OMG BPMN20.xsd) | the BPMN core matches the standard schema | no — informational |

**Why XSD is informational:** the standard `BPMN20.xsd` accepts anything inside
`<extensionElements>` via `processContents="lax"`, so it cannot validate the
clinical extensions — a green XSD does **not** mean the extensions are valid. That
verdict comes from the moddle roundtrip. Run `bash tools/validate-xsd.sh --strict`
to enforce the BPMN core when you need standard conformance.

### Local git hooks

`npm install` runs the `prepare` script, which points git at `.githooks/`
(`core.hooksPath`). After that:

- **pre-commit** runs `check:conformance` / `check:packages` when the matching
  files are staged.
- **pre-push** runs the full `npm run verify`.

Re-enable manually with `npm run hooks:install`. Bypass once with
`git commit --no-verify` / `git push --no-verify`. Hooks skip gracefully if
`node` is not on PATH.

### VS Code

`.vscode/tasks.json` exposes every check under **Terminal → Run Task…**, and with
the recommended `redhat.vscode-xml` extension `.bpmn` files are validated live
against the BPMN core XSD in the editor.

### Agent skills

`skills/bpmn-conformance`, `skills/moddle-extension-review` and
`skills/bpmn-naming-publishing` orchestrate these same tools (vendor-neutral
`SKILL.md`; Claude Code discovers them via `.claude/skills`, Codex/Copilot via `.agents/skills`).

The repo also vendors general **code-health skills** (detection-only): `dead-code-detector`,
`feature-inventarist`, `docs-auditor`, `security-reviewer`, `arc42-generator`, `test-generator`,
plus slash-commands under `.claude/commands/`. See [`skills/README.md`](skills/README.md) for what
each does and when to invoke it.

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable release branch. Protected. Every push deploys to GitHub Pages. |
| `feature/<name>` | Feature branches. Branch from `main`, merge back via PR. |
| `fix/<name>` | Bug fix branches. Branch from `main`, merge back via PR. |
| `release/<version>` | Release preparation branches (optional, for coordinated releases). |

### Rules

- Never push directly to `main`. Always use pull requests.
- Keep feature branches short-lived (days, not weeks).
- Rebase on `main` before merging to keep history linear.
- PRs target `main`. CI and the conformance gate run on `main` and on PRs-to-`main`; the GitHub Pages deploy and release-please run on `main` pushes only.

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build, CI, dependency, or tooling changes |
| `perf` | Performance improvement |

### Scopes

Use the package name as scope: `terminology`, `fhir-mapping`, `demo`, or omit for cross-cutting changes.

### Examples

```
feat(terminology): add OPS code system preset
fix(fhir-mapping): handle missing keyElements in export
docs: update README with GitHub Pages instructions
test(terminology): add SnowstormAdapter auth header tests
chore: update vitest to 3.2.x
```

---

## Pull Requests

### Before opening a PR

1. Run `npm run verify` (packages + conformance + tests) and ensure it passes.
2. Run `npm run build` and ensure the demo builds without errors.
3. If you touched any `.bpmn` file or a moddle descriptor, confirm `npm run check:conformance` is green.
4. If you added a new public API, update the `test/index.test.js` for the affected package.
5. If you added a new provider or adapter, include tests with mocked fetch.

### PR template

Describe what you changed and why. Reference any related issues. The CI pipeline will automatically run tests on Node 18 and 20 and build the demo.

### Review guidelines

- One approval required before merging.
- Squash-merge feature branches to keep `main` history clean.
- Ensure the commit message on squash follows the Conventional Commits format.

---

## GitHub Pages Deployment

The demo app is automatically deployed to GitHub Pages via the [`deploy.yml`](.github/workflows/deploy.yml) workflow on every push to `main`.

### First-time setup (repository owner)

1. Go to **Settings > Pages** in the GitHub repository.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main`. The workflow will build the demo and deploy it.
4. The demo will be available at `https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/`.

### How it works

The workflow first runs the full test suite on Node 18 and 20. On success, it installs dependencies, runs `npm run build` (which builds the Vite demo app to `site/` at the repository root), uploads the `site/` directory as a Pages artifact, and deploys it. This ensures the demo is only deployed when all tests pass.

---

## Packaging and Publishing

### Package registry

Packages are published to the **GitHub Package Registry** under the `@forschungsgruppe-digital-health` scope.

### Configuring npm for the GitHub registry

Add to your project's `.npmrc` (or create one):

```ini
@forschungsgruppe-digital-health:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

For local development, set `GITHUB_TOKEN` to a personal access token with `read:packages` scope. For CI publishing, use the `GITHUB_TOKEN` secret available in GitHub Actions. The CI path needs no manual `.npmrc`: the publish workflow's `actions/setup-node` step (with `registry-url` + `scope: "@forschungsgruppe-digital-health"`) writes it, and `NODE_AUTH_TOKEN` is the workflow's `secrets.GITHUB_TOKEN` — see [`.github/workflows/publish.yml`](.github/workflows/publish.yml).

### What gets published

Each package under `packages/` is an independent npm package. The root package (`clinical-bpmn`) and the demo app (`clinical-bpmn-demo`) are marked `"private": true` and are never published.

### Package exports

Each package defines explicit `exports` in its `package.json`. Consumers can import from:

```js
// Main entry point
import { ... } from '@forschungsgruppe-digital-health/terminology';

// Moddle descriptor (for moddleExtensions config)
import descriptor from '@forschungsgruppe-digital-health/terminology/moddle';

// Properties panel module (for additionalModules config)
import module from '@forschungsgruppe-digital-health/terminology/properties-panel';

// Preset factory functions
import { createKdlProvider } from '@forschungsgruppe-digital-health/terminology/providers/presets';
```

---

## Releasing with release-please

Releases are automated with [release-please](https://github.com/googleapis/release-please)
(manifest mode). You do **not** hand-edit version numbers or tag releases manually — you write
[Conventional Commits](https://www.conventionalcommits.org/), and the tooling does the rest.
Configuration lives in [`release-please-config.json`](release-please-config.json) and
[`.release-please-manifest.json`](.release-please-manifest.json); the workflow is
[`.github/workflows/release-please.yml`](.github/workflows/release-please.yml).

### How the automated release works

1. **Merge Conventional Commits to `main`.** Commit types map to SemVer:
   - `fix:` → PATCH (`0.1.0` → `0.1.1`)
   - `feat:` → MINOR (`0.1.0` → `0.2.0`)
   - `feat!:` or a `BREAKING CHANGE:` footer → MAJOR (`0.1.0` → `1.0.0`)
   - `docs:`, `refactor:`, `chore:`, `test:`, … → no release on their own.
2. **release-please opens (and keeps updating) a single release PR** titled `chore: release main`.
   It bumps the publishable package(s) that have releasable commits, updates each `CHANGELOG.md`,
   keeps the peer-dependency ranges between the sibling packages in sync (`node-workspace` plugin), and
   updates `.release-please-manifest.json`. Packages released together are kept at the same version
   (the `linked-versions` plugin) — see the lockstep note below. The private `demo` package is not
   in release-please, so it is never bumped here.
3. **A maintainer merges the release PR — with a _merge commit_, NOT a squash** (release-please needs
   the merge commit on `main` to tag the release; squashing breaks tag creation). On merge,
   release-please creates a git tag and a GitHub Release **per released package**
   (`include-component-in-tag: true`), e.g. `fhir-mapping-v0.1.0`.
4. **The `publish` job runs automatically** (same workflow, gated on `releases_created`) and
   pushes the two publishable packages to GitHub Packages (`https://npm.pkg.github.com`). No provenance
   attestation is produced — npm provenance is a public-npm-registry feature and is not supported
   on GitHub Packages.

### Lockstep versioning

The two publishable packages (`terminology`, `fhir-mapping`) are kept in sync **when they are released
together**: if both have releasable commits in the same window, the **highest** bump wins and those
packages move to the same version (the `linked-versions` plugin). Practical limit to be aware of:
release-please does **not** force-release a package that has *no* releasable commits, so a change
touching only one package (e.g. a `fix:` in `terminology`) bumps only that package — the versions
reconcile on the next release that spans the group. The private packages (the repo root
`clinical-bpmn`, the `demo` package, and the `clinical-bpmn-demo` example) are never versioned or
published — they are simply absent from `release-please-config.json`.

### Publish scope

GitHub Packages requires the npm scope to **match the owning GitHub account/organization name**
(lowercased). The packages are scoped `@forschungsgruppe-digital-health/*` and the repository owner
is `forschungsgruppe-digital-health` — they match, so `npm publish` to
`https://npm.pkg.github.com` is authorized with the workflow's `GITHUB_TOKEN`. Consumers configure
the registry for this scope as described in
[Configuring npm for the GitHub registry](#configuring-npm-for-the-github-registry).

### Release history

The published packages are `terminology@0.1.0` and `fhir-mapping@0.1.0` (GitHub Release `v0.1.2`).
The `demo` package is private and has never been published. Subsequent releases follow the automated
flow above.

### Ownership, hotfixes & deprecation

- **Ownership.** A repository maintainer (TU Dresden / Forschungsgruppe Digital Health) reviews and
  merges the release PR. A moddle-descriptor change that renames or removes a type/property is a
  **breaking (MAJOR)** change and needs an explicit maintainer sign-off before merge (see
  [AGENTS.md](AGENTS.md) and the `moddle-extension-review` skill). This is a **human gate** — CI
  validates schema correctness (bpmnlint + roundtrip) but does not auto-detect breaking changes.
- **Hotfixes.** To patch an already-released version without shipping unrelated `main` work, branch
  from the release tag (`git switch -c fix/x.y.z vX.Y.Z`), land the `fix:` there, and let
  release-please cut the patch when it merges to `main`.
- **Deprecation.** Mark a deprecated export/type in its JSDoc and the `CHANGELOG`, keep it for at
  least one further MINOR release, and remove it only in a MAJOR bump.
- **Peer ranges.** The `node-workspace` plugin auto-bumps the publishable packages' `peerDependencies`
  on their siblings during a release; keep `updatePeerDependencies: true` in
  `release-please-config.json` if you edit it. The private `demo` package is outside release-please, so
  its peer ranges are not managed here.

---

## Release Process

> **Superseded — releases are automated.** Use [Releasing with release-please](#releasing-with-release-please)
> above. The steps below are retained only as a record of the **SemVer policy** and as a manual
> fallback; do **not** run the `npm version`, `git tag`, or `npm publish` steps by hand anymore.

### Version numbering

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.x): Bug fixes, documentation improvements, test additions.
- **MINOR** (0.x.0): New features that are backwards-compatible (new providers, new aspects, new FHIR resource types).
- **MAJOR** (x.0.0): Breaking changes to public API, moddle schema changes, renamed exports.

Both publishable packages (`terminology`, `fhir-mapping`) are versioned together to keep compatibility simple. The private `demo` package is not versioned or published.

### Step-by-step release

1. **Create a release branch** (optional but recommended for coordinated releases):

   ```bash
   git checkout -b release/0.2.0 main
   ```

2. **Update version numbers** in both publishable package.json files:

   ```bash
   # From the repo root:
   npm version 0.2.0 --workspace=packages/terminology --no-git-tag-version
   npm version 0.2.0 --workspace=packages/fhir-mapping --no-git-tag-version
   ```

3. **Update peer dependency ranges** if the publishable packages' peer dependencies on each other need adjusting.

4. **Run the full test suite:**

   ```bash
   npm test
   npm run build
   ```

5. **Commit and push:**

   ```bash
   git add -A
   git commit -m "chore: release v0.2.0"
   git push origin release/0.2.0
   ```

6. **Open a PR** from the release branch to `main`. Let CI pass, get approval, then merge.

7. **Tag the release** on `main`:

   ```bash
   git checkout main
   git pull
   git tag v0.2.0
   git push origin v0.2.0
   ```

8. **Publish to GitHub Package Registry** (only the two publishable packages; the private `demo`
   package is never published):

   ```bash
   cd packages/terminology && npm publish
   cd ../fhir-mapping && npm publish
   ```

   If publishing from CI (recommended), use a GitHub Actions workflow:

   ```yaml
   - name: Publish packages
     env:
       NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     run: |
       npm publish --workspace=packages/terminology
       npm publish --workspace=packages/fhir-mapping
   ```

9. **Create a GitHub Release** from the tag, documenting the changes with links to relevant PRs and issues.

### Preparing packages for the GitHub Package Registry

Each package needs a `publishConfig` in its `package.json` to target GitHub Packages:

```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

---

## Troubleshooting

### `npm install` fails with peer dependency conflicts

Use `npm install --legacy-peer-deps`. The bpmn-js ecosystem has overlapping peer dependency ranges that npm's strict resolver cannot satisfy automatically.

### Tests fail with "Cannot find module" for bpmn-js internals

The `test/index.test.js` files use dynamic imports and avoid importing properties panel modules, which depend on bpmn-js peer dependencies. If you see these errors, make sure you are not importing properties panel modules in unit tests.

### Vite build fails with EPERM on `docs/`

If a previous build left artefacts in `docs/`, Vite may fail to clean it. Delete `docs/` manually and rebuild.

### GitHub Pages deployment shows 404

Ensure GitHub Pages is configured to use **GitHub Actions** as the source (not a branch). Go to **Settings > Pages > Source** and select **GitHub Actions**.
