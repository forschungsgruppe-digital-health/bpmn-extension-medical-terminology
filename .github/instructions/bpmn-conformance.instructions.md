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

This runs bpmnlint (BPMN structure), the moddle roundtrip (your `term:` extension
data is lossless and stable — the authoritative check for a moddle descriptor), and an
informational XSD-core validation.

Hard rules (see `AGENTS.md`): clinical data goes only in `<extensionElements>` under the custom
prefix (`term:`), never in `bpmn:` / `bpmndi:`. Renaming or removing a moddle
type/property is a breaking (MAJOR) change and needs human sign-off.
