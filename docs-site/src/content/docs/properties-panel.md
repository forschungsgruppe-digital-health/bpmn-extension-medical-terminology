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
the searchable registry. Registering only the UI still permits free-text annotations but
shows no searchable terminology systems.

See [Configuration](/configuration/) to replace the default providers or work offline.

## Supported BPMN elements

| Category | Elements |
| --- | --- |
| Tasks | Task and its standard specialisations |
| Activities | SubProcess, including derived subprocess types |
| Gateways | ExclusiveGateway |
| Data | DataObjectReference, DataStoreReference |
| Events | StartEvent, EndEvent, IntermediateThrowEvent, IntermediateCatchEvent |

Other elements may contain `mt:` data in XML, but the panel does not currently expose an
editor for them. The supported set is fixed and cannot be configured by the host.

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

Saved annotations show their text and codings in a read-only list. Use the `×` control to
remove an annotation.

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

- A saved annotation cannot be edited in place. Remove it and add the corrected value.
- Adding and removing annotations is not currently reversible with bpmn-js undo/redo.
- The supported BPMN element types cannot be configured.
- Only the group title uses the host translation service; the remaining UI text is English.
- Search has no pagination.

These limitations are tracked in the repository's
[issue tracker](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues).

For the stored XML structure, see [XML schema](/schema/).
