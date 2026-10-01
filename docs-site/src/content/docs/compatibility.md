---
title: Compatibility
description: Supported package, runtime, bpmn-js, and framework-independent XML usage.
---

## At a glance

| Area | Current support |
| --- | --- |
| Package format | Raw ESM |
| Application build | Vite, Rollup, webpack, esbuild, or comparable bundler |
| Node for repository development | Node.js 24 or later |
| bpmn-js | `>=15` |
| bpmn-js-properties-panel | `>=5` |
| @bpmn-io/properties-panel | `>=3` |
| Other BPMN frameworks | XML format usable if unknown extension elements are preserved |
| Registry | GitHub Packages |

## Installation

The package is published under the GitHub organisation scope. Configure the scope in the
consumer's `.npmrc` and authenticate with a GitHub token that can read packages:

```ini
@forschungsgruppe-digital-health:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

It is not currently published on npmjs.com. Do not commit a token to the repository.

## JavaScript and bpmn-js

The library ships source ESM instead of a compiled browser bundle. Its public barrel also
loads the properties-panel integration, whose dependency resolution requires a bundler.
Use it from an application build rather than importing the barrel directly in a plain Node
process.

The host owns `bpmn-js` and the properties-panel packages through peer dependencies. Keep
their installed versions inside the ranges shown above and import the normal host styles in
addition to `properties-panel.css` from this package.

Always register the XML descriptor:

```js
moddleExtensions: {
  mt: TerminologyModdleDescriptor
}
```

Without it, bpmn-js cannot create typed terminology objects and may report or discard
unrecognized `mt:` content during serialization.

## Other BPMN tools

The serialized format is ordinary BPMN `extensionElements` in its own namespace. A tool
does not need the properties-panel code or terminology providers to exchange it. It does
need to preserve unknown extension content on save.

Compatibility therefore has two separate levels:

- **Full bpmn-js integration:** visual editing, search, provider configuration, and typed
  moddle objects.
- **XML interoperability:** direct reading and writing of `mt:` elements in Camunda or a
  custom framework.

Before adoption, open an annotated test file in the target tool, save it, and compare the
`mt:` elements. BPMN conformance alone does not guarantee that an editor preserves foreign
extensions. See [XML schema](/schema/) for the framework-independent contract.

## Coexisting with other extensions

Multiple moddle extensions can share one BPMN file if every extension uses a distinct
namespace URI and registration key:

```js
const modeler = new BpmnModeler({
  moddleExtensions: {
    mt: TerminologyModdleDescriptor,
    custom: CustomDescriptor
  }
});
```

Do not register two descriptors with the same namespace URI. The conventional `mt` key
should also be used consistently across the application and fixtures.

The terminology stylesheet is scoped below `.medical-terminology`, but the host remains
responsible for loading the base bpmn-js and properties-panel styles.

## Current limitations

- The package is pre-1.0 and its JavaScript API may still change.
- The package is not available from npmjs.com.
- The barrel import is designed for bundlers, not plain Node ESM.
- The repository's bpmnlint plugin is used internally and is not a separately published
  consumer package.
- Foreign BPMN editors may discard extension content they do not understand.

See [Support](/support/) for reporting compatibility problems.
