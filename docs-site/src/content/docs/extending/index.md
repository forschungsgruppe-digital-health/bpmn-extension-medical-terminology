---
title: "Extension points"
description: "The seams where your own code plugs into the terminology extension, what each one can change, and how the pieces reach a running bpmn-js modeler."
---

The package is not one component. It is four layers that meet inside a bpmn-js
modeler, and each layer has a different kind of seam. Knowing which layer your
change belongs to is most of the work; the rest is a small amount of wiring.

```text
  ┌───────────────────────────────────────────────────────────────┐
  │ Editor UI            properties-panel group + annotation entry │
  ├───────────────────────────────────────────────────────────────┤
  │ Terminology access   registry → providers → transport adapters │
  ├───────────────────────────────────────────────────────────────┤
  │ Data model           term: moddle descriptor → BPMN XML        │
  ├───────────────────────────────────────────────────────────────┤
  │ Build time           package discovery (Vite plugin, CLI)      │
  └───────────────────────────────────────────────────────────────┘
```

Only the data-model layer is written into the `.bpmn` file. Everything above it
is editor behaviour: swap a provider and the same diagram still opens, still
validates, and still carries the same codings.

## The seams at a glance

| You want to… | Seam | Layer | Lives in |
|---|---|---|---|
| Add a code system the package does not ship | Write a [`TerminologyProvider`](/extending/providers/) and register it | Terminology access | your application |
| Talk to a FHIR terminology server or Snowstorm without writing HTTP code | Reuse [`FhirTerminologyAdapter` or `SnowstormAdapter`](/extending/adapters/) inside your provider | Terminology access | your application |
| Change which servers, versions or packages the defaults use | Pass a configuration object to `createDefaultTerminologyServices(…)` | Terminology access | [configuration](/configuration/) |
| Load a code system on demand, by canonical URI | Supply or replace the provider loader (`loaderConfig`) | Terminology access | [configuration](/configuration/) |
| Turn the annotation group off, or scope the panel | `createTerminologyPropertiesPanelModule({ showAnnotations })` | Editor UI | [properties panel](/properties-panel/) |
| Bundle terminology content that is installed as an npm package | The `./vite` plugin or the `fdh-terminology-discover` CLI | Build time | [discovery](/configuration/discovery/) |
| Read or write annotations from your own code | The annotation helpers exported from the barrel | Data model | [API reference](/api/) |
| Add a `term:` type or attribute | The moddle descriptor — a breaking change, see below | Data model | this repository |

## How the layers are wired

bpmn-js uses [didi](https://github.com/nikku/didi) dependency injection. Every
seam above is ultimately a service registered under a name, and the properties
panel resolves those names when it renders. Three names matter:

| Service name | Registered by | Required by the panel? |
|---|---|---|
| `terminologyRegistry` | `createTerminologyModule(services)` | optional — resolved with `useService('terminologyRegistry', false)` |
| `terminologyProviderLoader` | `createTerminologyModule(services)`, when a loader was built | optional |
| `terminologyPropertiesConfig` | `createTerminologyPropertiesPanelModule(config)` | yes, and the module always provides it |

The registry module and the panel module are deliberately separate. That is what
makes the extension usable headlessly — you can build a registry, search it, and
write annotations with no editor at all — but it also means a working editor
needs *both* modules passed to `additionalModules`.

```js title="Both modules, plus the moddle descriptor"
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import {
  TerminologyModdleDescriptor,
  createTerminologyPropertiesPanelModule,
  createDefaultTerminologyServices,
  createTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';

const terminologyServices = createDefaultTerminologyServices();

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    createTerminologyPropertiesPanelModule(),
    createTerminologyModule(terminologyServices)
  ],
  moddleExtensions: {
    term: TerminologyModdleDescriptor
  }
});
```

That is the shape the demo application uses; see
[`demo/src/app.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/demo/src/app.js)
for the full, running version.

:::caution[The one wiring mistake that matters]
Passing the properties-panel module **without** a terminology services module
produces a panel that looks complete but cannot search. The group appears, the
annotation form opens, free text can be entered and saved — and the coding
fieldset shows only:

> No terminology systems are available right now.

Nothing throws and nothing is logged. The panel resolves `terminologyRegistry`
optionally on purpose, so that a host can ship free-text annotation without any
terminology server. If you did not intend that, add
`createTerminologyModule(...)` (or `createDefaultTerminologyModule()`) to
`additionalModules`.
:::

## Registering a provider is a runtime operation

The registry emits `provider:registered` and `provider:unregistered`, and the
annotation entry subscribes to both
([`AnnotationListEntry.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/entries/AnnotationListEntry.js)).
A provider registered after the modeler booted therefore appears in the
terminology dropdown without a reload, and one that is unregistered while
selected resets the selection instead of leaving a dead option behind.

That makes late registration a legitimate pattern — for example, registering a
site-specific catalogue only once the user has authenticated:

```js
const { terminologyRegistry } = terminologyServices;

session.onAuthenticated(token => {
  terminologyRegistry.register(new HouseCatalogueProvider({ token }));
});
```

Provider IDs are unique: registering a second provider with an ID that is
already taken throws. Use `unregister(id)` first if you are replacing one.

## What is deliberately *not* an extension point

**The moddle descriptor.** `extension/src/moddle/clinical.json` defines the
`term:` vocabulary — `Annotations`, `Annotation`, `Coding` — and it is shared
vocabulary, not per-application configuration. Two applications that both claim
the `term` prefix but disagree about its types produce files that only one of
them can read. Adding a type or property is a repository change with a
round-trip test and an XSD regeneration behind it; renaming or removing one is a
breaking change. See [the schema page](/schema/) for the shape and
[contributing](/contributing/) for the gate.

**The bpmnlint plugin.** `extension/lint/bpmnlint-plugin-terminology/` is a
private workspace used by this repository's own conformance gate. It is marked
`"private": true` and is not part of the published package, so a consumer cannot
install it; the pattern for writing one is worth copying, the artefact is not
available. The repository is the reference implementation here.

**Custom rendering and element templates.** bpmn-js supports both. This
extension uses neither, and adding a renderer that draws terminology on the
canvas would be a new concern rather than a configuration of an existing one.

## Before you build against it

:::note[The package is bundler-only, and not on npmjs.com]
A plain Node ESM `import` of the barrel fails. This is structural, not a bug
awaiting a fix: `@bpmn-io/properties-panel` ships no export map, and
`preact/hooks` resolves as a directory. Consume the package through Vite,
Rollup, webpack or esbuild — all of which resolve those specifiers the way a
browser bundle needs them.

The package is **not published on npmjs.com**. `extension/package.json` sets
`publishConfig.registry` to `https://npm.pkg.github.com`, so an install requires
the `@forschungsgruppe-digital-health` scope to be pointed at GitHub Packages
with an authenticated token; otherwise consume it from a checkout of this
repository. Plan for that in your lockfile and CI before you design around the
package.
:::

The public surface is the export map, and nothing else. The entries are `.`
(the barrel), `./moddle`, `./properties-panel`, `./properties-panel.css`,
`./vite`, `./types` and `./vite/types`. Deep imports into `src/…` are not
reachable, which is worth knowing before you plan on importing an internal
helper: if it is not in [the barrel](/api/), it is not yours to import. The
most consequential case of that is
[`TerminologyRequestError`](/extending/providers/#signalling-errors), which the
properties panel reads but consumers cannot import.

## Where to go next

- [Writing a terminology provider](/extending/providers/) — the full contract,
  including the metadata the registry reads but the base class does not declare.
- [Reusing the transport adapters](/extending/adapters/) — FHIR R4 terminology
  operations and the Snowstorm API, with authentication, language, timeouts and
  cancellation.
- [API reference](/api/) — the generated reference for every exported symbol.
- [Architecture](/architecture/) — the arc42 chapters, including the building
  block view and the cross-cutting concepts behind these seams.
- [Compatibility](/compatibility/) — peer-dependency ranges and what other BPMN
  tools do with a `term:`-annotated file.
- [Configuration](/configuration/) — everything you can change without writing
  a provider at all, which is more than most integrations need.
