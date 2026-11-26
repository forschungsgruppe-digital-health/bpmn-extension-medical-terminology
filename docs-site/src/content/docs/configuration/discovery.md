---
title: Terminology packages
description: Use bundled or installed FHIR terminology packages without a terminology server.
---

FHIR terminology packages contain `CodeSystem` resources as JSON. This extension can turn
those resources into searchable providers. That is useful for offline use and for small,
redistributable code systems.

You do not need package discovery for the defaults: HL7 terminology, IHE XDS class and type,
and KDL providers are already bundled. You need it only when you want to add another installed
FHIR package or select different resources from one.

:::caution
Installing a package does not automatically grant permission to redistribute its content.
Check the terminology publisher's licence before putting data into a browser bundle.
:::

## Choose an integration

| Your setup | Recommended route |
| --- | --- |
| Vite application | Vite plugin |
| webpack, Rollup, esbuild, or SSR | Generate an ESM registry with the CLI |
| Package data is already available in your code | Pass the `CodeSystem[]` explicitly |

All three routes end in the same runtime provider API. They only differ in how JSON files get
from `node_modules` into code a browser can load.

## Vite: discover at build time

Add the plugin to the host application's Vite configuration:

```js title="vite.config.js"
import { defineConfig } from 'vite';
import { terminologyVitePlugin } from
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/vite';

export default defineConfig({
  plugins: [terminologyVitePlugin()]
});
```

Automatic discovery is deliberately restricted to the package's known defaults:
`hl7.terminology.r4`, the IHE XDS class and type code systems from `de.ihe-d.terminology`, and the
KDL from `dvmd.kdl.r4`. From `hl7.terminology.r4` it leaves out the same third-party code systems
as the bundled preset: SNODENT, the ADA tooth codes, the NUCC provider taxonomy and the W3C colour
codes (see
[Licensing and terminology rights](/licensing/)). The same defaults apply to the
`fdh-terminology-discover` CLI without `--package`, `--include` or `--exclude`, and to
`packageAutoDiscovery`.

:::caution[Explicit selections are not filtered]
Packages you select explicitly, through the plugin's `packages` or the CLI's `--package`,
`--include` or `--exclude`, are imported with every CodeSystem you select. The default runtime
registration (`packageAutoDiscovery`) still applies the defaults above to the plugin's
registry. It registers only the default packages and leaves out the third-party HL7 code
systems. To register an explicit selection as it is, pass it as `packageDiscovery.packages` or
`packageAutoDiscovery: { packages }`. If you register SNODENT, the ADA tooth codes, the W3C colour codes or the NUCC
taxonomy that way, you need their owners' licences.
:::

To load a different installed package, select it explicitly and, preferably, restrict it by
canonical `CodeSystem.url`:

```js title="vite.config.js"
terminologyVitePlugin({
  packages: {
    'my.terminology': {
      include: [ 'https://example.org/CodeSystem/custom' ]
    },
    'other.terminology': {
      exclude: [ 'https://example.org/CodeSystem/deprecated' ]
    }
  },
  autoDiscover: false,
  exclude: [ 'unused.terminology' ],
  includeTransitiveFrom: [ '@my-org/clinical-terminology-bundle' ]
});
```

Use `include: [ '*' ]` only when every CodeSystem in that package belongs in the bundle. An
unknown URL fails the build instead of silently creating an empty provider.

If you prefer explicit imports instead of exposing a global registry, set `exposeGlobal: false`
and import the virtual module in your application entry point:

```js title="vite.config.js"
terminologyVitePlugin({
  exposeGlobal: false
});
```

```js title="src/main.js"
import packages, { packageMetadata } from 'virtual:fdh-terminology-packages';
import {
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const TerminologyModule = createDefaultTerminologyModule({
  packageAutoDiscovery: false,
  packageDiscovery: {
    enabled: true,
    packages,
    metadata: packageMetadata
  }
});
```

:::note
The plugin injects build-time data through a virtual Vite module. It is not an HTTP endpoint;
do not pass `virtual:fdh-terminology-packages` to `fetch()` or use it as a script URL.
:::

## Other build tools: generate an ESM registry

Run the included CLI before your application build:

```bash
npx fdh-terminology-discover \
  --root . \
  --out src/generated/terminology-packages.js \
  --package de.ihe-d.terminology \
  --include de.ihe-d.terminology=http://ihe-d.de/CodeSystems/IHEXDSclassCode
```

Then register the generated data:

```js
import packages, { packageMetadata } from
  './generated/terminology-packages.js';
import {
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const TerminologyModule = createDefaultTerminologyModule({
  packageAutoDiscovery: false,
  packageDiscovery: {
    enabled: true,
    packages,
    metadata: packageMetadata
  }
});
```

Important CLI options:

| Option | Purpose |
| --- | --- |
| `--out <file>` | Required output module |
| `--root <directory>` | Consumer project root (default: current directory) |
| `--package <name>` | Include a package; repeatable |
| `--include <package>=<url>` | Keep one canonical CodeSystem URL; repeatable |
| `--exclude <package>=<url>` | Omit one canonical CodeSystem URL; repeatable |
| `--exclude-package <name>` | Exclude a package during auto-discovery; repeatable |
| `--include-transitive-from <name>` | Follow dependencies from a package; repeatable |
| `--no-auto-discover` | Disable dependency scanning |

Use `npx fdh-terminology-discover --help` for the complete option list.

## Pass package data directly

If your build already imports JSON, pass the resulting FHIR resource array directly:

```js
import customCodeSystem from
  'my.terminology/CodeSystem-custom.json' with { type: 'json' };

const TerminologyModule = createDefaultTerminologyModule({
  packageAutoDiscovery: false,
  packageDiscovery: {
    enabled: true,
    packages: {
      'my.terminology': [ customCodeSystem ]
    },
    metadata: {
      'my.terminology': {
        packageName: 'my.terminology',
        version: '1.0.0'
      }
    }
  }
});
```

This route is framework-neutral. The host only needs to provide FHIR `CodeSystem` objects with
embedded `concept` entries.

### Filter packages, exclude CodeSystems, and override labels at runtime

`packageDiscovery` also supports whitelist filtering (`mode`, `include`, `exclude`),
omitting individual CodeSystem URIs (`excludeSystemUris`), and overriding single-CodeSystem
labels (`componentLabels`):

```js
const TerminologyModule = createDefaultTerminologyModule({
  packageDiscovery: {
    enabled: true,
    mode: 'whitelist',
    include: [ 'my.terminology', 'de.ihe-d.*' ],
    exclude: [ 'my.legacy.terminology' ],
    excludeSystemUris: [ 'https://example.org/CodeSystem/deprecated' ],
    componentLabels: {
      'my.terminology': {
        'https://example.org/CodeSystem/custom': 'House Terminology'
      }
    }
  }
});
```

## Runtime behaviour

- One provider is created per package version.
- A package with no embedded concepts is skipped because it cannot be searched locally.
- CodeSystems already covered by an enabled bundled provider are removed to avoid duplicate
  search results.
- The npm package version labels the provider. A selected coding keeps the independent
  `CodeSystem.version` in `mt:coding/@version`.
- Explicit `packageDiscovery.packages` data takes precedence over auto-discovered data.

For provider IDs, filters, label overrides, and every configuration field, use the generated
[API reference](/api/).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No discovered provider | Ensure the plugin is active or pass `packageDiscovery.packages` |
| Installed custom package is ignored | Select it explicitly; automatic discovery is restricted |
| Provider is skipped | Its CodeSystems may have no embedded `concept` array or duplicate a preset |
| Bundle is unexpectedly large | Select exact canonical URLs instead of importing a whole package |
| Metadata override has no effect with Vite | Put it under `packageDiscovery.metadata` |

See [Configuration](/configuration/) for servers and offline mode, or [Extending](/extending/)
when the source is not a FHIR package.
