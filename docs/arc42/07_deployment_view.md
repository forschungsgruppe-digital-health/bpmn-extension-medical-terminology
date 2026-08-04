# 7. Deployment View

_Documents the technical infrastructure, deployment topology, and how software components map to physical or virtual execution environments._

## No Runtime Deployment — These Are Libraries

The artifacts produced by this monorepo are **bpmn-js extension libraries**, not a running service. There is no application server, database, container, message broker, or scheduled process to operate at runtime. The libraries execute **in-process** inside the host application that imports them (a bpmn-js modeler running in a browser or a Node tool).

Consequently this chapter describes two distinct things:

1. **Distribution of the libraries** as npm packages to a registry (build-time / publish-time), consumed via `npm install` by integrators.
2. **Deployment of the demo application** as static files to GitHub Pages — the only thing this repository itself "deploys".

The optional terminology adapters (`SnowstormAdapter`, `FhirTerminologyAdapter`, see [chapter 5](05_building_block_view.md)) make outbound HTTP calls to externally operated SNOMED CT (Snowstorm) and FHIR terminology servers. Those servers are **not part of this deployment** — they are provided and operated by the consuming application, and their base URLs are injected via provider configuration.

## Distributed Artifacts

| Artifact | Package name | Privacy | Registry |
|---|---|---|---|
| Terminology engine | `@forschungsgruppe-digital-health/terminology` | published | `https://npm.pkg.github.com` |
| FHIR mapping layer | `@forschungsgruppe-digital-health/fhir-mapping` | published | `https://npm.pkg.github.com` |
| Vue 3 wrapper `@forschungsgruppe-digital-health/demo` | `@forschungsgruppe-digital-health/demo` | `private: true` | not published |
| Root workspace `clinical-bpmn` | — | `private: true` | not published |
| Demo `clinical-bpmn-demo` (`examples/vanilla`) | — | `private: true` | deployed as static site (not npm) |

The two published packages ship **raw ESM source** (`"type": "module"`, `main: src/index.js`) — there is no transpile/bundle step before publish. Each declares `publishConfig.registry = https://npm.pkg.github.com`, so they are published to **GitHub Packages** under the `@forschungsgruppe-digital-health` scope (scope == owning GitHub org, as required by GitHub Packages). The `demo` package (the Vue 3 wrapper) is `private: true` and is **not** published. bpmn-js, the properties panel, and (for the `demo` package) Vue 3 are `peerDependencies` supplied by the consumer, not bundled.

## Topology

```mermaid
graph TD
    subgraph "GitHub (build & distribution plane)"
        REPO["Repository<br/>(main branch)"]
        GHP["GitHub Packages<br/>npm.pkg.github.com<br/>2 published packages"]
        PAGES["GitHub Pages<br/>static site (site/)"]
        REPO -- "publish.yml<br/>(on release: published)" --> GHP
        REPO -- "deploy.yml<br/>(push to main)" --> PAGES
    end

    subgraph "Consumer application (browser / Node, in-process)"
        HOST["Host bpmn-js modeler<br/>(consumer-owned)"]
        LIBS["clinical-semantics libraries<br/>(peer of bpmn-js)"]
        HOST --- LIBS
    end

    subgraph "End user"
        BROWSER["Browser"]
    end

    GHP -- "npm install" --> HOST
    PAGES -- "HTTPS GET" --> BROWSER

    LIBS -. "optional outbound HTTPS<br/>(Snowstorm / FHIR TS adapters)" .-> EXT["External terminology servers<br/>(operated by consumer / 3rd party)"]
```

## Demo Deployment (GitHub Pages)

The interactive demo is the single deployable unit owned by this repository. It is defined in `examples/vanilla` and deployed by `.github/workflows/deploy.yml` on every push to `main`.

| Property | Value | Source |
|---|---|---|
| Trigger | push to `main` | `deploy.yml` (`on.push.branches`) |
| Pre-deploy gate | full test suite on Node 18 **and** 20 (`test` job) | `deploy.yml` |
| Build tool | Vite 6 (`vite build`) | `examples/vanilla/package.json`, `vite.config.js` |
| Output directory | `site/` (repo root, gitignored) | `vite.config.js` (`build.outDir: ../../site`, `emptyOutDir`) |
| Base path | `/bpmn-js-clinical-semantics/` | `vite.config.js` (`base`) |
| Publish mechanism | `actions/upload-pages-artifact` → `actions/deploy-pages` | `deploy.yml` |
| Concurrency | group `pages`, `cancel-in-progress` | `deploy.yml` |
| Live URL | `https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/` | README / CONTRIBUTING |

The Vite `base` matches the GitHub Pages project-site path segment, so asset URLs resolve correctly under the org subdomain. The `site/` build output is generated and gitignored, not committed; because the build no longer targets `docs/`, the tracked documentation under `docs/` is not at risk from `emptyOutDir`. Required Pages configuration (Settings → Pages → Source = **GitHub Actions**) is one-time repo setup, documented in CONTRIBUTING.

## Package Publishing (GitHub Packages)

Release tagging and **publishing are decoupled into two workflows**. `.github/workflows/release-please.yml` (configured by `release-please-config.json` and `.release-please-manifest.json`) only maintains the release PR and creates the per-component tags + GitHub Releases — it has **no publish job**. Publishing is handled by `.github/workflows/publish.yml`, which triggers `on: release: published` and is **idempotent** (an already-published version is skipped, so re-runs and multiple release events do not fail).

```text
push to main ──▶ release-please-action maintains a release PR
                 (collects Conventional Commits, computes version bumps)
                          │  merge release PR
                          ▼
       per-component tag + GitHub Release  (include-component-in-tag: true,
       e.g. terminology-v0.1.0 / fhir-mapping-v0.1.0)
                          │  fires a `release: published` event
                          ▼
                 publish.yml  (on: release: published)
                          │  setup-node (registry-url + scope) writes .npmrc
                          ▼
   npm publish --workspace=packages/terminology   ┐
   npm publish --workspace=packages/fhir-mapping  ┴──▶ GitHub Packages
        (loop skips already-published versions)         (npm.pkg.github.com)
   (packages/demo is private: true — not published)
```

Configuration facts derived from `release-please-config.json`:

- Two release-tracked components (`terminology`, `fhir-mapping`), both `release-type: node`, currently at `0.1.0` per the manifest. The `demo` package (the renamed Vue 3 wrapper) is `private: true` and is neither release-tracked nor published.
- **`linked-versions`** plugin groups both under `clinical-bpmn`, so they share a single version line.
- **`node-workspace`** plugin (`updatePeerDependencies: true`) keeps the internal `peerDependencies` ranges (e.g. the `demo` package's optional peers on `terminology`/`fhir-mapping`) in sync on bump.
- `separate-pull-requests: false` → one consolidated release PR; `include-component-in-tag: true` → **per-component tags + GitHub Releases** (e.g. `terminology-v0.1.0`, `fhir-mapping-v0.1.0`), not one consolidated `v<version>` tag. The two packages still share one linked version line via the `linked-versions` plugin.

Publish job specifics (`publish.yml`):

- Runs `on: release: published` (any published GitHub Release — automated or manual — triggers it); uses `permissions: packages: write`.
- Auth via the workflow's built-in `secrets.GITHUB_TOKEN` exposed as `NODE_AUTH_TOKEN`; `actions/setup-node` (with `registry-url: https://npm.pkg.github.com` and `scope: @forschungsgruppe-digital-health`) writes the scoped registry line into `.npmrc`. No long-lived publish token is stored in the repo.
- **Raw-src publish** (no build step before `npm publish`); a per-workspace loop publishes `terminology` then `fhir-mapping`, **skipping any version already published** (a publish conflict is treated as success). The `private: true` workspaces (root, `packages/demo`, `examples/vanilla`) are never published.

## Continuous Integration (build/test plane)

`.github/workflows/ci.yml` runs on pushes and PRs to `main` and gates what is later deployed/published:

- **`build-and-test`** job — matrix on **Node 18 and 20** (`runs-on: ubuntu-latest`): `npm ci --legacy-peer-deps`, lint (non-blocking), `npm test`, `npm run build` (demo).
- **`conformance`** job (Node 20) — blocking gates: `check:conformance` (bpmnlint structural lint + lossless moddle roundtrip + informational XSD core validation via `xmllint`), `check:packages` (npm/bpmn.io packaging conventions), and `npm audit --omit=dev --audit-level=high` (production-dependency CVE gate). See `tools/` and [chapter 8](08_crosscutting_concepts.md).

Action versions are pinned by commit SHA. `--legacy-peer-deps` is used throughout because the bpmn-js peer ranges cannot be satisfied by npm's strict resolver.

## Execution Environments

| Environment | What runs | Operated by |
|---|---|---|
| GitHub Actions (`ubuntu-latest`, Node 18/20) | CI, conformance, demo build, release/publish | this project (CI) |
| GitHub Pages (org static hosting) | the built demo (`site/`) | this project |
| GitHub Packages (`npm.pkg.github.com`) | the two published npm packages (`terminology`, `fhir-mapping`) | this project (publish), integrators (consume) |
| Consumer host app (browser or Node) | the libraries, in-process as a bpmn-js peer | integrator |
| External SNOMED CT (Snowstorm) / FHIR terminology servers | optional outbound lookups from the adapters | consumer / third party (not this repo) |

## Aspects Not Derivable From the Repository

- _Requires human input: production deployment topology / hosting of any consuming application that embeds these libraries (out of scope for this repo)._
- _Requires human input: which concrete terminology server endpoints (Snowstorm / FHIR TS) a deployment is expected to target, their availability/SLA, and authentication to them._
- _Requires human input: sizing, scaling, and availability targets — there is no server component in this repository to size._

---

[← Architecture index](../ARCHITECTURE.md)
