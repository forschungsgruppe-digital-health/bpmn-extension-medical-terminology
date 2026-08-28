---
description: Generate or refresh the current repository's 12-section arc42 documentation
allowed-tools: Task, Read, Grep, Glob, Write, Bash
---

# Draft arc42: $ARGUMENTS

Generate or refresh the one-file-per-section arc42 documentation under
`docs/arc42/`, indexed by `docs/ARCHITECTURE.md`.

1. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, all existing
   `docs/arc42/NN_*.md`, the accepted ADRs in `docs/adr/`, and the current
   package/source evidence before drafting.
2. Use only current evidence from `extension/`, `demo/`, `tools/`,
   `extension/src/moddle/clinical.json`, `schema/`, `examples/`, manifests,
   hooks, and workflows.
3. Reflect the current architecture: one published package
   `@forschungsgruppe-digital-health/terminology`, private `demo/`, `term:`
   namespace `https://clinical-bpmn.org/terminology/v1`, terminology providers
   and FHIR CodeSystem package discovery.
4. Do not introduce removed legacy package, namespace, UI, or example concepts.
   FHIR terminology servers and FHIR `CodeSystem` resources are current and
   should remain documented.
5. Preserve useful existing rationale. Mark anything not derivable as:

   `> ⚠️ HUMAN INPUT REQUIRED — not derivable from current repository evidence.`

6. Keep chapter 9 linked to `docs/adr/0001-versioning-and-release-please.md`
   and `docs/adr/0002-bundled-terminology-defaults.md`.
7. Verify every chapter link and run the smallest applicable documentation
   checks. Do not modify source code, package manifests, fixtures, or tools.

The repository is a raw-ESM library distribution, not a deployed service:
describe GitHub Packages, GitHub Pages for `demo/dist`, and optional external
terminology servers, but do not invent Docker, Kubernetes, databases, or
application servers. Clinical examples must be synthetic only.
