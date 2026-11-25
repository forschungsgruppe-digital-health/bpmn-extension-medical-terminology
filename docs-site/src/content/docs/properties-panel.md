---
title: Properties panel
description: Integrate and use the Medical terminology group in a bpmn-js modeler.
---

The bpmn-js integration adds a **Medical terminology** group to supported BPMN
elements. A modeller can add free text, search configured terminology sources, select one
or more codings, and store the result in the BPMN file.

## Integration

The host needs the standard bpmn-js properties panel, the terminology UI, terminology
services, the moddle descriptor, and their styles:

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

`TerminologyPropertiesPanelModule` renders the group. The terminology module provides
the searchable registry and automatically enables the annotation badge and generated-comment
services. Registering only the UI still permits free-text annotations but shows no searchable
terminology systems.

See [Configuration](/configuration/) to replace the default providers or work offline.

## Supported BPMN elements

| Category | Elements |
| --- | --- |
| Tasks | Task and its standard specialisations |
| Activities | SubProcess, including derived subprocess types |
| Gateways | ExclusiveGateway |
| Data | DataObjectReference, DataStoreReference |
| Events | StartEvent, EndEvent, IntermediateThrowEvent, IntermediateCatchEvent |
| Flows | SequenceFlow |

Other elements may contain `mt:` data in XML, but the panel does not expose an editor for
them by default. Hosts can customise supported element types through
`createTerminologyPropertiesPanelModule()` (see [Options](#options)).

## Add an annotation

1. Select a supported BPMN element.
2. Open **Medical terminology** and choose **Add annotation**.
3. Optionally enter an ID and free text. An empty ID is generated automatically.
4. Select a terminology source and enter a search term.
5. Accept one or more results.
6. Choose **Save annotation**.

An annotation needs free text, at least one coding, or both. IDs must be unique in the
diagram and may contain letters, digits, dots, underscores, and hyphens. The same
`system` + `code` combination cannot be used twice in one diagram.

Saved annotations show their text and codings. They can be edited in place or removed with
the `×` control. Modeling operations use the bpmn-js command stack, so changes participate
in undo and redo.

## Search behaviour

- Search starts after a terminology source and a query have been entered.
- Results show the provider label, display text, and code.
- `Enter`, `Tab`, or a click accepts the active result.
- The panel requests at most 15 results and has no paging control.
- Network, authentication, server, timeout, and invalid-data failures are displayed in the
  panel without writing incomplete data to the model.

The result's `system`, `version`, `code`, and `display` values are copied into an
`mt:coding` element. The panel does not derive or rewrite those values later.

## Options

Use `createTerminologyPropertiesPanelModule()` to hide the terminology entry, start with `MT`
badges turned off, or adjust which BPMN element types show the annotation editor:

```js
import {
  createTerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const TerminologyPanelModule = createTerminologyPropertiesPanelModule({
  showAnnotations: true,
  showBadges: true,
  // Optional: replace the built-in default list completely:
  // targetTypes: ['bpmn:Task', 'bpmn:SequenceFlow'],
  includeTypes: ['bpmn:Participant'],
  excludeTypes: ['bpmn:UserTask']
});
```

- `showAnnotations` (`true` by default) toggles the annotation editor entry while keeping the
  provider registered.
- `showBadges` (`true` by default) sets the initial visibility of diagram `MT` badges (pass
  `showBadges: false` to start with badges hidden; users can still toggle them at runtime via
  **Show MT badges**).
- `targetTypes` replaces the built-in list of supported BPMN types.
- `includeTypes` adds BPMN types on top of the defaults (or `targetTypes`).
- `excludeTypes` removes BPMN types after applying defaults, `targetTypes`, and `includeTypes`.

The default values are exported as
[`DEFAULT_TERMINOLOGY_PROPERTIES_CONFIG`](/api/variables/default_terminology_properties_config/)
and listed on [Default configuration](/configuration/defaults/#properties-panel).

### Listening for search errors (`TERMINOLOGY_ERROR_EVENT`)

When a provider search fails, the properties panel displays the error inline and fires
`TERMINOLOGY_ERROR_EVENT` on the bpmn-js `eventBus` so the host application can log or react
to it:

```js
import {
  TERMINOLOGY_ERROR_EVENT
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

modeler.get('eventBus').on(TERMINOLOGY_ERROR_EVENT, ({ element, error, operation, providerId }) => {
  console.error('Terminology error', {
    elementId: element?.id,
    operation,
    providerId,
    message: error?.message
  });
});
```

## Diagram badges and generated comments

The terminology services module renders an `MT` badge on annotated BPMN shapes (such as tasks,
events, gateways, and data objects) by default (`showBadges: true`). The badge is a visual
indicator, not stored terminology data, and can be toggled globally with the **Show MT badges**
switch (or initialized with `showBadges: false` in `createTerminologyPropertiesPanelModule`).

The properties panel's **Show terminology as BPMN comments** switch operates independently and
creates linked standard BPMN text annotations and associations for annotated shapes even when
`MT` badges are turned off. Connections such as `SequenceFlow` can hold terminology
annotations in the panel and XML, but do not receive diagram badges or generated comments.

Generated comments carry an empty `<mt:generatedComment>` element (moddle type
`mt:GeneratedComment`) and are refreshed from the complete `mt:` data when annotations change
or the switch is toggled.

Comment lines follow annotation creation order, with each annotation's free text before its
codings. The comments wrap at 350 diagram units and render all lines; the full clinical data
remains in the `mt:` extension elements. See the [XML schema](/schema/) for the stored format.

## Known limitations

- The list requests at most 15 search results and has no paging control.
- The group title, panel toggle switches (**Show MT badges** and **Show terminology as BPMN
  comments**), badge `aria-label`, and validation/error messages use the host translation
  service; form field labels and action buttons are currently English.
- Diagram `MT` badges and generated BPMN comments apply to annotated shapes, not connections
  such as `SequenceFlow`.

These limitations are tracked in the repository's
[issue tracker](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues).
