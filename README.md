# BPMN Extension Medical Terminology

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/validate.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/validate.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A524-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

`@forschungsgruppe-digital-health/bpmn-extension-medical-terminology` adds
machine-readable medical codes to BPMN elements. It provides an XML extension, terminology
services, and an optional bpmn-js properties-panel integration.

- [Documentation](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/)
- [Live demo](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/demo/)
- [API reference](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/api/)

This is pre-1.0 research software. It does not execute clinical processes, generate FHIR
resources, provide a terminology licence, or replace clinical validation.

## What it does

A human-readable label such as `CT chest` is ambiguous to software. The extension can attach
a SNOMED CT, LOINC, ICD-10-GM, OPS, ATC, IHE XDS, KDL, or another coding while leaving the
BPMN element unchanged:

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

The `mt:` data uses the versioned namespace
`https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1`
and is stored only below standard BPMN `extensionElements`.

| Integration | What you can use |
| --- | --- |
| bpmn-js modeler | XML descriptor, terminology search, and properties-panel editor |
| JavaScript application without the UI | Terminology registry, providers, and annotation helpers |
| Camunda or another BPMN/XML framework | The framework-neutral `mt:` XML format and schema |

Non-bpmn-js tools must preserve unknown extension elements when saving. Test a round trip in
the target tool before adoption.

## Install

The package is raw ESM, published through GitHub Packages, and intended for applications
with a bundler. Configure the organisation scope and a token that can read packages:

```ini
@forschungsgruppe-digital-health:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

Do not commit a token. Supported peer versions and bundler constraints are listed under
[Compatibility](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/compatibility/).

## bpmn-js quick start

The host registers its normal properties-panel modules, this package's UI and services, and
the `mt` moddle descriptor:

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

The default setup offers server-backed providers and bundled, offline-searchable providers.
Use the [configuration guide](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/)
to select a self-hosted server, authentication route, offline-only operation, or installed
FHIR terminology packages.

## JavaScript without the panel

`createDefaultTerminologyServices()` exposes the same registry without registering a
bpmn-js module:

```js
import {
  createDefaultTerminologyServices
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const { terminologyRegistry } = createDefaultTerminologyServices();
const result = await terminologyRegistry.search('pneumonia', 'snomed-ct');
```

For custom providers, annotation helpers, and all options, use the
[Extending guide](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/extending/)
and generated [API reference](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/api/).

## Documentation

| Question | Start here |
| --- | --- |
| Does the package fit my use case? | [Decision and quick start](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/) |
| How do I configure sources? | [Configuration](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/) |
| How does a modeller edit annotations? | [Properties panel](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/properties-panel/) |
| How is the XML structured? | [XML schema](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/schema/) |
| What is the exact namespace contract? | [Namespace v1](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1/) |
| How do I report a problem? | [Support](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/support/) |

Contributor-only material remains in the repository:

- [Contributing](CONTRIBUTING.md) and the full [contributor guide](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/contributing/)
- [Architecture](docs/ARCHITECTURE.md) and [architecture decisions](docs/adr/)
- [Security policy](SECURITY.md)
- [Package changelog](extension/CHANGELOG.md)

## Develop

Node.js 24 or later is required for repository development.

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
npm run dev
```

Before a pull request or release:

```bash
npm run verify
```

The command checks package metadata, versions, generated terminology data, BPMN conformance,
moddle round trips, XML Schema validation, and the Vitest suite. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the complete workflow.

## Funding and citation

This work is part of **MiHUB – Medical Informatics Hub**, funded by the German Federal
Ministry of Research, Technology and Space (BMFTR), grant **01ZZ2506A**. Responsibility for
the content lies with the authors. See the [funding record](https://foerderportal.bund.de/foekat/jsp/SucheAction.do?actionMode=view&fkz=01ZZ2506A)
and [CITATION.cff](CITATION.cff).

## Licence

The source code is [MIT licensed](LICENSE). bpmn-js has an additional visible-watermark
condition; see the [bpmn.io licence](https://bpmn.io/license/).

Terminology content remains subject to its publisher's terms. The software licence does not
grant rights to SNOMED CT, LOINC, ICD-10-GM, OPS, ATC, or content returned by a configured
server. See [Support and licensing](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/support/#licence-and-terminology-content).
