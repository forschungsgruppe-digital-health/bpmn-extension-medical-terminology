---
title: Medical terminology for BPMN
description: A bpmn.io extension that binds SNOMED CT, LOINC, ICD-10-GM, OPS, ATC, IHE-D and KDL codes to BPMN elements and stores them as standard BPMN 2.0 extension elements.
---

Give the tasks, documents and decisions in a clinical pathway model a machine-readable meaning — without
changing BPMN itself.

[What it is for](/use-cases/) · [API reference](/api/)

## What it does

This package adds an optional terminology layer to [bpmn-js](https://bpmn.io): a BPMN element can carry
one or more annotations, and each annotation can carry any number of codings — a code system URI, a code,
a display text and a version. Everything is persisted as ordinary BPMN 2.0 `extensionElements` in a
separate `mt:` namespace, so the extension never touches BPMN core structures or the diagram layout.

Alongside the data model it ships the pieces you need to actually produce that data: a moddle descriptor,
a bpmn-js properties-panel group with concept search, terminology providers for SNOMED CT and for
FHIR-hosted code systems, offline providers backed by installed FHIR terminology packages, and build-time
discovery for those packages.

## A minimal integration

```js title="modeler.js"
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule,
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    TerminologyPropertiesPanelModule,
    createDefaultTerminologyModule()
  ],
  moddleExtensions: {
    mt: TerminologyModdleDescriptor
  }
});
```

Three things have to line up, and all three are in the snippet above:
`TerminologyPropertiesPanelModule` draws the **Medical terminology** group in the properties panel,
`createDefaultTerminologyModule()` supplies the providers that group searches, and the
`moddleExtensions` entry is what lets bpmn-js read and write the `mt:` elements at all.

:::caution[The most common mistake]
Registering `TerminologyPropertiesPanelModule` *without* a terminology module is the mistake almost
everyone makes first. The panel still appears and you can still save an annotation, but the coding
fieldset reports that no terminology systems are available, leaving free text as the only thing you can
record. See [the properties panel](/properties-panel/) for the full wiring, including how to configure
providers instead of taking the defaults.
:::

The package CSS contains only the structural styles for the terminology entries. Import the usual bpmn-js
and properties-panel stylesheets in the host application; the terminology styles inherit their fonts,
colours and CSS variables.

## Current status

This is pre-1.0 research software from the [MiHUB](https://mihubx.de/mihub/) project at TU Dresden. It is
used, it is tested, and the data model is stable enough to put in a file you intend to keep — but the
public surface is still moving. Three things are worth knowing before you adopt it:

- **It is not on npmjs.com.** The release workflow publishes to GitHub Packages, which needs a scope
  registry entry pointing at `https://npm.pkg.github.com` and an authenticated GitHub account; the
  dependable route today is installing from a checkout of the repository.
  [Getting it](/contributing/) walks through both.
- **It is bundler-only.** The package ships raw ESM with no build step, and its properties panel reaches
  into `@bpmn-io/properties-panel/preact/hooks` — a directory import that bundlers resolve and the Node
  ESM loader rejects, so a plain Node `import` of the barrel fails during module resolution. Under Vite,
  Rollup, webpack or esbuild it works; in a bare Node script it does not.
  [Compatibility](/compatibility/) has the detail.
- **The namespace URI is a stable format identifier.**
  `https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1`
  identifies XML format v1 and resolves to its generated contract, descriptor and XSD.
  See [Namespace v1](/ns/terminology/v1/).

Known functional gaps — notably that undo does not currently cover adding or removing an annotation, and
that a saved annotation cannot be edited in place — are described on
[the properties panel page](/properties-panel/) and tracked on [the roadmap](/roadmap/).

## Where to go next

| If you want to… | Read |
|---|---|
| decide whether this solves your problem | [Use cases](/use-cases/) |
| wire it into an application and choose providers | [Configuration](/configuration/) · [Defaults](/configuration/defaults/) |
| ship terminology content with your build instead of calling a server | [Package discovery](/configuration/discovery/) |
| add your own code system | [Extending](/extending/) · [Providers](/extending/providers/) · [Adapters](/extending/adapters/) |
| validate or process the XML outside a modeler | [Schema](/schema/) · [Compatibility](/compatibility/) |
| understand how the pieces fit together | [Architecture](/architecture/) · [Background](/background/) |
| look up an export, an option or a type | [API reference](/api/) |
| contribute, or report something broken | [Contributing](/contributing/) · [Support](/support/) |

The repository, including the runnable demo modeler in
[`demo/src/app.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/demo/src/app.js),
is on [GitHub](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology).
The package is MIT licensed; the terminology content it can reach is not necessarily — see
[Background](/background/) for what is bundled and what that means for licensing.
