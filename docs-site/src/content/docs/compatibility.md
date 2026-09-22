---
title: Compatibility
description: Which bpmn-js and properties-panel versions this extension works with, why it needs a bundler, and how it coexists with other bpmn.io extensions and BPMN tools.
---

This page answers the questions that come before installation: does it fit my bpmn-js
version, will it work with my build setup, will it fight with the other extensions I already
load, and what happens to my files elsewhere. Every version number below was read from the
package manifests and the committed lockfile in this repository.

## At a glance

| | |
|---|---|
| Consumption model | **Bundler required** (Vite, Rollup, webpack, esbuild). Plain Node `import` of the main entry point fails. |
| Availability | **Not on npmjs.com.** Install from GitHub Packages or from the repository. |
| bpmn-js | Peer range `>=15.0.0`; exercised against **18.14.0**. |
| bpmn-js-properties-panel | Peer range `>=5.0.0`; exercised against **5.53.0**. |
| @bpmn-io/properties-panel | Peer range `>=3.0.0`; exercised against **3.40.6**. |
| Node | Repository and CI: **24**. The published package declares no `engines`. |
| Module format | ESM only (`"type": "module"`), raw source, no build step. |
| Licence | MIT. |

## Installing it today

The package is **not published on npmjs.com**. `npm install` against the public registry will
not find it. There are two ways to get it.

From GitHub Packages, which is where the publish workflow pushes it. Point the
`@forschungsgruppe-digital-health` scope at that registry and authenticate first:

```ini title=".npmrc"
@forschungsgruppe-digital-health:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

Or from the repository, which is also how you run the demo:

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
```

The repository's own demo depends on the extension through a workspace file reference
(`"file:../extension"`), which is the arrangement to copy if you want to vendor it into an
application rather than depend on a registry. Making the artefact easier to obtain is on the
[roadmap](/roadmap/).

:::note[Why `--legacy-peer-deps`]
`bpmn-js-properties-panel` 5.53.0 declares peer dependencies on `camunda-bpmn-js-behaviors`
and `diagram-js` that this repository does not install directly (the Camunda behaviours are
only needed for the Camunda property groups). npm's strict peer resolution treats that as a
conflict. The flag is about the properties panel's upstream peer graph, not about anything
this extension declares — it declares three peers, listed below, and nothing else.
:::

## bpmn-js and the properties panel

The extension declares exactly three peer dependencies
([`extension/package.json`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/package.json)):

| Peer | Declared range | Installed in this repository | Required for |
|---|---|---|---|
| `bpmn-js` | `>=15.0.0` | 18.14.0 | The properties panel. `TerminologyPropertiesProvider` imports `bpmn-js/lib/util/ModelUtil.js`. |
| `bpmn-js-properties-panel` | `>=5.0.0` | 5.53.0 | The properties panel only. Provides `useService`. |
| `@bpmn-io/properties-panel` | `>=3.0.0` | 3.40.6 | The properties panel only. Provides the entry components and the Preact hooks. |

Two caveats about those ranges:

**The declared floors are not the tested floors.** CI installs and exercises one combination
— the versions in the right-hand column, resolved from the committed lockfile, on Node 24.
The `>=15.0.0` floor expresses an intent (bpmn-js 15 is where the current properties-panel
architecture settled) rather than a verified result. If you are on bpmn-js 15, 16 or 17,
expect it to work and test it; nothing in CI covers it.

**The effective `@bpmn-io/properties-panel` floor is higher than this package's.**
`bpmn-js-properties-panel` 5.53.0 itself requires `@bpmn-io/properties-panel >= 3.40`. Where
the two ranges disagree, the panel's requirement wins, because it is the package that renders
your entries. Treat `>=3.40` as the real minimum whenever you use the properties panel.

Every bpmn.io import in this package lives under `extension/src/properties-panel/`. The
moddle descriptor, the annotation helpers, the registry, the providers and the adapters
import no bpmn.io package at all — they operate on the moddle business objects your bpmn-js
instance hands them. So an integration that skips the properties panel has no hard
requirement on any of the three peers, and the `./moddle` export is plain JSON that needs
nothing whatsoever.

:::caution[One runtime dependency is not declared]
The panel entry imports `htm/preact`, but `htm` appears in neither the package's
`dependencies` nor its `peerDependencies`. It resolves in practice only because `bpmn-js`
pulls it in transitively (`diagram-js` → `@bpmn-io/diagram-js-ui` → `htm`) and npm hoists it
to the top-level `node_modules`. Under a strict or isolated installer, or if that transitive
edge ever goes away, the panel will fail to resolve it. If you see
`Cannot find module 'htm/preact'`, add `htm` to your own dependencies.
:::

## Node

| Context | Requirement |
|---|---|
| Developing this repository | Node 24 or later (`engines.node: ">=24"` at the repository root; CI runs Node 24). |
| Consuming the published package | No `engines` field is declared. |
| Browser code (panel, registry, providers) | No Node requirement — it is bundled for the browser. |
| `fdh-terminology-discover` CLI and the Vite plugin | Run under your project's Node during the build. |

The source ships as raw ESM and uses current language features, including an import attribute
for the moddle descriptor:

```js
export { default as TerminologyModdleDescriptor }
  from './moddle/medical-terminology.json' with { type: 'json' };
```

So whichever toolchain consumes the package — Node for the CLI, a bundler for the browser
code — must support standard import attributes. The repository's demo builds with Vite 6.4.3.

## Why a bundler is required

This is the single most important practical constraint, and it is structural rather than a
bug awaiting a fix. Importing the main entry point in plain Node ESM fails:

```text
Error [ERR_UNSUPPORTED_DIR_IMPORT]: Directory import
  '.../node_modules/@bpmn-io/properties-panel/preact/hooks' is not supported
  resolving ES modules imported from
  .../extension/src/properties-panel/entries/AnnotationListEntry.js
```

There are two upstream causes, both in bpmn.io packages, neither under this project's
control:

1. **`@bpmn-io/properties-panel` publishes no export map.** The subpath the panel entry
   needs, `@bpmn-io/properties-panel/preact/hooks`, therefore resolves as a plain filesystem
   path — and it is a *directory*, inside the copy of Preact that the package vendors. Node
   refuses a directory import with `ERR_UNSUPPORTED_DIR_IMPORT`; bundlers resolve the
   directory through its own `package.json` to an index module. This is the error you
   actually see, because that import is evaluated first.
2. **`bpmn-js-properties-panel`, imported for `useService`, reaches into bpmn-js through
   extensionless deep specifiers** such as `bpmn-js/lib/util/LabelUtil`. Node's ESM resolver
   requires a file extension and reports `ERR_MODULE_NOT_FOUND`; bundlers apply
   CommonJS-style extension resolution and find the file. Importing
   `bpmn-js-properties-panel` on its own in plain Node fails for exactly this reason.

The one bpmn-js module this package imports directly,
`bpmn-js/lib/util/ModelUtil.js`, carries its extension and resolves fine in plain Node. Both
failures come from the packages underneath it.

Neither can be worked around inside this package without vendoring or re-bundling bpmn.io
code, so the supported consumption model is: **bundle it.** Vite, Rollup, webpack and
esbuild all resolve both cases.

What *does* work in plain Node is the `./moddle` export — plain JSON, importable with an
import attribute, and genuinely useful for server-side or CI processing. There is a worked
plain-Node reader example on the [schema page](/schema/).

:::note[Only the listed subpaths are importable]
The export map lists `.`, `./moddle`, `./properties-panel`, `./properties-panel.css`,
`./vite`, `./vite/types` and `./types`. Nothing else is reachable — a deep import such as
`…/src/core/TerminologyRegistry.js` is blocked by the export map regardless of bundler.
Inside a checkout of this repository those files import cleanly in plain Node, but that is a
repository-local path, not a consumer-facing entry point.
:::

:::caution
Do not take a plain-Node failure as evidence of a broken install. If `node -e "import(…)"`
of the barrel throws `ERR_UNSUPPORTED_DIR_IMPORT`, that is the expected behaviour described
above.
:::

## Coexisting with other bpmn.io extensions

A modeller usually loads several extensions at once. Three interaction points matter.

### Moddle namespace registration

Descriptors are registered by prefix and by namespace URI, and moddle refuses duplicates of
either. Registering two packages that share a prefix or a URI throws at modeller
construction:

```text
Error: package with prefix <mt> already defined
Error: package with uri <https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1> already defined
```

In practice: you may load as many extensions as you like as long as each brings its own
prefix and its own URI. Camunda (`camunda`), Zeebe (`zeebe`) and this extension (`mt`) sit
side by side without interacting. The one real-world collision is the sibling library
described below.

The prefix key you pass to `moddleExtensions` is the prefix the modeller uses; the
descriptor's own `prefix` field is what appears in serialised XML. Keep them the same —
everything in this project, the fixtures included, assumes `term`.

```js
const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [ /* … */ ],
  moddleExtensions: {
    mt: TerminologyModdleDescriptor
  }
});
```

### Properties-panel provider priority

`TerminologyPropertiesProvider` registers with `propertiesPanel.registerProvider(500, this)`.
That number is not arbitrary and it is not exclusive:

| Provider | Priority |
|---|---|
| `BpmnPropertiesProvider` (the core BPMN groups) | 1000 (the panel's default) |
| `CamundaPlatformPropertiesProvider` | 500 |
| `ZeebePropertiesProvider` | 500 |
| `TerminologyPropertiesProvider` | 500 |

A priority is an event-listener priority: higher runs first, and providers at equal priority
run in registration order. Crucially, providers do not compete for a slot — the panel reduces
over them, handing each one the group list built so far and taking the list it returns. This
extension appends one group and returns; it never removes or rewrites another provider's
groups.

So registering at the same 500 as Camunda or Zeebe is the intended arrangement, not a
conflict: the core BPMN groups appear first, then the vendor groups, then (or interleaved by
registration order) the `medical-terminology` group. The only thing that changes if another
extension also registers at 500 is the vertical order of the groups in the panel.

### Styles

`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css`
contains only the structural styles for the terminology entries, and **every** selector in
it is scoped beneath `.medical-terminology`, the class on the entry's root element. It does
not restyle the panel, does not touch `.bio-properties-panel-*` classes globally, and inherits
the host's fonts, colours and CSS custom properties. Import it after the official bpmn-js and
properties-panel stylesheets, exactly as the demo does:

```js
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';
```

## Other BPMN tools

Annotations are standard BPMN 2.0 `extensionElements` in a foreign namespace, so a tool that
does not know the extension is not required to do anything about them.

- **XSD validators** accept them: the BPMN 2.0 schema declares `extensionElements` with an
  `xsd:any namespace="##other" processContents="lax"` wildcard, and "lax" means unknown
  namespaces are skipped rather than rejected.
- **bpmn.io-based tools preserve them.** Measured: parsing an annotated fixture with a
  `BpmnModdle` that has no `term` descriptor registered produces no warnings, and
  re-serialising reproduces the `mt:` elements and the `xmlns:mt` declaration unchanged.
  bpmn-moddle keeps unrecognised extension content as generic elements. Any bpmn.io viewer or
  modeller therefore round-trips annotated files even without this package.
- **Other vendors' tools are untested here.** A tool that imports BPMN into its own internal
  model and re-exports from that model may drop extension content it does not recognise. If a
  specific third-party tool sits in your workflow, verify it with
  [`examples/valid/minimal-valid.bpmn`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/examples/valid/minimal-valid.bpmn)
  before relying on it.

The details, including what happens with partially-recognised content, are on the
[schema page](/schema/).

## The bpmnlint plugin

The repository ships a bpmnlint plugin, `bpmnlint-plugin-terminology`, with one rule —
[`annotation-requires-id`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/lint/bpmnlint-plugin-terminology/rules/annotation-requires-id.js),
which reports any `mt:Annotation` whose `id` is missing or does not match
`^[A-Za-z0-9._-]+$`. It is what makes `id` effectively required, since the XSD cannot express
it.

:::caution[The plugin is repository-internal and not published]
Its
[manifest](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/lint/bpmnlint-plugin-terminology/package.json)
sets `"private": true` and it is a workspace of this repository, not a released artefact.
`"extends": ["plugin:terminology/recommended"]` resolves inside this repository only. A
downstream project **cannot** use that configuration line today — npm has nothing to install.
:::

The repository's own configuration, for reference:

```json title=".bpmnlintrc"
{
  "extends": [
    "bpmnlint:recommended",
    "bpmnlint:correctness",
    "plugin:terminology/recommended"
  ],
  "moddleExtensions": {
    "mt": "./extension/src/moddle/medical-terminology.json"
  }
}
```

Until the plugin is published, a downstream project has two options that do work:

- **Validate structurally instead.** The generated XSD plus a driver schema catches undeclared
  attributes and bad containment, though not the missing-`id` rule. The recipe is on the
  [schema page](/schema/).
- **Copy the rule.** It is one small CommonJS module whose only import is `bpmnlint-utils`;
  it does not depend on this package at all. The `moddleExtensions` entry above can point at
  the installed package's `./moddle` export instead of the repository path.

Publishing the plugin is tracked on the [roadmap](/roadmap/).

## Related pages

- [Schema](/schema/) — the data format, the XSD, and the round-trip guarantee.
- [Properties panel](/properties-panel/) — integration, required modules, and known
  limitations.
- [Configuration](/configuration/) — providers, servers and package sources.
- [Support](/support/) — where to report a version combination that does not work.
- [Roadmap](/roadmap/) — publication, the namespace decision, and the lint plugin.
