---
title: Configuration
description: How to assemble terminology services for a bpmn-js modeler — the composition roots, the default provider set, server endpoints, authentication and language handling.
---

Everything the extension does at runtime hangs off one object: a plain JavaScript configuration that you hand to a composition root, which builds a `TerminologyRegistry`, optionally a provider loader, and wraps both as a bpmn-js module.

This page covers the configuration object itself. The authoritative list of default values lives on the [defaults page](/configuration/defaults/), which is generated from the source so it cannot drift. Package-backed providers and how they are found have their own page: [discovery](/configuration/discovery/).

:::caution[The package is bundler-only]
The barrel cannot be imported from plain Node ESM. `@bpmn-io/properties-panel` ships no export map and `preact/hooks` resolves as a directory, so a bare `node --input-type=module -e "import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology')"` fails. This is structural, not a bug awaiting a fix — every example on this page assumes a bundler (Vite, Rollup, webpack or esbuild).

The package is also not on npmjs.com. It is published to GitHub Packages under the `@forschungsgruppe-digital-health` scope, so `npm install` works only after you point that scope at `https://npm.pkg.github.com` in `.npmrc` and authenticate. Otherwise install from the [repository](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology).
:::

## The five composition roots

There are two layers. The lower layer takes providers you have already decided on; the upper layer builds the default provider set for you and then calls the lower layer.

| Function | Layer | Takes | Returns |
|---|---|---|---|
| `createTerminologyServices(config)` | low | providers and provider configs you supply | `{ terminologyRegistry, terminologyProviderLoader? }` |
| `createTerminologyModule(services)` | low | the services object | a didi module for `additionalModules` |
| `createDefaultTerminologyConfig(config)` | high | the configuration described below | a *resolved* low-level config |
| `createDefaultTerminologyServices(config)` | high | the same configuration | services, defaults included |
| `createDefaultTerminologyModule(config)` | high | the same configuration | the didi module, defaults included |

The three `createDefault*` functions are a chain — `createDefaultTerminologyModule` calls `createDefaultTerminologyServices`, which calls `createTerminologyServices(createDefaultTerminologyConfig(config))`. All five are defined in [`extension/src/config/terminology-config.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/config/terminology-config.js) and [`extension/src/services/TerminologyServices.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/services/TerminologyServices.js), and all five are exported from the barrel.

Pick the highest one that still gives you the control you need. Most applications want `createDefaultTerminologyModule()` or `createDefaultTerminologyServices()`; reach for `createDefaultTerminologyConfig()` when you want the defaults *and* want to inspect or post-process them; reach for `createTerminologyServices()` when you want nothing but what you listed yourself.

## Example 1 — zero configuration

```js title="src/modeler.js"
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

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';

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

:::danger[Both modules or neither]
`TerminologyPropertiesPanelModule` renders the UI; `createDefaultTerminologyModule()` provides the registry the UI searches. Passing only the first gives you a terminology group with no search — the entry is not silent about it, but it is a dead panel. Always pass both. See [properties panel](/properties-panel/).
:::

With no arguments you get nine providers, registered in this order:

`snomed-ct` · `loinc` · `icd-10-gm` · `ops` · `atc` · `hl7-terminology-r4-package` · `ihe-xds-class` · `ihe-xds-type` · `kdl`

That list and its order are pinned by [`extension/test/config/terminology-config.test.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/test/config/terminology-config.test.js). The first five talk to a FHIR terminology server over the network. The last four are backed by FHIR packages that ship inside this package and work offline. Their endpoints, value sets and pinned versions are on the [defaults page](/configuration/defaults/); what they contain is on the [discovery page](/configuration/discovery/).

## The shape of the configuration object

Every `createDefault*` function takes the same object. This is the public TypeScript surface, importable from the `/types` subpath ([`extension/src/types.d.ts`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/types.d.ts)):

```ts title="DefaultTerminologyConfig (abridged)"
interface DefaultTerminologyConfig {
  // where the network-backed providers point
  serverConfig?: {
    fhirBaseUrl?: string;
    snomedBaseUrl?: string;
    snowstormBaseUrl?: string;
  };
  snomedConfig?: SnomedProviderConfig;
  fetchFn?: typeof fetch;

  // switch whole groups off
  enableSnomed?: boolean;          // default true
  enableFhirDefaults?: boolean;    // default true
  enablePackageDefaults?: boolean; // default true
  disabledProviderIds?: string[];

  // add to, or override, the default set
  providers?: TerminologyProvider[];
  fhirProviders?: Array<TerminologyProvider | FhirProviderConfig>;
  additionalFhirProviders?: Array<TerminologyProvider | FhirProviderConfig>;
  fhirProviderOverrides?: Array<Partial<FhirProviderConfig>>;
  packageProviders?: Array<TerminologyProvider | PackageProviderConfig>;
  additionalPackageProviders?: Array<TerminologyProvider | PackageProviderConfig>;
  packageProviderOptions?: Record<string, PackageProviderOptions>;

  // package-backed terminology — see the discovery page
  packageDiscovery?: PackageDiscoveryConfig;
  packageAutoDiscovery?: boolean | PackageAutoDiscoveryConfig;
  packageMetadata?: Record<string, PackageMetadata>;
  hl7CodeSystems?: CodeSystemResource[];

  // on-demand loading of code systems not registered up front
  loaderConfig?: false | LoaderConfig;
}
```

Nothing here is required. Every field is a modification of the defaults, and unknown fields are ignored rather than rejected — with two deliberate exceptions that fail fast, both noted below.

## Starting from the defaults and modifying them

The simplest modification is to pass options straight to `createDefaultTerminologyServices`:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const terminologyServices = createDefaultTerminologyServices({
  disabledProviderIds: ['atc'],
  fhirProviderOverrides: [
    { id: 'icd-10-gm', expandParameters: { valueSetVersion: '2024' } }
  ]
});
```

`fhirProviderOverrides` merges by `id` into the built-in FHIR provider configs, field by field — so the override above changes only the requested ValueSet version and leaves the endpoint, display name and system URI alone. An override whose `id` matches no built-in provider is not an error: it is appended as an additional provider config, so a typo produces an extra half-configured provider rather than a message. An override without an `id` at all throws `Provider override requires an id.`

When you need to see or post-process the resolved set, split the two steps:

```js
import {
  createDefaultTerminologyConfig,
  createTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import { MyHouseCatalogueProvider } from './MyHouseCatalogueProvider.js';

const resolved = createDefaultTerminologyConfig({ disabledProviderIds: ['atc'] });

const terminologyServices = createTerminologyServices({
  ...resolved,
  providers: [...resolved.providers, new MyHouseCatalogueProvider()]
});
```

`createDefaultTerminologyConfig` returns `{ providers, packageProviders, fhirProviders, loaderConfig }`. `providers` and `packageProviders` hold constructed provider instances; `fhirProviders` holds plain config objects that `createTerminologyServices` turns into `FhirProvider` instances. Both forms are accepted everywhere, so you can mix them freely.

## Disabling providers

Four switches, from coarse to fine:

| Option | Effect |
|---|---|
| `enableSnomed: false` | drops `snomed-ct` |
| `enableFhirDefaults: false` | drops `loinc`, `icd-10-gm`, `ops`, `atc`, **and everything in `additionalFhirProviders`**; only top-level `fhirProviders` still register |
| `enablePackageDefaults: false` | drops the four bundled package presets; explicit `packageDiscovery` packages still register |
| `disabledProviderIds: ['ops']` | drops individual providers by ID, in every group |

They compose. `{ enableSnomed: false, enablePackageDefaults: false }` leaves exactly `loinc`, `icd-10-gm`, `ops`, `atc`. `{ enableFhirDefaults: false, enablePackageDefaults: false }` leaves exactly `snomed-ct`. These combinations are pinned by the test matrix in [`extension/test/config/terminology-config.test.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/test/config/terminology-config.test.js).

:::caution[`enableFhirDefaults: false` also discards `additionalFhirProviders`]
`additionalFhirProviders` is appended by the same helper that builds the four built-in FHIR configs, and that helper only runs when `enableFhirDefaults` is on. Turning the group off therefore drops your own additions with it, silently.

If you want none of the built-in FHIR code systems but do want your own, put yours in the top-level `fhirProviders` array, which is registered in both branches:

```js
createDefaultTerminologyServices({
  enableFhirDefaults: false,
  fhirProviders: [
    {
      id: 'icd-o-3',
      displayName: 'ICD-O-3',
      systemUri: 'http://terminology.hl7.org/CodeSystem/icd-o-3',
      baseUrl: 'https://terminology.hospital.example/fhir'
    }
  ]
});
```
:::

`disabledProviderIds` matches the provider IDs listed above, and also the generated IDs of discovered package providers (`pkg-hl7-terminology-r4-7-1-0` and similar), so you can disable one installed package version without disabling another.

To go all the way to an offline-only setup, switch off the network groups and the dynamic loader:

```js
createDefaultTerminologyServices({
  enableSnomed: false,
  enableFhirDefaults: false,
  loaderConfig: false
});
```

`loaderConfig: false` omits `terminologyProviderLoader` from the returned services entirely, and `createTerminologyModule` then omits it from the didi module. The panel resolves that service optionally, so this is a supported configuration rather than a broken one.

## Pointing at your own terminology server

### The FHIR-backed providers

`serverConfig.fhirBaseUrl` is the base URL every built-in FHIR provider inherits unless it carries its own. Out of the box it is a public CSIRO Ontoserver instance (`https://r4.ontoserver.csiro.au/fhir`) — convenient for a demo, not something to depend on in production.

```js
createDefaultTerminologyServices({
  serverConfig: {
    fhirBaseUrl: 'https://terminology.hospital.example/fhir'
  }
});
```

That one line moves `loinc`, `icd-10-gm`, `ops`, `atc`, the default SNOMED provider and the dynamic loader to your server. `serverConfig.snomedBaseUrl` overrides the endpoint for SNOMED alone.

### SNOMED CT: two transports

`snomedConfig.transport` selects how the SNOMED provider talks to its server.

`'fhir'` (the default) builds a `FhirProvider` against `ValueSet/$expand` and `CodeSystem/$lookup`. It resolves its base URL from `snomedConfig.baseUrl`, then `serverConfig.snomedBaseUrl`, then `serverConfig.fhirBaseUrl`.

`'snowstorm'` builds a `SnomedCtProvider` against the Snowstorm REST API, which adds hierarchy navigation and ECL. It resolves its base URL from `snomedConfig.baseUrl`, then `serverConfig.snomedBaseUrl`, then `serverConfig.snowstormBaseUrl` — and if none of them is set it throws immediately rather than guessing. There is no public Snowstorm default, so this transport is always opt-in.

```js
createDefaultTerminologyServices({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: '/api/snowstorm/snomed-ct',
    branch: 'MAIN',
    language: 'de',
    languageStrategy: 'header',
    defaultEcl: '< 404684003',
    maxResults: 15
  }
});
```

`baseUrl` is the Snowstorm API context path only. The provider appends the branch and `/concepts` itself, so do not include them. `defaultEcl` is sent as the `ecl` query parameter on every search unless a call passes its own. Any unsupported `transport` value throws during configuration.

Relative base URLs are allowed and are resolved against `location.origin`, which is how a same-origin application route such as `/api/snowstorm/snomed-ct` works.

### Adding a code system

`additionalFhirProviders` appends provider configs to the built-in FHIR group:

```js
createDefaultTerminologyServices({
  additionalFhirProviders: [
    {
      id: 'icd-o-3',
      displayName: 'ICD-O-3',
      systemUri: 'http://terminology.hl7.org/CodeSystem/icd-o-3',
      baseUrl: 'https://terminology.hospital.example/fhir'
    }
  ]
});
```

:::caution[Additional providers do not inherit `serverConfig.fhirBaseUrl`]
Only the four built-in FHIR provider configs get `baseUrl` and `fetchFn` filled in from `serverConfig` and the top-level `fetchFn`. Entries in `additionalFhirProviders` and `fhirProviders` are passed through untouched, and `FhirProvider` calls `new URL(config.baseUrl)` in its constructor — so a missing `baseUrl` is a `TypeError` at construction time, not a silent fallback. Always set `baseUrl` explicitly on providers you add.
:::

If your code system is not a FHIR terminology server at all, write a provider instead — see [extending: providers](/extending/providers/).

### CORS is yours, not the extension's

The extension issues browser `fetch` calls to whatever URL you configure. It ships no proxy and configures none. A third-party terminology server that does not send CORS headers for your origin cannot be reached from a browser, and no configuration option changes that.

The supported hook is `fetchFn` — supply your own transport and route the request through your backend:

```js
createDefaultTerminologyServices({
  fetchFn: async (url, init) => fetch(
    `/api/terminology?target=${encodeURIComponent(url)}`,
    { ...init, headers: { ...init?.headers, 'X-Requested-By': 'bpmn-terminology' } }
  )
});
```

The top-level `fetchFn` reaches the SNOMED provider, the built-in FHIR providers and the dynamic loader. Package-backed providers never make requests, so it does not apply to them.

## Authentication

Authentication is per provider, via an `auth` object on the provider config. Both adapters build the header themselves in `_request`:

| `auth.type` | Header sent | FHIR adapter | Snowstorm adapter |
|---|---|---|---|
| `'Bearer'` | `Authorization: Bearer <token>` | yes | yes |
| `'Basic'` | `Authorization: Basic <credentials>` | yes | yes |
| `'ApiKey'` | `<headerName ?? 'X-Api-Key'>: <apiKey>` | **no** | yes |

`'ApiKey'` appears in the `TerminologyAuth` type and is handled by [`SnowstormAdapter`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/adapters/SnowstormAdapter.js), but [`FhirTerminologyAdapter`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/adapters/FhirTerminologyAdapter.js) only implements `Bearer` and `Basic`. For an API-key-protected FHIR server, use `headers` or `fetchFn` instead.

```js
createDefaultTerminologyServices({
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: 'https://snowstorm.hospital.example/snowstorm/snomed-ct',
    auth: { type: 'Bearer', token: accessToken }
  },
  additionalFhirProviders: [
    {
      id: 'house-catalogue',
      displayName: 'House catalogue',
      systemUri: 'https://hospital.example/CodeSystem/catalogue',
      baseUrl: 'https://terminology.hospital.example/fhir',
      headers: { 'X-Api-Key': apiKey }
    }
  ]
});
```

Three things worth knowing:

- `headers` is a free-form header map merged into every request by both adapters, and it is applied before the `auth` header, so `auth` wins on a collision.
- The `FhirProviderConfig` TypeScript interface does not yet declare `auth`, `headers`, `requestTimeoutMs`, `maxResults` or `version`, although the `FhirProvider` constructor reads all five. TypeScript consumers may need a cast until the interface catches up.
- Sending an `Authorization` header cross-origin requires the server to allow the preflight request and that header by name. Combined with the CORS note above, an authenticated third-party endpoint is usually a backend-route job.

### Request timeouts

`requestTimeoutMs` defaults to 15 000 ms ([`extension/src/core/request-signal.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/core/request-signal.js)). It applies to **search** requests only: `search` is the one call in either adapter that builds an abort signal. Lookups and Snowstorm's hierarchy calls are issued without a timeout and without a caller signal, so they run until the browser gives up.

A timeout aborts the search and surfaces as a `TerminologyRequestError` with `kind: 'timeout'`; a caller-supplied `AbortSignal` passed through `search` options surfaces as `kind: 'aborted'`.

## Language handling

Both adapters resolve a display language and then apply it by one of two strategies. This is the part of the configuration that is easiest to get wrong, because the defaults are not what most readers expect.

### Resolution order

Each adapter resolves, highest first:

1. `config.language` passed to the adapter constructor
2. `language` from the package's central [`extension/src/config/terminology-language-config.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/config/terminology-language-config.js)
3. `navigator.languages[0]`, `navigator.language`, or `navigator.userLanguage`
4. `'en'`

The strategy resolves the same way: `config.languageStrategy`, then the central file's `languageStrategy`, then `'param'`.

The central file currently ships `language: 'de'` and `languageStrategy: 'param'`. Because step 2 is always satisfied, **steps 3 and 4 never run in the shipped package** — the browser language is not consulted. Out of the box, every FHIR request asks for German displays.

### What each strategy does

`'param'` puts the language in the query string:

- FHIR adapter: `displayLanguage=<lang>` on `ValueSet/$expand`. It is *not* added to `CodeSystem/$lookup`.
- Snowstorm adapter: `language=<lang>` on the concept search.

`'header'` sends `Accept-Language: <lang>` instead:

- FHIR adapter: on both `$expand` and `$lookup`.
- Snowstorm adapter: the header is installed on the adapter's shared header set during a search, so it also reaches the subsequent lookup and hierarchy calls.

Language tags are normalised before use: the first tag is taken and the region subtag is dropped, so `de-DE,de;q=0.9` becomes `de`.

On the FHIR side the resolved language is also used to pick a display. When an expansion entry has no `display`, the adapter looks through `designation` for one whose language matches, and falls back to the first designation, then to the code. `includeDesignations=true` is always sent on `$expand` so that fallback has something to work with.

Many FHIR servers honour `displayLanguage`; some honour only `Accept-Language`. If a server returns English displays despite a German request, switching the strategy is the first thing to try.

### Where you can actually set it

:::caution[`language` is only wired through on the Snowstorm transport]
`SnomedCtProvider` forwards `config.language` and `config.languageStrategy` to `SnowstormAdapter`, so `snomedConfig.language` works when `transport: 'snowstorm'`. (The shipped SNOMED defaults already set `languageStrategy: 'header'`, so a Snowstorm SNOMED provider sends `Accept-Language` unless you say otherwise.)

`FhirProvider` does **not** forward them. Its constructor passes `baseUrl`, `systemUri`, `valueSetUri`, `expandParameters`, `lookupParameters`, `auth`, `fetchFn`, `headers` and `requestTimeoutMs` to the adapter, and nothing else. So a `language` or `languageStrategy` on a FHIR provider config — including `snomedConfig` when `transport: 'fhir'`, where the shipped `languageStrategy: 'header'` is simply dropped — is accepted and then ignored. Every FHIR-backed provider uses the central file's values.

The central file is not reachable through the package export map either, so it cannot be overridden from an application. Until this is wired through, the two workarounds are `headers: { 'Accept-Language': 'en' }` on the provider config, which reaches the adapter and is merged into every request, or constructing `FhirTerminologyAdapter` yourself inside a custom provider — see [extending: adapters](/extending/adapters/).

Note what the header workaround does *not* do: the central strategy is still `'param'`, so `$expand` continues to carry `displayLanguage=de` alongside your `Accept-Language` header. It only helps on a server that prefers the header. A server that honours `displayLanguage` keeps returning German.
:::

## Example 2 — one self-hosted FHIR terminology server

A complete, realistic setup: one server for everything, an access token, an attempt at English displays through the header workaround, and the bundled package providers left on because they cost nothing at runtime.

```js title="src/terminology.js"
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const FHIR_BASE_URL = 'https://terminology.hospital.example/fhir';

export function createTerminology(accessToken) {
  return createDefaultTerminologyServices({
    serverConfig: {
      fhirBaseUrl: FHIR_BASE_URL,
      snomedBaseUrl: FHIR_BASE_URL
    },
    snomedConfig: {
      transport: 'fhir',
      auth: { type: 'Bearer', token: accessToken },
      headers: { 'Accept-Language': 'en' }
    },
    fhirProviderOverrides: [
      { id: 'loinc', headers: { 'Accept-Language': 'en' } },
      { id: 'icd-10-gm', headers: { 'Accept-Language': 'en' } },
      { id: 'ops', headers: { 'Accept-Language': 'en' } }
    ],
    disabledProviderIds: ['atc'],
    loaderConfig: {
      fhirBaseUrl: FHIR_BASE_URL
    }
  });
}
```

`loaderConfig` configures the dynamic provider loader, which registers a code system on demand when a saved annotation references a system no registered provider covers. It defaults to `serverConfig.fhirBaseUrl`, so the explicit block above is redundant here — it is shown because the loader is easy to forget when a deployment splits its endpoints.

## Example 3 — a fully explicit provider set

No defaults at all. `createTerminologyServices` registers exactly what you list, in the order `staticProviderFactories` → `providers` → `fhirProviders` → `packageProviders`.

```js title="src/terminology-explicit.js"
import {
  SnomedCtProvider,
  StaticProvider,
  createTerminologyModule,
  createTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import houseCatalogue from './house-catalogue.codesystem.json';

const FHIR_BASE_URL = 'https://terminology.hospital.example/fhir';

const terminologyServices = createTerminologyServices({
  // already-constructed provider instances
  providers: [
    new SnomedCtProvider({
      baseUrl: 'https://snowstorm.hospital.example/snowstorm/snomed-ct',
      branch: 'MAIN',
      language: 'de',
      languageStrategy: 'header',
      defaultEcl: '< 71388002',
      maxResults: 20
    }),
    new StaticProvider(
      'triage-codes',
      'Local triage codes',
      'https://hospital.example/CodeSystem/triage',
      [
        { code: 'T1', display: 'Immediate', system: 'https://hospital.example/CodeSystem/triage' },
        { code: 'T2', display: 'Urgent', system: 'https://hospital.example/CodeSystem/triage' }
      ]
    )
  ],

  // plain configs; each becomes a FhirProvider
  fhirProviders: [
    {
      id: 'loinc',
      displayName: 'LOINC',
      systemUri: 'http://loinc.org',
      valueSetUri: 'http://loinc.org/vs',
      baseUrl: FHIR_BASE_URL
    }
  ],

  // one searchable provider over imported CodeSystem resources
  packageProviders: [
    {
      id: 'house-catalogue',
      packageName: 'hospital.catalogue',
      packageMetadata: { version: '2026.1.0' },
      codeSystems: [houseCatalogue]
    }
  ],

  loaderConfig: {
    fhirBaseUrl: FHIR_BASE_URL
  }
});

export const TerminologyServicesModule =
  createTerminologyModule(terminologyServices);
```

`packageProviders` entries are normalised by shape: an array of `codeSystems` builds one searchable collection provider, a `fallbackProvider` or `fallbackFhirConfig` builds a package-with-network-fallback provider, and a single `codeSystem` builds a static provider. Anything that already looks like a provider — it has `search`, `lookup` and `validate` — is registered as is.

The `StaticProvider` constructor is positional: `new StaticProvider(id, displayName, systemUri, concepts, version?)`.

A provider you write yourself should supply more than the three required members if you want it to render well in the panel; the full contract is on [extending: providers](/extending/providers/).

## Using the registry outside the panel

The services object is useful on its own — nothing about it is bpmn-js specific:

```js
const { terminologyRegistry, terminologyProviderLoader } = terminologyServices;

// what is registered, and how it will be labelled
terminologyRegistry.listProviders();

// search one provider
const { concepts, total } = await terminologyRegistry.search('pneumonia', 'snomed-ct');

// register a code system on demand
await terminologyProviderLoader.ensureProvider(
  'http://terminology.hl7.org/CodeSystem/v3-ActCode'
);
```

`total` is present only when the provider can supply a reliable count. Never infer a total from `concepts.length`.

Search failures throw `TerminologyRequestError` with a `kind` discriminator (`network`, `authorization`, `server`, `data`, `redirect`, `timeout`, `aborted`). That class is not currently re-exported from the barrel, so the working pattern is to read `error.kind` — the properties panel does the same. The full list and the duck-typing pattern are on the [API reference](/api/).

## Where to go next

- [Default values](/configuration/defaults/) — the generated table of every shipped default
- [Package discovery](/configuration/discovery/) — the package-backed providers and the five routes into them
- [Properties panel](/properties-panel/) — `showAnnotations`, the supported element types, and the known limitations
- [Extending](/extending/) — writing your own provider or reusing an adapter
- [API reference](/api/) — every exported symbol
