---
title: XML schema and framework-independent use
description: The compact XML contract for terminology annotations and how to use it outside bpmn-js.
---

The properties panel is specific to bpmn-js. The serialized format is not: any BPMN or
XML tool can read and write the `mt:` elements described here.

The authoritative generated contract is the [namespace v1 reference](/ns/terminology/v1/).
It publishes both the moddle descriptor and XSD. This page explains how to use that
contract.

## Namespace

```xml
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:mt="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1"
  targetNamespace="https://example.org/process">
```

`mt` is the conventional prefix. The namespace URI, not the prefix spelling, identifies
the format. `/v1` is the major version of the XML contract and is independent of the npm
package version.

## Content model

Terminology data is stored below a BPMN element's `bpmn:extensionElements`:

```text
mt:annotations
└── mt:annotation (0..n)
    └── mt:coding (0..n)
```

### `mt:annotations`

Container for all terminology annotations on one BPMN element. It has no attributes.

### `mt:annotation`

| Attribute | Required | Meaning |
| --- | --- | --- |
| `id` | Required by the repository lint rule | Stable identifier, unique in the diagram |
| `text` | No | Human-readable statement or explanation |

An annotation may contain any number of `mt:coding` children. It must contain free text,
at least one coding, or both when created through the properties panel.

### `mt:coding`

| Attribute | Required | Meaning |
| --- | --- | --- |
| `system` | Expected | Canonical code-system URI |
| `code` | Expected | Code within that system |
| `version` | No | Code-system version, in the system's own format |
| `display` | No | Human-readable display captured when selected |

The stored values intentionally follow the shape of a FHIR `Coding`, but the BPMN file
does not contain or require a FHIR resource.

## Complete example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:mt="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1"
  id="Definitions_1"
  targetNamespace="https://example.org/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
    <bpmn:task id="Task_CT" name="CT chest">
      <bpmn:extensionElements>
        <mt:annotations>
          <mt:annotation id="mt-ann-1" text="Diagnostic imaging procedure">
            <mt:coding
              system="http://snomed.info/sct"
              code="169069000"
              display="Computed tomography of chest" />
          </mt:annotation>
        </mt:annotations>
      </bpmn:extensionElements>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_CT" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_CT" targetRef="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>
```

The extension model itself allows `mt:annotations` wherever BPMN allows extension
elements. The bpmn-js properties panel intentionally supports a smaller list; see
[Supported BPMN elements](/properties-panel/#supported-bpmn-elements).

## Using the format with another framework

Camunda, another modeler, or a custom parser does not need the JavaScript package to
exchange the XML. It needs to:

1. preserve unknown elements under `bpmn:extensionElements` when loading and saving;
2. match the namespace URI, not only the `mt` prefix;
3. read or emit the three elements and attributes above;
4. preserve BPMN core and BPMN-DI unchanged.

Test the tool's round-trip behaviour with a synthetic annotated file before adopting it.
Some BPMN editors discard extension content they do not understand.

JavaScript applications based on bpmn-moddle can register the descriptor directly:

```js
import BpmnModdle from 'bpmn-moddle';
import terminologyDescriptor
  from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/moddle'
  with { type: 'json' };

const moddle = new BpmnModdle({
  mt: terminologyDescriptor
});
```

## Validation

The generated XSD is available from the
[namespace reference](/ns/terminology/v1/). It validates the terminology element and
attribute structure. BPMN core validation and extension validation remain separate because
the official BPMN schema accepts foreign extension elements with lax processing.

The repository combines four checks:

| Check | Purpose |
| --- | --- |
| BPMN lint | BPMN structure and configured terminology rules |
| Moddle round-trip | `mt:` data survives parse and serialization |
| BPMN core XSD | Informational validation of standard BPMN content |
| Terminology XSD | Structure of `mt:` elements and attributes |

Run the repository gate with:

```bash
npm run check:conformance
```

For the machine-readable files and exact cardinalities, use the generated
[namespace v1 reference](/ns/terminology/v1/).
