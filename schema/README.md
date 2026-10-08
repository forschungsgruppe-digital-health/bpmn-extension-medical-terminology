# BPMN Medical Terminology Extension

This repository contains the formal XML Schema Definition (XSD) for extending BPMN 2.0 models with semantic medical terminology.

## Contents

- `medical-terminology.xsd`: The generated XSD defining the `https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1` namespace. It is derived from `extension/src/moddle/medical-terminology.json` and provides the structural vocabulary for medical terminology.

Regenerate it after changing the moddle descriptor with `npm run xsd:gen`.

## Usage

To use these extensions in your BPMN 2.0 XML files, declare the namespace and include the extension elements within the `bpmn:extensionElements` tag of any standard BPMN element.

### Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
    xmlns:mt="https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1">
    
  <bpmn:process id="Process_1">
    <bpmn:task id="Task_1" name="Measure Blood Pressure">
      <bpmn:extensionElements>
        <mt:annotations>
          <!-- A single annotation with a coding concept -->
          <mt:annotation id="mt-ann-1" text="Blood pressure measurement">
            <mt:coding system="http://snomed.info/sct" code="46973005" display="Blood pressure taking" />
          </mt:annotation>
        </mt:annotations>
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
</bpmn:definitions>
```

## Integration with bpmn-js

If you are building tools using the [bpmn.io](https://bpmn.io/) ecosystem, you can use our JSON moddle descriptor to work with this schema natively in JavaScript:

```bash
npm install @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

```javascript
import BpmnModdle from 'bpmn-moddle';
import medicalTerminologySchema from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/moddle';

const moddle = new BpmnModdle({
  mt: medicalTerminologySchema
});
```
