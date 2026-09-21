---
title: Contributing
description: How to get the repository running, what each quality gate proves, and how changes are reviewed, merged and released.
---

This page is the working guide for changing the repository: how to get it running, which checks
have to pass, and how a change travels from a branch to a published release. It expands the
repository's [`CONTRIBUTING.md`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CONTRIBUTING.md),
which stays the short canonical version.

Before you start, two rules apply to every change without exception:

:::danger[Non-negotiable]
- **Only obviously synthetic clinical data** may appear anywhere — in the repository, in a test
  fixture, in an issue, or in a pull request. Never commit or transmit real patient data or
  realistic clinical identifiers.
- **Clinical semantics live only in `term:` elements** under `bpmn:extensionElements`. BPMN core
  and BPMN-DI structures are never changed to carry clinical meaning.
:::

## Getting the repository running

### Prerequisites

- **Node.js 24 or later.** The root `package.json` declares `"engines": { "node": ">=24" }`, and
  every continuous-integration job runs on Node 24.
- **`xmllint`** (from `libxml2-utils` on Debian and Ubuntu) for the XSD validation steps. Without
  it, `npm run check:xsd` and `npm run xsd:ext` cannot run.
- A checkout of the repository. Some of the tooling only does its job inside a git working tree.

```bash title="Clone and install"
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required; a plain `npm install` fails on peer-dependency
resolution. The same flag is used by every workflow in continuous integration
(`npm ci --legacy-peer-deps`).

Installing also runs the root `prepare` script, which points git at the repository's committed
hooks by setting `core.hooksPath` to `.githooks`. It is written so it can never fail an install:
if this is not a git checkout, or git is unavailable, it prints a notice and exits successfully.
You can re-run it at any time with `npm run hooks:install`.

:::tip[Devcontainer]
The repository ships a `.devcontainer` definition that installs `xmllint` and the workspace
dependencies on create, and starts the demo modeler on port 5173 on attach. Note that its image
is `mcr.microsoft.com/devcontainers/javascript-node:22`, one major behind the `>=24` the
repository declares — install a newer Node inside the container if a tool objects.
:::

### Run the demo modeler

```bash
npm run dev
```

This starts the Vite dev server for the `demo/` workspace — a bpmn-js modeler with the extension
and its properties panel already wired up. It is the fastest way to see the effect of a change,
and it is the reference for how a host application integrates the package; see
[use cases](/use-cases/) for what it demonstrates.

The demo runs with the package's default provider configuration. To point it at a SNOMED CT
server, copy `demo/.env.example` to `demo/.env.local` and set `VITE_SNOWSTORM_BASE_URL` to a
redirect-free base URL whose CORS policy permits the demo's browser origin. The demo does not
configure a Vite proxy and the package does not ship one.

## Workspace layout

The repository is an npm workspace root. The root package is private and is never published.

| Path | What it is |
|---|---|
| `extension/` | The published package. Raw ESM source under `extension/src/`, tests under `extension/test/`, and the bpmnlint plugin under `extension/lint/`. |
| `demo/` | The private bpmn-js integration demo. Never published; it is the worked integration example. |
| `examples/valid/` | Synthetic BPMN fixtures that must pass every conformance check. |
| `examples/invalid/` | Negative fixtures that must **fail** linting. Continuous integration fails if they start passing. |
| `schema/` | The generated `clinical-semantics.xsd` and its README. Generated from the moddle descriptor — never hand-edited. |
| `tools/` | Deterministic conformance, packaging and documentation checks — plain Node scripts, plus one shell script for the XSD core validation. |
| `docs/` | The narrative documentation: the arc42 architecture set, the bpmn.io extension primer, the decision records, and the user stories. |
| `docs-site/` | This documentation site. Deliberately **not** an npm workspace, so its dependency tree stays out of every other install. |

The workspace list is `extension`, `demo`, and `extension/lint/bpmnlint-plugin-terminology`.
The published package has **no build step**: it ships the source as ESM, so what you read in
`extension/src/` is exactly what a consumer executes.

## Tests

```bash
npm test
```

This runs the test script of every workspace that defines one, which today means Vitest over the
`extension/` suite — 24 test files covering adapters, providers, the registry, the configuration
assembly, the services, the properties-panel entries, the Vite plugin, the CLI and the lint rules.

The tests are the most reliable statement of what the code actually does, and they are the
fastest way to understand an unfamiliar corner of it. Two conventions matter:

- **Every new function gets a unit test**, and behaviour that crosses a layer boundary gets a
  test that exercises the crossing rather than mocking it away.
- **Before refactoring existing behaviour, pin it first.** Write tests that capture what the code
  does today, including anything that looks wrong, and do not "fix" the observed behaviour inside
  those tests. Correct it afterwards, in a separate change, where the diff shows what changed.

Run a single file while you work:

```bash
npx vitest run extension/test/core/TerminologyRegistry.test.js
```

## Quality gates

The repository has one command that runs everything:

```bash
npm run verify
```

It is the required local gate and expands to four groups: package conventions, the generated
terminology drift guard, the conformance suite, and the tests. Running it before pushing means a
green push is a green pipeline, because the hooks, the editor tasks and continuous integration
all call the *same* npm scripts.

### What each gate proves

| Command | Blocking? | What it actually checks |
|---|---|---|
| `npm run check:packages` | yes | Publishing conventions for each publishable package: an accepted name prefix, `"type": "module"`, and a usable entry point (`main` or `exports`). Missing `exports`, peer dependencies, `repository.directory` or `publishConfig.registry` are warnings, not failures. Private packages skip the publish-specific rules but must still be ESM. |
| `npm run generate:hl7:check` | yes | That the checked-in HL7 code-system resource still matches what the generator produces from the installed `hl7.terminology.r4` package. It is a drift guard: if the dependency moved and the generated file did not, this fails. Regenerate with `npm run generate:hl7`. |
| `npm run lint:bpmn` | yes | Runs bpmnlint over the repository's `.bpmn` files with `.bpmnlintrc` — the recommended and correctness rule sets plus the repository's own terminology plugin. This is BPMN *structure*: disconnected nodes, missing start and end events, implicit splits, dangling references. |
| `npm run check:roundtrip` | yes | Parses each fixture with the `term:` moddle extension registered, serialises it, re-parses and re-serialises, and asserts the two serialisations are identical. It also compares extension-element counts to detect content silently dropped on parse. This is where *extension* correctness is actually established, because the standard BPMN schema cannot check it. Add `--strict` to turn moddle parse warnings into failures. |
| `npm run xsd:gen:check` | yes | That `schema/clinical-semantics.xsd` is exactly what `tools/moddle-to-xsd.mjs` generates from the moddle descriptor right now. The descriptor is the single source of truth; the schema is derived. See the [schema](/schema/) page. |
| `npm run xsd:ext` | yes | Validates each example against BPMN core **and** the extension's own schema in one pass, by generating a small driver schema that imports both. This works because the BPMN schema admits foreign content through a lax wildcard — a validator only checks it if it already holds a schema for that namespace. |
| `npm run check:xsd` | informational | Validates the BPMN *core* of each file against the official OMG schema. Informational by design: a green result says nothing about the extension content, which the lax wildcard lets through unchecked. Pass `--strict` to make an invalid core fail. |
| `npm run docs:defaults:check` | yes | That the generated [default configuration](/configuration/defaults/) page still matches the configuration the code assembles. The values it documents — which terminology server is contacted, which code-system versions are pinned — are module-private constants, so the page is generated from the assembled configuration itself and this check fails when the two drift. Regenerate with `npm run docs:defaults`. |
| `npm test` | yes | The Vitest suite. |

`npm run check:conformance` is the six conformance steps in sequence
(`lint:bpmn`, `check:roundtrip`, `xsd:gen:check`, `xsd:ext`, `check:xsd`, `docs:defaults:check`),
and `npm run verify` is conventions plus the generated-content guard plus conformance plus tests.

:::caution[No JavaScript linter yet]
The repository has no ESLint configuration. `npm run lint` resolves to nothing, because no
workspace defines a `lint` script. Match the style of the file you are editing; there is no
automated arbiter to appeal to.
:::

### Git hooks

Both hooks live in `.githooks/` and are enabled by the install.

- **pre-commit** is conditional. It runs the conformance checks only when a `.bpmn` file or the
  moddle descriptor is staged, and the package-convention check only when a `package.json` is
  staged. If node cannot be found it prints a notice and lets the commit through rather than
  blocking you.
- **pre-push** runs the full `npm run verify`.

Bypass either once with `git commit --no-verify` or `git push --no-verify`. Use it for a
work-in-progress push to your own branch, not to get a red change past review.

The same scripts are available as VS Code tasks (**Terminal → Run Task…**), including a strict
round-trip variant, so you can run an individual gate without memorising the script names.

## The documentation site

The pages you are reading live in `docs-site/src/content/docs/` as Markdown with YAML
frontmatter. `docs-site/` has its own `package.json` and its own dependency tree, kept out of the
workspace set on purpose: it is a documentation artefact, not part of the published package.

```bash title="Build and preview the site locally"
npm run docs:install   # one-off: install the site's own dependencies
npm run docs:dev       # refresh the TypeDoc output, then serve with live reload
npm run docs:build     # refresh the TypeDoc output, then build the static site
npm run docs:preview   # serve the built output
```

Three parts of the site are generated rather than written by hand:

- **`src/content/docs/api/`** is produced by the `starlight-typedoc` plugin while the site builds,
  from the JSDoc in `extension/src/`. It is git-ignored. To change what appears on the
  [API reference](/api/), change the JSDoc on the symbol, not the generated page. (`npm run
  docs:api` runs TypeDoc separately, into `docs-site/.typedoc-out/`; that copy feeds the coverage
  gate below and the script that derives the API sidebar from the `@category` tags.)
- **`src/content/docs/architecture/`** is copied from `docs/arc42/` by
  `docs-site/scripts/import-repo-docs.mjs` on every site build, and is git-ignored. Edit the
  chapter files under `docs/arc42/`, never the copies.
- **`src/content/docs/configuration/defaults.md`** is written by
  `tools/generate-config-defaults.mjs` from the assembled default configuration. Unlike the other
  two it *is* committed, and `npm run docs:defaults:check` — part of `npm run check:conformance` —
  fails the build when the page and the code disagree.

Two further gates protect the generated reference:

- `npm run docs:types` runs the TypeScript checker over the JavaScript source and fails on a
  short allowlist of error codes — the ones that make the published reference *wrong* rather than
  merely incomplete. An unresolvable module specifier renders every type from it as `any`, and a
  JSDoc tag naming a parameter that does not exist publishes prose against the wrong symbol. The
  full strict sweep reports a great deal more; the gate deliberately ignores work nobody has
  scheduled. Add `--all` to see everything while still gating on the allowlist.
- `npm run docs:gate` regenerates the reference and compares its documentation coverage against
  the committed baseline in `tools/api-docs-baseline.json`. Coverage may improve freely; it may
  not regress. After an improvement, record the new floor with
  `node tools/check-api-docs.mjs --update` and commit the baseline in the same change.

Both run in the `docs-preview` workflow, which fires on a pull request that touches the site,
the docs, the extension source or the documentation tooling. It builds the whole published tree
and attaches it as a downloadable artifact rather than deploying it, because GitHub Pages serves
one site per repository and its environment accepts deployments from the default branch only. On
`main`, the `deploy-demo` workflow builds the same tree — this site at the root, the interactive
demo under `/demo/` — and publishes it to GitHub Pages.

## Commits, branches and reviews

**Commit messages follow Conventional Commits.** This is not decoration: release-please derives
the next version and the changelog from the commit history, so `feat:` and `fix:` decide what the
next release is, and a `feat!:` or a `BREAKING CHANGE:` footer is how a breaking change announces
itself. Use the type that matches the change — `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`ci`, `build`, `perf` — with an optional scope, and write the subject as an instruction:
`fix(terminology): harden provider discovery`.

**Changes land through pull requests into `dev`.** A release is promoted with a separate pull
request from `dev` to `main`. Do not push directly to `main`.

Continuous integration (`.github/workflows/validate.yml`) runs on pushes and pull requests against
both branches, in two jobs: one installs, lints the BPMN fixtures, asserts that the *invalid*
fixtures still fail, runs the tests and builds the workspaces; the other runs the full conformance
and package-convention gates plus an audit of production dependencies that fails on any high or
critical advisory.

A pull request that is easy to merge tends to look like this:

- **One logical change.** Split a refactor away from the behaviour change it enables; they are
  much easier to review — and to revert — apart.
- **Green locally before it is pushed.** `npm run verify` passes on your machine.
- **Tests that would have failed before the change.** For a fix, a test that reproduces the bug.
  For a feature, tests for the ordinary path and for the failure paths.
- **Documentation updated in the same pull request.** If the change alters behaviour a reader
  relies on — a configuration option, a default, a provider contract — the page that describes it
  changes with it. A change that makes the documentation wrong is not finished.
- **A description that says why.** What problem this solves, what was considered and rejected, and
  anything a reviewer should look at sceptically.

Some changes need more than a review:

- **Renaming or removing a moddle type or property** in `extension/src/moddle/clinical.json` is a
  breaking change to the data format and needs explicit human sign-off. Changing the descriptor's
  namespace `uri` is a deliberate breaking change that needs its own decision record. The current
  authority and versioning rules are fixed by
  [ADR-0004](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0004-namespace-authority-and-versioning.md).
- **A non-trivial architectural decision** gets a record in `docs/adr/`, using the template in
  that directory. Existing records cover versioning and release automation, the bundled
  terminology defaults, and the bounds on automatic package discovery.

## How a release is cut

Releases are automated, and the automation is split in two on purpose.

1. **release-please** runs on every push to `main`. It reads the Conventional Commits since the
   last release and maintains a release pull request that bumps the version and writes the
   changelog.
2. **Merging that pull request** creates the git tag and the GitHub Release. Tags carry the
   component name — `terminology-v0.1.9`.
3. **A published release triggers the publish workflow**, which pushes the package to the
   configured registry. It is decoupled from release-please's own release step because that step
   proved unreliable for this repository, and it is idempotent: an already-published version is
   skipped, so re-runs and duplicate release events do not fail the job.

One version number spans four artefacts — the package, the bpmnlint plugin, the moddle descriptor
and the generated XSD — applied in lockstep through release-please's `extra-files` configuration,
so a reader of any one of them can tell which release it came from. The namespace URI is
explicitly **not** part of that: it is the data-format contract and is changed only by hand, as a
deliberate breaking change. The reasoning is recorded in
[ADR-0001](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/docs/adr/0001-versioning-and-release-please.md).

Before a release, it is worth inspecting the prospective archive:

```bash
cd extension
npm pack --dry-run
```

:::note[Where the package is published today]
The package is currently published to GitHub Packages with private visibility and is not
available from npmjs.com, which means nobody outside the owning organisation can install it.
That is a known, tracked problem rather than an intended state — see the
[roadmap](/roadmap/) and the [support](/support/) page.
:::

## Also worth reading

- [Extending the extension](/extending/) — the concepts behind providers and adapters, and the
  bpmn.io mechanisms this package sits on.
- [Architecture](/architecture/) — the arc42 chapters, including the building-block view and the
  recorded quality requirements.
- [API reference](/api/) — every exported symbol, generated from the source.
