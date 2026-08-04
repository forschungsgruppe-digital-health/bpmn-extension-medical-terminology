---
applyTo: "**/package.json"
---
You are editing a workspace package manifest.

Follow `skills/bpmn-naming-publishing/SKILL.md`.

Before proposing a commit or PR, run the deterministic gate and explain any failures:

```bash
npm run check:packages
```

It enforces npm / bpmn.io publishing conventions: accepted name prefix
(`@forschungsgruppe-digital-health/*`, `bpmn-js-*`, or `bpmnlint-plugin-*`), ESM (`"type": "module"`),
a declared license, an entry point (`main` / `exports`), peer dependencies, and the publish
registry config (see `AGENTS.md`).
