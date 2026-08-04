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
- Provider architecture for SNOMED CT via Snowstorm, FHIR terminology
  servers, package-backed HL7 resources, IHE XDS, and KDL.
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
  createKdlProvider,
  createPackageFallbackProvider,
  createTerminologyModule,
  createTerminologyServices,
  addAnnotation
} from '@forschungsgruppe-digital-health/terminology';
import actCodeCodeSystem from
  'hl7.terminology.r4/CodeSystem-v3-ActCode.json';

const terminologyServices = createTerminologyServices({
  providers: [
    new SnomedCtProvider({
      baseUrl: 'https://snowstorm.example.com'
    }),
    createKdlProvider(),
    createPackageFallbackProvider({
      id: 'hl7-v3-actcode',
      displayName: 'HL7 v3 ActCode',
      systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      codeSystem: actCodeCodeSystem,
      fallbackFhirConfig: {
        systemUri: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        valueSetUri: 'http://terminology.hl7.org/ValueSet/v3-ActCode',
        baseUrl: 'https://fhir.example.com'
      }
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
by the demo: SNOMED CT, FHIR terminology-server providers, and package-backed
terminology providers.

### Default service configuration

| Option | Purpose |
|---|---|
| `serverConfig` | Override FHIR and Snowstorm server base URLs |
| `enableSnomed` | Enable or disable the default SNOMED provider |
| `enableFhirDefaults` | Enable or disable built-in FHIR providers |
| `enablePackageDefaults` | Enable or disable built-in package providers |
| `disabledProviderIds` | Disable providers by ID |
| `snomedConfig` | Override SNOMED provider settings |
| `fhirProviderOverrides` | Override built-in FHIR providers |
| `additionalFhirProviders` | Add additional FHIR providers |
| `packageProviderOptions` | Override built-in package providers |
| `hl7CodeSystems` | Inject explicit HL7 CodeSystems |
| `additionalPackageProviders` | Add package-backed providers |
| `packageDiscovery` | Configure explicit package registration and filtering |
| `packageAutoDiscovery` | Enable Vite-driven package discovery |
| `loaderConfig` | Override or disable provider loading |

Example:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/terminology';

const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    fhirBaseUrl: 'https://r4.ontoserver.csiro.au/fhir',
    snowstormBaseUrl:
      'https://snowstorm-training.snomedtools.org/snowstorm/snomed-ct'
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

## Package Discovery with Vite

Install the terminology package that contains the CodeSystems:

```bash
npm install <your-terminology-package>
```

Register the plugin in `vite.config.js`:

```js
import { defineConfig } from 'vite';
import { terminologyVitePlugin } from
  '@forschungsgruppe-digital-health/terminology/vite';

export default defineConfig({
  plugins: [
    terminologyVitePlugin({
      packages: {
        'hl7.fhir.r4.core': {
          include: [
            'http://terminology.hl7.org/CodeSystem/condition-clinical',
            'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
          ]
        }
      }
    })
  ]
});
```

Enable discovery in the terminology services:

```js
createDefaultTerminologyServices({
  packageAutoDiscovery: true
});
```

The plugin exposes discovered packages on
`globalThis.__FDH_TERMINOLOGY_PACKAGES__`.

`include` and `exclude` select resources by exact canonical `CodeSystem.url`,
never by filename. `exclude` takes precedence over `include`.
`include: ['*']` includes every CodeSystem in the selected package. Omitting
both filters also includes the complete package. A configured URL that does
not exist in the package causes an error.

To discover transitive dependencies explicitly:

```js
terminologyVitePlugin({
  includeTransitiveFrom: [
    '@forschungsgruppe-digital-health/terminology'
  ],
  exclude: [
    'hl7.fhir.r4.core',
    'hl7.fhir.uv.extensions.r4'
  ]
});
```

When using `createDefaultTerminologyServices(...)`, pass
`packageDiscovery: { exclude: [] }` if built-in package and FHIR
infrastructure packages should also be discovered.

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

The demo keeps server endpoints and terminology discovery settings in
[`demo/src/terminology-config.js`](demo/src/terminology-config.js).

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
