# 11. Risks and Technical Debt

_Identifies and prioritizes technical risks, vulnerabilities, and accumulated technical debt with suggested mitigation measures._

> Drafted by the arc42-generator from code, configuration, manifests, the moddle
> descriptors, the CI workflows, and the open GitHub issues. Each entry cites its
> evidence. **Likelihood and impact ratings are a project decision and are marked as
> human input** — only the technical facts are derived here. Verify every item against
> the live code before relying on it.
>
> Note: `CODE-HEALTH-TOOLING-REPORT.md` is a **local, intentionally-uncommitted**
> analysis report (gitignored, not in the repo). Items that historically cited it
> should rely on the re-derivable workflow/manifest evidence instead — the underlying
> facts are reproducible from `.github/workflows/*` and the package manifests.

## 11.1 Conformance debt — pre-existing example/sample data

The deterministic conformance gate (`tools/`, `npm run check:conformance`) already
**surfaces** the following defects, but both relevant checks are **non-blocking by
default**, so the debt persists in tree while CI stays green.

| ID | Debt | Evidence | Gate behaviour |
|---|---|---|---|
| TD-1 | Example data associations are **not** valid against the OMG `BPMN20.xsd`: `bpmn:dataInputAssociation` is missing the required `targetRef` in both minimal lung-cancer diagrams (the `dataOutputAssociation` elements carry their `targetRef` correctly). This is a **core-BPMN** defect, not an extension defect. | GitHub issue **#18** (open); `examples/minimal/lung-cancer-staging-annotated.bpmn` (line ~150), `examples/minimal/lung-cancer-staging.bpmn` (line ~41); reproduced by `npm run check:xsd` / `tools/validate-xsd.sh`. | `check:xsd` is **informational** (never blocks, because the standard XSD cannot validate the `term:`/`fhirmap:` extensions which pass via `processContents="lax"`). `bash tools/validate-xsd.sh --strict` exits non-zero. |
| TD-2 | **README-vs-schema drift (`term:target` undefined).** `packages/terminology/src/moddle/clinical.json` defines `Annotation` with only `aspect`, `mode`, `text`, `codings` — **no** `target`/`Target` type — yet the README still advertises FHIRPath mapping targets. The only place a `term:target` element appears is `docs/sample.bpmn`, a **gitignored, untracked local fixture** (present on disk, not in the repo). Were that fixture loaded, bpmn-moddle would drop the undefined element on parse (lossy load/save roundtrip), but no tracked artifact exercises it. | GitHub issue **#19** (open); `packages/terminology/src/moddle/clinical.json` (`Annotation` properties); `README.md` advertises the mapping-target feature; `docs/sample.bpmn` is on disk but absent from `git ls-files`. | `check:roundtrip` treats "unparsable content" warnings as **non-fatal** (blocks only on instability / loss of _known_ elements). `node tools/moddle-roundtrip.mjs --strict` promotes them to failures. |

> _Requires human input: likelihood and impact ratings for TD-1 and TD-2, and the
> decision recorded in each issue (TD-2 resolution option 1 "implement the `Target`
> type so the README claim holds" vs. option 2 "remove the stale README claim"). Note:
> option 1 is a moddle-descriptor change and therefore requires human sign-off (see
> § 11.5 / `AGENTS.md` hard rules)._

## 11.2 Build risk — `emptyOutDir` deleting tracked documentation (RESOLVED)

**Status: mitigated.** This was previously a real accidental-data-loss risk:
`examples/vanilla/vite.config.js` built the demo into the repository-root `docs/`
directory with `emptyOutDir: true`, so a local `npm run build` would wipe the same
directory the **tracked, hand-authored** arc42 chapters, `ARCHITECTURE.md`,
`EXTENDING.md`, user-stories and concepts live in.

**Fix applied:** the Vite output has been moved out of `docs/` to a separate,
gitignored `site/` directory; `emptyOutDir` now only ever wipes `site/`, never the
tracked docs:

```js
build: {
  outDir: '../../site',   // gitignored build output — no longer docs/
  emptyOutDir: true,      // wipes site/ before each build (safe)
  sourcemap: true
}
```

- **Evidence:** `examples/vanilla/vite.config.js` (`outDir: '../../site'`); `docs/` is
  the tracked documentation home (only `docs/sample.bpmn`, a local scratch fixture,
  is gitignored/untracked); the deploy workflow `.github/workflows/deploy.yml` runs
  `npm run build` and now publishes from `site/`.
- **Residual:** none for the tracked docs. The earlier concern that `npm run build`
  would empty `docs/` is closed.

> _Requires human input: confirm the deploy workflow / Pages artifact path tracks the
> `site/` move end-to-end, then this item can be retired from the register._

## 11.3 Process risk — no automated detection of breaking moddle-schema changes

A change that renames or removes a moddle type or property is a **breaking (MAJOR)
API change** for downstream consumers, because the affected `term:`/`fhirmap:`
extension data is silently dropped on roundtrip. Today this class of change is
**guarded by human review only** — there is no automated detector that fails CI when
a descriptor change is semantically breaking.

- **Evidence:** `AGENTS.md` hard rule — _"A moddle descriptor change that
  renames/removes a type or property is a **breaking** (MAJOR) change — flag it;
  descriptor files need human sign-off."_ The `moddle-extension-review` skill and the
  roundtrip check (`npm run check:roundtrip`) prove a descriptor parses, but neither
  diffs the old vs. new schema to classify the change as breaking.
- **Consequence:** correct SemVer bumps for the published packages depend on a
  reviewer noticing; an additive-looking edit that actually removes/renames a property
  can ship as a minor/patch and silently break consumers' extension data.

> _Requires human input: likelihood/impact rating and whether to add an automated
> moddle-schema diff/compatibility gate alongside the existing conformance gate._

## 11.4 Test-coverage debt — the `demo` package has no unit tests

`packages/demo` (`@forschungsgruppe-digital-health/demo`) ships the `useTerminology()`
and `useFhirMapping()` composables but contains **no test files and no `test`
script**, so `npm test` (which runs `--workspaces --if-present`) skips it entirely.

- **Evidence:** `packages/demo` contains only `src/index.js` and
  `src/composables/{useTerminology,useFhirMapping}.js`; no `test/` directory, no
  `*.test.*` / `*.spec.*` files, and `packages/demo/package.json` has no `test` script
  (whereas `terminology` and `fhir-mapping` carry Vitest suites under `packages/*/test/`
  — roughly 138 and 43 cases respectively).
- **Consequence:** the framework-specific wrapper — the layer most exposed to bpmn-js
  selection/reactivity changes — is unverified by the regression suite.

> _Requires human input: likelihood/impact rating and a coverage target for the `demo`
> package._

## 11.5 Dependency / supply-chain risk

| ID | Item | Evidence | Status |
|---|---|---|---|
| DEP-1 | **1 low-severity, dev-only advisory remains after `npm audit fix`** (esbuild `0.27.3–0.28.0`: arbitrary file read via the dev server on Windows). Reached only via the Vite demo toolchain; `npm audit --omit=dev` reports **0** vulnerabilities, so the published library surface is clean. The higher-severity Vite/Vitest advisories are resolved by the patch-level `audit fix`. | Re-derivable via `npm audit` / `npm audit --omit=dev`; root `devDependencies` (`vitest`) and the Vite demo under `examples/`. | Dev-/toolchain-only; not in shipped artifacts. |
| DEP-2 | Overlapping bpmn-js peer ranges force `--legacy-peer-deps`. All CI/publish workflows now install **reproducibly** with `npm ci --legacy-peer-deps`; the non-reproducible `npm install --legacy-peer-deps` survives only as **local-dev guidance** in `AGENTS.md`. | `.github/workflows/ci.yml`, `deploy.yml`, `publish.yml` all use `npm ci --legacy-peer-deps`; `AGENTS.md` § dev setup shows `npm install --legacy-peer-deps`. | Reproducible in CI; residual is the peer-range conflict itself, not the install mode. |
| DEP-3 | **No SCA/SAST/secret-scanning gate** in CI beyond informal `npm audit`; no ESLint/Prettier/tsconfig. | Re-derivable: `.github/workflows/*` contain no scanner step; repo root has no `.eslintrc*` / `.prettierrc*` / `tsconfig.json`. | Open gap. |

> Note: the workflow files (`.github/workflows/ci.yml`, `deploy.yml`, `publish.yml`,
> `release-please.yml`) **already SHA-pin** their GitHub Actions (e.g.
> `actions/checkout@34e1148…`, `actions/setup-node@49933ea…`), so the mutable-tag
> supply-chain exposure is addressed for the workflows present in the tree.

> _Requires human input: likelihood/impact ratings; whether DEP-1 must be patched
> before the next release; and which scanners (Dependabot, OSV-Scanner, Gitleaks,
> ESLint security plugins) to adopt._

## 11.6 Maturity / lifecycle risk

| ID | Item | Evidence |
|---|---|---|
| MAT-1 | **Pre-1.0.** The two publishable packages (`terminology`, `fhir-mapping`) are published at version `0.1.0` (GitHub Release `v0.1.2` exists); the `demo` package is private (`"private": true`) and excluded from release-please/publishing. Per SemVer, the public API is unstable and may change without a major bump. | `.release-please-manifest.json` (`terminology`/`fhir-mapping` = `0.1.0`); GitHub Release `v0.1.2`; `packages/demo/package.json` (`"private": true`); release-please configured via `.github/workflows/release-please.yml` + `release-please-config.json`. |
| MAT-2 | **Several arc42 chapters are code-derived drafts, and others are not yet documented.** Chapters 1, 3, 4, 5, 8 are filled; the remaining chapters (incl. this one) are code-derived drafts that require human verification and the marked human-input fields completed. | The `arc42/01..12` set; per-chapter content/placeholders. |

> _Requires human input: target version/stability milestone for the first ≥ 1.0
> release and a documentation-completeness owner/deadline for the arc42 set._

## 11.7 Summary of risk register

| ID | Area | One-line | Rating |
|---|---|---|---|
| TD-1 | Conformance | Examples not BPMN20.xsd-valid: `dataInputAssociation` missing `targetRef` (open issue #18) | _Requires human input_ |
| TD-2 | Conformance | README-vs-schema drift: `term:target` undefined in `clinical.json`; example only in untracked `docs/sample.bpmn` (open issue #19) | _Requires human input_ |
| TD-3 | Build | **RESOLVED** — Vite output moved `docs/` → `site/`; `emptyOutDir` no longer wipes tracked docs | Mitigated |
| TD-4 | Process | Breaking moddle-schema changes gated by human review only (no auto-detection) | _Requires human input_ |
| TD-5 | Tests | `demo` package has no unit tests | _Requires human input_ |
| DEP-1 | Dependencies | 1 low, dev-only advisory after `npm audit fix` (esbuild); prod deps clean | _Requires human input_ |
| MAT-1 | Lifecycle | Pre-1.0; `terminology`/`fhir-mapping` published at `0.1.0` (release `v0.1.2`), `demo` private/unpublished | _Requires human input_ |
| MAT-2 | Docs | Several arc42 chapters are code-derived drafts | _Requires human input_ |

---

[← Architecture index](../ARCHITECTURE.md)
