---
title: Configuration options
description: Configure terminology servers, authentication, offline mode, provider overrides, fallbacks, dynamic loading, and programmatic use.
---

Review [Default configuration](/configuration/defaults/) first to see which endpoints,
provider IDs, pinned versions, and offline packages are active out of the box.

Configuration is split across three layers:

| Layer | Configured via | Page |
| --- | --- | --- |
| **Terminology services & providers** (servers, auth, offline mode, overrides, fallbacks) | `createDefaultTerminologyModule(options)` | **This page** |
| **Properties panel & UI** (supported BPMN element types, initial `MT` badge visibility, hiding the panel, error events) | `createTerminologyPropertiesPanelModule(options)` | [Properties panel](/properties-panel/#options) |
| **Build-time & runtime FHIR packages** (Vite plugin, CLI, custom CodeSystem bundles) | `terminologyVitePlugin()` / `fdh-terminology-discover` / `packageDiscovery` | [Terminology packages](/configuration/discovery/) |

:::caution
The package is raw ESM intended for bundler-based applications. Stable releases are published
through GitHub Packages, while release candidates are staged on npm. See
[Installation & compatibility](/compatibility/) before installing it.
:::

## Options at a glance

| Option on `createDefaultTerminologyModule()` | Purpose | Section |
| --- | --- | --- |
| `serverConfig` | Override `fhirBaseUrl`, `snomedBaseUrl`, or `snowstormBaseUrl` | [Terminology servers](#terminology-servers) |
| `fetchFn` | Route requests through your backend, attach cookies/tokens, or use mTLS | [Terminology servers](#terminology-servers) |
| `snomedConfig` | Switch SNOMED CT to Snowstorm, set `branch`, `language`, `defaultEcl`, `auth`, `headers`, `requestTimeoutMs`, `maxResults`, `version` | [SNOMED CT, Snowstorm & language](#snomed-ct-snowstorm-and-result-language) |
| `enableSnomed`, `enableFhirDefaults`, `enablePackageDefaults` | Turn whole provider groups on or off (offline-only or server-only) | [Offline-only and server-only setups](#offline-only-and-server-only-setups) |
| `disabledProviderIds` | Disable specific built-in providers by ID | [Enable, disable, or override providers](#enable-disable-or-override-providers) |
| `fhirProviderOverrides` | Override parameters, URLs, auth, headers, or timeouts for built-in FHIR providers | [Enable, disable, or override providers](#enable-disable-or-override-providers) |
| `additionalFhirProviders` | Register extra FHIR CodeSystems | [Enable, disable, or override providers](#enable-disable-or-override-providers) |
| `packageProviderOptions` | Override labels or metadata of bundled presets (`kdl`, `ihe-xds-*`, `hl7-*`) | [Bundled package presets & fallbacks](#bundled-package-presets-and-fallbacks) |
| `additionalPackageProviders` | Register extra package providers or offline-with-FHIR fallback providers | [Bundled package presets & fallbacks](#bundled-package-presets-and-fallbacks) |
| `loaderConfig` | Configure or disable on-demand FHIR loading for unknown CodeSystems | [Dynamic provider loader](#dynamic-provider-loader) |
| `packageAutoDiscovery`, `packageDiscovery` | Discover or supply installed FHIR terminology packages | [Terminology packages](/configuration/discovery/) |

## Default setup

`createDefaultTerminologyModule()` registers the built-in network and package-backed
providers as a bpmn-js module:

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule,
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule,
    createDefaultTerminologyModule()
  ],
  moddleExtensions: {
    mt: TerminologyModdleDescriptor
  }
});
```

The properties-panel module renders the UI; the terminology module supplies the registry,
providers, `MT` badges, and generated-comment support. Register both.

## Terminology servers

### Use your own FHIR terminology server

```js
import {
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const TerminologyModule = createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: 'https://terminology.example.org/fhir'
  }
});
```

`serverConfig.fhirBaseUrl` redirects the built-in FHIR providers, the default FHIR-backed
SNOMED provider, and the dynamic loader. A production host is responsible for authentication,
licensing, availability, and CORS. The package does not ship a proxy.

### Separate server for SNOMED CT

If SNOMED CT runs on a different endpoint than your other FHIR code systems, configure
`snomedBaseUrl` (for FHIR or Snowstorm) or `snowstormBaseUrl` (for Snowstorm transport):

```js
const TerminologyModule = createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: 'https://fhir.example.org/fhir',
    snomedBaseUrl: 'https://snomed.example.org/fhir'
  }
});
```

### Route requests through your backend (`fetchFn`)

Use `fetchFn` when requests must go through a same-origin backend proxy, include session
cookies, or attach refreshed credentials:

```js
const TerminologyModule = createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: '/api/terminology'
  },
  fetchFn: (url, init) => fetch(url, {
    ...init,
    credentials: 'include'
  })
});
```

For servers requiring client certificates, see
[mTLS-secured terminology servers](/configuration/mtls/).

## Authentication, headers, timeouts, and result limits

There is no global token setting. The recommended browser setup is a host-owned `fetchFn`
that calls your same-origin backend so credentials stay server-side. Do not put long-lived
secrets into client-side configuration.

For servers that accept a browser-visible credential, both `snomedConfig` and individual FHIR
providers (`fhirProviderOverrides` / `additionalFhirProviders`) support per-provider `auth`
(`Bearer` or `Basic`), custom `headers`, `requestTimeoutMs` (default `15000` ms), and
`maxResults` (default `15`):

```js
const TerminologyModule = createDefaultTerminologyModule({
  snomedConfig: {
    auth: { type: 'Bearer', token: sessionToken },
    headers: { 'X-Client-App': 'clinical-modeler' },
    requestTimeoutMs: 10000,
    maxResults: 20
  },
  fhirProviderOverrides: [
    {
      id: 'loinc',
      auth: { type: 'Basic', credentials: btoa('user:password') },
      headers: { 'X-Client-App': 'clinical-modeler' },
      requestTimeoutMs: 10000
    }
  ]
});
```

Snowstorm transport additionally supports `ApiKey` authentication (see below). Use `fetchFn`
when authentication must apply across all FHIR providers or when tokens need to be refreshed.

## SNOMED CT, Snowstorm, and result language

### Snowstorm instead of FHIR for SNOMED CT

There is no public Snowstorm default; supply `snomedConfig.baseUrl` (or
`serverConfig.snowstormBaseUrl` / `serverConfig.snomedBaseUrl`):

```js
const TerminologyModule = createDefaultTerminologyModule({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: 'https://snowstorm.example.org/snowstorm/snomed-ct',
    branch: 'MAIN/SNOMEDCT-DE',
    language: 'de',
    languageStrategy: 'header',
    defaultEcl: '< 404684003',
    version: '2025-05-15',
    maxResults: 15,
    auth: {
      type: 'ApiKey',
      headerName: 'X-Api-Key',
      apiKey: sessionApiKey
    }
  }
});
```

### Result language

For Snowstorm, `languageStrategy: 'header'` sends `Accept-Language`, while `'param'` sends
the server-specific `language` query parameter.

Built-in `FhirProvider` instances currently use the package default (`de` via the
`displayLanguage` query parameter). If an application needs a different FHIR language policy,
configure `FhirTerminologyAdapter` directly, provide a host-owned `fetchFn`, or use a
[custom provider](/extending/). The server ultimately decides whether a translated display is
available.

## Offline-only and server-only setups

### Offline-only (bundled packages only)

The bundled HL7 terminology, IHE XDS, and KDL providers need no network access. Disable all
remote providers and the dynamic loader:

```js
const TerminologyModule = createDefaultTerminologyModule({
  enableSnomed: false,
  enableFhirDefaults: false,
  enablePackageDefaults: true,
  loaderConfig: false
});
```

For additional installed FHIR packages, see [Terminology packages](/configuration/discovery/).

### Server-only (no bundled packages)

Disable the bundled offline presets and automatic package discovery if your application should
query only your configured terminology server:

```js
const TerminologyModule = createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: 'https://terminology.example.org/fhir'
  },
  enablePackageDefaults: false,
  packageAutoDiscovery: false
});
```

## Enable, disable, or override providers

### Disable individual defaults by ID

Use any provider ID from [Default configuration](/configuration/defaults/):

```js
const TerminologyModule = createDefaultTerminologyModule({
  disabledProviderIds: [ 'atc', 'ops', 'hl7-terminology-r4-package' ]
});
```

### Override built-in FHIR providers

Override pinned versions (`valueSetVersion` or `system-version`), lookup parameters, display
names, or even the server URL per provider:

```js
const TerminologyModule = createDefaultTerminologyModule({
  fhirProviderOverrides: [
    {
      id: 'icd-10-gm',
      expandParameters: { valueSetVersion: '2025' },
      lookupParameters: { version: '2025' }
    },
    {
      id: 'ops',
      displayName: 'OPS 2025',
      expandParameters: {
        'system-version': 'http://fhir.de/CodeSystem/bfarm/ops|2025'
      }
    },
    {
      id: 'loinc',
      baseUrl: 'https://loinc-server.example.org/fhir'
    }
  ]
});
```

### Add another FHIR CodeSystem explicitly

```js
const TerminologyModule = createDefaultTerminologyModule({
  additionalFhirProviders: [
    {
      id: 'local-codes',
      displayName: 'Local codes',
      systemUri: 'https://example.org/CodeSystem/local',
      valueSetUri: 'https://example.org/ValueSet/local',
      baseUrl: 'https://terminology.example.org/fhir'
    }
  ]
});
```

Additional providers do not inherit `serverConfig.fhirBaseUrl`; set their `baseUrl`
explicitly. For a non-FHIR source, implement a [custom provider](/extending/).

## Bundled package presets and fallbacks

### Customise bundled package presets (`packageProviderOptions`)

Adjust labels or metadata for any built-in preset ID (`hl7-terminology-r4-package`,
`ihe-xds-class`, `ihe-xds-type`, `kdl`):

```js
const TerminologyModule = createDefaultTerminologyModule({
  packageProviderOptions: {
    kdl: {
      displayName: 'KDL (Hospital Document Types)',
      componentLabel: 'KDL 2025'
    }
  }
});
```

### Offline snapshot with live FHIR fallback (`additionalPackageProviders`)

Use `createPackageFallbackProvider()` to search a local FHIR `CodeSystem` snapshot first and
fall back to a live FHIR server when a concept is missing locally:

```js
import localCodeSystem from './codesystem-local.json' with { type: 'json' };
import {
  createDefaultTerminologyModule,
  createPackageFallbackProvider
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const localWithFallback = createPackageFallbackProvider({
  id: 'local-hybrid',
  displayName: 'Local catalogue',
  systemUri: 'https://example.org/CodeSystem/local',
  codeSystem: localCodeSystem,
  fallbackFhirConfig: {
    baseUrl: 'https://terminology.example.org/fhir',
    systemUri: 'https://example.org/CodeSystem/local'
  }
});

const TerminologyModule = createDefaultTerminologyModule({
  additionalPackageProviders: [ localWithFallback ]
});
```

## Dynamic provider loader

By default, the terminology module includes a lazy `terminologyProviderLoader` that can load
an unknown FHIR `CodeSystem` on demand from `serverConfig.fhirBaseUrl` (for example when
opening a diagram annotated with a code system not explicitly registered up front).

Disable dynamic loading completely (recommended when you only want explicitly configured
sources):

```js
const TerminologyModule = createDefaultTerminologyModule({
  loaderConfig: false
});
```

Or point the loader at a dedicated FHIR endpoint, custom `fetchFn`, or custom loader
function:

```js
const TerminologyModule = createDefaultTerminologyModule({
  loaderConfig: {
    fhirBaseUrl: 'https://loader.example.org/fhir',
    fetchFn: customFetch
  }
});
```

## Programmatic use without bpmn-js

### Query terminology services directly

`createDefaultTerminologyServices()` returns the registry and optional loader without wrapping
them as a bpmn-js module:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const { terminologyRegistry, terminologyProviderLoader } =
  createDefaultTerminologyServices({
    serverConfig: { fhirBaseUrl: 'https://terminology.example.org/fhir' }
  });

const { concepts } = await terminologyRegistry.search('pneumonia', 'snomed-ct');
const details = await terminologyRegistry.lookup('233604007', 'snomed-ct');

// Optionally preload additional FHIR CodeSystems on demand:
await terminologyProviderLoader?.preload([
  'https://example.org/CodeSystem/local'
]);
```

### Read and write `mt:` annotations programmatically

Use the exported annotation helpers to inspect or modify a BPMN business object without the
properties panel:

```js
import {
  getAnnotations,
  addAnnotation,
  removeAnnotation
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const existing = getAnnotations(taskBusinessObject);

addAnnotation(taskBusinessObject, moddle, {
  text: 'Primary staging imaging',
  codings: [
    {
      system: 'http://snomed.info/sct',
      code: '169069000',
      display: 'Computed tomography of chest'
    }
  ]
});

// Remove the first annotation if needed:
removeAnnotation(taskBusinessObject, 0);
```

For every option, helper, and return type, use the generated [API reference](/api/).
