---
agent: 'agent'
description: 'Review a bpmn-moddle extension descriptor against bpmn.io conventions'
---
Follow `skills/moddle-extension-review/SKILL.md` exactly.

Review the changed descriptor(s) under `extension/src/moddle/*.json`: namespace/prefix
separation (never `bpmn` / `bpmndi`), `Element` superClass, `isAttr` / `isMany`, and XSD-extension
risks. Then run `npm run check:conformance` so the moddle roundtrip proves the descriptor
round-trips the examples losslessly. Cite the line for each finding.
