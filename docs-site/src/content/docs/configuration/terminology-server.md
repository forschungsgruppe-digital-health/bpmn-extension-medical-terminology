---
title: Connecting a terminology server
description: Connect LOINC, ICD-10-GM, OPS, ATC and SNOMED CT to a FHIR terminology server or Snowstorm, with a worked example against the HL7 Deutschland server, authentication, the demo setup and troubleshooting.
---

The package ships no terminology server. Until you set `serverConfig.fhirBaseUrl`, it offers only
the bundled HL7 Terminology, IHE XDS and KDL code systems and sends no request. This page connects
it to a server end to end. Every option is described under [Configuration options](/configuration/),
and what is active without configuration is listed under
[Default configuration](/configuration/defaults/).

:::caution[Licences first]
Connecting a server does not license its content. Before you connect one:

- read the operator's terms of use: they decide who may query the server, for which purposes and
  how often;
- hold the publishers' licences for every code system you query, and show their notices in your
  application;
- for SNOMED CT, hold an Affiliate Licence for the edition you configure (in Germany from BfArM,
  the National Release Centre).

See [Licensing and terminology rights](/licensing/).
:::

## What the server must support

The extension is a browser client of a FHIR R4 terminology server. It sends only `GET` requests:

| Purpose | Request |
| --- | --- |
| Search | `{fhirBaseUrl}/ValueSet/$expand?url={value set}&filter={term}&count=15&offset=0&displayLanguage=de&includeDesignations=true` |
| Lookup and validation of a stored code | `{fhirBaseUrl}/CodeSystem/$lookup?system={code system}&code={code}&displayLanguage=de` |
| Loading a code system that no provider covers (dynamic loader) | `{fhirBaseUrl}/CodeSystem?url={code system}` |

The server therefore needs `ValueSet/$expand` with `filter`, `count` and `offset`, and
`CodeSystem/$lookup`, for the value sets and code systems listed under
[Default configuration](/configuration/defaults/). If your server publishes them under other
URLs, override `valueSetUri` per provider.

The default providers send no version parameter. The server answers from its current release, and
the extension stores the release the server reports with each coding: the `used-codesystem`
parameter of the expansion for a search, the `version` output for a lookup. Parameters you add
through `expandParameters` or `lookupParameters` are appended to the query. The SNOMED CT
provider also sends `activeOnly=true`, so searches return active concepts only; see
[Add SNOMED CT](#add-snomed-ct).

Requests carry only `Accept: application/fhir+json`, plus the headers the browser adds itself. They
are CORS simple requests: the browser sends no preflight, and the server only has to answer with an
`Access-Control-Allow-Origin` header that allows your application's origin. As soon as you add
`auth` or custom `headers`, the browser first sends a preflight `OPTIONS` request, and the server
must allow each of those headers explicitly.

## Search throttling

The properties panel limits how often it queries a server. For a provider whose searches may reach
a terminology server, it sends a search only:

- **from three characters on.** A shorter term sends nothing; the panel asks for more characters,
  for example "Enter at least 3 characters to search LOINC.";
- **300 ms after the last keystroke.** While you type, the running request is cancelled and only
  the last term is sent.

Such providers report `sourceType: 'api'` (the FHIR providers, SNOMED CT over FHIR or Snowstorm,
and code systems the dynamic loader adds) or `remoteSearch: true`. A `FallbackProvider`, such as an
offline package with FHIR fallback (`fallbackFhirConfig`), reports `remoteSearch: true` when its
primary or fallback provider queries a server. Its package searches are throttled too, because the
panel cannot tell in advance whether the package will answer a term.

Accepting a suggestion with the right arrow key searches its text at once, still subject to the
minimum length. The bundled code systems and other local providers search at once, from one
character. Both values are options of the properties-panel module:

```js
createTerminologyPropertiesPanelModule({
  serverSearchDebounceMs: 300, // default; 0 searches on every keystroke
  serverSearchMinLength: 3     // default; 1 searches from the first character
});
```

A custom provider that queries a server should report `sourceType: 'api'`, or `remoteSearch: true`
if it only falls back to one, so that the panel throttles it too; the panel cannot throttle a
provider that reports neither. The throttling lowers the number of requests and of partial search terms that
reach the server; it does not replace an arrangement with the operator about the volume you send.

## Worked example: HL7 Deutschland terminology server

HL7 Deutschland e.V. runs a public FHIR R4 terminology server (Ontoserver) with the base URL
`https://tx.fhir.de/fhir`. Reading needs no account. Use exactly that base URL; an `/r4` path
variant, as other servers use it, returns HTTP 404.

Before you connect it, read its [terms of use](https://tx.fhir.de/de/terms). In summary:

- Use for FHIR tooling, software development, validation and non-commercial research is permitted.
- Bulk or high-volume automated querying needs a prior arrangement with the operator.
- The content keeps its publishers' licences, listed on the server's
  [licence page](https://tx.fhir.de/de/licenses). For SNOMED CT you need a valid Affiliate Licence.
- The [privacy statement of HL7 Deutschland](https://hl7.de/datenschutz/) applies to your requests.

In addition, its [start page](https://tx.fhir.de/de) (checked 27 November 2026) describes the
server as used mainly for FHIR tooling and validation and not intended as the primary terminology
server of a production system. The start page also states that the server serves validation only,
that is, checking that terminologies are used correctly, and that the terminologies it obtains from
the Zentraler Terminologieserver (ZTS) are kept internally and processed only for validation.
Whether interactive searches of ICD-10-GM, OPS and ATC-GM through tx.fhir.de, as in this example,
fit this role is for HL7 Deutschland to say; this project has no confirmation from them. Ask them
before you rely on it.

Use it to develop and evaluate an integration. In production, use a server your organisation
operates or has contracted. The panel's [search throttling](#search-throttling) applies to this
server as to any other: by default a search is sent from three characters on and 300 ms after the
last keystroke. Ask HL7 Deutschland before you send higher volumes, for example from an
application with many users or with shorter throttling settings.

When this page was checked (26 November 2026), the server held, among others:

- LOINC;
- ICD-10-GM and OPS, releases 2025 and 2026;
- ATC-GM 2026;
- the German edition of SNOMED CT (`11000274103`), releases `20251115`, `20260515` and
  `20260815`, but no separate International Edition.

Its content changes over time. The server reflects the requesting origin in
`Access-Control-Allow-Origin`, so browser applications on any origin, including
`http://localhost:5173`, can call it directly. Its preflight allows the `Authorization` header; a
custom header such as `X-Client-App` was rejected with HTTP 403.

### Register the modules

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

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';

const terminologyModule = createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: 'https://tx.fhir.de/fhir' }
});

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TerminologyPropertiesPanelModule,
    terminologyModule
  ],
  moddleExtensions: { mt: TerminologyModdleDescriptor }
});
```

This one setting registers LOINC, ICD-10-GM, OPS and ATC against that server and enables the
dynamic loader. SNOMED CT stays disabled until you configure an edition (or an explicit value
set); see [Add SNOMED CT](#add-snomed-ct).

### Check the result

Start the application, select a task, choose **OPS** in the terminology group and search for
`Lobektomie`. The browser's network tab shows this request:

```text
GET https://tx.fhir.de/fhir/ValueSet/$expand?url=http%3A%2F%2Ffhir.de%2FValueSet%2Fbfarm%2Fops&filter=Lobektomie&count=15&offset=0&displayLanguage=de&includeDesignations=true
```

Select `5-324` "Einfache Lobektomie und Bilobektomie der Lunge". The extension writes the system,
version, code and display text into the diagram. It never writes the server URL:

```xml
<bpmn:task id="Task_Lobectomy" name="Lobektomie durchführen">
  <bpmn:extensionElements>
    <mt:annotations xmlns:mt="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1">
      <mt:annotation id="mt-ann-1">
        <mt:coding system="http://fhir.de/CodeSystem/bfarm/ops" version="2026" code="5-324" display="Einfache Lobektomie und Bilobektomie der Lunge" />
      </mt:annotation>
    </mt:annotations>
  </bpmn:extensionElements>
</bpmn:task>
```

`version="2026"` comes from the expansion's `used-codesystem` parameter
(`http://fhir.de/CodeSystem/bfarm/ops|2026`). It is the release the server actually used, not a
configured value. When the server moves to the next release, new codings get that release and
existing codings keep theirs.

### Pin a release

The default providers follow the server's current release. To keep searches on one release, for
example a billing year, override the provider:

```js
createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: 'https://tx.fhir.de/fhir' },
  fhirProviderOverrides: [
    {
      id: 'icd-10-gm',
      expandParameters: { valueSetVersion: '2026' },
      // Optional: look up and validate stored codes in the same release.
      lookupParameters: { version: '2026' }
    }
  ]
});
```

Ask the server which releases it holds before you pin one:

```bash
curl -H 'Accept: application/fhir+json' \
  'https://tx.fhir.de/fhir/CodeSystem?url=http://fhir.de/CodeSystem/bfarm/icd-10-gm&_elements=url,version'
```

Keep these points in mind when you pin a release:

- **Year-labelled value sets.** `valueSetVersion` selects a version of the value set. On
  tx.fhir.de this works for ICD-10-GM and OPS 2025 and 2026, because each yearly value set includes
  the code system release of the same year.
- **A pin breaks when the release goes.** Once the server drops the pinned release, every search
  with that provider fails with HTTP 404, and the panel reports that the provider could not answer
  the request: "… could not answer this request (HTTP 404). The configured value set or version may
  not exist on this server." Update or remove the pin.
- **`system-version` has no effect here.** In FHIR R4 it applies only when the value set does not
  fix the code system version itself. The BfArM value sets fix it, so tx.fhir.de ignores the
  parameter and answers from the current release.
- **`force-system-version` is an edge case.** FHIR R4 also defines it to override the version a
  value set specifies. It can produce an expansion the value set's author did not intend, and
  servers support it differently. Use it only if you accept that.
- **Codings from other releases get a warning.** A pinned provider reports its release as its
  version, so the panel marks codings stored from any other release with a "Version unavailable"
  warning. Without a pin, these providers report no version, and no such warning appears.

### Add SNOMED CT

:::caution
Enable SNOMED CT only if you hold an Affiliate Licence for the edition (in Germany from BfArM, the
National Release Centre). tx.fhir.de's terms require a valid licence for SNOMED CT. The server
answering without credentials does not change that.
:::

```js
createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: 'https://tx.fhir.de/fhir' },
  snomedConfig: {
    edition: '11000274103',    // module id of the edition your licence covers (German National Edition)
    editionVersion: '20260815' // optional: one release, as YYYYMMDD
  }
});
```

- **Without `editionVersion`:**
  - Searches expand `http://snomed.info/sct/11000274103?fhir_vs`.
  - The server answers from its latest release of that edition.
  - Each coding stores the release the server reports, for example
    `version="http://snomed.info/sct/11000274103/version/20260815"`.
  - The provider itself reports no version, so a newer release never triggers the
    version warning.
- **With `editionVersion: '20260815'`:**
  - Searches expand `http://snomed.info/sct/11000274103/version/20260815?fhir_vs`, and lookups
    request that release.
  - The provider reports `http://snomed.info/sct/11000274103/version/20260815` as its version.
  - Codings stored from other releases are marked "Version unavailable".
  - Once the server drops that release, searches fail with HTTP 404.
- **With `valueSetUri` instead of `edition`:** an explicit `snomedConfig.valueSetUri` also enables
  SNOMED CT, and searches expand exactly that value set. Prefer `edition`. If the value set is an
  implicit SNOMED CT value set such as `http://snomed.info/sct/11000274103?fhir_vs`, lookups use
  the edition named in it; if you set `edition` as well, lookups use `edition`, and the console
  warns once when the two name different editions or releases. `http://snomed.info/sct?fhir_vs…`
  without a module id always expands the server's default edition, and the console asks for the
  module id. Any other value set names no edition, and the console warns once
  (`SNOMED CT value set "…" names no edition`): which edition searches use, and which version is
  stored with each coding, then depends on the value set's definition (`compose.include.version`)
  or, if it pins none, on the server's default edition. Make sure the value set pins the edition
  your licence covers. Lookups are scoped to an edition only if you also set `edition` or
  `lookupParameters.version`; neither changes searches or the stored version. You are responsible
  for choosing a value set your licence covers.
- **Without `edition` or `valueSetUri`:** SNOMED CT stays disabled, and the console says
  `SNOMED CT is disabled: no edition is configured`. A server can therefore never silently answer
  from an edition you did not choose.
- **Active concepts only:** searches send `activeOnly=true`, because servers otherwise also return
  inactive concepts. To include them, set `snomedConfig.expandParameters: { activeOnly: 'false' }`.
  Other `expandParameters` are added to the default.

### LOINC search tips

The default LOINC value set `http://loinc.org/vs` is the implicit value set of all of LOINC. Besides
LOINC terms, the observation codes, it contains LOINC Parts (codes starting with `LP`), Answers
(`LA`), groups (`LG`) and answer lists (`LL`). The default `loinc` provider therefore shows only
LOINC term codes: its `codePattern` is `^\d{1,7}-\d$`.

The filter runs on each page of 15 results the server returns; the panel requests only the first
page. That page can therefore show fewer results. The server's total still counts the hidden Parts
and Answers, so the panel then leaves it out of its summary ("Showing 4 results"). A server may
rank Parts first for one-word searches; on tx.fhir.de, for example, `glucose` returns Parts such as
`LP32534-7` at the top, and the first page may hold no term code at all. If the server reports
more matches than that page held, the panel then says that the server found matches but the
provider hides every code on the first page, and asks for more search words, instead of reporting
no matches.

- **Search with several words.** `glucose serum plasma` lists `2345-7` "Glucose [Masse/Volumen] in
  Serum oder Plasma" among the first results.
- **Narrow the search.** Override `valueSetUri` of the `loinc` provider with a smaller value set
  that your server can expand.
- **Show every code again.** `fhirProviderOverrides: [{ id: 'loinc', codePattern: null }]` turns
  the filter off. `codePattern` (a `RegExp` or a string) works for any FHIR provider; it filters
  search results only, not lookups.

## Self-hosted FHIR terminology server

Any FHIR R4 terminology server that supports the operations under
[What the server must support](#what-the-server-must-support) works. Pass its absolute base URL.
You can also point individual providers at other endpoints:

```js
createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: 'https://terminology.example.org/fhir',
    snomedBaseUrl: 'https://snomed.example.org/fhir' // optional: SNOMED CT on another endpoint
  },
  snomedConfig: { edition: '11000274103' },
  fhirProviderOverrides: [
    { id: 'loinc', baseUrl: 'https://loinc.example.org/fhir' }
  ]
});
```

If your backend exposes the server on the application's own origin, a relative route is enough:

```js
createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: '/api/terminology' }
});
```

A relative base URL is resolved against the current page, as `fetch` resolves it. Searches with
`/api/terminology` therefore go to
`https://<your application>/api/terminology/ValueSet/$expand?…`. Your backend forwards them to the
terminology server and can add credentials or a client certificate on the way. Because the route is
same-origin, the browser applies no CORS checks. The package does not ship such a route; you operate
it. For client certificates, see [mTLS-secured servers](/configuration/mtls/).

## Snowstorm for SNOMED CT

SNOMED CT can also come from a Snowstorm server instead of FHIR. The other terminologies still use
`serverConfig.fhirBaseUrl`:

```js
createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: 'https://terminology.example.org/fhir' }, // LOINC, ICD-10-GM, OPS, ATC
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: 'https://snowstorm.example.org/snowstorm/snomed-ct', // API context path, no branch, no /concepts
    branch: 'MAIN/SNOMEDCT-DE',
    language: 'de',
    languageStrategy: 'header',
    defaultEcl: '< 404684003'
  }
});
```

`branch` is required and names the edition: there is no default branch. Without it, SNOMED CT stays
disabled and the console says `SNOMED CT is disabled: no Snowstorm branch is configured`, because
Snowstorm's `MAIN` branch holds the International Edition, which your licence may not cover. Set
`branch: 'MAIN'` explicitly only if it does. A `SnomedCtProvider` or `SnowstormAdapter` you
construct yourself without `branch` still queries `MAIN` for compatibility, and the console warns
once.

`baseUrl` may also be a same-origin route such as `/api/snowstorm/snomed-ct`. The endpoint must be
redirect-free and, if it is on another origin, allow yours through CORS. Do not call the public
`https://snowstorm.snomedtools.org/snowstorm/snomed-ct` endpoint from an application: it redirects
browser requests and returns no usable CORS response. The same licence rules apply: serve only
an edition your licence covers.

## Authentication

Keep long-lived credentials out of the browser. Two setups work well:

- **A host-owned `fetchFn`** (recommended). It calls your backend, or adds a short-lived token, for
  every FHIR provider, SNOMED CT and the loader at once.
- **Per-provider settings.** Set `auth` (`Bearer` or `Basic`; Snowstorm also `ApiKey`), `headers`
  and `requestTimeoutMs` per provider. See
  [Authentication, headers, timeouts, and result limits](/configuration/#authentication-headers-timeouts-and-result-limits).

```js
createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: 'https://terminology.example.org/fhir' },
  snomedConfig: { edition: '11000274103' },
  fetchFn: (input, init = {}) => fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${getAccessToken()}` }
  })
});
```

`getAccessToken()` stands for your application's own token handling.

Mind CORS whenever you add a header. An `Authorization` header or any custom header turns the
request into one that needs a preflight. The server must answer the preflight with
`Access-Control-Allow-Headers` naming that header. tx.fhir.de allows `Authorization` but rejected
a custom header such as `X-Client-App`; it needs no credentials for reading anyway. Through a
same-origin route there is no preflight.

## Try it in the demo

By default the
[public demo](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/demo/)
contacts no terminology server and searches only the bundled code systems. A build can offer
each visitor an optional live search. The demo opens in German when the browser prefers German
over English, otherwise in English, with a DE | EN switch in the banner and in each dialog; the
labels below are the English ones, with the German label in brackets.

- **Off by default, with separate consent.** *Live search…* (*Live-Suche…*) in the banner opens its own consent
  dialog, which states what is sent, to whom, and why. Accepting the licence notice does not
  switch it on.
- **LOINC, ICD-10-GM, OPS and ATC on tx.fhir.de only.** After consent the demo adds these four
  providers for `https://tx.fhir.de/fhir`, and the browser queries HL7 Deutschland's server
  directly. The live search is offered only for a host whose operator the consent dialog names,
  which is tx.fhir.de alone; for any other `VITE_OPT_IN_FHIR_BASE_URL` the demo offers none.
- **For this browser tab.** The consent is kept in the tab's session storage until the live
  search is turned off or the tab is closed; a reopened or duplicated tab may restore it, and the
  banner then shows that the live search is on. While the live search is on, *Live search
  details* (*Details zur Live-Suche*) in the banner reopens the consent information, and *Turn
  off live search* (*Live-Suche ausschalten*) withdraws the consent and removes the four
  providers.
- **Throttled.** A search reaches the server only from three characters on and about 300 ms
  after you stop typing; while you type, only the last search is sent. Repeated searches are
  answered from a cache. The demo delays requests in its own fetch wrapper, which checks the
  consent right before it sends, and therefore passes `serverSearchDebounceMs: 0` to the
  properties panel; the panel's three-character minimum still applies.
- **SNOMED CT unlock (off in public builds).** `VITE_OPT_IN_SNOMED_EDITION` (the module id of
  the edition) and optionally `VITE_OPT_IN_SNOMED_EDITION_VERSION` (a release, `YYYYMMDD`) take
  effect only together with `VITE_OPT_IN_FHIR_BASE_URL`. Only `11000274103` (German National
  Edition) is accepted, because the self-declaration describes that edition and use in Germany
  alone; any other module id offers no unlock and logs a warning in the browser console.
  *SNOMED CT…* then appears in the banner once the live search is on, and unlocks SNOMED CT only
  after the visitor ticks three self-declaration statements, none of them pre-ticked: an own
  Affiliate Licence for the edition (or use as an end user under one), use in Germany only, and
  evaluation only without patient data. The declaration is not verified, is kept in session storage bound to the host and the
  edition, and ends with *Lock SNOMED CT* (*SNOMED CT sperren*) or *Turn off live search*. SNOMED CT is not offered in
  the public demo: the Pages workflows set no `VITE_OPT_IN_SNOMED_EDITION`. Do not set it in a
  public build of your own unless the body that administers SNOMED CT licences in your country
  (in Germany BfArM) has agreed to this approach; see
  [Licensing](/licensing/#optional-live-search).

The Pages workflow passes the repository variable `DEMO_OPT_IN_FHIR_BASE_URL` to the build as
`VITE_OPT_IN_FHIR_BASE_URL`; while that variable is unset or empty, the public demo offers no
live search. The `docs-preview` workflow builds its review artifact with the same repository
variable, so the artifact offers no live search either while it is unset or empty. Neither sets
any of the variables below; `npm run check:demo-gates` fails if a workflow does. To try the demo locally against a server you may use, clone the repository and create
`demo/.env.local`:

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
cp demo/.env.example demo/.env.local   # then edit demo/.env.local
npm run dev                            # http://localhost:5173
```

```dotenv
# demo/.env.local (git-ignored)
# LOINC, ICD-10-GM, OPS and ATC from HL7 Deutschland's server:
# development and non-commercial research only
VITE_FHIR_BASE_URL=https://tx.fhir.de/fhir

# SNOMED CT over FHIR: only with an Affiliate Licence for this edition
# VITE_SNOMED_EDITION=11000274103
# VITE_SNOMED_EDITION_VERSION=20260815

# Or SNOMED CT over Snowstorm, also only with a licence (takes precedence over the two lines above)
# VITE_SNOWSTORM_BASE_URL=https://snowstorm.example.org/snowstorm/snomed-ct
# Required with Snowstorm: without a branch SNOMED CT stays disabled (MAIN is the International Edition)
# VITE_SNOWSTORM_BRANCH=MAIN/SNOMEDCT-DE
# VITE_SNOWSTORM_LANGUAGE=de
# VITE_SNOWSTORM_LANGUAGE_STRATEGY=header
# VITE_SNOWSTORM_DEFAULT_ECL=< 404684003
# VITE_SNOWSTORM_MAX_RESULTS=15
```

The demo page then states which server it contacts.

- **Local servers take precedence.** With `VITE_FHIR_BASE_URL` set, or `VITE_SNOWSTORM_BASE_URL`
  together with `VITE_SNOWSTORM_BRANCH`, the demo contacts that server from the start and offers
  no live-search opt-in; `VITE_OPT_IN_FHIR_BASE_URL` is then ignored. To reproduce the public
  demo's opt-in locally, set only `VITE_OPT_IN_FHIR_BASE_URL`; to try the SNOMED CT unlock as
  well, add `VITE_OPT_IN_SNOMED_EDITION=11000274103` (the only edition accepted), again only
  with a licence for that edition.
- **Restart after editing.** Restart `npm run dev` after you change `demo/.env.local`.
- **Throttled and cached.** A search reaches a server set in `demo/.env.local` only from three
  characters on (the panel's minimum, see [Search throttling](#search-throttling)) and about
  300 ms after you stop typing: the demo delays each request in its own fetch wrapper, drops it
  if you keep typing, and answers repeated searches from a cache. It passes
  `serverSearchDebounceMs: 0` to the panel, so the two delays do not add up.
- **No credentials.** Vite compiles `VITE_*` values into the page, where anyone who opens it can
  read them.
- **Production build.** To test it, run `npm run build --workspace=demo` and then
  `npm run preview --workspace=demo` (<http://localhost:4173>). The preview serves the last build,
  so rebuild after you change the variables.
- **Never publish a locally built `demo/dist`.** It would send every visitor's searches to the
  configured server and, with the SNOMED CT variables, offer SNOMED CT to people without a licence.

## Troubleshooting

The panel names the provider in each message, for example "OPS could not be reached". The
underlying error is in the browser console, and the panel also fires
[`TERMINOLOGY_ERROR_EVENT`](/properties-panel/#listening-for-search-errors-terminology_error_event)
for the host application.

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| "… could not be reached"; the console shows a CORS error | The server does not allow your origin, or it is unreachable. Or it rejects the preflight for a header you send (`Authorization` through `auth`, or a custom header through `headers`); tx.fhir.de answers a preflight for a custom header such as `X-Client-App` with HTTP 403. The browser then blocks the request, so the panel never sees that status. | Check CORS with the `curl` command below. Use a server that allows your origin, or a same-origin route you operate. Drop custom headers the server does not allow. |
| "… redirected the search request" | The URL points at a login page or a web front end, not the API | Configure the redirect-free API base URL. |
| "… denied access" (HTTP 401 or 403) | The server answered the request itself with 401 or 403: credentials are missing or expired, or the account has no access to that content | Add credentials through `fetchFn` or `auth`, or ask the operator for access. |
| "… could not answer this request (HTTP 404). The configured value set or version may not exist on this server." for one provider (HTTP 400 shows the same message) | The server does not hold that value set, or not the pinned release | Check `fhirProviderOverrides` for a pin (`valueSetVersion`, `lookupParameters.version`) and list the server's releases as shown under [Pin a release](#pin-a-release). Check `valueSetUri`. |
| "… is currently unavailable (HTTP 500)" or another server status | The server has an outage or is overloaded | Try again later; check the server's status. |
| Every new coding of a provider shows "Version unavailable" | The provider is configured with a release other than the one the server answers from, for example a `system-version` pin the server ignores, or a `version` override | Remove that setting, or pin with `valueSetVersion` to a release the server holds. |
| SNOMED CT missing; console: `SNOMED CT is disabled: no edition is configured` | Neither `snomedConfig.edition` nor `snomedConfig.valueSetUri` is set | Set the edition your licence covers. |
| SNOMED CT missing; console: `SNOMED CT is disabled: no Snowstorm branch is configured` | `transport: 'snowstorm'` without `snomedConfig.branch` | Set the branch of the edition your licence covers, for example `MAIN/SNOMEDCT-DE`. |
| Console: `SNOMED CT value set "…" names no edition` | `snomedConfig.valueSetUri` is not an implicit value set of one edition, so its definition or the server's default decides the edition of searches and stored versions | Make sure the value set pins (`compose.include.version`) the edition your licence covers, or use `snomedConfig.edition` instead of `valueSetUri`. To scope lookups as well, set `edition` or `lookupParameters.version`. |
| "Enter at least 3 characters to search …" and no request in the network tab | The [search throttling](#search-throttling) sends a server search only from three characters on | Type more characters, or lower `serverSearchMinLength`. |
| LOINC, ICD-10-GM, OPS, ATC or SNOMED CT missing; console: `… disabled: no terminology server is configured` | `serverConfig.fhirBaseUrl` is not set | Set it to a server you may use. |
| "… did not respond in time" | The server is slow or overloaded (default timeout 15 s) | Try again; raise `requestTimeoutMs` for that provider. |
| "… returned invalid terminology data" | A proxy or `fetchFn` returned HTML or another non-FHIR body | Check the proxy, the route and `fetchFn`. |
| No results | The term, the language, or the value set or edition does not contain the concept | Run the same `$expand` with `curl` (below) and check `expansion.total`. |
| LOINC shows few results for a one-word search, or "… hides every code on the first page of results" | The default `loinc` provider hides the Parts, Answers, groups and answer lists of the first page the server returned | Search with several words; see [LOINC search tips](#loinc-search-tips). |

Check whether the server allows your origin:

```bash
curl -s -o /dev/null -D - -H 'Origin: http://localhost:5173' -H 'Accept: application/fhir+json' \
  'https://tx.fhir.de/fhir/metadata?_summary=true' | grep -i '^access-control-allow-origin'
# expected: access-control-allow-origin: http://localhost:5173
```

Repeat a search outside the browser:

```bash
curl -s -H 'Accept: application/fhir+json' \
  'https://tx.fhir.de/fhir/ValueSet/$expand?url=http://fhir.de/ValueSet/bfarm/ops&filter=Lobektomie&count=3&displayLanguage=de'
```

## Notices for the content shown on this page

- **OPS** (source statement from the annex to BfArM's download conditions as of 1 August 2025,
  verbatim):

  > Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag
  > des Bundesministeriums für Gesundheit (BMG)
  >
  > Die Erstellung bzw. der Druck erfolgt unter Verwendung der maschinenlesbaren Fassung des
  > Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM).

  The example cites OPS 2026.

- **LOINC®:** This material contains content from LOINC (<http://loinc.org>). LOINC is
  copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and
  Codes (LOINC) Committee and is available at no cost under the license at
  <http://loinc.org/license>. LOINC® is a registered United States trademark of Regenstrief
  Institute, Inc.
