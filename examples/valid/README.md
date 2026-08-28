# Valid BPMN fixtures

These BPMN files contain only synthetic data and are used by the conformance
checks.

| File | Purpose |
|---|---|
| `minimal-valid.bpmn` | Small, structurally valid BPMN fixture |
| `lung-cancer-staging.bpmn` | Synthetic clinical workflow without terminology extensions |
| `lung-cancer-staging-annotated.bpmn` | Synthetic clinical workflow with `term:` terminology annotations |

The terminology-annotated demo fixture is
[`demo/public/sample.bpmn`](../../demo/public/sample.bpmn). It uses the
`term:` namespace only.
