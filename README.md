# BPMN Extension Medical Terminology

[![CI](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/ci.yml/badge.svg)](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/actions/workflows/ci.yml)

`@forschungsgruppe-digital-health/terminology` adds machine-readable clinical
terminology annotations to BPMN 2.0 diagrams. It stores data under standard
`bpmn:extensionElements` in the `term:` namespace, so BPMN tools that do not
understand the extension preserve it unchanged.

## Package

| Package | Location | Purpose |
|---|---|---|
| `@forschungsgruppe-digital-health/terminology` | [`extension/`](extension/) | Moddle descriptor, bpmn-js properties-panel module, terminology providers, and Vite discovery plugin |
| Demo | [`demo/`](demo/) | Private bpmn-js integration example |

Install the published package from GitHub Packages:

```bash
npm install @forschungsgruppe-digital-health/terminology
```

Configure the `@forschungsgruppe-digital-health` scope to use
`https://npm.pkg.github.com` before installing from GitHub Packages.

## Use with bpmn-js

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  createDefaultTerminologyModule,
  TerminologyModdleDescriptor,
  TerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/terminology';

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    TerminologyPropertiesPanelModule,
    createDefaultTerminologyModule()
  ],
  moddleExtensions: {
    term: TerminologyModdleDescriptor
  }
});
```

The default services provide SNOMED CT, FHIR terminology-server providers, and
package-backed terminology providers. Configure endpoints and providers through
`createDefaultTerminologyServices(config)`; see
[`demo/src/terminology-config.js`](demo/src/terminology-config.js) for a working
example.

The Vite discovery plugin selects package resources by their canonical
`CodeSystem.url`:

```js
terminologyVitePlugin({
  packages: {
    'hl7.fhir.r4.core': {
      include: [
        'http://terminology.hl7.org/CodeSystem/condition-clinical'
      ]
    }
  }
});
```

`exclude` uses the same URL format and takes precedence over `include`.
`include: ['*']` includes all resources. A configured URL that does not exist
in the package causes an error; filenames are not valid selectors.

## Development

```bash
npm install --legacy-peer-deps
npm run verify
npm run dev
```

`npm run verify` runs package-convention checks, BPMN conformance checks, and
the extension test suite. The demo is in `demo/`; the published package is in
`extension/`.

Clinical data must be synthetic and belongs only under `term:` elements inside
`bpmn:extensionElements`. Do not add clinical data to BPMN core or BPMN-DI
namespaces.

See [CONTRIBUTING.md](CONTRIBUTING.md) for release and publishing procedures,
and [AGENTS.md](AGENTS.md) for repository automation guidance.

## License

[Apache-2.0](LICENSE)
