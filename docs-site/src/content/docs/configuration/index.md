---
title: Configuration
description: Configure the built-in terminology sources, a self-hosted server, or an offline-only setup.
---

Most applications need one of three setups: use the defaults, point the defaults at an
organisation's FHIR server, or disable network providers and work offline. The generated
[defaults page](/configuration/defaults/) lists the exact endpoints, providers, and versions.

:::caution
The package is raw ESM intended for bundler-based applications. It is published through
GitHub Packages, not npmjs.com. See [Compatibility](/compatibility/) before installing it.
:::

## Default setup

`createDefaultTerminologyModule()` registers the built-in network and package-backed
providers as a bpmn-js module:

```js
import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule,
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const modeler = new BpmnModeler({
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

The properties-panel module renders the UI; the terminology module supplies the registry
and providers searched by that UI. Register both.

## Use your own FHIR terminology server

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

This redirects the built-in FHIR providers, the default SNOMED provider, and the dynamic
loader. A production host is responsible for authentication, licensing, availability, and
CORS. The package does not ship a proxy.

Use `fetchFn` when requests must go through your backend or require custom authentication:

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

### Authentication

There is no global token setting. The recommended browser setup is a host-owned `fetchFn`
that calls your same-origin backend; the backend keeps credentials and forwards the request to
the terminology server. Do not put long-lived secrets into client-side configuration.

For a server that accepts a browser-visible token, the SNOMED configuration supports
`Bearer` and `Basic` authentication. Snowstorm transport additionally supports API keys:

```js
createDefaultTerminologyModule({
  snomedConfig: {
    auth: { type: 'Bearer', token: sessionToken }
  }
});
```

Use `fetchFn` when authentication must apply to all FHIR providers or when tokens need to be
refreshed. The [API reference](/api/) documents the adapter-level authentication fields.

### Result language

For Snowstorm, choose the language and how it is sent:

```js
createDefaultTerminologyModule({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: 'https://snowstorm.example.org/snowstorm/snomed-ct',
    language: 'de',
    languageStrategy: 'header'
  }
});
```

`header` sends `Accept-Language`; `param` sends the server-specific language query
parameter. FHIR requests currently use the package default (`de` as
`displayLanguage`). If an application needs a different FHIR language policy, provide a
host-owned `fetchFn` or configure a custom provider. The server ultimately decides whether a
translated display is available.

### Snowstorm instead of FHIR for SNOMED CT

```js
const TerminologyModule = createDefaultTerminologyModule({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: 'https://snowstorm.example.org/snowstorm/snomed-ct',
    branch: 'MAIN',
    language: 'de',
    defaultEcl: '< 404684003'
  }
});
```

There is no public Snowstorm default; a base URL is required.

## Offline-only setup

The bundled HL7 terminology, IHE XDS, and KDL providers do not require a network. Disable
the server-backed providers and dynamic loader to use only them:

```js
const TerminologyModule = createDefaultTerminologyModule({
  enableSnomed: false,
  enableFhirDefaults: false,
  enablePackageDefaults: true,
  loaderConfig: false
});
```

For additional installed FHIR packages, see [Terminology packages](/configuration/discovery/).

## Enable, disable, or override providers

Disable individual defaults by ID:

```js
createDefaultTerminologyModule({
  disabledProviderIds: [ 'atc', 'ops' ]
});
```

Override one of the built-in FHIR providers:

```js
createDefaultTerminologyModule({
  fhirProviderOverrides: [
    {
      id: 'icd-10-gm',
      expandParameters: { valueSetVersion: '2024' }
    }
  ]
});
```

Add another FHIR CodeSystem explicitly:

```js
createDefaultTerminologyModule({
  additionalFhirProviders: [
    {
      id: 'local-codes',
      displayName: 'Local codes',
      systemUri: 'https://example.org/CodeSystem/local',
      baseUrl: 'https://terminology.example.org/fhir'
    }
  ]
});
```

Additional providers do not inherit `serverConfig.fhirBaseUrl`; set their `baseUrl`
explicitly. For a non-FHIR source, implement a [custom provider](/extending/).

## Use the services without bpmn-js

`createDefaultTerminologyServices()` returns the same registry without wrapping it as a
bpmn-js module:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const { terminologyRegistry } = createDefaultTerminologyServices();
const result = await terminologyRegistry.search('pneumonia', 'snomed-ct');
```

For every option and return type, use the generated [API reference](/api/).
