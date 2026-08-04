# AGENTS.md — bpmn-js-clinical-semantics

Operational context for AI coding agents (Claude Code, Codex, Cursor, Gemini CLI,
Copilot — anything that reads the open AGENTS.md standard). Single source of truth:
tool-specific files (e.g. `CLAUDE.md`) only point here. Keep this lean — the
project narrative lives in `README.md`, `docs/ARCHITECTURE.md` and `CONTRIBUTING.md`;
do not duplicate it.

## What this repo is

Two independent bpmn-js extension libraries that add clinical semantics to BPMN
2.0 via standard `<extensionElements>` — `@forschungsgruppe-digital-health/terminology`
(`term:`) and `@forschungsgruppe-digital-health/fhir-mapping` (`fhirmap:`) — the two
publishable packages — plus the private, unpublished `@forschungsgruppe-digital-health/demo`
package (a Vue 3 wrapper, dir `packages/demo`). npm-workspaces monorepo, raw ESM (no
build step for libraries), JS + JSDoc, Vitest. Setup and commands: `CONTRIBUTING.md`.

## Quality gate — one source, four runners

Every check is a deterministic CLI tool under `tools/`, wired to an npm script.
The **decision lives in the tool, never in the model.** The same scripts run in
all four places, so a green local run means a green CI run:

| Runner | How |
|---|---|
| Terminal | `npm run check:conformance`, `npm run check:packages`, `npm run verify` |
| Git hooks | `.githooks/pre-commit` (conformance/packages on staged files), `.githooks/pre-push` (full `verify`); enabled by `prepare` → `core.hooksPath` |
| VS Code | `.vscode/tasks.json` (Run Task…) + live BPMN-core XSD validation via redhat.vscode-xml |
| Agent skills | `skills/bpmn-conformance`, `skills/moddle-extension-review`, `skills/bpmn-naming-publishing` — Claude Code via `.claude/skills`, Codex & Copilot via `.agents/skills` (both symlink to `skills/`). See [Agent skills](#agent-skills-codex-copilot-claude-code-cursor) below |

Layers and severity:

- **bpmnlint** (`npm run lint:bpmn`) — BPMN structure/correctness. **Blocking.**
- **moddle roundtrip** (`npm run check:roundtrip`) — `term:`/`fhirmap:` data is
  lossless and serialization is stable. **Blocking** on instability; parse
  warnings (extension content not defined in the moddle model) are non-fatal —
  `node tools/moddle-roundtrip.mjs --strict` promotes them to failures.
- **XSD core** (`npm run check:xsd`) — BPMN core vs OMG BPMN20.xsd. **Informational**
  by default: the standard XSD cannot validate extensions (they pass via
  `processContents="lax"`), so a green XSD ≠ valid extensions. `--strict` enforces.
- **package conventions** (`npm run check:packages`) — npm/bpmn.io publishing rules.
  **Blocking.**

To register a new `.bpmn` location for the checks, edit `ROOTS` in
`tools/bpmn-files.mjs` (the single file-discovery source).

## Agent skills (Codex, Copilot, Claude Code, Cursor)

Reusable validation workflows live once under `skills/<name>/SKILL.md` (the single source).
Tool wiring points at that directory — never duplicate the content:

- **Claude Code** reads them via `.claude/skills` → `../skills`.
- **Codex** and **Copilot** auto-discover them via `.agents/skills` → `../skills` (the symlink
  target is followed). Copilot scans `.github/skills` / `.claude/skills` / `.agents/skills`, not a
  top-level `skills/`.
- **Copilot** additionally has `.github/copilot-instructions.md` (repo-wide),
  `.github/instructions/*.instructions.md` (path-scoped via `applyTo`), and
  `.github/prompts/*.prompt.md` (manual `/`-invoked wrappers).

When your change matches a trigger below, **open and follow the named `SKILL.md`** and run its
gate command before proposing a commit or PR. The decision lives in the tool, never in the model.

| Skill (open this) | Triggers when you edit | Gate command |
|---|---|---|
| `skills/bpmn-conformance/SKILL.md` | any `**/*.bpmn`, or a moddle descriptor `packages/*/src/moddle/*.json` | `npm run check:conformance` |
| `skills/moddle-extension-review/SKILL.md` | a moddle type/property/namespace/prefix in `packages/*/src/moddle/*.json` | `npm run check:conformance` (roundtrip proves the descriptor) |
| `skills/bpmn-naming-publishing/SKILL.md` | any `packages/*/package.json`, or preparing a release | `npm run check:packages` |

Codex has no per-glob `applyTo` frontmatter, so treat the "Triggers" column as the path mapping
(Copilot gets real `applyTo` globs in `.github/instructions/`). Codex custom prompts are
personal-only (`~/.codex/prompts`) and deprecated — there is no repo-committed Codex prompt
location; the skills above are the shared, repo-committed equivalent.

Beyond the three conformance skills, the repo also vendors general **analysis skills** (invoked on
demand, detection-only): `dead-code-detector`, `feature-inventarist`, `docs-auditor`,
`security-reviewer`, `arc42-generator`, `test-generator` — plus slash-commands under
`.claude/commands/` (`classify-feature`, `inventory-update`, `draft-arc42`, `adr-draft`,
`upgrade-dep`). See [`skills/README.md`](skills/README.md).

## Conventions (enforced or expected)

- ESM only (`"type": "module"`); JS + JSDoc, no TypeScript.
- Package names: `@forschungsgruppe-digital-health/*` (or `bpmn-js-*` / `bpmnlint-plugin-*`).
- Conventional Commits; scope = package name (`terminology`, `fhir-mapping`, `demo`).
- `npm install --legacy-peer-deps` (overlapping bpmn-js peer ranges).

## Branching and pull requests

- Land **every change as a pull request into `dev`** (`gh pr create --base dev`), bundling its
  commits. Do **not** push directly to `dev` or `main`, and do **not** fast-forward `main`
  (no `git push origin dev:main`).
- Promotion to a release is a separate **`dev` → `main`** pull request (release-please drives the
  `main` side).
- One logical change per PR; keep diffs reviewable; CI (lint + tests + the conformance gate) must
  pass. A human reviews and merges — **agents do not self-merge**.

## Hard rules (do not violate)

- Clinical data goes in `<extensionElements>` under the custom prefix — **never**
  the `bpmn:`/`bpmndi:` namespace, and never by changing the BPMN core structure.
- Visual/layout info belongs in `bpmndi`, not in clinical extensions.
- A moddle descriptor change that renames/removes a type or property is a
  **breaking** (MAJOR) change — flag it; descriptor files need human sign-off.
- Use only synthetic clinical data with obviously artificial content. Never commit
  real patient data.

## Where to look first

- Conformance tooling: `tools/` + `skills/bpmn-conformance/SKILL.md`
- Design rationale, data model, UML: `docs/ARCHITECTURE.md`
- Setup, testing, release, publishing: `CONTRIBUTING.md`
- Moddle schemas: `packages/*/src/moddle/*.json`
