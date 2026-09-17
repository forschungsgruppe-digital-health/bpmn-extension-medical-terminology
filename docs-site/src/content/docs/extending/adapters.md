---
title: "Reusing the transport adapters"
description: "When to build a provider on FhirTerminologyAdapter or SnowstormAdapter, their options, the error model they produce, and how cancellation and timeouts work."
---

An adapter is the HTTP half of a provider. It knows one wire protocol — FHIR R4
terminology operations, or the Snowstorm REST API — and it turns responses into
the extension's internal `Concept` shape. It knows nothing about the registry,
the properties panel, or BPMN.

Building on an adapter rather than on `fetch` buys you three things that are
tedious to get right: **response validation**, a **classified error model** the
properties panel already understands, and **cancellation with a timeout**. If
your code system is reachable over either protocol, reuse the adapter and keep
your provider to a dozen lines.

## Which adapter

| | `FhirTerminologyAdapter` | `SnowstormAdapter` |
|---|---|---|
| Protocol | FHIR R4 `ValueSet/$expand`, `CodeSystem/$lookup` | Snowstorm's native concept API |
| Works against | Any FHIR R4 terminology server — Ontoserver, HAPI FHIR, a Snowstorm FHIR endpoint, a national server | A Snowstorm deployment |
| Methods | `search`, `lookup` | `search`, `lookup`, `getParents`, `getChildren` |
| Hierarchy | no | yes |
| Auth types | `Bearer`, `Basic` | `Bearer`, `Basic`, `ApiKey` |
| SNOMED-specific features | via `expandParameters` | ECL, semantic tags, editions via `branch` |
| Used by | `FhirProvider` (LOINC, ICD-10-GM, OPS, ATC, and SNOMED CT under the default transport) | `SnomedCtProvider` |

SNOMED CT can be reached either way, and the package ships both routes. The
default configuration uses the **FHIR** transport against a public terminology
server with the implicit SNOMED ValueSet (`http://snomed.info/sct?fhir_vs`);
`SnomedCtProvider` and `SnowstormAdapter` are the opt-in native route, which is
what you want for ECL queries, hierarchy navigation, or a specific edition
branch. Switching between them is a configuration change —
`snomedConfig.transport: 'fhir' | 'snowstorm'` — not a code change. See
[configuration](/configuration/).

:::note[Neither adapter can defeat CORS]
Both take the base URL you give them and call it from the browser. If the server
does not send CORS headers permitting your origin, the request fails and there
is nothing the adapter can do about it. The supported hook is `fetchFn`: route
through your own backend and hand the adapter a function that calls it. The
public `https://snowstorm.snomedtools.org/snowstorm/snomed-ct` endpoint in
particular redirects browser requests to a denial page and returns no usable
CORS response, so it cannot be used directly — that is what the `'redirect'`
error kind exists to tell you.
:::

## `FhirTerminologyAdapter`

```js
import {
  FhirTerminologyAdapter
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const adapter = new FhirTerminologyAdapter({
  baseUrl: 'https://example.org/fhir',
  systemUri: 'https://example.org/fhir/CodeSystem/lab-catalogue',
  valueSetUri: 'https://example.org/fhir/ValueSet/lab-catalogue'
});
```

| Option | Default | Purpose |
|---|---|---|
| `baseUrl` *(required)* | — | FHIR base URL. A relative value is resolved against the page origin, which is how a host-owned same-origin route is configured. Missing or blank throws. |
| `systemUri` *(required)* | — | The CodeSystem URI sent to `$lookup` and used as the concept fallback system. |
| `valueSetUri` | derived | The ValueSet expanded by `$expand`. When omitted, the adapter derives `` `${systemUri}?vs` `` unless `systemUri` already looks like a ValueSet (contains `/ValueSet/` or a `?`). Set it explicitly whenever the server publishes a named ValueSet. |
| `auth` | — | `{ type: 'Bearer', token }` or `{ type: 'Basic', credentials }`. **`ApiKey` is not applied by this adapter** — use `headers` for a custom header. |
| `headers` | `{}` | Extra request headers, merged after `Accept: application/fhir+json`. |
| `fetchFn` | `globalThis.fetch` | Injection point for a proxy route or a test double. |
| `expandParameters` | `{}` | Extra `$expand` query parameters. Empty, `null` and `undefined` values are skipped. |
| `lookupParameters` | `{}` | Extra `$lookup` query parameters, same filtering. |
| `requestTimeoutMs` | `15000` | Search timeout. `0` disables it. |
| `language`, `languageStrategy` | central config | `'param'` sends `displayLanguage`; `'header'` sends `Accept-Language`. |

`expandParameters` is one of the two places a version gets pinned. The shipped
defaults use three different forms, because the servers differ: `valueSetVersion`
(ICD-10-GM, ATC), a piped `system-version` (OPS), and a `lookupParameters.version`
(ATC). `FhirProvider` reads all of them when deriving its own `version`.

```js
{
  id: 'ops',
  displayName: 'OPS',
  systemUri: 'http://fhir.de/CodeSystem/bfarm/ops',
  valueSetUri: 'http://fhir.de/ValueSet/bfarm/ops',
  expandParameters: {
    'system-version': 'http://fhir.de/CodeSystem/bfarm/ops|2021'
  }
}
```

### What `search` sends and returns

`search({ term, limit, offset, signal })` issues
`GET {baseUrl}/ValueSet/$expand` with `url`, `filter`, `count`, `offset`, the
language parameter when the strategy is `'param'`, your `expandParameters`, and
`includeDesignations=true` (always, and set last — several servers only return
usable text with it). It resolves to `{ items, total }` where `items` are
`Concept` objects.

The mapping is deliberate:

- `display` is `expansion.contains[].display`, falling back to a designation in
  the requested language, then to any designation, then to the code.
- `active` is `!entry.inactive`.
- `version` comes from the entry, and when the entry has none, from the
  expansion's `version`, `system-version` or `used-codesystem` parameter — the
  part after the final `|` if it is a piped canonical.

The response is validated before mapping. A body that is not an object, has no
`expansion`, has a `contains` that is present but not an array, has a
non-numeric `total`, or contains an entry without a non-empty string `code`, is
rejected as a `'data'` error rather than mapped into half-empty concepts.

### What `lookup` sends and returns

`lookup(code)` issues `GET {baseUrl}/CodeSystem/$lookup?system=…&code=…` plus
your `lookupParameters`, and reads `display`, `name` and `version` from the
returned `Parameters` resource (string values only). The `'header'` language
strategy applies here too; the `'param'` strategy does not. HTTP 404 resolves to
`null`. The result is always `active: true` — `$lookup` succeeding is taken as
the concept existing.

:::caution[Timeout and cancellation apply to `search` only]
Neither adapter passes an abort signal on the `lookup`, `getParents` or
`getChildren` paths, so `requestTimeoutMs` and a caller's `signal` have no
effect there. A hung server on a lookup hangs until `fetch` itself gives up.
This is a current limitation of both adapters, not a configuration you have
missed.
:::

## `SnowstormAdapter`

```js
import {
  SnowstormAdapter
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const adapter = new SnowstormAdapter({
  baseUrl: '/api/snowstorm/snomed-ct',   // host-owned route, no CORS problem
  branch: 'MAIN',
  language: 'de',
  languageStrategy: 'header'
});
```

| Option | Default | Purpose |
|---|---|---|
| `baseUrl` *(required)* | — | The Snowstorm API context path — **without** the branch and without `/concepts`; the adapter appends both. Relative values resolve against the page origin. Missing or blank throws. |
| `branch` | `'MAIN'` | The SNOMED edition branch. |
| `auth` | — | `Bearer`, `Basic`, or `ApiKey` (header name from `auth.headerName`, default `X-Api-Key`). |
| `headers` | `{}` | Extra request headers. |
| `fetchFn` | `globalThis.fetch` | Injection point. |
| `requestTimeoutMs` | `15000` | Search timeout. `0` disables it. |
| `language`, `languageStrategy` | central config | `'param'` sends `?language=`; `'header'` sends `Accept-Language`. |

`search({ term, limit, offset, additionalParams, signal })` calls
`GET {baseUrl}/{branch}/concepts` with `term`, `limit`, `offset` and
`activeFilter=true` — inactive concepts are never returned by this path.
`additionalParams` is how SNOMED-specific query parameters get through;
`SnomedCtProvider` uses it for `ecl` and `semanticTag`.

Concept mapping adds SNOMED structure that the generic adapter cannot produce:

- `display` is the preferred term (`pt.term`), falling back to the fully
  specified name.
- `properties.fsn` is the FSN, `properties.semanticTag` is the parenthesised
  tail of it (`(procedure)` → `procedure`), `properties.definitionStatus` is
  passed through.
- `version` is a SNOMED edition version URI —
  `http://snomed.info/sct/{moduleId}/version/{effectiveTime}` — when both parts
  are present, otherwise the bare effective time.

`lookup(code)` resolves to `null` on 404. `getParents(code)` and
`getChildren(code)` return `Concept[]`, `[]` on 404; `getChildren` requests at
most 50 and tolerates both a bare array and an `{ items }` wrapper.

## The error model

Both adapters throw `TerminologyRequestError` with a `kind` discriminator, a
`host`, an optional `status`, and the original failure as `cause`.

| `kind` | Raised when |
|---|---|
| `'authorization'` | HTTP 401 or 403 |
| `'server'` | any other non-OK status |
| `'redirect'` | the response was redirected, is `opaqueredirect`, or has a 3xx status |
| `'network'` | `fetch` itself rejected, or there is no status at all |
| `'data'` | the response parsed but does not have a usable shape |
| `'timeout'` | the configured `requestTimeoutMs` elapsed first |
| `'aborted'` | the caller's `signal` fired first |

One asymmetry is worth knowing: the Snowstorm search path and both adapters'
`lookup` paths test `response.redirected` explicitly, while the FHIR search path
only classifies a response once it is not OK. A redirect that still ends in a
usable `200` therefore passes through the FHIR search unremarked.

:::note[The published type union is narrower than the runtime]
The `TerminologyRequestErrorKind` type exported from `…/types` lists
`network`, `authorization`, `server`, `data` and `redirect`. The runtime
additionally produces `timeout` and `aborted`, and the properties panel handles
`timeout` explicitly. Treat the seven kinds above as the real contract, and
expect the declaration to catch up.
:::

A provider built on an adapter should let these propagate. The panel maps each
kind to a message on its own; see
[signalling errors](/extending/providers/#signalling-errors) for the table and
for the duck-typing pattern that is necessary because the error class is not
exported.

One habit worth copying from the shipped providers: log and rethrow, rather than
swallow.

```js
try {
  result = await this._adapter.search({ /* … */ });
} catch (error) {
  console.warn(
    `[terminology] Search failed for provider "${this.id}" at ${this.sourceLabel}.`,
    error
  );
  throw error;
}
```

## Cancellation and timeouts

Both adapters build their search request signal with `createRequestSignal`
([`core/request-signal.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/core/request-signal.js)),
which combines the caller's `AbortSignal` with a timer. Whichever fires first
decides the error kind: `'aborted'` for the caller, `'timeout'` for the timer.
The default is 15 seconds; `requestTimeoutMs: 0` disables the timer entirely.
The listener and the timer are always cleaned up, including on the failure path.

Your provider's part is one line — pass the signal through:

```js
async search(term, options = {}) {
  const result = await this._adapter.search({
    term,
    limit: options.limit ?? this._maxResults,
    offset: options.offset ?? 0,
    signal: options.signal        // ← do not drop this
  });
  // …
}
```

This matters in the editor: the annotation entry creates an `AbortController`
per search and aborts the previous request on every keystroke, discarding any
superseded response. A provider that ignores `options.signal` leaves those
requests running and lets a slow early response overwrite a fast later one.

## Language resolution

Both adapters resolve the request language in the same order — the first value
that exists wins:

1. the `language` passed to the adapter constructor;
2. `extension/src/config/terminology-language-config.js`, the package's central
   language file;
3. the browser (`navigator.languages[0]`, `navigator.language`);
4. `'en'`.

The value is normalised to its primary subtag, so `de-DE` is sent as `de`.
`languageStrategy` decides how it travels: `'param'` as a query parameter
(`displayLanguage` for FHIR, `language` for Snowstorm), `'header'` as
`Accept-Language`. Servers differ on which they honour, which is why the option
exists — Ontoserver accepts the parameter; try the header when displays come
back in the wrong language.

:::caution[`FhirProvider` does not forward language settings]
`SnomedCtProvider` passes `language` and `languageStrategy` on to
`SnowstormAdapter` (defaulting the strategy to `'header'`). `FhirProvider` does
not pass either to `FhirTerminologyAdapter`. Under the default SNOMED transport
(`'fhir'`), `snomedConfig.language` and `snomedConfig.languageStrategy` are
therefore not applied — the adapter falls back to the central language file, or
to the browser. If you need per-provider language control over FHIR today,
construct `FhirTerminologyAdapter` yourself, as in the example below.
:::

## A provider built on an adapter

The complete equivalent of the
[in-memory example](/extending/providers/#a-complete-provider), backed by a FHIR
terminology server instead. It is shorter than the in-memory version, because
the adapter does the transport work.

```js title="lab-catalogue-provider.js"
import {
  TerminologyProvider,
  FhirTerminologyAdapter
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const SYSTEM_URI = 'https://example.org/fhir/CodeSystem/lab-catalogue';

export class LabCatalogueProvider extends TerminologyProvider {

  /**
   * @param {{ baseUrl: string, version?: string, maxResults?: number,
   *           auth?: object, fetchFn?: typeof fetch, language?: string }} config
   */
  constructor(config) {
    super();

    this._version = config.version;
    this._maxResults = config.maxResults || 15;
    this._sourceLabel = new URL(config.baseUrl, globalThis.location?.origin).host;

    this._adapter = new FhirTerminologyAdapter({
      baseUrl: config.baseUrl,
      systemUri: SYSTEM_URI,
      valueSetUri: 'https://example.org/fhir/ValueSet/lab-catalogue',
      auth: config.auth,
      fetchFn: config.fetchFn,
      language: config.language,
      languageStrategy: 'header',
      requestTimeoutMs: 10_000,
      ...(config.version
        ? { expandParameters: { valueSetVersion: config.version } }
        : {})
    });
  }

  get id() { return 'lab-catalogue'; }
  get displayName() { return 'Laboratory catalogue'; }
  get systemUri() { return SYSTEM_URI; }
  get version() { return this._version; }
  get sourceType() { return 'api'; }
  get sourceName() { return 'Laboratory catalogue'; }
  get sourceLabel() { return this._sourceLabel; }

  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  async search(term, options = {}) {
    const result = await this._adapter.search({
      term,
      limit: options.limit ?? this._maxResults,
      offset: options.offset ?? 0,
      signal: options.signal
    });

    return {
      concepts: (result.items || []).map(concept => this._withDefaults(concept)),
      total: result.total
    };
  }

  async lookup(code) {
    const concept = await this._adapter.lookup(code);

    return concept ? this._withDefaults(concept) : null;
  }

  /** The ValueSet may expand under its own URI; persist the CodeSystem URI. */
  _withDefaults(concept) {
    return {
      ...concept,
      system: SYSTEM_URI,
      version: concept.version || this._version
    };
  }
}
```

Register it exactly like any other provider —
[see the registration routes](/extending/providers/#registering-it).

The `_withDefaults` step is not optional bookkeeping. `$expand` returns concepts
whose `system` may be the ValueSet's, and a coding persisted into BPMN XML must
carry the **CodeSystem** URI; `FhirProvider` does the same thing for the same
reason. The version fallback is the second half of it: without it, a server that
omits the expansion version writes a `term:coding` with no `@version`, which
takes that coding out of the version-drift check entirely.

## Related

- [Writing a terminology provider](/extending/providers/) — the contract the
  adapter sits behind.
- [Extension points](/extending/) — where adapters fit among the other seams.
- [Configuration](/configuration/) — server URLs, transports, versions and
  authentication without writing a class.
- [API reference](/api/) — generated signatures for both adapters.
