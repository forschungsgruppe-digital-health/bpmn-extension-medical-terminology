---
title: Using the properties panel
description: How the Medical terminology group behaves in a bpmn-js properties panel, how to wire it up correctly, and what it can and cannot do today.
---

The extension ships a properties-panel group called **Medical terminology**. It is the only
user-facing surface of the package: everything a modeller does — picking a code system,
searching it, attaching codings to a BPMN element, removing them again — happens there.

This page describes the contract: what the group looks like, what wiring it needs, which
elements it appears on, how search behaves, and which limitations are real today.

## What the group does

Selecting a supported BPMN element shows a group labelled **Medical terminology** at the
bottom of the properties panel. It contains one entry, which renders:

- the annotations already attached to the selected element, each with its id, its optional
  free text, and its codings;
- the message `No annotations yet.` when the element has none;
- a **+ Add annotation** button, shown whenever the add form is closed — so an element with no
  annotations shows the message and the button together;
- when adding, a form with an id field, a free-text field, a terminology picker and a
  search field.

Each annotation is serialised into the element's `bpmn:extensionElements`, inside a
`term:annotations` container, as a `term:annotation` with zero or more `term:coding` children.
A typical result looks like this — the sample is excerpted from
[`examples/valid/lung-cancer-staging-annotated.bpmn`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/examples/valid/lung-cancer-staging-annotated.bpmn),
with the task's sequence-flow and data-association children left out:

```xml title="Produced by the panel, serialised by bpmn-js"
<bpmn2:task id="Task_Staging" name="Perform TNM Staging">
  <bpmn2:extensionElements>
    <term:annotations>
      <term:annotation id="term-ann-3" text="Clinical TNM staging to determine tumor stage">
        <term:coding system="http://snomed.info/sct"
                     version="http://snomed.info/sct/32506021000036107/version/20260731"
                     code="254292007"
                     display="Tumor staging (tumor staging)"/>
        <term:coding system="http://loinc.org"
                     version="2.82"
                     code="21908-9"
                     display="Stage group.clinical Cancer"/>
      </term:annotation>
    </term:annotations>
  </bpmn2:extensionElements>
</bpmn2:task>
```

The XML shape itself is described on the [schema page](/schema/).

## Wiring: you need both modules

The panel is split into two didi modules, and **you need both**:

| Module | What it contributes |
|---|---|
| `createTerminologyPropertiesPanelModule(config)` / `TerminologyPropertiesPanelModule` | The UI — registers `TerminologyPropertiesProvider` with the properties panel |
| `createTerminologyModule(services)` | The services — publishes `terminologyRegistry` and, when the services object carries one, `terminologyProviderLoader` into the didi container |

The UI module resolves those services *optionally*
(`useService('terminologyRegistry', false)` in
[`entries/AnnotationListEntry.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/entries/AnnotationListEntry.js)).
That is deliberate — the panel still renders and still lets you write free-text annotations
without a registry — but without the services module there is nothing to search.

:::caution[The most common integration mistake]
Passing `TerminologyPropertiesPanelModule` **without** a terminology services module produces
a panel that looks complete but has no terminology picker. Opening the add form shows only:

> No terminology systems are available right now.

It is not silent, but it is easy to misread as "the servers are down". The fix is to add
`createTerminologyModule(...)` — or `createDefaultTerminologyModule()` — to
`additionalModules`. The same message also appears when a registry *is* present but every
registered provider reports `capabilities.search === false`.
:::

### A complete, working integration

This is the wiring the demo uses, condensed from
[`demo/src/app.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/demo/src/app.js).
It is a Vite application; the package is bundler-only, so a plain Node ESM import of the
barrel will not work — see [configuration](/configuration/) for what that means when you
install it.

```js title="src/app.js"
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import {
  TerminologyModdleDescriptor,
  createTerminologyPropertiesPanelModule,
  createTerminologyModule,
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';

// 1. Build the services (registry + a dynamic provider loader).
const terminologyServices = createDefaultTerminologyServices();

const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: {
    parent: '#properties'
  },
  additionalModules: [
    // The host properties panel itself.
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,

    // 2. The terminology UI …
    createTerminologyPropertiesPanelModule({ showAnnotations: true }),

    // 3. … and the services it talks to. Both are required.
    createTerminologyModule(terminologyServices)
  ],
  moddleExtensions: {
    // 4. Without this, term: elements are dropped on import and export.
    term: TerminologyModdleDescriptor
  }
});
```

Four things must all be present. Omitting the moddle extension is the second-most common
mistake: annotations then vanish on the next import/export round trip, because bpmn-moddle
does not know the `term` namespace. See [the schema page](/schema/).

If you do not need to customise the UI options, the default export is equivalent to
`createTerminologyPropertiesPanelModule()`, and `createDefaultTerminologyModule()` builds the
services and wraps them in one call:

```js title="The same wiring, with the shipped defaults"
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
  moddleExtensions: { term: TerminologyModdleDescriptor }
});
```

The UI module can also be imported from its own subpath,
`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel`, if you
want to avoid pulling the whole barrel into a code-split chunk.

## Which elements show the group

`TerminologyPropertiesProvider` registers at priority `500` and filters by an explicit
allow-list, `TARGET_TYPES`. These 16 BPMN types are on it:

| Category | Types |
|---|---|
| Tasks | `bpmn:Task`, `bpmn:UserTask`, `bpmn:ServiceTask`, `bpmn:SendTask`, `bpmn:ReceiveTask`, `bpmn:ManualTask`, `bpmn:ScriptTask`, `bpmn:BusinessRuleTask` |
| Activities | `bpmn:SubProcess` |
| Gateways | `bpmn:ExclusiveGateway` |
| Data | `bpmn:DataObjectReference`, `bpmn:DataStoreReference` |
| Events | `bpmn:StartEvent`, `bpmn:EndEvent`, `bpmn:IntermediateThrowEvent`, `bpmn:IntermediateCatchEvent` |

The check uses bpmn-js's `is()` helper, which is type-hierarchy aware. That has two
consequences worth knowing:

- Types that *inherit* from a listed type are included even though they are not named.
  `bpmn:AdHocSubProcess` and `bpmn:Transaction` both extend `bpmn:SubProcess`, so both get
  the group. Equally, the seven specialised task types are redundant entries — they all
  extend `bpmn:Task` already.
- Types that merely *look* related are not included. `bpmn:BoundaryEvent` extends
  `bpmn:CatchEvent`, not `bpmn:IntermediateCatchEvent`, so boundary events get no group.
  `bpmn:CallActivity` extends `bpmn:Activity`, not `bpmn:SubProcess`. Parallel, inclusive,
  complex and event-based gateways extend `bpmn:Gateway`, not `bpmn:ExclusiveGateway`.

Everything else — sequence flows, pools and lanes, text annotations, associations, the
process itself — shows no terminology group at all. There is no configuration option to
widen the list; if you need another element type, that is a change to
[`TerminologyPropertiesProvider.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/TerminologyPropertiesProvider.js).

:::note
The group label goes through the bpmn-js `translate` service, so a host application that
registers its own translation module can localise the string `Medical terminology`. The
strings *inside* the entry — button captions, hints, error messages — are not translated;
they are English literals in the component.
:::

The group is marked as *edited* (the panel's change indicator) whenever the selected element
carries a `term:Annotations` container holding at least one annotation.

## Annotating an element, step by step

1. **Select** a supported element. The **Medical terminology** group appears.
2. **Click + Add annotation.** The form opens.
3. **Optionally set an id.** Leave it empty and the panel uses the placeholder it shows
   you — `term-ann-1`, `term-ann-2`, … — counting up from 1 until it finds a number that is
   free across the whole diagram.
4. **Optionally write free text.** This becomes `term:annotation/@text`, a natural-language
   description of what the coding means in this process.
5. **Pick a terminology** from the dropdown. The search field appears only after a selection.
6. **Type a search term.** Results appear underneath as you type.
7. **Accept a result** with `Enter`, `Tab`, or a click. The coding moves into a **Selected
   codings** list above the search field and the search field clears. Accepting from the
   keyboard also returns focus to the search field, so you can add a second coding from the
   same or a different system straight away.
8. **Save** with the **Save annotation** button, or by pressing `Tab` in an empty search
   field.

An annotation must carry either free text or at least one coding. Saving an empty one is
rejected with `Please provide free text or at least one coding before saving.` If you typed a
search term but never accepted a result, the message is more specific: `Please select a coding
from the search results or provide free text before saving.`

To remove a saved annotation, use the `×` button in its header. To remove a coding *before*
saving, use the `×` next to it in the **Selected codings** list.

### Id and duplicate rules

Two validations run, both scoped to the entire diagram rather than the selected element — the
entry walks `elementRegistry` when it is available, and falls back to the current element when
it is not:

- **Id syntax and uniqueness.** An id may contain only letters, digits, dots, underscores and
  hyphens; violations show `ID may only contain letters, numbers, dots, underscores, and
  hyphens.` A collision shows `ID must be unique across the diagram.` Both appear directly
  below the id field, and the field itself is marked with the host panel's error state.
- **Coding uniqueness.** The same `system` + `code` pair may not appear twice in one diagram.
  The check runs when you save, and a violation blocks the save with `A terminology code with
  the same system and code is already used in the diagram.` This is intentional: a code is
  meant to identify one thing in the model, so a repeat usually means the same concept was
  annotated twice rather than two distinct ones.

## How search behaves

### The terminology picker

The dropdown lists every registered provider whose `capabilities.search` is not `false`,
split into two option groups:

- **Terminology servers (API)** — providers with `sourceType === 'api'`, plus any provider
  that declares no `sourceType` at all.
- **Installed terminology packages** — providers with `sourceType === 'package'`.

Within each group, options are sorted by their visible label using a locale-aware, numeric,
case-insensitive comparison, with the provider id as tie-breaker. Labels are composed from
provider metadata, where *name* means `sourceName`, falling back to `displayName`, falling
back to the provider id:

| Provider kind | Label shape | With no `sourceLabel` |
|---|---|---|
| `sourceType: 'api'` | `name (systemUri, sourceLabel)` | `name (systemUri)` |
| `sourceType: 'package'` | `name (sourceLabel)` | `name` |
| no `sourceType` | `displayName`, or the id when there is none | — |

The shipped providers fill those fields in: the API-backed ones set `sourceLabel` to the host
of their configured base URL, and package-backed providers get `packageName@version`, so a
KDL package pinned at `2025.0.1` renders as `KDL (dvmd.kdl.r4@2025.0.1)`.

A provider that implements only the base interface documented on `TerminologyProvider` has no
`sourceType`, so it falls into the API group and renders as its bare `displayName`, without
the system URI and source detail the shipped providers show — and, having no `version`, it
cannot take part in the version check described below. See
[writing a provider](/extending/providers/) for the full set of metadata fields a provider
should supply.

:::caution
The base class `TerminologyProvider` declares `capabilities` as
`{ search: false, lookup: false, hierarchy: false, validate: false }`. A subclass that
implements `search()` but forgets to override `capabilities` is **filtered out of this
dropdown entirely** and will look like it was never registered.
:::

The entry subscribes to the registry's `provider:registered` and `provider:unregistered`
events, so providers loaded at runtime appear in the dropdown without reopening the panel. If
the currently selected provider disappears, the selection resets and the search state clears.

### Querying

Search runs on every keystroke. There is **no debounce**; instead, concurrency is handled two
ways at once:

- an `AbortController` aborts the in-flight HTTP request when a new keystroke arrives, and
- a monotonically increasing request sequence number discards any late response that is no
  longer the newest request, so a slow early query cannot overwrite a fast later one.

Each query asks the registry for `{ limit: 15, offset: 0 }`, plus the abort signal. There is
no paging control in the panel — the offset is always zero — so refining the term is how you
reach concepts beyond the first fifteen.

The label next to the search field changes to `Search (searching...)` while a request is open.

### Reading results

Each suggestion shows the concept display on the first line and the system short name plus the
code on the second. The short name is resolved by looking the coding's `system` URI up against
the registered providers and using that provider's `displayName`; when no provider matches, the
last path segment of the URI is shown instead.

Underneath the field, a status line reports how much you are seeing. The wording depends on
whether the provider supplied a trustworthy `total`:

| Situation | Status line |
|---|---|
| Total available | `Showing 15 of 214 results` |
| No reliable total | `Showing 15 results` |
| Term entered, nothing matched | `No matching terminology concepts found.` |
| No term entered yet | *(nothing — no request is made)* |

A total is only trusted when it is a safe integer no smaller than `offset + displayedCount`;
otherwise the panel falls back to the count-only wording rather than printing a number it
cannot stand behind. The rule is implemented in
[`entries/search-utils.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/entries/search-utils.js)
and matches what a `SearchResult` promises: `total` is optional, supplied only when the
provider can, so its absence means *unknown*, not *zero*.

The field also renders an inline completion. When the active suggestion's label starts with
what you typed, the remainder is shown greyed out behind the cursor; pressing `→` accepts it
into the field and re-runs the search with the completed term.

### The coding that gets written

Accepting a result builds the coding from the concept, filling gaps from the selected provider:

- `system` — the concept's own `system`, falling back to the provider's `systemUri`;
- `version` — the concept's `version`, falling back to the provider's `version`;
- `code` and `display` — taken from the concept.

A coding with no `system` or no `code` is discarded rather than written. Accepting the same
`system` + `code` twice inside one unsaved form is a no-op.

Recording the version matters: it is what lets the panel tell you later that a saved coding
came from a release you no longer have. When a saved coding's `version` is not among the
versions any registered provider reports for that system, the coding is rendered in a warning
style with the badge `Version unavailable` and the tooltip `Saved CodeSystem version is not
available locally`. A system for which no provider reports any version at all is never flagged
— absence of information is not treated as evidence of staleness.

## Keyboard behaviour

The search field installs its own key handler in the capture phase, so these bindings win over
the host panel's:

| Key | In the search field |
|---|---|
| `↓` / `↑` | Move the active suggestion (clamped at both ends) |
| `→` | Accept the active suggestion's label into the field as text and search again |
| `Enter` | Add the active suggestion as a coding, clear the field, keep focus |
| `Tab` | Same as `Enter` while there are results; in an **empty** field, saves the annotation |
| `Esc` | Close the suggestion list |

`Shift`+`Tab` is left alone throughout, so it still moves focus backwards. For symmetry, `Tab`
on the terminology dropdown while no terminology is selected also saves the annotation — which
is what lets you add a free-text-only annotation without touching the mouse.

Mouse hover moves the active suggestion too, and the active item is scrolled into view when it
leaves the visible area. Clicking a suggestion uses `mousedown` with the default prevented, so
the click registers before the field's blur can dismiss the list.

Elsewhere in the form, `Esc` closes the form and discards the draft. Inside the search field it
never does: the capture-phase handler consumes every `Escape` to close the suggestion list and
stops it from reaching the form, whether or not a list is open. To close the form from the
keyboard, move focus out of the search field first.

The hint printed under the search field states the two least obvious bindings:

> Press Tab or Enter to add an annotation (multiple entries allowed).
> To submit, press Tab in the empty search field.

## Accessibility

What the component provides today, stated without extrapolation:

- The whole add-and-search flow is operable from the keyboard; no interaction requires a mouse.
- The suggestion container carries `role="listbox"`.
- The inline-completion ghost text is `aria-hidden="true"`, so a screen reader reads the typed
  value rather than the typed value plus the suggested remainder.
- The search input sets `autocomplete="off"` to suppress the browser's own dropdown.
- Validation errors use the host panel's `bio-properties-panel-error` element and render
  adjacent to the control they concern.

Known gaps, so you can judge the fit for your own accessibility requirements: the individual
suggestions do not carry `role="option"`, there is no `aria-activedescendant` or
`aria-expanded` wiring between the input and the list, the **Terminology** and **Selected
codings** labels are plain `<label>` elements with no association to their controls, and the
`×` remove buttons expose their purpose only through a `title` attribute.

## Options

The UI module takes a small options object, resolved by
[`properties-panel/config.js`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/extension/src/properties-panel/config.js):

```js title="extension/src/properties-panel/config.js"
export const DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG = Object.freeze({
  showAnnotations: true
});
```

`showAnnotations` is the only option. It is `true` by default, and setting it to `false`
removes the annotation entry — which, since it is the group's only entry, removes the
**Medical terminology** group altogether:

```js title="Register the provider but render no terminology group"
createTerminologyPropertiesPanelModule({ showAnnotations: false })
```

That is useful as a feature flag in a host application that wants the services and the moddle
extension available — for programmatic annotation, import/export, validation — without exposing
the editing UI. The frozen defaults object is re-exported from the barrel as
`DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG`, so a host can read it rather than hard-coding `true`.

Everything else — which providers exist, which servers they talk to, which packages are
discovered — is configured on the *services* side, not here. See
[configuration](/configuration/) and the [generated defaults table](/configuration/defaults/).

## Error messages

When a search fails, the panel prints one sentence at the bottom of the coding fieldset, below
the search field. It does not surface the raw error: it duck-types the thrown value's `kind`
discriminator and maps it to a message that names the provider and says what to do next.

| `kind` | Message shown |
|---|---|
| `authorization` | `<provider> denied access. Check the server credentials and permissions.` |
| `server` | `<provider> is currently unavailable (HTTP <status>). Please try again later.` |
| `data` | `<provider> returned invalid terminology data. Check the server compatibility and try again.` |
| `redirect` | `<provider> redirected the search request. Use a redirect-free endpoint or a host-owned same-origin endpoint.` |
| `timeout` | `<provider> did not respond in time. Please try again.` |
| anything else | `<provider> could not be reached. Check your network connection and server URL.` |

`<provider>` is the selected provider's `displayName`, or the literal `The selected terminology`
when none can be resolved.

Two behaviours are worth calling out because they were deliberate:

- **An empty result is not an error.** A successful search that matched nothing shows the
  neutral `No matching terminology concepts found.` status, never a failure message.
- **A server error is not overwritten by a validation error.** If a search failed and you then
  press Save on an otherwise empty annotation, the panel keeps the server message visible
  instead of replacing it with "please select a coding" — the actionable information is the one
  about the server.

Correcting the cause and searching again clears the message; a failed provider does not put
the form into a state you have to close and reopen.

The underlying error type is `TerminologyRequestError`, which carries `kind`, `host` and
`status`. It is not currently reachable through the package's export map, which is why the
panel duck-types `error.kind` rather than using `instanceof`. Host code that wants to react to
terminology failures should do the same for now:

```js
try {
  await terminologyRegistry.search('pneumonia', 'snomed-ct');
} catch (error) {
  // Duck-type the discriminator; the class is not exported yet.
  if (error?.kind === 'authorization') {
    // re-authenticate
  }
}
```

See [writing an adapter](/extending/adapters/) for where these errors are raised and
[the roadmap](/roadmap/) for the planned export.

## Styling

The package ships one stylesheet, exported at its own subpath:

```js
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';
```

It contains only the structural rules for the terminology entry — every selector is scoped
under `.medical-terminology`. Typography is inherited (`font: inherit` on the entry's own
controls), and its colours are derived from the host panel's CSS custom properties, with
literal values only for the version-warning highlight. Import it *after* the bpmn-js and
`@bpmn-io/properties-panel` stylesheets, as in the integration example above.

If you skip it, the panel still functions — the markup is all there — but the annotation list,
the selected-codings chips and the search suggestion overlay lose their layout, and the
suggestion list will not float above the following form rows.

To restyle rather than replace, override under the same scope:

```css title="your-app.css"
.medical-terminology .annotation-item--saved {
  border-left: 3px solid var(--your-accent);
}
```

## Known limitations

:::caution[Undo does not remove an annotation]
Adding and removing annotations does not participate in the bpmn-js command stack correctly.
The helper mutates the business object directly and then calls
`modeling.updateModdleProperties(element, businessObject, {})` with an empty property set,
which marks the diagram dirty and triggers a re-render but records nothing the command stack
can reverse. **Pressing Ctrl+Z after adding an annotation does not remove it**, and undo after
a removal does not bring it back. Until this is fixed, treat both operations as immediate and
final, and use the `×` button rather than undo to correct a mistake.

**Editing an existing annotation in place is not implemented.** The saved list is read-only:
there is no way to change an annotation's text, add a coding to it, or correct a wrong code.
The workflow is to remove the annotation and add it again. Note that removing it also frees its
generated id, so re-adding usually reproduces the same `term-ann-*` value.

Both are tracked; see [the roadmap](/roadmap/).
:::

A note on repository documents you may encounter: the MVP user stories and the arc42 runtime
view both describe in-place editing and command-stack participation as implemented. They
describe the intended design, not the current code. This page reflects what
`AnnotationListEntry.js` and `AnnotationHelper.js` actually do.

Two smaller limits, for completeness:

- Search is capped at 15 results per query with no paging control.
- The set of annotatable element types is fixed in source; see
  [Which elements show the group](#which-elements-show-the-group).

## Where to go next

- [Configuration](/configuration/) — which providers exist and how to point them at your own
  servers and packages.
- [Writing a provider](/extending/providers/) — the full metadata contract a provider must
  satisfy to render well in the dropdown.
- [Schema](/schema/) — the `term:` XML shape the panel produces.
- [Compatibility](/compatibility/) — bpmn-js and properties-panel version requirements.
- [Roadmap](/roadmap/) — the command-stack fix, in-place editing, and the error export.
