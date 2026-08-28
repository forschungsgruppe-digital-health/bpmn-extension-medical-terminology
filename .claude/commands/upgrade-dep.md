---
description: Upgrade a dependency with compatibility check
allowed-tools: Read, Edit, Bash, Grep, Glob
---

# Upgrade: $ARGUMENTS

Target: $ARGUMENTS (format: "library@version", e.g. "bpmn-js@18", "vitest@3", "vue@3.5")

This is an ESM npm-workspaces monorepo of bpmn-js extension libraries
(`extension`, `demo`), JS + JSDoc, no
TypeScript, Vitest. The libraries ship raw ESM (no build step). The central upgrade
risk is **overlapping bpmn-js peer-dependency ranges** across packages — see AGENTS.md.

1. **Version Assessment**
   - Find current version:    root `package.json` (`devDependencies`) and `extension/package.json`
   (`dependencies` / `peerDependencies`). Detection only.
   - Check the library's changelog and breaking changes.
   - Grep the codebase for deprecated / removed APIs (`extension/src/**`, `tools/**`).

2. **Compatibility Analysis**
   - For bpmn-js ecosystem deps (`bpmn-js`, `bpmn-js-properties-panel`,
     `@bpmn-io/properties-panel`, `bpmn-moddle`, `bpmnlint`): these appear as
     **peer ranges** in multiple packages. Confirm the new version stays within a
     single overlapping range across `extension` and `demo`, and
     widen the peer ranges deliberately rather than pinning.
   - Installs use `npm install --legacy-peer-deps` (intentional, per AGENTS.md);
     do not "fix" this by tightening peers without sign-off.
   - For `vue`: only affects `demo` (peer `vue >=3.3.0`).

3. **Incremental Upgrade**
   - Update the version in the relevant manifest(s).
   - Reinstall with `npm install --legacy-peer-deps`.
   - Fix any broken imports / deprecated API usage in `extension/src/**` and
     `tools/**`. Keep JSDoc types in sync — no TypeScript.
   - If the change touches a moddle descriptor (`extension/src/moddle/*.json`) or
     a properties-panel provider, follow `skills/moddle-extension-review/SKILL.md`.

4. **Testing**
   - `npm run verify` (runs `check:packages` + `check:conformance` + `npm test`).
   - Or, narrower: `npm test` (Vitest), `npm run check:conformance`
     (bpmnlint + moddle roundtrip + XSD core), `npm run check:packages`.
   - If `.bpmn` files or moddle descriptors are affected, the
     `skills/bpmn-conformance/SKILL.md` gate is `npm run check:conformance`.
   - The `verify` script is the same gate the git hooks (`.githooks/pre-push`) and
     CI run — a green local `verify` means a green CI run.

5. **Commit**
   - One logical commit per step.
   - Conventional Commit message: `chore(deps): upgrade $ARGUMENTS`
     (scope = affected package: `terminology` / `demo`, or omit for root).
   - PR description lists all breaking changes and any widened peer ranges.

STOP and ask for human review if:
- A bpmn-js / properties-panel / bpmn-moddle MAJOR change (peer ranges affect all packages
  and downstream consumers).
- A moddle descriptor (`extension/src/moddle/*.json`) renames/removes a type or property —
  that is a breaking (MAJOR) change for published consumers and needs sign-off (AGENTS.md).
- A published package's public `name`, entry points, or registry config would change
  (GitHub Packages, `@forschungsgruppe-digital-health/*`) — see `skills/bpmn-naming-publishing/SKILL.md`.
- > 10 files modified.
