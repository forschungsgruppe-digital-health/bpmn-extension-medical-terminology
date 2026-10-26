---
applyTo: "**/*.bpmn,**/src/moddle/*.json"
---
You are editing a BPMN diagram or a clinical moddle descriptor.

Follow `skills/bpmn-conformance/SKILL.md` and, for descriptor changes,
`skills/moddle-extension-review/SKILL.md`.

Before proposing a commit or PR, run the deterministic gate and explain any failures — do not
assert a pass without the tool output:

```bash
npm run check:conformance
```

This runs bpmnlint (BPMN structure), the moddle roundtrip (your `mt:` extension
data is lossless and stable — the authoritative check for a moddle descriptor), and an
informational XSD-core validation.

Hard rules (see `AGENTS.md`): canonical structured clinical data lives in
`<extensionElements>` under the custom prefix (`mt:`). The extension may
generate `bpmn:TextAnnotation` and `bpmn:Association` artifacts as comments;
their `bpmn:text` may contain a derived plain-text snapshot so other BPMN
editors can render it. An `mt:GeneratedComment` marker identifies generated
annotations for synchronization. Do not change BPMN process semantics or
BPMN-DI structures. Renaming or removing an `mt:` type/property is a breaking
(MAJOR) change and needs human sign-off.
