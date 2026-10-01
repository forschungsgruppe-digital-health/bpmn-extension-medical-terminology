---
title: Decision and quick start
description: Decide whether medical terminology annotations fit your BPMN workflow and choose the integration path for your framework.
---

This package attaches machine-readable medical codes to BPMN elements without changing
BPMN itself. A task can keep its readable label while also carrying SNOMED CT, LOINC,
ICD-10-GM, OPS, ATC, IHE XDS, KDL, or other codes inside the `.bpmn` file.

## What problem does it solve?

A label such as `CT chest` is understandable to a person, but software cannot reliably
compare it with `CT-Thorax`. A terminology annotation adds an unambiguous system URI,
code, optional version, and display text:

```xml
<bpmn:task id="Task_CT" name="CT chest">
  <bpmn:extensionElements>
    <mt:annotations>
      <mt:annotation id="mt-ann-1">
        <mt:coding system="http://snomed.info/sct"
                   code="169069000"
                   display="Computed tomography of chest" />
      </mt:annotation>
    </mt:annotations>
  </bpmn:extensionElements>
</bpmn:task>
```

The diagram and BPMN core remain unchanged. The additional data lives only in standard
`bpmn:extensionElements` under the versioned `mt:` namespace
`https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1`.

## Is it a good fit?

| You need to… | Fit |
| --- | --- |
| Add coded clinical meaning to BPMN elements | **Yes** — this is the core use case |
| Search terminology from a bpmn-js properties panel | **Yes** |
| Store annotations in the `.bpmn` file instead of a sidecar | **Yes** |
| Work offline with bundled or installed FHIR CodeSystems | **Yes** |
| Use the XML format from Camunda or a custom BPMN tool | **Yes**, if the tool preserves unknown extension elements |
| Generate FHIR resources from a process model | **Not included**; the annotations can be input to your own mapping |
| Execute or simulate a process | **No** |
| Obtain a terminology licence or hosted terminology server | **No** |

This is pre-1.0 research software. Check the current [compatibility constraints](/compatibility/)
and [properties-panel limitations](/properties-panel/#known-limitations) before adoption.

## Choose your integration path

### bpmn-js modeler: full package

Use the moddle descriptor, terminology services, and properties-panel module together:

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule,
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    TerminologyPropertiesPanelModule,
    createDefaultTerminologyModule()
  ],
  moddleExtensions: {
    mt: TerminologyModdleDescriptor
  }
});
```

The host application must also register the normal bpmn-js properties-panel modules and
styles. See [Properties panel](/properties-panel/) for the complete integration.

### JavaScript without the UI

Use the exported descriptor and helper APIs when your application should read, write, or
query annotations without rendering the terminology panel. The package ships raw ESM and
is intended for a bundler-based application. Start with the [API reference](/api/) and
[compatibility notes](/compatibility/).

### Camunda or another BPMN framework

The UI integration is specific to bpmn-js, but the XML format is not. Another framework can
write and read the same `mt:` elements directly. It must preserve unknown
`bpmn:extensionElements` when saving. The [XML schema](/schema/) explains the format and
the generated [namespace reference](/ns/terminology/v1/) is the authoritative contract.

## What to read next

| Goal | Page |
| --- | --- |
| Configure default, self-hosted, or offline terminology sources | [Configuration](/configuration/) |
| Add annotations in the bpmn-js UI | [Properties panel](/properties-panel/) |
| Integrate with another BPMN/XML tool | [XML schema](/schema/) |
| Add a custom terminology source | [Extending](/extending/) |
| Look up an exported function or type | [API reference](/api/) |
| Report a problem | [Support](/support/) |

The [live demo](/demo/) shows the complete bpmn-js integration with synthetic data.
