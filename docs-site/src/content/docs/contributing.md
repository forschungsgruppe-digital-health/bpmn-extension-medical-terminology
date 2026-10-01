---
title: Contributing
description: The canonical setup, quality gates, and pull-request workflow for contributors.
---

The repository's
[`CONTRIBUTING.md`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CONTRIBUTING.md)
is the single source for development setup, commands, quality gates, branching, reviews,
and releases.

## Short version

```bash
git clone https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology.git
cd bpmn-extension-medical-terminology
npm install --legacy-peer-deps
npm run verify
```

Use Node.js 24 or later. Changes land through pull requests into `dev`; releases use a
separate `dev` to `main` pull request.

Important repository rules:

- store clinical semantics only in `mt:` elements under `bpmn:extensionElements`;
- use only obviously synthetic clinical data;
- obtain maintainer approval before renaming or removing a moddle type or property;
- keep the package raw ESM and preserve its published package name.

Read the canonical
[`CONTRIBUTING.md`](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/CONTRIBUTING.md)
before opening a pull request.
