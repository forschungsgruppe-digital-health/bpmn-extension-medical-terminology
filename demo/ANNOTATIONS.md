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

For applications consuming the published package, pass configuration to
`createTerminologyPropertiesPanelModule`. `includeTypes` and `excludeTypes`
let you adjust the package defaults without copying the complete list:

```js
import { createTerminologyPropertiesPanelModule } from
  '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const additionalModules = [
  createTerminologyPropertiesPanelModule({
    includeTypes: ['bpmn:Participant'],
    excludeTypes: ['bpmn:UserTask']
  })
];
```

The example adds participants to the defaults and excludes user tasks. An
exclusion takes precedence over both the defaults and `includeTypes`.
`bpmn:Task` includes its subtypes, so excluding `bpmn:UserTask` removes user
tasks without removing other task types. You can use `targetTypes` when you
want to replace the default list completely; `includeTypes` and `excludeTypes`
then act as additions and exclusions on that replacement list.

Use `targetTypes: []` to start with no annotatable types and add only the types
you want with `includeTypes`. `showAnnotations: false` hides the annotation
entry for every element regardless of type configuration.

Use BPMN type names such as `bpmn:Task`; malformed entries cause a configuration
error. Type names are not checked against the moddle registry: unknown names
match no element.

`targetTypes`, `includeTypes`, and `excludeTypes` apply BPMN inheritance: an
entry matches the named type and its subtypes. This setting controls only the
properties panel. Changing the list preserves existing annotations in imported
BPMN files and does not constrain the annotation helper API or XML validation.
Restart the demo after changing its configuration.
