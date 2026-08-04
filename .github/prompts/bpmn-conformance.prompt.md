---
agent: 'agent'
description: 'Run and explain the BPMN 2.0 conformance gate for changed .bpmn / moddle files'
---
Follow `skills/bpmn-conformance/SKILL.md` exactly.

Run `npm run check:conformance` from the repo root, read the bpmnlint, moddle-roundtrip and
XSD-core reports, and explain every failure with the offending file and line. Do not claim a
pass without the tool output — the decision lives in the tool, never in you.
