# BPMN Extension Medical Terminology

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/validate.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/validate.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

`@forschungsgruppe-digital-health/terminology` adds machine-readable medical
terminology to BPMN process models. It provides a `term:`
moddle extension for XML serialization, a bpmn-js properties-panel provider,
terminology services, and a Vite plugin for discovering terminology packages.

All annotations are stored as standard BPMN 2.0 `extensionElements`, so BPMN
tools that do not understand the extension preserve the model unchanged.

> **Live Demo:** [bpmn-extension-medical-terminology](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/)

## Funding

This work is part of **MiHUB – Medical Informatics Hub**, a Digital Progress Hub
(Digitaler FortschrittsHub Gesundheit) of the German Medical Informatics
Initiative (MII).

MiHUB is funded by the German Federal Ministry of Research, Technology and Space
(Bundesministerium für Forschung, Technologie und Raumfahrt, BMFTR) under grant
number **01ZZ2506A** (01/2026 – 12/2029). The responsibility for the content of
this publication lies with the authors.

- Project: <https://mihubx.de/mihub/>
- Funding record: [Förderkatalog des Bundes, FKZ 01ZZ2506A](https://foerderportal.bund.de/foekat/jsp/SucheAction.do?actionMode=view&fkz=01ZZ2506A)
- Funder: BMFTR ([ROR 04pz7b180](https://ror.org/04pz7b180))

<details>
<summary>Förderhinweis (deutsch)</summary>

Das diesem Repository zugrunde liegende Vorhaben wurde mit Mitteln des
Bundesministeriums für Forschung, Technologie und Raumfahrt (BMFTR) unter dem
Förderkennzeichen 01ZZ2506A gefördert. Die Verantwortung für den Inhalt dieser
Veröffentlichung liegt bei den Autor:innen.

</details>

## Table of Contents

- [Funding](#funding)
- [Motivation](#motivation)
- [Features](#features)
- [Package](#package)
- [Quick Start](#quick-start)
- [Programmatic Usage](#programmatic-usage)
- [Package Discovery with Vite](#package-discovery-with-vite)
- [Generated XML](#generated-xml)
- [Demo](#demo)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Citation](#citation)
- [License](#license)

## Motivation

BPMN 2.0 is widely used for modelling clinical pathways, but its elements do
not carry machine-readable clinical terminology semantics. A task labelled
“CT-Thorax” has no link to a SNOMED CT procedure code or an IHE XDS document
type. This limits reliable clinical process automation and interoperability.

This extension adds terminology annotations for systems such as SNOMED CT,
LOINC, ICD-10-GM, OPS, IHE XDS, KDL, and other FHIR-hosted code systems.
Terminology annotations are optional and remain isolated in the `term:`
namespace under BPMN `extensionElements`.

## Features

- Multi-code annotations on BPMN Tasks, DataObjects, Events, Gateways, and
  MessageFlows.
- Provider architecture for SNOMED CT via Ontoserver/FHIR by default or a
  custom Snowstorm endpoint, package-backed HL7 resources, IHE XDS, and KDL.
- Stable annotation IDs and optional coded entries.
- Offline static providers for small terminology systems.
- Interactive bpmn-js properties-panel integration.
- Terminology registry with search, lookup, and validation operations.
- Package-backed terminology providers with automatic or explicit discovery.
- Vite resource filtering by exact canonical `CodeSystem.url`.
- Raw ESM package with no library build step.

## Package

| Package | Location | Description |
|---|---|---|
| `@forschungsgruppe-digital-health/terminology` | [`extension/`](extension/) | Terminology annotations, providers, moddle extension, properties panel, and Vite discovery |
| Demo | [`demo/`](demo/) | Private bpmn-js integration example |

Install the published package from GitHub Packages:

```bash
npm install @forschungsgruppe-digital-health/terminology
```

Configure the `@forschungsgruppe-digital-health` scope to use
`https://npm.pkg.github.com` before installing from GitHub Packages.

## Quick Start

### Prerequisites

- Node.js 22 or later for development
- An application using bpmn-js 15 or later
- `bpmn-js-properties-panel` 5 or later when using the properties panel

### Integrate into a bpmn-js modeler

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule,
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/terminology';
import '@forschungsgruppe-digital-health/terminology/properties-panel.css';

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    TerminologyPropertiesPanelModule,
    createDefaultTerminologyModule()
  ],
  moddleExtensions: {
    term: TerminologyModdleDescriptor
  }
});
```

The package CSS contains only the structural styles for the terminology
entries. Import the official bpmn-js and properties-panel styles in the host
application as usual; the terminology styles inherit its fonts, colors, and
CSS variables.

## Programmatic Usage

```js
import {
  SnomedCtProvider,
  createTerminologyModule,
  createTerminologyServices,
  addAnnotation
} from '@forschungsgruppe-digital-health/terminology';

const terminologyServices = createTerminologyServices({
  providers: [
    new SnomedCtProvider({
      baseUrl: 'https://snowstorm.example.com'
    })
  ],
  loaderConfig: {
    fhirBaseUrl: 'https://fhir.example.com'
  }
});

await terminologyServices.terminologyProviderLoader
  .ensureProvider('http://terminology.hl7.org/CodeSystem/v3-ActCode');

const results = await terminologyServices.terminologyRegistry
  .search('pneumonia', 'snomed-ct');

const TerminologyServicesModule =
  createTerminologyModule(terminologyServices);

addAnnotation(businessObject, moddle, {
  id: 'term-ann-1',
  text: 'CT-Thorax mit Kontrastmittel',
  codings: [{
    system: 'http://snomed.info/sct',
    code: '169069000',
    display: 'CT of chest'
  }]
});
```

`createDefaultTerminologyServices()` provides the standard service setup used
by the demo and by a plain app after installation: SNOMED CT, FHIR
terminology-server providers, and package-backed terminology providers are all
available with sensible defaults, so the extension works out of the box after
`npm install`.

### Default service configuration

| Option | Purpose |
|---|---|
| `serverConfig` | Override FHIR, SNOMED, and Snowstorm server base URLs |
| `enableSnomed` | Enable or disable the default SNOMED provider |
| `enableFhirDefaults` | Enable or disable built-in FHIR providers |
| `enablePackageDefaults` | Enable or disable bundled package providers |
| `disabledProviderIds` | Disable providers by ID |
| `snomedConfig` | Override SNOMED provider settings |
| `fhirProviderOverrides` | Override built-in FHIR providers |
| `additionalFhirProviders` | Add additional FHIR providers |
| `additionalPackageProviders` | Add package-backed providers |
| `packageProviderOptions` | Override a bundled package provider's `componentLabel` or complete `displayName` |
| `packageDiscovery` | Configure explicit package registration and filtering |
| `packageAutoDiscovery` | Use packages exposed by a bundler or host application |
| `loaderConfig` | Override or disable provider loading |

Bundled and generated package provider labels use `Package name (version) —
component`. For example, the bundled IHE XDS providers are labelled by their
package and their distinct document class or document type component. Generated
registries use the canonical package name even when the package manifest also
contains a longer title. Override only the component label while preserving the
package metadata:

```js
createDefaultTerminologyServices({
  packageProviderOptions: {
    'ihe-xds-class': {
      componentLabel: 'XDS document class'
    }
  }
});
```

Set `displayName` instead when the application needs to replace the entire
label.

Package discovery creates one aggregate provider per package. When exactly one
CodeSystem is selected from a package, its FHIR `title`, `name`, `id`, or
canonical URL is appended as the component. `componentLabels` overrides that
component by package name and canonical CodeSystem URL. Invalid provider IDs,
package names, or CodeSystem URLs fail fast with a descriptive error.

TypeScript consumers can import the public configuration types from
`@forschungsgruppe-digital-health/terminology/types`.

Example:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/terminology';

const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    fhirBaseUrl: 'https://r4.ontoserver.csiro.au/fhir',
    snomedBaseUrl: 'https://r4.ontoserver.csiro.au/fhir'
  },
  snomedConfig: {
    transport: 'fhir'
  },
  disabledProviderIds: ['atc'],
  fhirProviderOverrides: [
    {
      id: 'icd-10-gm',
      expandParameters: { valueSetVersion: '2024' }
    }
  ]
});
```

The default SNOMED provider uses the FHIR API at
`https://r4.ontoserver.csiro.au/fhir`. To use a custom Snowstorm deployment
or a same-origin proxy, keep the provider ID unchanged and change its
transport and base URL.

```js
const terminologyServices = createDefaultTerminologyServices({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: '/api/snowstorm/snomed-ct'
  }
});
```

For another FHIR terminology server, keep `transport: 'fhir'` and set
`serverConfig.snomedBaseUrl` or `snomedConfig.baseUrl`. For a Snowstorm
instance, use `transport: 'snowstorm'` as shown above.

### CORS, proxies, and custom fetch functions

Browsers enforce CORS at the network boundary. The extension cannot make a
browser trust a third-party SNOMED/FHIR origin that does not include the
necessary CORS headers. In practice, this means a browser app must either:

- call a same-origin proxy, or
- use a backend endpoint that proxies the target terminology server, or
- pass a custom `fetchFn` so the app can route the request through a trusted
  server-side path.

The public config API supports this directly:

```js
const terminologyServices = createDefaultTerminologyServices({
  fetchFn: async (url, init) => {
    const response = await fetch(`/api/terminology?target=${encodeURIComponent(url)}`, {
      ...init,
      headers: {
        ...init?.headers,
        'X-Requested-By': 'bpmn-terminology'
      }
    });

    return response;
  }
});
```

This is the supported extension-side hook for CORS-sensitive deployments. The
browser itself still blocks direct cross-origin requests unless the remote
server explicitly allows them.

### Out-of-the-box defaults and external overrides

After installation in a bpmn-js app, the extension is designed to work without
manual provider registration. It ships with sensible defaults for:

- SNOMED CT via Ontoserver/FHIR (`https://r4.ontoserver.csiro.au/fhir` by
  default)
- FHIR terminology servers such as LOINC, ICD-10-GM, OPS, and ATC
- default package-backed providers for common bundled terminology packages
- automatic discovery of already installed terminology packages in the app

The app can override any of these defaults from the outside by passing the
public configuration object into `createDefaultTerminologyServices(...)`:

```js
const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    fhirBaseUrl: 'https://r4.ontoserver.csiro.au/fhir',
    snomedBaseUrl: 'https://r4.ontoserver.csiro.au/fhir'
  },
  snomedConfig: {
    transport: 'fhir'
  },
  packageDiscovery: {
    enabled: true,
    include: ['*'],
    mode: 'auto'
  },
  packageMetadata: {
    'hl7.terminology.r4': {
      title: 'HL7 Terminology (Custom)',
      version: '1.0.0'
    }
  },
  disabledProviderIds: ['atc']
});
```

This keeps the package usable in a plain app while still exposing a clean
extension point for downstream projects that want to point to their own servers,
package sets, or terminology metadata.

The bundled HL7, IHE XDS, and KDL providers do not require the Vite discovery
plugin. The `packageAutoDiscovery` option is for additional packages exposed by
the host application; native ESM hosts can provide those packages explicitly
through `packageDiscovery`.

Installed terminology packages are discovered automatically by default when a
Vite app exposes them through `globalThis.__FDH_TERMINOLOGY_PACKAGES__` or the
terminology Vite plugin. You can disable the default automatic discovery with
`packageAutoDiscovery: false`, or provide an explicit package set via
`packageDiscovery`.

When package discovery is explicitly enabled but no packages are exposed by the
bundler, the extension writes an actionable warning to the browser console.
The built-in package providers remain available; configure
`packageDiscovery.packages`, provide `packageAutoDiscovery.globFn`, or expose
`globalThis.__FDH_TERMINOLOGY_PACKAGES__` for additional package-backed
providers.

### Cross-bundler discovery

For Webpack, Rollup, esbuild, SSR, or other non-Vite builds, generate a plain
ESM registry during the application build:

```bash
npx fdh-terminology-discover \
  --root . \
  --out src/generated/terminology-packages.js \
  --package de.ihe-d.terminology
```

Register the generated registry without using a bundler plugin:

```js
import packages, { packageMetadata } from
  './generated/terminology-packages.js';

createDefaultTerminologyServices({
  packageAutoDiscovery: false,
  packageDiscovery: {
    enabled: true,
    packages,
    metadata: packageMetadata
  }
});
```

The generated file contains ordinary ESM data and does not require a JSON
loader or Vite-specific API. Use `--include <package>=<CodeSystem.url>` to keep
only selected CodeSystems in the generated registry. Supplying `--include` or
`--package` selects an explicit package set; it does not mean automatic
discovery of every installed package. Use `--exclude-package` when automatic
discovery should remain enabled while omitting complete packages.

The CLI is optional. The runtime API is bundler-neutral and can receive an
already imported package collection directly:

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

An application may also generate the same plain ESM registry with its own
Node.js, esbuild, Webpack, or Rollup build step. The browser only consumes the
resulting `packages` object; it cannot scan `node_modules` at runtime.

## Package Discovery with Vite

Install the terminology package that contains the CodeSystems:

```bash
npm install <your-terminology-package>
```

Configure the discovered packages and their CodeSystem filters in `vite.config.js`:

```js
import { defineConfig } from 'vite';
import { terminologyVitePlugin } from
  '@forschungsgruppe-digital-health/terminology/vite';

const discoveryPackages = {
  'de.ihe-d.terminology': { include: ['*'] },
  'dvmd.kdl.r4': { include: ['*'] },
  'hl7.terminology.r4': { include: ['*'] },
  'hl7.fhir.r4.core': {
    include: ['http://hl7.org/fhir/abstract-types']
  },
  'hl7.fhir.uv.extensions.r4': { include: ['*'] }
};

export default defineConfig({
  plugins: [
    terminologyVitePlugin({
      packages: discoveryPackages
    })
  ]
});
```

Each package entry supports the documented resource filters:

```js
const discoveryPackages = {
  'hl7.fhir.r4.core': {
    include: ['http://hl7.org/fhir/abstract-types'],
    exclude: []
  }
};
```

Enable discovery in the terminology services:

```js
createDefaultTerminologyServices({
  packageAutoDiscovery: true
});
```

The plugin discovers installed FHIR terminology packages from the application's
dependency graph and exposes them on
`globalThis.__FDH_TERMINOLOGY_PACKAGES__`. The services create one provider
per discovered package. Each provider searches all CodeSystems in that package,
so the properties-panel dropdown stays compact while the selected coding still
keeps its concrete CodeSystem URL and version.

The package names are explicit keys in `packages`. Within each package,
`include` and `exclude` match exact canonical `CodeSystem.url` values, never
filenames. `exclude` takes precedence over `include`, and `include: ['*']`
loads every CodeSystem from that package. A configured URL that does not exist
in the package causes an error.

The repository demo itself uses the bundled providers and default terminology
configuration. The filtered `packages` examples above are integration
configurations for applications that want to restrict the available package
content.

## Generated XML

Terminology annotations are persisted as standard BPMN 2.0 extension elements:

```xml
<bpmn2:dataObject id="DataObj_Befund" name="CT-Befundbericht"
                  xmlns:term="https://clinical-bpmn.org/terminology/v1">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1"
                       text="CT-Befund Thorax mit KM">
        <term:coding system="http://snomed.info/sct"
                     code="169069000"
                     display="CT of chest (procedure)"/>
      </term:annotation>
    </term:annotations>
  </bpmn2:extensionElements>
</bpmn2:dataObject>
```

Clinical data belongs only in `term:` elements under
`bpmn:extensionElements`. It must not change BPMN core or BPMN-DI structures.

## Demo

The interactive demo is deployed to GitHub Pages on pushes to `main`:

[bpmn-extension-medical-terminology demo](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/)

Run it locally:

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
npm run dev
```

The demo uses the extension's bundled package providers and default
Ontoserver/FHIR configuration without terminology-specific Vite setup. The
public service configuration supports switching to a custom Snowstorm instance,
a same-origin proxy, or another FHIR terminology server.

## Documentation

| Document | Audience | Content |
|---|---|---|
| [README.md](README.md) | Users and integrators | Features, setup, usage, and discovery |
| [Extending bpmn.io](docs/EXTENDING.md) | Developers and contributors | BPMN 2.0, bpmn.io, moddle, properties panel, linting, and validation primer |
| [Terminology extension user story](docs/user-stories/terminology-extension-mvp.md) | Maintainers and stakeholders | Dated current scope, implemented capabilities, and planned follow-up |
| [Architecture](docs/ARCHITECTURE.md) | Contributors and integrators | Complete arc42 architecture documentation |
| [Architecture decisions](docs/adr/) | Maintainers and contributors | Accepted ADRs and ADR template |
| [Schema](schema/README.md) | XML/tooling integrators | Generated terminology XSD and usage |
| [Valid BPMN examples](examples/valid/README.md) | Contributors and users | Synthetic conformance fixtures |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | Development, testing, branching, and publishing |
| [SECURITY.md](SECURITY.md) | Maintainers and security reporters | Vulnerability reporting and data-handling rules |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | All contributors | Community standards and reporting |
| [CHANGELOG.md](CHANGELOG.md) | Maintainers and release reviewers | Repository-level release history |
| [AGENTS.md](AGENTS.md) | Automation and agents | Repository rules and quality gates |

## Contributing

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
npm test
npm run verify
```

`npm run verify` runs package-convention checks, BPMN conformance checks, and
the extension test suite. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full
contributor and publishing guide.

## Citation

If you use this software, please cite it using the metadata in
[CITATION.cff](CITATION.cff).
Broader machine-readable software metadata is available in
[codemeta.json](codemeta.json).

## License

MIT © Technische Universität Dresden, Forschungsgruppe Digital Health.
See [LICENSE](LICENSE).

### bpmn.io watermark

This extension targets [bpmn.io](https://bpmn.io). bpmn-js is a peer dependency and
is not distributed with this package. bpmn-js is published under MIT terms with one
additional condition: the code that renders the bpmn.io watermark must not be removed
or altered, and the watermark must stay fully visible and unobstructed in any website
or application that uses it. This applies to the playground in `demo/` and to any
application built on this extension. See <https://bpmn.io/license/>.

### Terminology content

This extension stores code system identifiers and codes only. It ships no SNOMED CT,
LOINC or ICD-10 content — no display names, descriptions, hierarchies or excerpts.
Using those terminologies in an application requires the licenses of their respective
publishers: an Affiliate License via BfArM/MLDS for SNOMED CT, the LOINC Copyright
Notice and License for LOINC, and the BfArM terms of use for ICD-10-GM.
