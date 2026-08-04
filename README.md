# bpmn-js-clinical-semantics

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/actions/workflows/ci.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Semantic clinical annotations and FHIR resource mapping for BPMN process models.**

Two independent [bpmn-js](https://github.com/bpmn-io/bpmn-js) extension libraries that add clinical context to BPMN diagrams without modifying the BPMN standard. Each library provides a moddle extension (for XML serialization) and a properties panel provider (for interactive editing). Both annotation layers are stored as standard BPMN 2.0 `extensionElements`, preserving full backwards compatibility with every BPMN engine and viewer.

> **Live Demo:** [forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics](https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/)

---

## Table of Contents

- [Motivation](#motivation)
- [Features](#features)
- [Packages](#packages)
- [Quick Start](#quick-start)
- [Programmatic Usage](#programmatic-usage)
- [Generated XML](#generated-xml)
- [Demo and GitHub Pages](#demo-and-github-pages)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Motivation

BPMN 2.0 is widely used for modelling clinical pathways, but its elements carry no machine-readable clinical semantics. A task labelled "CT-Thorax" has no link to a SNOMED CT procedure code, no classification as an IHE XDS document type, and no mapping to a FHIR resource. This makes BPMN diagrams unreliable for clinical process automation, cross-institutional pathway exchange, and FHIR-based interoperability.

**bpmn-js-clinical-semantics** closes this gap by adding two optional annotation layers: terminology annotations (`term:` namespace) for codes from SNOMED CT, LOINC, ICD-10-GM, OPS, IHE XDS, KDL, and other systems; and FHIR resource mappings (`fhirmap:` namespace) for declaring resource types, profiles, interactions, and key elements. Both layers use standard BPMN `extensionElements`, so non-clinical tools simply ignore them.

For the full background and design rationale, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Features

### Terminology Annotations (`@bpmn-js-clinical-semantics/terminology`)

- [x] Multi-code annotation of any BPMN element (Tasks, DataObjects, Events, Gateways, MessageFlows)
- [x] Pluggable provider architecture with built-in support for SNOMED CT (via Snowstorm), any FHIR-hosted code system (LOINC, ICD-10-GM, OPS, ATC, ICD-O-3), package-backed HL7 terminology resources, IHE XDS classCode/typeCode, and KDL
- [x] Annotation model with stable `id` bindings and optional coded entries
- [x] Optional FHIRPath mapping targets
- [x] Extensibility without code changes -- new terminology systems via `TerminologyProvider` interface
- [x] Offline-capable static providers for small code systems (IHE XDS, KDL)
- [x] Interactive properties panel integration for the bpmn-js modeler
- [x] TerminologyRegistry facade with search, searchAll, lookup, and validate
- [ ] Terminology validation at design time (real-time code verification against server)
- [ ] Auto-complete / type-ahead search in properties panel
- [ ] Import terminology bindings from existing FHIR profiles
- [ ] Bulk export of annotations as FHIR CodeSystem/ValueSet resources

### FHIR Resource Mapping (`@bpmn-js-clinical-semantics/fhir-mapping`)

- [x] Resource-level FHIR mapping (resourceType, profile URL, interaction, direction)
- [x] Key element binding with FHIRPath expressions, semantic roles, fixed values, and terminology bindings
- [x] Search parameter declaration for FHIR search-type interactions
- [x] JSON export of all FHIR mappings from a BPMN model
- [x] Independent from the terminology package -- usable separately or together
- [ ] FHIR Bundle generation from annotated process models
- [ ] StructureMap generation and validation
- [ ] FHIR R5 SubscriptionTopic support
- [ ] Automated conformance checking against FHIR profiles

### Vue Integration (`@bpmn-js-clinical-semantics/vue`)

- [x] `useTerminology()` and `useFhirMapping()` composables for Vue 3
- [ ] Additional framework integrations (React, Angular)

### Tooling and Quality

- [x] 173 unit tests covering core modules, adapters, providers, helpers, and public API
- [x] CI pipeline on Node 18 and 20
- [x] GitHub Pages deployment of interactive demo
- [ ] TypeScript type definitions (.d.ts)
- [ ] End-to-end tests with bpmn-js integration
- [ ] Automated release pipeline with changelog generation

---

## Packages

| Package | Description | Install |
|---|---|---|
| [`@forschungsgruppe-digital-health/terminology`](packages/terminology/) | Terminology annotation engine, providers, moddle extension, properties panel | `npm i @forschungsgruppe-digital-health/terminology` |
| [`@forschungsgruppe-digital-health/fhir-mapping`](packages/fhir-mapping/) | FHIR resource mapping, moddle extension, properties panel | `npm i @forschungsgruppe-digital-health/fhir-mapping` |
| [`@forschungsgruppe-digital-health/demo`](packages/demo/) | Vue 3 demo app (private; not published) | (not published) |

Either package can be installed independently. The Vue package is optional and only needed for Vue 3 projects.

Packages are published to the [GitHub Package Registry](https://docs.github.com/en/packages). See [CONTRIBUTING.md](CONTRIBUTING.md#configuring-npm-for-the-github-registry) for registry configuration.

---

## Quick Start

### Prerequisites

- Node.js >= 18
- An existing project using [bpmn-js](https://github.com/bpmn-io/bpmn-js) >= 15 and [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel) >= 5

### Install

```bash
npm install @bpmn-js-clinical-semantics/terminology @bpmn-js-clinical-semantics/fhir-mapping
```

### Integrate into your bpmn-js modeler

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule
} from '@bpmn-js-clinical-semantics/terminology';

import {
  FhirMappingModdleDescriptor,
  FhirMappingPropertiesPanelModule
} from '@bpmn-js-clinical-semantics/fhir-mapping';

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule,     // adds "Klinische Annotation" group
    FhirMappingPropertiesPanelModule      // adds "FHIR Resource Mapping" group
  ],
  moddleExtensions: {
    term: TerminologyModdleDescriptor,    // term: namespace in XML
    fhirmap: FhirMappingModdleDescriptor  // fhirmap: namespace in XML
  }
});
```

---

## Programmatic Usage

```js
import {
  SnomedCtProvider,
  createKdlProvider,
  createPackageFallbackProvider,
  createTerminologyModule,
  createTerminologyServices,
  addAnnotation
} from '@bpmn-js-clinical-semantics/terminology';
import actCodeCodeSystem from 'hl7.terminology.r4/CodeSystem-v3-ActCode.json';

const terminologyServices = createTerminologyServices({
  providers: [
    new SnomedCtProvider({ baseUrl: 'https://snowstorm.example.com' }),
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

await terminologyServices.terminologyProviderLoader.ensureProvider('http://terminology.hl7.org/CodeSystem/v3-ActCode');

// Search across all providers
const results = await terminologyServices.terminologyRegistry.searchAll('pneumonia');

// Optional: expose the services as a bpmn-js DI module
const TerminologyServicesModule = createTerminologyModule(terminologyServices);

// Add an annotation to a BPMN element's businessObject
addAnnotation(businessObject, moddle, {
  id: 'term-ann-1',
  text: 'CT-Thorax mit Kontrastmittel',
  codings: [{ system: 'http://snomed.info/sct', code: '169069000', display: 'CT of chest' }]
});
```

`createDefaultTerminologyServices()` exposes the standard configuration used by the demo (SNOMED + FHIR server providers + package-backed providers). You can override only the parts you need (for example base URLs, disabled provider IDs, or provider overrides) and keep the rest unchanged. For full custom wiring, `createPackageTerminologyProvider()` and `createPackageFallbackProvider()` remain available as low-level extension points.

### Default config options (`createDefaultTerminologyServices(config)`)

| Option | Type | Purpose |
|---|---|---|
| `serverConfig` | `{ fhirBaseUrl?: string, snowstormBaseUrl?: string }` | Override default server base URLs. |
| `enableSnomed` | `boolean` | Enable/disable default SNOMED provider (`true` by default). |
| `enableFhirDefaults` | `boolean` | Enable/disable built-in FHIR providers (`true` by default). |
| `enablePackageDefaults` | `boolean` | Enable/disable built-in package providers (`true` by default). |
| `disabledProviderIds` | `string[]` | Disable providers by ID (applies to defaults and custom providers). |
| `snomedConfig` | `object` | Override SNOMED provider config (`branch`, `languageStrategy`, `baseUrl`, ...). |
| `fhirProviderOverrides` | `Array<{ id: string, ... }>` | Override built-in FHIR providers by ID. |
| `additionalFhirProviders` | `Array<FhirProviderConfig>` | Add extra FHIR providers. |
| `packageProviderOptions` | `Record<string, object>` | Override built-in package providers by ID. |
| `hl7CodeSystems` | `CodeSystem[]` | Inject explicit HL7 package CodeSystems instead of auto-loaded defaults. |
| `additionalPackageProviders` | `TerminologyProvider[]` | Add extra package-backed providers. |
| `packageDiscovery` | `{ enabled?: boolean, packageNames?: string[], modules?: Record<string, CodeSystem>, packages?: Record<string, CodeSystem[]>, include?: string[], exclude?: string[], mode?: 'auto'\|'whitelist' }` | Advanced package provider registration (explicit package maps and filtering controls). |
| `packageAutoDiscovery` | `boolean \| { packages?: Record<string, CodeSystem[]>, globalKey?: string, globFn?: Function }` | Shortcut for plugin-driven package discovery (`true` reads `globalThis.__FDH_TERMINOLOGY_PACKAGES__`). |
| `providers` / `fhirProviders` / `packageProviders` | arrays | Append additional provider instances/configs directly. |
| `loaderConfig` | `false \| object` | Override loader setup or disable loader with `false`. |

Default provider IDs:
- SNOMED: `snomed-ct`
- FHIR defaults: `loinc`, `icd-10-gm`, `ops`, `atc`
- Package defaults: `hl7-terminology-r4-package`, `ihe-xds-class`, `ihe-xds-type`, `kdl`

Example:

```js
import { createDefaultTerminologyServices } from '@bpmn-js-clinical-semantics/terminology';

const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    fhirBaseUrl: 'https://r4.ontoserver.csiro.au/fhir',
    snowstormBaseUrl: 'https://snowstorm-training.snomedtools.org/snowstorm/snomed-ct'
  },
  disabledProviderIds: ['atc'],
  fhirProviderOverrides: [
    { id: 'icd-10-gm', expandParameters: { valueSetVersion: '2024' } }
  ]
});
```

### Adding another terminology package in the demo

The demo already uses built-in package presets (including `hl7-terminology-r4-package`,
`ihe-xds-class`, `ihe-xds-type`, and `kdl`) through `createDefaultTerminologyServices(...)`,
so no extra wiring is required for those defaults.

For additional package discovery, use the terminology Vite plugin:

1. Install the package in your app:

```bash
npm install <your-terminology-package>
```

2. Register the terminology plugin in `vite.config.js`:

```js
import { defineConfig } from 'vite';
import { terminologyVitePlugin } from '@forschungsgruppe-digital-health/terminology/vite';

const ENABLE_PACKAGE_DISCOVERY = false;

export default defineConfig({
  plugins: [
    ENABLE_PACKAGE_DISCOVERY ? terminologyVitePlugin() : null
  ].filter(Boolean)
});
```

Set `ENABLE_PACKAGE_DISCOVERY` to `true` when you want the demo to auto-discover installed
terminology packages.

3. Enable auto-discovery in `createDefaultTerminologyServices(...)`:

```js
import { createDefaultTerminologyServices } from '@forschungsgruppe-digital-health/terminology';

createDefaultTerminologyServices({
  packageAutoDiscovery: true
});
```

The plugin exposes discovered packages automatically on `globalThis.__FDH_TERMINOLOGY_PACKAGES__`,
which is consumed by `packageAutoDiscovery: true`.

4. Restart the dev server after dependency changes.

The plugin discovers CodeSystem resources from direct dependencies and (by default) from
dependencies of `@forschungsgruppe-digital-health/terminology`, then exports them as a
package-keyed map for `packageDiscovery.packages`.

If you need explicit control, pass plugin options such as:

```js
terminologyVitePlugin({
  packages: ['hl7.terminology.r4'],            // explicit allow-list (overrides auto discovery)
  includeTransitiveFrom: ['@forschungsgruppe-digital-health/terminology'],
  exclude: ['hl7.fhir.r4.core', 'hl7.fhir.uv.extensions.r4']
});
```

To include only selected CodeSystem resources from an installed package, use a
package-to-file map with an explicit `include` filter:

```js
terminologyVitePlugin({
  packages: {
    'hl7.terminology.r4': {
      include: [
        'CodeSystem-condition-clinical.json',
        'CodeSystem-allergyintolerance-clinical.json'
      ]
    }
  }
});
```

To include every CodeSystem resource from a package, use `include: ['*']`.
To load everything except selected resources, omit `include` and use `exclude`:

```js
terminologyVitePlugin({
  packages: {
    'hl7.fhir.r4.core': {
      exclude: [
        'CodeSystem-condition-clinical.json'
      ]
    }
  }
});
```

For a practical filter test, `hl7.fhir.r4.core` is a suitable package because
it contains many CodeSystems and is not provided by a terminology preset. It
is already a dependency of the vanilla example. Select only the resources
needed by the application:

```js
terminologyVitePlugin({
  packages: {
    'hl7.fhir.r4.core': {
      exclude: ['CodeSystem-condition-clinical.json']
    }
  },
  exclude: []
});
```

When using `createDefaultTerminologyServices(...)`, pass
`packageDiscovery: { exclude: [] }` as well, because built-in preset packages
and FHIR infrastructure packages are excluded from discovery by default. After
restarting the dev server, only the two selected CodeSystems are included in
the discovery provider.

Or pass an explicit package map directly:

```js
createDefaultTerminologyServices({
  packageAutoDiscovery: {
    packages: {
      'my-terminology-package': [myCodeSystem]
    }
  }
});
```

Manual wiring still works (for non-Vite setups or explicit subset imports):

```js
import myCodeSystem from 'my-terminology-package/CodeSystem-my-system.json';

createDefaultTerminologyServices({
  packageDiscovery: {
    enabled: true,
    packages: {
      'my-terminology-package': [myCodeSystem]
    }
  }
});
```

The built-in HL7 preset (`hl7-terminology-r4-package`) is always wired through
`createDefaultTerminologyServices(...)` and remains overrideable via
`packageProviderOptions`.

If your package does not follow that shape, you can still wire it manually:

```js
createPackageCollectionProvider({
  id: 'my-package',
  displayName: 'My Terminology Package',
  codeSystems: MY_PACKAGE_CODE_SYSTEMS
})
```

This is optional consumer-side extension wiring. A `.npmrc` is not required when the dependency is installed from a direct URL or from the default npm registry; it is only needed when the package must be fetched from a custom registry such as GitHub Packages.

For adding custom terminology systems (FHIR-hosted, static, package-backed, or custom API), see [ARCHITECTURE.md -- Extending with a New Terminology System](ARCHITECTURE.md#extending-with-a-new-terminology-system). The demo keeps its concrete server URLs and package imports in a dedicated bootstrap/config layer; the properties panel only talks to `terminologyRegistry` and an optional `terminologyProviderLoader`. For FHIR terminology servers that need explicit canonical ValueSet URLs or version hints, `FhirProvider` also supports `valueSetUri` and `expandParameters`.

---

## Generated XML

Annotations and mappings are persisted as standard BPMN 2.0 extension elements:

```xml
<bpmn2:dataObject id="DataObj_Befund" name="CT-Befundbericht"
                  xmlns:term="https://clinical-bpmn.org/terminology/v1"
                  xmlns:fhirmap="https://clinical-bpmn.org/fhir-mapping/v1"
                  term:clinicalDomain="diagnostics">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-1"
                       text="CT-Befund Thorax mit KM">
        <term:coding system="http://snomed.info/sct"
                     code="169069000" display="CT of chest (procedure)"/>
      </term:annotation>
    </term:annotations>
    <fhirmap:resourceMappings>
      <fhirmap:resourceMapping resourceType="DiagnosticReport"
                               interaction="create" direction="output">
        <fhirmap:keyElement path="DiagnosticReport.status"
                           semanticRole="trigger" fixedValue="final"/>
      </fhirmap:resourceMapping>
    </fhirmap:resourceMappings>
  </bpmn2:extensionElements>
</bpmn2:dataObject>
```

The two namespaces (`term:` and `fhirmap:`) are independent. Non-clinical BPMN tools ignore them and preserve them on re-save.

---

## Demo and GitHub Pages

The interactive demo is automatically deployed to GitHub Pages on every push to `main`.

**Live Demo:** [forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics](https://forschungsgruppe-digital-health.github.io/bpmn-js-clinical-semantics/)

The demo shows the full bpmn-js modeler with both annotation panels active, loaded with a sample lung cancer diagnostic pathway. Click any BPMN element to inspect and edit its annotations, view the resulting XML, and download the annotated BPMN file.
To run the demo locally:

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
npm run dev
```

---

## Documentation

| Document | Audience | Content |
|---|---|---|
| [README.md](README.md) | All users | Overview, features, quick start, usage examples |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Contributors, integrators | Design decisions, UML diagrams, data model, project structure, extensibility |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | Development setup, coding standards, testing, branching, release process |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide covering development setup, coding standards, testing, branching strategy, and the release and publishing process.

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-js-clinical-semantics.git
cd bpmn-js-clinical-semantics
npm install --legacy-peer-deps
npm test        # 173 tests
npm run dev     # interactive demo at http://localhost:5173
```

---

## License

[Apache License 2.0](LICENSE)

Apache 2.0 was chosen for compatibility with the FHIR ecosystem (HAPI FHIR, Snowstorm, Blaze, Medplum all use Apache 2.0) and bpmn-js (MIT, compatible with Apache 2.0). Apache 2.0 provides an explicit patent grant, which is relevant for medical informatics tooling.

**Important:** This project contains **software** under Apache 2.0. The medical terminology systems it integrates with (SNOMED CT, LOINC, ICD-10-GM, KDL etc.) have their own licensing terms that apply independently. Users must obtain appropriate licenses for the terminology content they use.
