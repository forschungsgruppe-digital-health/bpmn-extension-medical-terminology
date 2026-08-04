---
name: arc42-generator
description: Derives an arc42 architecture documentation skeleton (official 12-section structure) from this bpmn-js-clinical-semantics monorepo. Fills ONLY what is unambiguously derivable from code, package manifests, moddle descriptors, and the conformance tooling; marks everything else as requiring human input. Use when you need a first-draft (or refreshed) arc42 document from the code without inventing goals, qualities, or rationale. Detection and drafting only — no speculation, never edits source files.
---

# arc42-generator

> **No speculation.** Fill in ONLY what is unambiguously derivable from code,
> package manifests (`package.json`), moddle descriptors
> (`packages/*/src/moddle/*.json`), the conformance tooling under `tools/`, and
> the committed docs (`AGENTS.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`,
> `README.md`). When something needs guessing, insert the placeholder below
> instead. Do NOT modify source files; writing is limited to the arc42 output
> file(s). This is a detection/drafting skill — **mandatory human review** before
> any DERIVED content is relied upon.

You generate an arc42 architecture documentation skeleton following the OFFICIAL
arc42 12-section structure.

Note: this repo already ships a hand-written arc42 under `docs/arc42/`
(one numbered Markdown file per section: `01_introduction_and_goals.md` …
`12_glossary.md`). When that exists, DO NOT overwrite it. Read it first, then
either (a) propose a diff that fills `_Not yet documented._` stubs with
code-derived drafts marked as such, or (b) write a separate first-draft when the
user explicitly asks for one. Match the existing one-file-per-section layout and
heading style (`# N. Title`).

Placeholder to use whenever something is not derivable without guessing:

```
> ⚠️ HUMAN INPUT REQUIRED — not derivable from code without speculation.
```
…followed by a brief note on what kind of input is needed.

## Input

This monorepo. Relevant evidence sources:

- Root `package.json` (npm workspaces, scripts/gates, engines, devDeps).
- Per-package `packages/*/package.json` (names, exports, peerDependencies).
- Moddle descriptors `packages/*/src/moddle/*.json` (namespaces, prefixes, types).
- Conformance tooling `tools/*.mjs` / `tools/*.sh` and the npm scripts wiring them.
- Git hooks `.githooks/`, CI under `.github/`, and the agent skills under `skills/`.
- Prose: `AGENTS.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, `README.md`,
  `docs/EXTENDING.md`, `examples/`, `docs/user-stories/`.

## The 12 official arc42 sections and how to treat each

1. **Introduction and Goals** — ⚠️ HUMAN INPUT. Quality goals and stakeholders are
   not in code. You MAY summarize the stated purpose from `AGENTS.md` /
   `README.md` ("clinical semantics on BPMN 2.0 via `<extensionElements>`") and
   list contributor hints only if a `CONTRIBUTORS`/`CODEOWNERS` file exists
   (mark "detected, validate"). Top-level quality goals: placeholder.
2. **Architecture Constraints** — PARTIAL. You MAY note hard technical constraints
   visible in code: ESM only (`"type": "module"`), JS + JSDoc (no TypeScript),
   Node engine pin from `engines.node`, raw ESM with no library build step,
   bpmn-js / bpmn-moddle peer ranges, package-name prefix
   `@forschungsgruppe-digital-health/*`, the "clinical data only in
   `<extensionElements>` under the custom prefix" rule, and synthetic-data-only.
   Cite each to its source file. Organizational constraints: placeholder.
3. **Context and Scope** — PARTIAL. Technical context is derivable: the libraries
   plug into a bpmn-js host application (the `peerDependencies` are the contract),
   emit/consume BPMN XML with `term:` and `fhirmap:` extension namespaces, and the
   `fhir-mapping` package references FHIR resource types (`@types/fhir`). Produce a
   mermaid context diagram showing the host bpmn-js app, the workspace packages, and
   the BPMN/FHIR data they exchange — detected boundaries only. Business context:
   placeholder.
4. **Solution Strategy** — PARTIAL/REFERENCE. The "why" lives in prose, not code.
   Summarize and link `docs/ARCHITECTURE.md` and `docs/arc42/04_solution_strategy.md`
   if present; do not reconstruct rationale that is not written down. This repo has
   NO `docs/adr/` directory — do not invent one or link to it.
5. **Building Block View** — DERIVABLE. Strongest section. Level 1: the three
   workspace packages — `packages/terminology` (prefix `term:`),
   `packages/fhir-mapping` (prefix `fhirmap:`), `packages/demo` (host wrapper) —
   plus the `tools/` conformance gate and `examples/`. Level 2/3: each package's
   `src/index.js` exports, its moddle descriptor
   (`packages/*/src/moddle/*.json`), and (where present) properties-panel
   providers. Use the official whitebox/blackbox template per building block and
   produce mermaid diagrams. State the npm package name and namespace prefix per
   block.
6. **Runtime View** — PARTIAL. Derive only clearly traceable flows, e.g. the moddle
   roundtrip (parse BPMN XML → augment with `term:`/`fhirmap:` extension data →
   re-serialize losslessly, the invariant `tools/moddle-roundtrip.mjs` proves), or
   the conformance gate sequence (`lint:bpmn` → `check:roundtrip` → `check:xsd`).
   Mark untraceable flows incomplete. Do NOT invent sequences.
7. **Deployment View** — PARTIAL. This is a set of published npm libraries, not a
   deployed service — there is NO Docker/compose/k8s/server here. Derive the
   distribution topology instead: packages published to GitHub Packages under
   `@forschungsgruppe-digital-health`, consumed as ESM by a downstream bpmn-js
   application; the registry/auth config from per-package `publishConfig`. A
   mermaid "publish → install → host app" diagram is appropriate. Do not describe
   runtime infrastructure that does not exist.
8. **Cross-cutting Concepts** — PARTIAL. Derive only evidenced concepts: the
   `<extensionElements>` extension mechanism and namespace/prefix separation
   (`term:`/`fhirmap:`, never `bpmn:`/`bpmndi:`); the deterministic conformance
   gate (bpmnlint, moddle roundtrip, XSD core, package conventions) with its
   one-source/four-runner wiring (terminal, git hooks, VS Code, agent skills);
   JSDoc typing; Vitest unit tests; Conventional Commits + release-please
   versioning; synthetic-data / PII-sensitivity handling for clinical content.
   Rationale beyond what is written: placeholder.
9. **Architecture Decisions** — REFERENCE ONLY. There is no `docs/adr/` here.
   Point to `docs/ARCHITECTURE.md` and `docs/arc42/09_architecture_decisions.md`
   (which currently defers to the Solution Strategy). Do NOT write new ADRs or
   reconstruct rationale from code.
10. **Quality Requirements** — ⚠️ HUMAN INPUT. Quality scenarios and the quality
    tree (10.1 overview, 10.2 details) are domain decisions. Placeholder. You MAY
    note that *conformance/losslessness* is mechanically enforced by the gate
    (evidence, not a quality target) — mark it "detected, confirm as a goal".
11. **Risks and Technical Debt** — PARTIAL. List technically-evident debt
    (TODO/FIXME density, missing tests for a package, stray `.DS_Store` files,
    `--legacy-peer-deps` workaround for overlapping bpmn-js peer ranges, the
    informational-by-default XSD gate that cannot validate extensions) and mark
    each "detected, severity assessment requires human review". A moddle descriptor
    change that renames/removes a type or property is a BREAKING (MAJOR) risk —
    flag it. Do NOT assess business risk.
12. **Glossary** — PARTIAL. Extract domain/technical terms from code and
    descriptors: namespace prefixes (`term:`, `fhirmap:`), moddle type and property
    names from `packages/*/src/moddle/*.json`, `<extensionElements>`, moddle
    roundtrip, FHIR resource names referenced by `fhir-mapping`, bpmn-js / bpmnlint.
    Mark "extracted, definitions need human confirmation".

## Output

Default: refresh the existing `docs/arc42/` set — one numbered file per section
(`NN_title.md`), matching the present naming and `# N. Title` headings — filling
only `_Not yet documented._` stubs with code-derived drafts. If the user asks for
a fresh standalone draft, write `docs/arc42/arc42.md` (single file) instead.
Ask if unclear.

Use the official section headings and numbering. Every section must be present.
Sections you cannot fill carry the ⚠️ placeholder, never invented content.

Add a provenance note at the top of any file you create or substantially fill:
"Generated/updated by arc42-generator on <date>. Code-derivable sections are
drafted; sections marked ⚠️ require human input. Verify all DERIVED content
against the actual code before relying on it."

## Hard rules

- NO speculation. When in doubt, placeholder. **Detection/drafting only — every
  DERIVED claim needs human review.**
- Mark DERIVED content as draft requiring verification, and cite its source file.
- Do not modify any source file, descriptor, or tool. Never auto-delete or
  auto-change code; never "fix" issues you spot — report them in section 11.
- Never invent infrastructure (Docker/server/ADR dirs) this repo does not have.
- Prefer mermaid for diagrams (context, building blocks, distribution).
- State per building block which package/path it lives in.
- Clinical content is synthetic-only and PII-sensitive: never copy real or
  realistic patient data into the arc42 output.

## Related skills

These cover the conformance/publishing rules this skill only references — open
them for the authoritative checks, do not duplicate their logic here:

- `skills/bpmn-conformance/SKILL.md` — the BPMN 2.0 conformance gate
  (`npm run check:conformance`), useful evidence for sections 6 and 8.
- `skills/moddle-extension-review/SKILL.md` — moddle descriptor conventions,
  useful evidence for sections 5, 8, and the breaking-change risk in 11.
- `skills/bpmn-naming-publishing/SKILL.md` — npm/bpmn.io publishing conventions
  (`npm run check:packages`), useful evidence for sections 2 and 7.

Project context and the canonical quality-gate description live in `AGENTS.md`.

---
*Built on the open Agent Skills standard. Portable core frontmatter: `name`,
`description`. Consumed by Claude Code (`.claude/skills`), Codex/Copilot
(`.agents/skills`), and any AGENTS.md-aware agent.*
