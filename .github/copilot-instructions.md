# GitHub Copilot — repository instructions

This repository's canonical agent guidance lives in **[`AGENTS.md`](../AGENTS.md)** at the
repo root. Read it first; everything below only summarizes the agent-skill wiring.

## Single source of truth

- Project context, conventions, and hard rules: **`AGENTS.md`**.
- Reusable validation workflows ("skills") live once in **`skills/<name>/SKILL.md`** (the only
  copy). Copilot auto-discovers them via the `.agents/skills` (and `.claude/skills`) symlink
  that points at `skills/` — Copilot scans `.github/skills` / `.claude/skills` / `.agents/skills`,
  not a top-level `skills/`. Do not duplicate skill content into this file.

## The quality gate is deterministic

Decisions are made by CLI tools wired to npm scripts, never by the model. Run the tool, read
the report, explain failures — never hand-wave a pass.

| Command | What it gates |
|---|---|
| `npm run check:conformance` | bpmnlint + moddle roundtrip + XSD core (BPMN / extension conformance) |
| `npm run check:packages` | npm / bpmn.io publishing conventions for `extension/` |
| `npm run verify` | full gate: `check:packages` + `check:conformance` + tests (pre-push runs this) |

## Skills and when they apply

- **bpmn-conformance** (`skills/bpmn-conformance/SKILL.md`) — when editing any `**/*.bpmn` or a
  moddle descriptor `extension/src/moddle/*.json`. Gate: `npm run check:conformance`.
- **moddle-extension-review** (`skills/moddle-extension-review/SKILL.md`) — when changing a moddle
  type / property / namespace / prefix in `extension/src/moddle/*.json`. Pair with
  `npm run check:conformance` (the roundtrip proves the descriptor).
- **bpmn-naming-publishing** (`skills/bpmn-naming-publishing/SKILL.md`) — when editing any
  `extension/package.json` or preparing a release. Gate: `npm run check:packages`.

When a task matches a trigger above, open and follow the named `SKILL.md` and run its gate
command before proposing a commit or PR.

## Hard rules (see `AGENTS.md`)

- Clinical data goes only in `<extensionElements>` under the custom `term:` prefix,
  never in the `bpmn:` / `bpmndi:` namespace, and never by changing the BPMN core structure.
- Renaming or removing a moddle type/property is a breaking (MAJOR) change and needs human sign-off.
- ESM only; package names use `@forschungsgruppe-digital-health/*` (or `bpmn-js-*` / `bpmnlint-plugin-*`).
- Install with `npm install --legacy-peer-deps`.
