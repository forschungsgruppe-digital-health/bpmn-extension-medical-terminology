---
agent: 'agent'
description: 'Check workspace packages against npm / bpmn.io publishing conventions'
---
Follow `skills/bpmn-naming-publishing/SKILL.md` exactly.

Run `npm run check:packages` from the repo root and explain every error/warning: name prefix,
ESM, license, entry points, peer dependencies, and registry config. The deterministic check
decides; you explain and propose the diff.
