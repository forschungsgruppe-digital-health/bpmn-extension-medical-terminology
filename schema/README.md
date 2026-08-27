# BPMN Medical Terminology Extension

This repository contains the formal XML Schema Definition (XSD) for extending BPMN 2.0 models with semantic clinical annotations.

## Contents

- `clinical-semantics.xsd`: The generated XSD defining the `https://clinical-bpmn.org/terminology/v1` namespace. It is derived from `extension/src/moddle/clinical.json` and provides the structural vocabulary for terminology annotations.

Regenerate it after changing the moddle descriptor with `npm run xsd:gen`.

## Usage

To use these extensions in your BPMN 2.0 XML files, declare the namespace and include the extension elements within the `bpmn:extensionElements` tag of any standard BPMN element.

### Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
    xmlns:term="https://clinical-bpmn.org/terminology/v1">
    
  <bpmn:process id="Process_1">
    <bpmn:task id="Task_1" name="Measure Blood Pressure">
      <bpmn:extensionElements>
        <term:annotations>
          <!-- A single annotation with a coding concept -->
          <term:annotation id="term-ann-1" text="Blood pressure measurement">
            <term:coding system="http://snomed.info/sct" code="46973005" display="Blood pressure taking" />
          </term:annotation>
        </term:annotations>
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
</bpmn:definitions>
```

## Integration with bpmn-js

If you are building tools using the [bpmn.io](https://bpmn.io/) ecosystem, you can use our JSON moddle descriptor to work with this schema natively in JavaScript:

```bash
npm install @forschungsgruppe-digital-health/terminology
```

```javascript
import BpmnModdle from 'bpmn-moddle';
import clinicalSchema from '@forschungsgruppe-digital-health/terminology/moddle';

const moddle = new BpmnModdle({
  term: clinicalSchema
});
```
