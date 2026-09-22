---
title: Package discovery
description: How npm-installed FHIR terminology packages become searchable providers — the five configuration routes and their precedence, the Vite plugin, and the fdh-terminology-discover CLI.
---

Some terminology is small enough and openly licensed enough to ship as data. FHIR publishes it as npm packages — `hl7.terminology.r4`, `de.ihe-d.terminology`, `dvmd.kdl.r4` and hundreds of others — each a directory of `CodeSystem-*.json` resources. *Package discovery* is the machinery that turns those installed directories into searchable providers in the terminology registry.

It has two halves. At build time something must read `node_modules` and hand the JSON to the bundle, because a browser cannot scan a file system. At runtime `createDefaultPackageProviders` decides which of the handed-over packages become providers. This page covers both, starting with what you get without configuring anything.

## What ships in the package

Four package-backed providers are bundled and need no build-time step at all:

| Provider ID | Source package | Content |
|---|---|---|
| `hl7-terminology-r4-package` | `hl7.terminology.r4` | the HL7 Terminology CodeSystems |
| `ihe-xds-class` | `de.ihe-d.terminology` | `IHEXDSclassCode` |
| `ihe-xds-type` | `de.ihe-d.terminology` | `IHEXDStypeCode` |
| `kdl` | `dvmd.kdl.r4` | the KDL document-class CodeSystem |

The HL7 content is not imported from `node_modules` at runtime; it is baked into [`extension/src/providers/presets/hl7-code-systems.json`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/providers/presets/hl7-code-systems.json), generated from the installed package by [`tools/generate-hl7-code-systems.mjs`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/tools/generate-hl7-code-systems.mjs). `npm run generate:hl7:check` fails when the generated file and the installed package have drifted; it runs as part of `npm run verify`. The three IHE-D and KDL CodeSystems are imported directly from the installed FHIR packages by the preset module, so they are bundled by your bundler rather than pre-baked.

:::note[What is bundled versus what is fetched — this matters legally]
The generated HL7 preset is substantial: 897 CodeSystem resources, 887 of which carry embedded concepts and become searchable, 20 052 concepts in total, 19 833 of them with a `display` and 16 464 with a `definition`. The IHE-D and KDL presets add 15, 38 and 557 concepts, every one with a display. All of that is **bundled** — searchable offline, and part of your application bundle.

What is *not* bundled matters just as much. None of this content is SNOMED CT, LOINC, ICD-10-GM, OPS or ATC; every canonical URL in the preset belongs to an openly licensed HL7, IHE-D or KDL code system. Concepts from SNOMED CT, LOINC, ICD-10-GM, OPS and ATC are fetched from a terminology server at runtime, and only the code, system, version and display of a concept you actually select are written into your BPMN file. The repository README makes the same point from the other direction — it states that the package ships no SNOMED CT, LOINC or ICD-10 content, which the measurement above confirms. Using those terminologies in an application still requires the respective publisher's licence: an Affiliate Licence via BfArM/MLDS for SNOMED CT, the LOINC Copyright Notice and License, and the BfArM terms of use for ICD-10-GM and OPS.
:::

`enablePackageDefaults: false` removes all four presets and nothing else. Explicitly supplied packages still register.

To relabel one preset without replacing the package identity:

```js
createDefaultTerminologyServices({
  packageProviderOptions: {
    'ihe-xds-class': { componentLabel: 'XDS document class' }
  }
});
```

Use `displayName` instead to replace the whole label. An unknown key here fails fast with `Unknown bundled package provider "..."` — the valid keys are exactly the four IDs in the table above.

## The five routes, and their precedence

Beyond the presets, package data can reach `createDefaultPackageProviders` five different ways. They are not additive: the first one that yields data wins outright, and the rest are not consulted. The order, read out of [`extension/src/config/terminology-config.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/config/terminology-config.js):

1. **`packageDiscovery.packages`** — an explicit map of package key → `CodeSystem[]`. Highest precedence; consulted first and, if present, alone.
2. **`packageDiscovery.packageNames` and/or `packageDiscovery.modules`** — used together to group bundler-loaded modules by package. Consulted only when route 1 is absent and at least one of the two is non-empty.
3. **`packageAutoDiscovery.packages`** — the same map shape, supplied under the auto-discovery key.
4. **`globalThis[packageAutoDiscovery.globalKey ?? '__FDH_TERMINOLOGY_PACKAGES__']`** — what the Vite plugin writes into the page.
5. **`packageAutoDiscovery.globFn`** — a glob function (`import.meta.glob`) scanned against a built-in list of `node_modules/**/CodeSystem-*.json` patterns.

Routes 3, 4 and 5 are all disabled together by `packageAutoDiscovery: false`; routes 1 and 2 are unaffected by it.

### The allowlist applies to some routes and not others

Routes 4 and 5 are filtered through `filterDefaultPackageRegistry` before anything else happens. That filter keeps only three package names — `hl7.terminology.r4`, `de.ihe-d.terminology`, `dvmd.kdl.r4` — and for the latter two keeps only the specific CodeSystem URLs the presets use. So a page global containing an unrelated terminology package contributes nothing.

Routes 1, 2 and 3 bypass that filter entirely. If you want a package that is not one of the three defaults, you must supply it explicitly, and `packageDiscovery.packages` is the route to use.

The allowlist lives in [`extension/src/services/PackageDiscoveryDefaults.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/services/PackageDiscoveryDefaults.js) and the build-time tooling applies the same list, so the boundary is consistent at both ends.

### Metadata follows its own, separate precedence

Package metadata — the `packageName`, `title` and `version` used for labels and provider IDs — resolves independently:

1. `packageDiscovery.metadata`
2. `packageAutoDiscovery.metadata`
3. `globalThis[packageAutoDiscovery.metadataGlobalKey ?? '__FDH_TERMINOLOGY_PACKAGE_METADATA__']`
4. the top-level `packageMetadata` config option

:::caution[Top-level `packageMetadata` is the lowest priority, and a Vite app will usually shadow it]
The Vite plugin writes the metadata global (step 3) on every page it touches, even when the discovered metadata is an empty object. An empty object still counts as a value, so step 4 is skipped. In a Vite application with the plugin installed, a top-level `packageMetadata` block is silently ignored.

If you need to override metadata in that setup, put it under `packageDiscovery.metadata`, which outranks the global.
:::

### Include, exclude and the whitelist trap

Once a package set exists, `discoverPackageProviders` filters it ([`extension/src/services/PackageProviderDiscovery.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/services/PackageProviderDiscovery.js)):

- `include` defaults to `['*']`, `exclude` defaults to `[]`.
- Patterns match the canonical package name *or* the version-qualified package key. `*` is the only wildcard character and may appear anywhere.
- A package must match `include` and must not match `exclude`. `exclude` therefore wins.
- `mode` is `'auto'` or `'whitelist'`. The difference only shows when `include` is empty: in `'auto'` an empty include list lets everything through, in `'whitelist'` it lets nothing through.

:::caution[`packageNames` silently flips discovery into whitelist mode]
`packageDiscovery.packageNames` looks like it only says which bundler modules belong to which package. It does two more things:

- when `include` is not set, it *becomes* the include list, and
- when it is non-empty, `mode` becomes `'whitelist'`.

So `{ packages: { 'a.terminology': [...], 'b.terminology': [...] }, packageNames: ['a.terminology'] }` registers `a.terminology` only. `b.terminology` is dropped with no warning. If you supply `packages` directly, leave `packageNames` out.
:::

### The "nothing was discovered" warning

When discovery was *requested* but the resulting package set is empty, the extension logs an actionable console warning and carries on with the built-in providers. "Requested" means either `packageDiscovery` carried `enabled`, `packages`, `packageNames` or `modules`, or `packageAutoDiscovery` was passed explicitly as anything other than `false`.

A zero-config application never sees this warning, even though auto-discovery is on by default — the warning is deliberately scoped to setups that asked for something and did not get it.

### Provider identity and deduplication

Discovery creates **one aggregate provider per installed package version**, searching only that version's CodeSystems. Provider IDs are derived from the package key: `pkg-de-ihe-d-terminology` for a plain package name, `pkg-hl7-terminology-r4-7-1-0` for a version-qualified key. The build-time tooling only emits a version-qualified key when you selected packages explicitly or when two installations of the same package were found, so the plain form is what you normally see. Two installed versions produce two independently searchable, independently disableable providers.

When npm resolves one installation for both a direct and a transitive requirement, discovery keeps a single provider and warns:

```text
[terminology] Package "hl7.terminology.r4" version "7.1.0" is installed directly and transitively. The package was deduplicated; one terminology provider will be used.
```

CodeSystems already covered by an enabled preset are subtracted from discovered providers, so the bundled HL7 preset and a discovered `hl7.terminology.r4` of the same version do not produce duplicate search hits. When the subtraction empties a package completely, it is skipped with:

```text
[terminology] Package "hl7.terminology.r4" has no CodeSystem resources with embedded concepts; skipping.
```

The same message appears for a package whose CodeSystems only declare a `url` and no `concept` array — a legitimate situation for code systems that are meant to be expanded by a terminology server rather than enumerated.

:::note[Package version is not CodeSystem version]
The npm package version identifies the installed artefact. A selected concept keeps its own `CodeSystem.version`, and only that value is written to `mt:coding/@version` in the BPMN XML. The package version is provider metadata and is never substituted into a coding.
:::

### Labels

A package-backed provider is labelled `package-name (package-version)`, and when the package contributes exactly one searchable CodeSystem an em dash and that CodeSystem's name are appended:

```text
de.ihe-d.terminology (3.0.1) — IHEXDSclassCode
hl7.terminology.r4 (7.1.0)
```

The component half comes from the resource's FHIR `title`, `name`, `id` or canonical URL, in that order. A package contributing several CodeSystems gets the package half only. (Separately, `provider.sourceLabel` carries the compact `packageName@version` form, which the panel uses where a short source hint is wanted.)

`packageDiscovery.componentLabels` overrides the component half, keyed by package name or version-qualified key and then by canonical CodeSystem URL:

```js
packageDiscovery: {
  packages: { 'dvmd.kdl.r4': [kdlCodeSystem] },
  componentLabels: {
    'dvmd.kdl.r4': {
      'http://dvmd.de/fhir/CodeSystem/kdl': 'Document classes'
    }
  }
}
```

Because the component half only exists for a single-CodeSystem package, a `componentLabels` entry has no visible effect on a package that contributes several. A label referencing a package or a CodeSystem URL that is not in the supplied set throws with a descriptive message rather than being ignored.

## Build time: getting packages into the bundle

Three supported ways, in increasing order of manual work.

### The Vite plugin

```js title="vite.config.js"
import { defineConfig } from 'vite';
import { terminologyVitePlugin } from
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/vite';

export default defineConfig({
  plugins: [terminologyVitePlugin()]
});
```

The plugin ([`extension/src/vite/plugin.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/vite/plugin.js)) walks the dependency graph from the Vite root, resolves each package directory, selects resource files, and serves them from a virtual module `virtual:fdh-terminology-packages`. During `transformIndexHtml` it injects a small module script that assigns the module's default export to `globalThis.__FDH_TERMINOLOGY_PACKAGES__` and its `packageMetadata` export to `globalThis.__FDH_TERMINOLOGY_PACKAGE_METADATA__` — routes 4 and 3 of the runtime list.

Options:

| Option | Default | Meaning |
|---|---|---|
| `packages` | — | explicit selection: an array of names, or a map of name → `{ include, exclude }` of canonical `CodeSystem.url` values |
| `autoDiscover` | `true` | walk the dependency graph when `packages` is not given |
| `includeTransitiveFrom` | `['@forschungsgruppe-digital-health/bpmn-extension-medical-terminology']` | packages whose own dependencies are also traversed |
| `exclude` | `[]` | package names skipped during automatic discovery |
| `resourceTypes` | `['CodeSystem']` | FHIR resource types read from a package index |
| `exposeGlobal` | `true` | inject the script that sets the page globals |
| `globalKey` | `'__FDH_TERMINOLOGY_PACKAGES__'` | where packages are exposed |
| `metadataGlobalKey` | `'__FDH_TERMINOLOGY_PACKAGE_METADATA__'` | where metadata is exposed |

The default `includeTransitiveFrom` is why the plugin finds the three default FHIR packages at all: they are dependencies of this extension, not of your application, so the walk has to step through the extension to reach them.

With `packages` set, the allowlist does not apply and you can load any installed terminology package:

```js title="vite.config.js"
terminologyVitePlugin({
  packages: {
    'my.terminology': {
      include: ['https://example.org/CodeSystem/custom']
    }
  }
})
```

`include` and `exclude` here match canonical `CodeSystem.url` values, never filenames — which is what makes the selection survive a package that renames `codesystem-kdl.xml.json` to `codesystem-kdl.json`. `include: ['*']` takes every CodeSystem in the package. A URL that does not exist in the package raises an error at build time, so a typo cannot quietly produce an empty provider.

:::caution[`virtual:fdh-terminology-packages` is a bundler module, not a URL]
Do not add it as a script `src`, pass it to `fetch`, or import it from a runtime-built string. Vite resolves it through `resolveId`/`load` while transforming the HTML entry; the browser never sees the specifier, and discovery makes no network request of its own.
:::

:::caution[Automatic discovery of `hl7.terminology.r4` is expensive]
Auto-discovery applies a URL filter to `de.ihe-d.terminology` and `dvmd.kdl.r4` but not to `hl7.terminology.r4` — that package has no default filter, so every one of its CodeSystem resources is imported into the virtual module. Run against this repository, an unfiltered automatic discovery selects 900 CodeSystems from those three packages, 897 of them HL7. The bundled preset already covers that content, and the runtime subtracts the overlap, so you pay the bundle cost for a provider that is then skipped. If you enable the plugin only to reach a different package, add `exclude: ['hl7.terminology.r4']`.
:::

### The `fdh-terminology-discover` CLI

For webpack, Rollup, esbuild, SSR or any non-Vite build, generate a plain ESM registry as a build step. The binary is shipped by the package ([`extension/src/cli/generate-terminology-packages.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/cli/generate-terminology-packages.js)).

```bash
npx fdh-terminology-discover \
  --root . \
  --out src/generated/terminology-packages.js \
  --package de.ihe-d.terminology
```

Full flag set:

| Flag | Meaning |
|---|---|
| `--out <file>` | generated ESM registry — **required** |
| `--root <directory>` | consumer project root (default: current directory) |
| `--package <name>` | package to include; repeatable |
| `--include <package>=<url>` | keep one CodeSystem URL from that package; repeatable |
| `--exclude <package>=<url>` | drop one CodeSystem URL from that package; repeatable |
| `--exclude-package <name>` | skip a package during automatic discovery; repeatable |
| `--include-transitive-from <name>` | follow dependencies from this package; repeatable |
| `--no-auto-discover` | disable dependency-based discovery |
| `--help`, `-h` | print usage |

An unknown flag, a flag missing its value, an `--include`/`--exclude` argument not of the form `<package>=<url>`, or a missing `--out` each exit with status 1 and a `[fdh-terminology]` message. On success the CLI prints one line — `--package` with no URL filter takes every CodeSystem in the package, so the command above reports all sixteen:

```text
[fdh-terminology] Generated 16 CodeSystem(s) from 1 package(s) in /app/src/generated/terminology-packages.js.
```

Add `--include de.ihe-d.terminology=http://ihe-d.de/CodeSystems/IHEXDSclassCode` to narrow that to the one resource you want.

The generated file is ordinary data — no JSON loader, no bundler-specific API. Its metadata block carries only the keys the package's own `package.json` actually has, so a FHIR package without a `title` yields two fields:

```js title="src/generated/terminology-packages.js (generated)"
// Generated by fdh-terminology-discover. Do not edit.
export const packageMetadata = {
  "de.ihe-d.terminology": {
    "packageName": "de.ihe-d.terminology",
    "version": "3.0.1"
  }
};

export default {
  "de.ihe-d.terminology": [ /* CodeSystem resources */ ]
};
```

Register it through route 1:

```js
import packages, { packageMetadata } from './generated/terminology-packages.js';

createDefaultTerminologyServices({
  packageAutoDiscovery: false,
  packageDiscovery: {
    enabled: true,
    packages,
    metadata: packageMetadata
  }
});
```

`--package` or `--include` selects an explicit package set and switches automatic discovery off for that run; the three-package allowlist does not apply to an explicit selection. Without an explicit selection, automatic discovery stays limited to the default HL7, IHE-D and KDL resources — use `--exclude-package` to keep automatic discovery on while omitting a package.

### Importing the JSON yourself

The runtime API is bundler-neutral, so neither the plugin nor the CLI is mandatory. Anything that can produce a `CodeSystem[]` will do:

```js
import aerztlicheFachrichtungen from
  'de.ihe-d.terminology/CodeSystem-AerztlicheFachrichtungen.json' with { type: 'json' };

createDefaultTerminologyServices({
  packageAutoDiscovery: false,
  packageDiscovery: {
    enabled: true,
    packages: {
      'de.ihe-d.terminology': [aerztlicheFachrichtungen]
    }
  }
});
```

For two installed versions in parallel, use version-qualified keys and matching metadata so labels and provider IDs stay distinct:

```js
packageDiscovery: {
  packages: {
    'hl7.terminology.r4@6.0.2': oldCodeSystems,
    'hl7.terminology.r4@7.1.0': currentCodeSystems
  },
  metadata: {
    'hl7.terminology.r4@6.0.2': { packageName: 'hl7.terminology.r4', version: '6.0.2' },
    'hl7.terminology.r4@7.1.0': { packageName: 'hl7.terminology.r4', version: '7.1.0' }
  }
}
```

## What counts as a terminology package

The build-time walk in [`extension/src/build-time/package-discovery.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/build-time/package-discovery.js) treats a resolved package directory as a FHIR terminology package when either:

- its `.index.json` lists at least one entry with `resourceType: "CodeSystem"`, or
- the directory contains files matching `CodeSystem-*.json`.

Resource files are taken from `.index.json` when it is usable and from the filename glob otherwise. Package identity comes from the package's own `package.json` (`name`, `title`, `version`); a package installed both directly and transitively at one resolved version is marked `deduplicated` so the runtime can emit the warning shown above.

Packages reached only through `includeTransitiveFrom` are traversed one level further: the walk descends into a package's own dependencies when that package is itself a terminology package or when it was reached as a transitive root.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Console warns that no packages were discovered | discovery was requested but every route came up empty — check that the plugin is in `vite.config.js`, or supply `packageDiscovery.packages` |
| A package you supplied never appears | `packageNames` flipped discovery into whitelist mode, or `exclude` matched it — `exclude` beats `include` |
| Your `packageMetadata` block has no effect | the Vite plugin's metadata global outranks it; move it to `packageDiscovery.metadata` |
| A `componentLabels` entry has no effect | the package contributes more than one searchable CodeSystem, so the label has no component half to override |
| "has no CodeSystem resources with embedded concepts" | the package's CodeSystems have no `concept` array, or an enabled preset already covers all of them |
| An unrelated installed package is ignored | routes 4 and 5 are filtered to the three default packages; supply it via `packageDiscovery.packages` or the plugin's `packages` option |
| Build fails on a CodeSystem URL | an `include`/`exclude` URL does not exist in that package — this is deliberate fail-fast behaviour |

## Related pages

- [Configuration](/configuration/) — the configuration object, servers, authentication and language
- [Default values](/configuration/defaults/) — the generated table of shipped defaults
- [Extending: providers](/extending/providers/) — writing a provider when no package covers your terminology
- [Compatibility](/compatibility/) — bundler and peer-dependency expectations
