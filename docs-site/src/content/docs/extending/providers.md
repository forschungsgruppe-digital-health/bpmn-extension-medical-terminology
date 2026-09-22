---
title: "Writing a terminology provider"
description: "The complete provider contract — required members, defaulted members, the metadata the registry reads, the shapes you must return, and a worked example you can paste."
---

A provider is one code system, behind one small interface. `SNOMED CT`, `LOINC`
and a hospital's own procedure catalogue are all the same shape to the rest of
the extension: something with an `id`, a `systemUri`, and an async `search`.

Write one when the code system you need is not among the shipped providers and
is not reachable as a plain FHIR terminology server or npm terminology package.
If it *is* reachable that way, you probably do not need a new class at all —
[configuration](/configuration/) covers FHIR servers, and
[discovery](/configuration/discovery/) covers installed packages.

## The contract, in three parts

The base class
[`extension/src/core/TerminologyProvider.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/core/TerminologyProvider.js)
declares the first two parts. The third — provider metadata — is read by
`TerminologyRegistry` and the properties panel but is **not declared on the
base class**; each shipped subclass supplies it. It is documented in full below,
because a provider that implements only the base class renders without a label
qualifier and without a version.

### 1. Members you must supply

| Member | Type | Notes |
|---|---|---|
| `id` | `string` getter | Unique across the registry. A duplicate registration throws. Also the value you would put in `disabledProviderIds`. |
| `displayName` | `string` getter | Human-readable fallback label. |
| `systemUri` | `string` getter | The canonical CodeSystem URI written into `mt:coding/@system`. |
| `capabilities` | `TerminologyCapabilities` getter | `{ search, lookup, hierarchy, validate }`, all booleans. The base class default is all `false`, and the panel hides a provider whose `search` is `false` — so a subclass that does not override this never reaches the dropdown. |
| `search(term, options)` | `Promise<SearchResult>` | The only method the properties panel calls. |
| `lookup(code)` | `Promise<Concept \| null>` | Return `null` for “not found”, do not throw. |

`id`, `displayName` and `systemUri` throw `Not implemented: id` and so on when
they are not overridden, as do `search()` and `lookup()`, so a half-finished
provider fails loudly at the point of use rather than rendering as `undefined`.
`capabilities` is the exception: it has an all-`false` default and therefore
fails quietly, by hiding the provider.

### 2. Members with working defaults

| Member | Default behaviour | Override when |
|---|---|---|
| `validate(code)` | Calls your `lookup(code)`; returns `{ valid: false, message: 'Code … not found in <id>' }` when it resolves to `null`, and `{ valid: false }` for a concept with `active === false` | your system has a cheaper validation endpoint, or a notion of validity beyond “exists and is active” |
| `getHierarchy(code)` | Returns `{ parents: [], children: [] }` | your system has a hierarchy worth navigating |

Both defaults are safe to inherit. Declare them honestly in `capabilities`:
inheriting the empty `getHierarchy` and advertising `hierarchy: true` is the one
combination that will mislead a caller.

:::note[What the editor actually calls today]
The properties panel calls `search()` and nothing else. `lookup()`, `validate()`
and `getHierarchy()` are part of the programmatic API — reachable through
`registry.lookup(code, id)`, `registry.validate(code, id)` and
`registry.getProvider(id).getHierarchy(code)` — but no UI drives them yet.
Implement them well anyway; they are what makes a provider usable outside the
panel, and they are what `validate` inherits from.

Note also that the registry facade has no `getHierarchy` method: hierarchy is
reached through `getProvider(id)`.
:::

### 3. The metadata the registry reads

`TerminologyRegistry.listProviders()` copies these fields off every registered
provider, and the properties panel's option labels and option grouping are built
from them; the version-drift marker is computed by the registry's
`isCodeSystemVersionOutdated()`, which reads `getCodeSystemVersions()` or
`version`
([`TerminologyRegistry.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/core/TerminologyRegistry.js),
[`AnnotationListEntry.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/entries/AnnotationListEntry.js)).
All of them are optional in the sense that nothing crashes without them. What
happens instead is quieter:

| Field | Type | Used for | If you omit it |
|---|---|---|---|
| `sourceType` | `'api' \| 'package'` | Chooses the dropdown optgroup and the label format | The provider lands in the **Terminology servers (API)** group anyway, but gets the bare `displayName` label with **no system URI** shown — the least informative of the three label formats |
| `sourceName` | `string` | Preferred base of the option label | Falls back to `displayName`, then `id` |
| `sourceLabel` | `string` | The qualifier in parentheses — conventionally the server host for `'api'`, `packageName@version` for `'package'` | The API label degrades from `Name (systemUri, host)` to `Name (systemUri)` |
| `version` | `string` | Two things: it is the fallback CodeSystem version stamped into a new `mt:coding/@version` when a concept carries none, and the registry's fallback source of known versions for this system | Codings whose concepts carry no version are written **without** `@version`, and this provider contributes nothing to the version-drift check |
| `getCodeSystemVersions(systemUri)` | `(string) => string[]` | Authoritative list of versions this provider can serve for a system URI | The registry falls back to `systemUri === provider.systemUri ? [provider.version] : []`. Define the method when one provider serves several CodeSystems |
| `packageName`, `packageVersion`, `packageKey` | `string` | Package-backed provenance; the default configuration reads `packageName`/`packageVersion` (with `getCodeSystemUris()`) to stop discovery from duplicating a bundled package | Irrelevant for an API-backed provider. Only supply them if your provider is backed by an installed npm terminology package |

:::caution[`capabilities` behaves differently depending on how you build the provider]
The panel filters with `capabilities?.search !== false`, so a plain object with
no `capabilities` at all is still offered as searchable — which is how the
registry's own tests get away with minimal mock providers. A class that extends
`TerminologyProvider` and forgets `capabilities` is the opposite case: it
inherits the all-`false` default and is filtered out of the dropdown with no
error and no log line. Declaring `{ search: false }` deliberately is the
supported way to register a lookup-only provider.
:::

:::tip[Rule of thumb]
Supply `sourceType`, `sourceName`, `sourceLabel` and `version`. They are four
lines of getters and they are the difference between a dropdown entry reading
`House catalogue (https://example.org/fhir/CodeSystem/house-catalogue,
example.org)` and one reading `house-catalogue`.
:::

## The shapes you return

From the published TypeScript declarations at `…/types`, which the JSDoc
typedefs in
[`extension/src/core/types.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/core/types.js)
mirror:

```ts
interface Concept {
  code: string;                            // → mt:coding/@code
  display?: string;                        // → mt:coding/@display
  system: string;                          // → mt:coding/@system
  version?: string;                        // → mt:coding/@version
  active?: boolean;
  properties?: Record<string, unknown>;    // provider-specific extras
}

interface SearchResult {
  concepts: Concept[];
  total?: number;                          // only when genuinely reliable
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  language?: string;
  activeOnly?: boolean;
  filter?: Record<string, string>;
}

interface TerminologyCapabilities {
  search: boolean;
  lookup: boolean;
  hierarchy: boolean;
  validate: boolean;
}
```

Four rules that the shipped providers follow and that your provider should too:

1. **`concepts`, not `items`.** A provider returns `{ concepts }`. The
   `{ items }` shape belongs to the transport adapters, one layer below; the
   provider is where that is translated.
2. **Omit `total` unless it is real.** The panel only prints “x of y” when
   `total` is at least `offset + displayed`; otherwise it prints “Showing x
   results”. A guessed total produces a wrong count, not a nicer one.
3. **`system` is per concept.** Set it on every returned concept. A provider
   that aggregates several CodeSystems returns each concept under its own
   canonical URI, which is what gets persisted — that is exactly how the bundled
   package-collection providers work.
4. **Honour `options.signal`.** The panel aborts the previous search on every
   keystroke. See [cancellation](/extending/adapters/#cancellation-and-timeouts).

:::note[`signal` is passed but not declared]
The panel calls `search()` with `{ limit, offset, signal }`, but the published
`SearchOptions` declaration above does not list `signal`. Accept it anyway — it
is the only way to make a search cancellable — and expect the declaration to
catch up.
:::

The panel builds a coding as `system: concept.system || provider.systemUri` and
`version: concept.version || provider.version`, so a concept-level value always
wins over the provider-level fallback.

## A complete provider

This is a working provider over an in-memory catalogue — the shape a hospital's
own procedure or document-class list usually takes. It is complete: paste it,
register it, and it appears in the terminology dropdown with a full label, a
version, and working `search`, `lookup` and (inherited) `validate`.

```js title="house-catalogue-provider.js"
import { TerminologyProvider }
  from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const SYSTEM_URI = 'https://example.org/fhir/CodeSystem/house-catalogue';
const VERSION = '2026.1';

const CATALOGUE = [
  { code: 'HC-0001', display: 'Synthetic imaging review' },
  { code: 'HC-0002', display: 'Synthetic tumour board presentation' },
  { code: 'HC-0003', display: 'Synthetic staging assessment' },
  { code: 'HC-0004', display: 'Synthetic follow-up consultation', active: false }
];

export class HouseCatalogueProvider extends TerminologyProvider {

  /**
   * @param {{ concepts?: Array<{code: string, display: string, active?: boolean}>,
   *           maxResults?: number }} [config]
   */
  constructor(config = {}) {
    super();
    this._concepts = config.concepts || CATALOGUE;
    this._maxResults = config.maxResults || 15;
  }

  // ── required ────────────────────────────────────────────────

  get id() { return 'house-catalogue'; }
  get displayName() { return 'House catalogue'; }
  get systemUri() { return SYSTEM_URI; }

  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  // ── registry metadata ───────────────────────────────────────

  get version() { return VERSION; }
  get sourceType() { return 'api'; }
  get sourceName() { return 'House catalogue'; }
  get sourceLabel() { return 'example.org'; }

  getCodeSystemVersions(systemUri) {
    return systemUri === SYSTEM_URI ? [ VERSION ] : [];
  }

  // ── behaviour ───────────────────────────────────────────────

  async search(term, options = {}) {
    const needle = String(term || '').trim().toLowerCase();

    if (!needle) {
      return { concepts: [], total: 0 };
    }

    const matches = this._concepts.filter(entry =>
      entry.display.toLowerCase().includes(needle)
      || entry.code.toLowerCase().includes(needle)
    );

    const offset = options.offset ?? 0;
    const limit = options.limit ?? this._maxResults;

    return {
      concepts: matches.slice(offset, offset + limit).map(toConcept),
      total: matches.length
    };
  }

  async lookup(code) {
    const entry = this._concepts.find(candidate => candidate.code === code);

    return entry ? toConcept(entry) : null;
  }
}

function toConcept(entry) {
  return {
    code: entry.code,
    display: entry.display,
    system: SYSTEM_URI,
    version: VERSION,
    active: entry.active !== false
  };
}
```

`validate()` and `getHierarchy()` are inherited. `validate('HC-0004')` returns
`{ valid: false }` because that concept is marked inactive — the inherited
implementation reads `concept.active`, which is why `toConcept` sets it
explicitly rather than leaving it undefined.

### Registering it

Three routes, depending on how much of the default setup you want to keep.

```js title="Keep every default, add yours"
import {
  createDefaultTerminologyServices,
  createTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import { HouseCatalogueProvider } from './house-catalogue-provider.js';

const terminologyServices = createDefaultTerminologyServices({
  providers: [ new HouseCatalogueProvider() ]
});

const terminologyServicesModule = createTerminologyModule(terminologyServices);
```

```js title="Only your provider — no defaults, no loader"
import {
  createTerminologyServices,
  createTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import { HouseCatalogueProvider } from './house-catalogue-provider.js';

const terminologyServices = createTerminologyServices({
  providers: [ new HouseCatalogueProvider() ],
  loaderConfig: false
});

const terminologyServicesModule = createTerminologyModule(terminologyServices);
```

```js title="At runtime, on an existing registry"
terminologyServices.terminologyRegistry.register(new HouseCatalogueProvider());
```

The module goes into `additionalModules` next to the properties-panel module —
see [extension points](/extending/) for the full modeler setup, and
[configuration](/configuration/) for what else `createDefaultTerminologyServices`
accepts.

:::caution[`providers` is not `packageProviders`]
`createTerminologyServices` accepts `providers`, `fhirProviders`,
`packageProviders` and `staticProviderFactories`, and it normalises each list
differently. A class instance belongs in `providers`. The other lists accept
plain configuration objects which are turned into `FhirProvider` or
package-backed providers for you.
:::

## Signalling errors

The properties panel does not care what class your error is. It reads
`error.kind` and nothing else, and turns it into a message for the user:

| `error.kind` | Message shown under the search field |
|---|---|
| `'authorization'` | “… denied access. Check the server credentials and permissions.” |
| `'server'` | “… is currently unavailable (HTTP `error.status`). Please try again later.” |
| `'data'` | “… returned invalid terminology data. Check the server compatibility and try again.” |
| `'redirect'` | “… redirected the search request. Use a redirect-free endpoint or a host-owned same-origin endpoint.” |
| `'timeout'` | “… did not respond in time. Please try again.” |
| anything else, or absent | “… could not be reached. Check your network connection and server URL.” |

The leading “…” is the selected provider's `displayName`, or the literal
`The selected terminology` when none is resolved.

The internal error class is `TerminologyRequestError`
([`core/TerminologyRequestError.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/core/TerminologyRequestError.js)),
which both adapters throw. It carries `kind`, `host`, `status` and a native
`cause`.

:::caution[You cannot import that class today]
`TerminologyRequestError` is not re-exported from the barrel, and the export map
exposes no path that reaches it. Consumers therefore duck-type — which is
exactly what the properties panel does, so the contract that matters is the
`kind` property, not the class identity. A direct export is planned; see the
[roadmap](/roadmap/). Until then, throw your own error carrying a `kind`:
:::

```js title="An error the panel classifies correctly"
function terminologyError(message, kind, status) {
  const error = new Error(message);

  error.kind = kind;

  if (status !== undefined) {
    error.status = status;
  }

  return error;
}

// inside search()
if (response.status === 401 || response.status === 403) {
  throw terminologyError(
    'House catalogue denied access.', 'authorization', response.status
  );
}

if (!response.ok) {
  throw terminologyError(
    `House catalogue returned HTTP ${response.status}.`, 'server', response.status
  );
}
```

If your provider is built on one of the shipped adapters, you get all of this
for free — the adapter classifies the response and throws the right `kind`. Let
the error propagate rather than wrapping it. See
[the error model](/extending/adapters/#the-error-model).

Two further conventions:

- **`lookup()` returns `null` for a missing code.** “Not found” is a result, not
  a failure. Both adapters translate HTTP 404 into `null` for exactly this
  reason.
- **An empty search result is a success.** Return `{ concepts: [], total: 0 }`.
  The `'data'` kind exists to distinguish “the server answered with nonsense”
  from “the server answered, and there were no matches”.

## Combining a fast local copy with a live server

`FallbackProvider` composes two providers that serve the **same** `systemUri`
(it throws at construction if they disagree). It tries the primary, and falls
back when the primary throws or returns nothing:

```js
import {
  FallbackProvider
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const provider = new FallbackProvider({
  id: 'house-catalogue',
  displayName: 'House catalogue',
  primaryProvider: new HouseCatalogueProvider(),  // offline snapshot
  fallbackProvider: liveHouseCatalogueProvider    // authoritative server
});
```

A primary that *throws* is logged with `console.warn` before the fallback runs;
a primary that merely returns no results falls through silently. Either way the
user sees nothing unusual. `capabilities` is the union of both, and `version` is
the primary's, falling back to the fallback's. For the common case — a
package-backed snapshot plus a FHIR server — `createPackageFallbackProvider`
builds the pair for you from a CodeSystem resource and a FHIR configuration.

## Testing your provider

Providers are plain classes with async methods, so they test without a modeler,
without a DOM, and without a network. The repository's own provider tests are
the pattern worth copying —
[`extension/test/providers/`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/tree/main/extension/test/providers)
and
[`extension/test/core/TerminologyRegistry.test.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/test/core/TerminologyRegistry.test.js),
which shows the minimal object the registry accepts as a provider.

Four cases are worth pinning for any provider:

1. `search` returns `{ concepts }` with `system` set on every concept.
2. `lookup` of an unknown code resolves to `null` rather than throwing.
3. A failing transport produces an error with the `kind` you intend.
4. `getCodeSystemVersions(systemUri)` returns what the registry needs — and
   returns `[]` for any other URI.

If your provider talks HTTP, inject `fetchFn` rather than mocking the global —
both adapters and both network-backed providers (`FhirProvider`,
`SnomedCtProvider`) take one, which is what makes them testable and what makes
host-owned request routing possible at all.

## Related

- [Transport adapters](/extending/adapters/) — do not hand-write FHIR
  `$expand`/`$lookup` or Snowstorm calls; reuse an adapter.
- [API reference](/api/) — every exported symbol, generated from source.
- [Configuration](/configuration/) and [its generated defaults](/configuration/defaults/)
  — the providers you get before writing any code.
- [Properties panel](/properties-panel/) — how a provider's output reaches the
  user, and the current limitations of the annotation editor.
