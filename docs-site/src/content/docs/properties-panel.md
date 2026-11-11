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

Other elements may contain `mt:` data in XML, but the panel does not expose an editor for
them by default. Hosts can configure supported element types through the properties-panel
module options.

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

Hide the terminology entry while keeping the provider registered:

```js
import {
  createTerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const TerminologyPanelModule = createTerminologyPropertiesPanelModule({
  showAnnotations: false
});
```

## Known limitations

- The list requests at most 15 search results and has no paging control.
- Only the group title uses the host translation service; the remaining UI text is English.

## Diagram badges and generated comments

The terminology services module automatically renders an `MT` badge for each annotated
element. The badge is a visual indicator, not stored terminology data. The properties panel's
**Show terminology as BPMN comments** switch creates linked standard BPMN text annotations and
associations. Generated comments carry an `mt:GeneratedComment` marker and are refreshed from
the complete `mt:` data when annotations change or the switch is toggled.

Comment lines follow annotation creation order, with each annotation's free text before its
codings. The comments wrap at 350 diagram units and render all lines; the full clinical data
remains in the `mt:` extension elements. See the [XML schema](/schema/) for the stored format.

These limitations are tracked in the repository's
[issue tracker](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues).

For the stored XML structure, see [XML schema](/schema/).
