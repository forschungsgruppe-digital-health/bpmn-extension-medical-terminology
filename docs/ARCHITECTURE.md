# Architecture

The repository contains one publishable bpmn-js extension and one private demo.

- [`extension/`](../extension/) exports the terminology moddle descriptor,
  properties-panel module, provider implementations, default service factory,
  and Vite package-discovery plugin.
- [`demo/`](../demo/) demonstrates registration with a bpmn-js modeler.
- [`examples/valid/`](../examples/valid/) holds synthetic BPMN fixtures used by
  the conformance checks.

Terminology annotations use the `term:` namespace
`https://clinical-bpmn.org/terminology/v1`. They are attached exclusively in
standard BPMN `extensionElements`; the extension does not modify BPMN core
elements or visual BPMN-DI data.

The deterministic quality gate is `npm run verify`. It combines BPMN linting,
moddle roundtrip stability, informational BPMN-core XSD validation, package
convention checks, and the Vitest suite.
