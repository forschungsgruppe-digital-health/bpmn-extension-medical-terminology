# Configuring annotatable BPMN elements

Edit `extension/src/config/annotation-config.json` to choose which BPMN elements show the medical
terminology annotation panel. For example:

```json
{
  "targetTypes": ["bpmn:Task", "bpmn:StartEvent", "bpmn:Participant"]
}
```

The list replaces the defaults. BPMN inheritance applies: `bpmn:Task` includes
its subtypes, such as `bpmn:UserTask`. Use `targetTypes: []` to hide the panel
for all elements. Omitting `targetTypes` uses the package's existing defaults.
`showAnnotations: false` still hides the panel regardless of the selected types.

The demo and the package defaults both use this JSON file. No JavaScript edit is
needed to change the default list.

For applications consuming the published package, pass your own configuration file's
object to `createTerminologyPropertiesPanelModule`:

```js
import { createTerminologyPropertiesPanelModule } from
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import ANNOTATION_CONFIG from './annotation-config.json' with { type: 'json' };

const additionalModules = [
  createTerminologyPropertiesPanelModule(ANNOTATION_CONFIG)
];
```

Use BPMN type names such as `bpmn:Task`; malformed entries cause a configuration
error. Type names are not checked against the moddle registry: unknown names
match no element.

This setting controls the properties panel. Changing the list preserves existing
annotations in imported BPMN files and does not constrain the annotation helper
API or XML validation. Restart the demo after changing the configuration.
