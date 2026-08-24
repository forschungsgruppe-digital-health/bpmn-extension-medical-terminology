# BPMN Extension Medical Terminology

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/ci.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

`@forschungsgruppe-digital-health/terminology` adds machine-readable clinical
terminology annotations to BPMN process models. It provides a `term:`
moddle extension for XML serialization, a bpmn-js properties-panel provider,
terminology services, and a Vite plugin for discovering terminology packages.

All annotations are stored as standard BPMN 2.0 `extensionElements`, so BPMN
tools that do not understand the extension preserve the model unchanged.

> **Live Demo:** [bpmn-extension-medical-terminology](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/)

## Table of Contents

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
  .searchAll('pneumonia');

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
| `packageAutoDiscovery` | Enable Vite-driven package discovery |
| `loaderConfig` | Override or disable provider loading |

Package-backed provider labels use `Package title (version) — component`.
For example, the bundled IHE XDS providers are labelled by their package and
their distinct document class or document type component. Override only the
component label while preserving the package metadata:

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

Installed terminology packages are discovered automatically by default when a
Vite app exposes them through `globalThis.__FDH_TERMINOLOGY_PACKAGES__` or the
terminology Vite plugin. You can disable the default automatic discovery with
`packageAutoDiscovery: false`, or provide an explicit package set via
`packageDiscovery`.

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

The demo uses the extension's default Ontoserver/FHIR configuration. The
public service configuration supports switching to a custom Snowstorm
instance, a same-origin proxy, or another FHIR terminology server.

## Documentation

| Document | Audience | Content |
|---|---|---|
| [README.md](README.md) | Users and integrators | Features, setup, usage, and discovery |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | Development, testing, branching, and publishing |
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

## License

[Apache License 2.0](LICENSE)

This repository contains software under Apache 2.0. The terminology systems it
integrates with, including SNOMED CT, LOINC, ICD-10-GM, and KDL, may have
separate licensing terms that apply independently.
