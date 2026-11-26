# BPMN Extension Medical Terminology

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/validate.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/validate.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A524-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology` adds machine-readable medical
terminology to BPMN process models. It provides a `mt:`
moddle extension for XML serialization, a bpmn-js properties-panel provider,
terminology services, and a Vite plugin for discovering terminology packages.

All annotations are stored as standard BPMN 2.0 `extensionElements`, so BPMN
tools that do not understand the extension preserve the model unchanged.

> **Documentation:** <https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/>
> — guides, the generated API reference, the XML schema and the compatibility matrix.
>
> **Live demo:** <https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/demo/>
> — a bpmn-js modeler with the terminology properties-panel group enabled.

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
Terminology annotations are optional and remain isolated in the `mt:`
namespace under BPMN `extensionElements`.

## Features

- Multi-code annotations on BPMN Tasks, DataObjects, Events, Gateways, and
  MessageFlows.
- Provider architecture for SNOMED CT via a FHIR terminology server or a
  Snowstorm endpoint that you configure and license, package-backed HL7
  resources, IHE XDS, and KDL. No terminology server is preconfigured.
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
| `@forschungsgruppe-digital-health/bpmn-extension-medical-terminology` | [`extension/`](extension/) | Terminology annotations, providers, moddle extension, properties panel, and Vite discovery |
| Demo | [`demo/`](demo/) | Private bpmn-js integration example |

Install the published package from GitHub Packages:

```bash
npm install @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

Configure the `@forschungsgruppe-digital-health` scope to use
`https://npm.pkg.github.com` before installing from GitHub Packages.

## Quick Start

### Prerequisites

- Node.js 24 or later for development
- An application using bpmn-js 15 or later
- `bpmn-js-properties-panel` 5 or later when using the properties panel

### Integrate into a bpmn-js modeler

```js
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

The package CSS contains only the structural styles for the terminology
entries. Import the official bpmn-js and properties-panel styles in the host
application as usual; the terminology styles inherit its fonts, colors, and
CSS variables.

The terminology services module also enables round `MT` badges and terminology
comments; no separate diagram module is needed. It renders SVG alongside the
standard bpmn-js shapes. The **Show MT badges** switch toggles `MT` badges
globally (`showBadges: true` by default; pass `showBadges: false` to
`createTerminologyPropertiesPanelModule` to start with badges hidden).
Independently, the **Show terminology as BPMN comments** switch creates
standard `bpmn:TextAnnotation` and `bpmn:Association` elements for annotated
shapes (even when `MT` badges are turned off). Generated comments contain a plain-text rendering of the connected
shape's `mt:` data in `<bpmn:text>`, so editors without this extension can
display them as ordinary BPMN comments. All annotations are rendered, with
wrapping as needed and no line limit; comment width remains capped at 350
diagram units. The full data remains in `mt:`. An `mt:GeneratedComment`
marker lets the extension identify comments it owns and refresh them when
terminology data changes. With comments enabled, they are part of BPMN XML and
SVG exports.
Turning the comment switch off removes generated comments; turning it on again
recreates them from the current `mt:` data. The Medical terminology properties
group is available for all selected elements; only configured target types show
the annotation editor in addition to the global switches.

To add or exclude annotatable BPMN element types without replacing the package
defaults, pass `includeTypes` or `excludeTypes` to
`createTerminologyPropertiesPanelModule`. See
[Configuring annotatable BPMN elements](demo/ANNOTATIONS.md) for examples and
the full configuration behavior.

## Programmatic Usage

> The documentation site carries an expanded version of this section, including the
> [default values](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/defaults/) generated from the code and the
> language options that are not described below:
> <https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/>

```js
import {
  SnomedCtProvider,
  createTerminologyModule,
  createTerminologyServices,
  addAnnotation
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

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
  id: 'mt-ann-1',
  text: 'CT-Thorax mit Kontrastmittel',
  codings: [{
    system: 'http://snomed.info/sct',
    code: '169069000',
    display: 'CT of chest'
  }]
});
```

Terminology search failures are exposed as `TerminologyRequestError` instances
with a `kind` of `network`, `authorization`, `server`, `data`, or `redirect`.
The `data` kind means that the server responded but did not return a valid
provider response; it is distinct from an empty successful result. `redirect`
means that Snowstorm redirected the request and should be configured with its
redirect-free API base URL.

### Properties-panel and host error handling

The terminology UI reuses the public bpmn.io properties-panel error contract:

- Standard fields use their entry `validate` function and `useError(id)`-aware
  field component. The custom search control follows the same entry contract.
- Errors are published via `propertiesPanel.setErrors` under the owning entry
  ID (`annotation-id`, `annotation-search`, or `annotation-form`) and under
  `medical-terminology`. The latter lets the containing properties-panel group
  show its error marker.
- Existing errors belonging to other entries are preserved. Terminology errors
  are removed after correction or a successful retry without clearing unrelated
  host errors.
- User-facing error strings pass through the host's `translate` service.

`propertiesPanel.setErrors` stores strings and drives entry/group presentation;
it is not a technical notification API. A failed provider request therefore
also emits `medicalTerminology.error` on the bpmn-js `eventBus`. Its payload
preserves the original structured error for logging, telemetry, or a host-owned
notification, while the search entry remains the UI fallback when no listener
is installed:

```js
modeler.get('eventBus').on('medicalTerminology.error', ({
  element,
  error,
  operation,
  providerId
}) => {
  // error remains the original TerminologyRequestError where supplied by the
  // provider, including kind, host, and status.
});
```

The event name is also exported as `TERMINOLOGY_ERROR_EVENT` to avoid repeating
the string in host integrations.

Superseded or aborted searches do not emit this event and do not leave a stale
UI error. The extension deliberately does not prescribe a toast implementation;
the host may choose one in its event listener without creating a second default
message in the properties panel.

Search results always contain the displayed concepts. The optional `total`
field is only present when the provider can supply a reliable total; clients
must not infer a total from the number of returned concepts.

`createDefaultTerminologyServices()` provides the standard service setup used
by the demo and by a plain app after installation. Without arguments it
registers only the package-backed providers (HL7 Terminology, IHE XDS, KDL) and
contacts no server. SNOMED CT, LOINC, ICD-10-GM, OPS, and ATC are licensed
content: they become available once you set `serverConfig.fhirBaseUrl` to a
terminology server you are licensed to use, and, for SNOMED CT,
`snomedConfig.edition` to the edition your licence covers. A step-by-step setup
with a worked example, the demo and troubleshooting is in
[Connecting a terminology server](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/terminology-server/).

### Default service configuration

| Option | Purpose |
|---|---|
| `serverConfig` | Override FHIR, SNOMED, and Snowstorm server base URLs |
| `enableSnomed` | Enable or disable the default SNOMED provider |
| `enableFhirDefaults` | Enable or disable built-in FHIR providers |
| `enablePackageDefaults` | Enable or disable bundled package providers; explicit `packageDiscovery` providers remain available |
| `disabledProviderIds` | Disable providers by ID |
| `snomedConfig` | SNOMED CT edition (`edition`, required for the FHIR transport) and other SNOMED provider settings |
| `fhirProviderOverrides` | Override built-in FHIR providers |
| `additionalFhirProviders` | Add additional FHIR providers |
| `additionalPackageProviders` | Add package-backed providers |
| `packageProviderOptions` | Override a bundled package provider's `componentLabel` or complete `displayName` |
| `packageDiscovery` | Register explicit package data and configure package filtering |
| `packageAutoDiscovery` | Use the bundled HL7, IHE XDS, and KDL package resources exposed by a bundler; does not disable explicit `packageDiscovery.packages` |
| `loaderConfig` | Override or disable provider loading |

Package-provider dropdown labels use the same dynamic format for bundled
presets and discovered package versions:

```text
Name (package@version)
```

For a package part containing one CodeSystem, `Name` comes from that resource's
FHIR `title`, `name`, `id`, or canonical URL. For a package containing several
CodeSystems, it falls back to the package name. This means a bundled preset and
an additional installed version use the same naming rule; neither relies on a
hard-coded preset label. `sourceName` and `componentLabel` configuration values
remain explicit overrides. For example, a KDL resource is displayed as
`CodeSystem Klinische Dokumentenklassen-Liste 2026
(dvmd.kdl.r4@2026.0.0)`.

The provider's internal `displayName` still contains the package identity and
component for API consumers. Generated registries use the canonical package
name even when the package manifest also contains a longer title. Override only
the component label while preserving the package metadata:

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

Package discovery creates one aggregate provider per installed package
version. When exactly one CodeSystem is selected from a package, its FHIR
`title`, `name`, `id`, or canonical URL is appended as the component.
`componentLabels` overrides that component by package name (or by a
version-qualified package key) and canonical CodeSystem URL. Invalid provider
IDs, package names, or CodeSystem URLs fail fast with a descriptive error.

When npm resolves one package version for both a direct and a transitive
requirement, discovery keeps one provider and emits this non-blocking warning:

```text
[terminology] Package "hl7.terminology.r4" version "7.5.0" is installed directly and transitively. The package was deduplicated; one terminology provider will be used.
```

When different versions are installed in different `node_modules` paths, the
registry keeps both entries instead of overwriting one by package name. Their
keys are version-qualified (`hl7.terminology.r4@6.0.2` and
`hl7.terminology.r4@7.5.0`), their display names include the package version,
and their provider IDs are stable IDs such as
`pkg-hl7-terminology-r4-6-0-2` and `pkg-hl7-terminology-r4-7-5-0`.
`disabledProviderIds` can therefore disable one installed version without
disabling the other. A single unversioned or legacy package entry keeps the
existing `pkg-<package-name>` ID; explicit package data without npm metadata
also keeps its existing ID and version behavior.

The package version identifies the installed npm terminology package. It is
not the FHIR CodeSystem version. Search concepts retain the selected
CodeSystem's own `version`, and only that value is written to the existing
`mt:coding/@version` attribute in BPMN XML. The npm package version is
available as provider/package metadata and is never substituted into the
Coding.

When a diagram is loaded, a saved Coding with a CodeSystem version is shown
with a yellow system/code marker only when the same CodeSystem URI is available
locally but that exact saved version is not. This identifies a Coding that may
need review after replacing a terminology package. If the old and new package
versions are installed in parallel, the saved Coding remains normally marked
because its CodeSystem version is still available. Versionless Codings and
systems for which no local version is known remain unchanged.

TypeScript consumers can import the public configuration types from
`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/types`.

Example:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    // A terminology server you are licensed to use.
    fhirBaseUrl: 'https://terminology.example.org/fhir'
  },
  snomedConfig: {
    transport: 'fhir',
    // German National Edition; use the edition your SNOMED CT licence covers.
    edition: '11000274103'
  },
  disabledProviderIds: ['atc'],
  fhirProviderOverrides: [
    {
      id: 'icd-10-gm',
      // Optional pin; the release must exist on the server (default: its current release).
      expandParameters: { valueSetVersion: '2026' }
    }
  ]
});
```

The SNOMED provider uses the FHIR API of the configured server. It stays
disabled until a server and either `snomedConfig.edition` (the module id of the
edition, for example `11000274103` for the German National Edition or
`900000000000207008` for the International Edition) or an explicit
`snomedConfig.valueSetUri` are set, so a server can never silently answer from
an edition you did not choose. Prefer `edition`, and configure only an edition
your licence covers. The edition determines the value set
(`http://snomed.info/sct/<edition>?fhir_vs`) and the `$lookup` version. If
`valueSetUri` is an implicit SNOMED CT value set such as
`http://snomed.info/sct/11000274103?fhir_vs`, `$lookup` uses the edition named
in it; for any other value set, set `lookupParameters.version` yourself, or
lookups answer from the server's default edition. Each selected concept stores
the release the server reports, for example
`http://snomed.info/sct/11000274103/version/20260815`; pin one release with
`editionVersion: 'YYYYMMDD'`. To use a custom Snowstorm deployment
or an application-owned same-origin endpoint, keep the provider ID unchanged
and change its transport and base URL. `baseUrl` is the Snowstorm API context
path, without the edition branch or `/concepts`; the provider appends both.

```js
const terminologyServices = createDefaultTerminologyServices({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: '/api/snowstorm/snomed-ct',
    branch: 'MAIN',
    language: 'de',
    languageStrategy: 'header',
    defaultEcl: '< 404684003'
  }
});
```

For another FHIR terminology server, keep `transport: 'fhir'` and set
`serverConfig.snomedBaseUrl` or `snomedConfig.baseUrl`. For a Snowstorm
instance, use `transport: 'snowstorm'` as shown above. The configured
`defaultEcl` is sent as the `ecl` query parameter, and `languageStrategy:
'header'` sends the configured language as `Accept-Language`.

There is no built-in public Snowstorm REST endpoint. Snowstorm transport is
therefore opt-in and requires an explicit `baseUrl`. The extension does not
provide or configure a Vite proxy, reverse proxy, or other CORS bypass; any
same-origin route must be operated and configured by the host application.

### CORS and host-owned request routing

Browsers enforce CORS at the network boundary. The extension cannot make a
browser trust a third-party SNOMED/FHIR origin that does not include the
necessary CORS headers. A browser app must use an endpoint that explicitly
permits its origin through CORS. The extension does not ship or configure a
Vite proxy.

If the terminology server cannot provide the required CORS headers, the host
application or its deployment environment must provide the backend or reverse
proxy and expose that route as the configured `baseUrl`. The extension only
uses the URL or `fetchFn` supplied by the application; it does not implement
the routing service.

The public config API supports this directly. Configure the upstream server as
usual; `fetchFn` then receives every request URL the providers build and can
forward it to your own backend route. Without `serverConfig.fhirBaseUrl` (or a
provider-level `baseUrl`), every network provider stays disabled and `fetchFn`
is never called:

```js
const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    // Upstream FHIR terminology server you are licensed to use.
    fhirBaseUrl: 'https://terminology.example.org/fhir'
  },
  // Only with a SNOMED CT Affiliate Licence for this edition.
  snomedConfig: { edition: '11000274103' },
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
server explicitly allows them. In particular, the public
`https://snowstorm.snomedtools.org/snowstorm/snomed-ct` endpoint must not be
used directly from a browser: it redirects browser requests to a denial page
and does not provide a usable CORS response. Use a Snowstorm deployment with a
redirect-free, CORS-enabled API endpoint or an application-owned backend route.
A direct authenticated browser request additionally requires the operator to
allow its preflight request and the `Authorization` header.

### Out-of-the-box defaults and external overrides

After installation in a bpmn-js app, the extension works without manual
provider registration. Its defaults are:

- package-backed providers for the bundled HL7 Terminology, IHE XDS, and KDL
  code systems, searchable offline
- automatic discovery of already installed terminology packages in the app
- provider definitions for SNOMED CT, LOINC, ICD-10-GM, OPS, and ATC, which
  stay disabled until you configure a terminology server you are licensed to
  use (and, for SNOMED CT, an edition); they pin no release, so the server
  answers from its current release and each coding stores the version the
  server reports

**Breaking change:** the built-in `atc` provider uses the German ATC-GM
published by BfArM (`http://fhir.de/CodeSystem/bfarm/atc`, value set
`http://fhir.de/ValueSet/bfarm/atc`) instead of the WHO ATC
(`http://www.whocc.no/atc`). New codings carry the ATC-GM system URI; existing
WHO ATC codings remain valid data. To keep WHO ATC, override the `atc` provider
with its `systemUri` and a `valueSetUri` your server can expand.

The app can override any of these defaults from the outside by passing the
public configuration object into `createDefaultTerminologyServices(...)`:

```js
const terminologyServices = createDefaultTerminologyServices({
  serverConfig: {
    fhirBaseUrl: 'https://terminology.example.org/fhir'
  },
  snomedConfig: {
    transport: 'fhir',
    edition: '11000274103'
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
plugin. `enablePackageDefaults: false` disables only these bundled providers.
The `packageAutoDiscovery` option controls the bundled package resources
exposed by the host application; native ESM hosts can provide other packages
explicitly through `packageDiscovery`, independent of both options:

```js
createDefaultTerminologyServices({
  enablePackageDefaults: false,
  packageAutoDiscovery: false,
  packageDiscovery: {
    packages: {
      'my.terminology': [myCodeSystem]
    }
  }
});
```

Installed terminology packages are discovered automatically by default when a
Vite app exposes them through `globalThis.__FDH_TERMINOLOGY_PACKAGES__` or the
terminology Vite plugin. You can disable the default automatic discovery with
`packageAutoDiscovery: false`, or provide an explicit package set via
`packageDiscovery`.

When package discovery is explicitly enabled but no packages are exposed by the
bundler, the extension writes an actionable warning to the browser console.
The built-in package providers remain available; configure
`packageDiscovery.packages`, provide `packageAutoDiscovery.globFn`, or expose
`globalThis.__FDH_TERMINOLOGY_PACKAGES__` for the bundled package resources.

Automatic discovery is deliberately limited to the package resources used by
the four bundled presets: `hl7.terminology.r4`, the two selected IHE XDS
CodeSystems from `de.ihe-d.terminology`, and the KDL CodeSystem from
`dvmd.kdl.r4`. FHIR core and implementation-guide extension packages are
dependencies of those packages, but are not imported, parsed, bundled, or
registered as providers. Use `packageDiscovery.packages` for any other
terminology package; explicit package discovery is not subject to this
default allowlist.

The published package keeps the URL-pinned FHIR core package
(`hl7.fhir.r4.core`) as an installation-time resolution anchor because the
upstream Simplifier package manifests refer to it by bare version. This
technical package remains excluded from automatic terminology discovery and is
never registered as a provider.

The default IHE and KDL filters select resources by their canonical
`CodeSystem.url`, not by a single package filename. This supports compatible
package layouts such as `codesystem-kdl.xml.json` (KDL 2025) and
`CodeSystem-kdl-2026-0-0.json` (KDL 2026). If a default package contains no matching resource, the
Vite plugin emits a warning and skips that package instead of failing with an
unresolved filename.

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
discovery of every installed package. Without an explicit package selection,
automatic discovery is limited to the default HL7, IHE XDS, and KDL resources.
Use `--exclude-package` when automatic discovery should remain enabled while
omitting complete packages.

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
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/vite';

export default defineConfig({
  plugins: [
    terminologyVitePlugin()
  ]
});
```

The default plugin imports only the CodeSystems required by the bundled
providers. It does not follow technical FHIR dependencies into the virtual
module. In particular, it does not import `hl7.fhir.r4.core`,
`hl7.fhir.uv.extensions.r4`, or unrelated resources from
`de.ihe-d.terminology`.

Applications that intentionally need another package can opt into it
explicitly. Each explicit package entry supports the documented resource
filters:

```js
const discoveryPackages = {
  'my.terminology': {
    include: ['https://example.org/CodeSystem/custom'],
    exclude: []
  }
};

export default defineConfig({
  plugins: [
    terminologyVitePlugin({
      packages: discoveryPackages
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

The plugin discovers installed FHIR terminology packages from the application's
dependency graph and exposes them on
`globalThis.__FDH_TERMINOLOGY_PACKAGES__`. The services create one provider
per discovered package version. If npm has deduplicated equal direct and
transitive requirements, the registry contains one provider and emits the
warning described above. Each provider searches only the CodeSystems from its
own package version, so parallel versions remain independently searchable and
selectable while the selected coding still keeps its concrete CodeSystem URL
and version.

The plugin resolves its internal `virtual:fdh-terminology-packages` module
through Vite's `resolveId` and `load` hooks while Vite transforms the HTML
entry. The resulting development module is a Vite-managed module-graph entry,
and the production build bundles it normally. Do not add that virtual module
URI as an application script URL, pass it to `fetch()`, or import it from
runtime-generated strings. It is an internal bundler module, not an HTTP
resource, and package discovery does not create a CORS request. Applications
only configure `terminologyVitePlugin` and use `packageAutoDiscovery`.

The package names are explicit keys in `packages`; when parallel versions are
provided manually, use version-qualified keys and matching metadata:

```js
packageDiscovery: {
  packages: {
    'hl7.terminology.r4@6.0.2': oldCodeSystems,
    'hl7.terminology.r4@7.5.0': currentCodeSystems
  },
  metadata: {
    'hl7.terminology.r4@6.0.2': {
      packageName: 'hl7.terminology.r4',
      version: '6.0.2'
    },
    'hl7.terminology.r4@7.5.0': {
      packageName: 'hl7.terminology.r4',
      version: '7.5.0'
    }
  }
}
```

`include` and `exclude` match the canonical package name and may also target a
version-qualified package key. Within each package version,
`include` and `exclude` match exact canonical `CodeSystem.url` values, never
filenames. `exclude` takes precedence over `include`, and `include: ['*']`
loads every CodeSystem from that package. A configured URL that does not exist
in the package causes an error.

The repository demo uses the bundled providers without package filtering. It
contacts a terminology server only when `demo/.env.local` configures one or, in
the public demo, after a visitor switches on the optional live search (see
[Demo terminology server configuration](#demo-terminology-server-configuration)).
The filtered `packages` examples above are integration configurations for
applications that want to restrict the available package content.

## Generated XML

Terminology annotations are persisted as standard BPMN 2.0 extension elements:

```xml
<bpmn2:dataObject id="DataObj_Befund" name="CT-Befundbericht"
                  xmlns:mt="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1">
  <bpmn2:extensionElements>
    <mt:annotations>
      <mt:annotation id="mt-ann-1"
                       text="CT-Befund Thorax mit KM">
        <mt:coding system="http://snomed.info/sct"
                     code="169069000"
                     display="CT of chest (procedure)"/>
      </mt:annotation>
    </mt:annotations>
  </bpmn2:extensionElements>
</bpmn2:dataObject>
```

Clinical data belongs only in `mt:` elements under
`bpmn:extensionElements`; it must not change BPMN process semantics or be
stored in BPMN-DI. The extension may add standard BPMN comments and adjust
diagram bounds to keep generated comments from overlapping existing content.

## Demo

The interactive demo is deployed to GitHub Pages on pushes to `main`:

[bpmn-extension-medical-terminology demo](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/demo/)

Run it locally:

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
npm run dev
```

The package itself is independent of the host application's deployment
architecture: an integrator can use a direct CORS-enabled terminology service,
its own backend proxy, or only local package-backed providers. It does not
ship a proxy or require one.

### Demo terminology server configuration

By default the public demo contacts no terminology server and searches only the
bundled code systems. A build can offer an optional live search for LOINC,
ICD-10-GM, OPS and ATC on HL7 Deutschland's server `tx.fhir.de`, which each
visitor must switch on in a separate consent dialog (*Live search…* in the
banner). Accepting the licence notice does not switch it on. The consent lasts
for the browser tab; while it is on, *Live search details* reopens the consent
information and *Turn off live search* withdraws it. Searches are sent only from
three characters on and about 300 ms after typing stops, and repeated searches
are answered from a cache. The live search is offered only for a host whose
operator the consent dialog names, which is `tx.fhir.de` alone.

The Pages workflow passes the repository variable `DEMO_OPT_IN_FHIR_BASE_URL` to
the build as `VITE_OPT_IN_FHIR_BASE_URL`; while that variable is unset or empty,
the public demo offers no live search. The `docs-preview` workflow builds its
review artifact with `VITE_OPT_IN_FHIR_BASE_URL=https://tx.fhir.de/fhir`
directly. Neither workflow sets another terminology variable. The demo code can
also unlock SNOMED CT on top of the live search after a licence
self-declaration (`VITE_OPT_IN_SNOMED_EDITION`, optionally
`VITE_OPT_IN_SNOMED_EDITION_VERSION`), but SNOMED CT is not offered in the
public demo: the Pages workflows set no `VITE_OPT_IN_SNOMED_EDITION`. Only
`11000274103` (German National Edition) is accepted, because the
self-declaration describes that edition and use in Germany alone; any other
value offers no unlock.

To try the demo locally against a server you are allowed to use, copy
`demo/.env.example` to `demo/.env.local`, set for example
`VITE_FHIR_BASE_URL=https://tx.fhir.de/fhir` (HL7 Deutschland; development and
non-commercial research only), and restart `npm run dev`. A server configured
there takes precedence: the demo contacts it from the start and offers no
live-search opt-in. The demo throttles that server too: each request waits for
a short pause in typing, and repeated searches are answered from a cache; there
is no minimum length. Enable SNOMED CT (`VITE_SNOMED_EDITION`, or the
`VITE_SNOWSTORM_*` variables) only with a licence for that edition. All
variables, the production preview and troubleshooting are covered in
[Connecting a terminology server](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/terminology-server/#try-it-in-the-demo).

## Documentation

The documentation site at <https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/> is the place to start. It carries the guides,
the API reference generated from the source, the XML schema reference and the compatibility
matrix, and it is rebuilt from this repository on every push to `main`. Build it locally with
`npm run docs:install` followed by `npm run docs:dev`.

| Page | Audience | Content |
|---|---|---|
| [Decision and quick start](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/) | Anyone evaluating the extension | The problem it solves, fit, and integration paths |
| [Configuration](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/) | Integrators | Composition roots, providers, servers, authentication, language |
| [Connecting a terminology server](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/terminology-server/) | Integrators | Worked example against a FHIR server, SNOMED CT, authentication, the demo, troubleshooting |
| [Properties panel](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/properties-panel/) | Integrators and modellers | The user-facing surface, its wiring contract and its current limits |
| [Namespace v1](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1/) | XML/tooling integrators | Generated namespace contract, moddle descriptor and XSD |
| [XML schema](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/schema/) | Tooling integrators | Namespace, content model, serialisation, forward compatibility |
| [Compatibility](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/compatibility/) | Integrators | Supported versions, the bundler-only model, coexistence with other extensions |
| [Extending](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/extending/) | Contributors | Writing a provider or a transport adapter |
| [API reference](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/api/) | Developers | Every export, generated from the source |

The repository documents below remain the source for what they cover.
Release maintainers: [npm staging setup](docs/NPM-STAGING.md) and
[release candidate testing checklist](docs/RELEASE-TESTING.md).

| Document | Audience | Content |
|---|---|---|
| [README.md](README.md) | Users and integrators | Features, setup, usage, and discovery |
| [Extending bpmn.io](docs/EXTENDING.md) | Developers and contributors | BPMN 2.0, bpmn.io, moddle, properties panel, linting, and validation primer |
| [Terminology extension user story](docs/user-stories/terminology-extension-mvp.md) | Maintainers and stakeholders | Historical scope snapshot (2026-08-27) and planned follow-up; not current behavior documentation |
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

The package ships no SNOMED CT, LOINC, ICD-10-GM, OPS or ATC content — no display
names, descriptions, hierarchies or excerpts — and preconfigures no terminology server
for them. When a modeller selects a concept, the extension stores its code system URI,
code, version and display text in the BPMN file.

Using those terminologies in an application requires your own licences and the
publishers' notices: an Affiliate Licence for SNOMED CT (in Germany via BfArM/MLDS),
the LOINC licence, the BfArM terms of use for ICD-10-GM and OPS, and the WIdO
and BfArM terms for ATC-GM (the WHO Collaborating Centre's terms if you
configure WHO ATC instead). Public terminology servers have their own terms of
use as well. The example diagrams in `examples/` and the demo
contain a few such codes for illustration and carry the SNOMED CT, LOINC, OPS and
ATC-GM notices.

The package does bundle HL7 Terminology (CC0-1.0, without the third-party code systems
SNODENT, ADA tooth codes, the NUCC taxonomy and the W3C colour codes), and it imports the IHE Deutschland XDS
value sets and the KDL, whose packages declare no licence.
[`extension/THIRD_PARTY_NOTICES.md`](extension/THIRD_PARTY_NOTICES.md) lists every
source with its terms and the notices to show, and it ships inside the npm package.
