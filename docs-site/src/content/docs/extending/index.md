---
title: Extending
description: Add a custom terminology provider or reuse the built-in FHIR and Snowstorm transports.
---

Extend the package when the built-in FHIR, SNOMED CT, static, or package-backed
providers do not cover your terminology source. You normally add a provider; changing
the BPMN XML model is not required.

## Choose the smallest extension point

| Need | Use |
| --- | --- |
| Add concepts already available as FHIR CodeSystem JSON | Package discovery or `StaticProvider` |
| Add a FHIR terminology server | `FhirProvider` configuration |
| Add native Snowstorm access | `SnomedCtProvider` configuration |
| Add another API, database, or local catalogue | Custom `TerminologyProvider` |
| Change the serialized `mt:` format | Moddle descriptor change; requires maintainer review |

Start with [Configuration](/configuration/) and
[Terminology packages](/configuration/discovery/) before writing code.

## Provider contract

A provider represents a searchable terminology source. It supplies:

- a unique `id`, a `displayName`, and a canonical `systemUri`;
- `capabilities` describing the supported operations;
- `search(term, options)` and `lookup(code)`;
- optionally custom `validate(code)` and `getHierarchy(code)` implementations.

Returned concepts use this shape:

```js
{
  code: 'HC-001',
  display: 'Synthetic imaging review',
  system: 'https://example.org/CodeSystem/house-catalogue',
  version: '2026.1',
  active: true
}
```

## Minimal custom provider

```js
import {
  TerminologyProvider,
  createDefaultTerminologyServices,
  createTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const SYSTEM = 'https://example.org/CodeSystem/house-catalogue';
const CONCEPTS = [
  { code: 'HC-001', display: 'Synthetic imaging review' },
  { code: 'HC-002', display: 'Synthetic follow-up consultation' }
];

class HouseCatalogueProvider extends TerminologyProvider {
  get id() { return 'house-catalogue'; }
  get displayName() { return 'House catalogue'; }
  get systemUri() { return SYSTEM; }

  get capabilities() {
    return { search: true, lookup: true, hierarchy: false, validate: true };
  }

  async search(term, options = {}) {
    const query = term.trim().toLowerCase();
    const matches = CONCEPTS.filter(({ code, display }) =>
      code.toLowerCase().includes(query) || display.toLowerCase().includes(query)
    );
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 15;

    return {
      concepts: matches.slice(offset, offset + limit).map(toConcept),
      total: matches.length
    };
  }

  async lookup(code) {
    const concept = CONCEPTS.find(entry => entry.code === code);
    return concept ? toConcept(concept) : null;
  }
}

function toConcept(concept) {
  return { ...concept, system: SYSTEM, version: '2026.1', active: true };
}

const services = createDefaultTerminologyServices({
  providers: [ new HouseCatalogueProvider() ]
});

export const HouseTerminologyModule = createTerminologyModule(services);
```

Use `options.limit` and `options.offset`, and pass `options.signal` to cancellable
requests. Set `system` on every concept when one provider aggregates multiple code
systems.

## Reuse a transport adapter

An adapter handles HTTP and response mapping; a provider supplies identity, capabilities,
and registry integration.

| Adapter | Protocol | Use it for |
| --- | --- | --- |
| `FhirTerminologyAdapter` | FHIR R4 `$expand` and `$lookup` | Any compatible FHIR terminology server |
| `SnowstormAdapter` | Snowstorm concept API | ECL and SNOMED CT hierarchy navigation |

Both support custom headers, authentication options, `fetchFn`, cancellation, and
classified request errors. They cannot bypass browser CORS; route through a backend you
operate when the server does not allow the browser origin.

Prefer the ready-made `FhirProvider` or `SnomedCtProvider` unless the source needs custom
behaviour. Full constructor options and return types are in the
[API reference](/api/).

## Test the integration

At minimum, verify:

- empty and successful search results;
- lookup of present and absent codes;
- correct `system`, `version`, `code`, and `display` values;
- network, authorization, invalid-response, timeout, and cancellation behaviour;
- registration alongside the default providers;
- XML round-trip after a returned concept is selected.

A change to `extension/src/moddle/medical-terminology.json` changes the serialized data
contract. Renaming or removing a type or property is breaking and requires explicit
maintainer approval.
