---
description: Generate (or refresh) an arc42 architecture documentation skeleton from this monorepo — code-derivable sections filled, the rest marked as human input.
allowed-tools: Task, Read, Grep, Glob, Write, Bash
---

# Draft arc42: $ARGUMENTS

Argument format (optional): output mode — "refresh" (default; fill `_Not yet
documented._` stubs in the existing `docs/arc42/NN_*.md` set in place) or
"single" (write a fresh standalone `docs/arc42/arc42.md`).

GOAL: Produce an arc42 architecture documentation skeleton following the official
12-section structure, filling ONLY code-derivable content and marking everything
else as ⚠️ HUMAN INPUT REQUIRED. No speculation.

Steps:
1. **Read the existing arc42 first.** This repo ALREADY ships a hand-written
   arc42 under `docs/arc42/` (one numbered file per section,
   `01_introduction_and_goals.md` … `12_glossary.md`, `# N. Title` headings, arc42
   v9), indexed by `docs/ARCHITECTURE.md`. Do NOT overwrite filled sections. In refresh
   mode, only replace `_Not yet documented._` stubs with code-derived drafts marked
   as such; match the present one-file-per-section layout and heading style.
2. **Launch the `arc42-generator` skill** scoped to this monorepo. Its evidence
   sources are the code, not prose intent: root + per-package `package.json`
   (npm workspaces, scripts/gates, `engines`, `peerDependencies`, `publishConfig`),
   the moddle descriptors `packages/*/src/moddle/*.json` (namespaces `term:` /
   `fhirmap:`, types), the conformance tooling under `tools/*.mjs` / `tools/*.sh`
   and the npm scripts wiring them, the git hooks `.githooks/`, CI under `.github/`,
   and the committed prose (`AGENTS.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`,
   `README.md`, `docs/EXTENDING.md`, `examples/`, `docs/user-stories/`).
3. **Assemble the output** per the argument: refresh the `docs/arc42/NN_*.md`
   files in place (default), or write a fresh `docs/arc42/arc42.md` (single).
4. **Verify the provenance note** is present at the top of any file you create or
   substantially fill, and that every section either contains DERIVED draft content
   (marked for verification, cited to its source file) or the ⚠️ placeholder. No
   section may contain invented goals, qualities, or rationale.
5. **Respect what does NOT exist here.** This is a set of published ESM npm
   libraries, not a deployed service: there is NO Docker/compose/k8s/server (§7 is
   the publish→install→host-app distribution topology to GitHub Packages under
   `@forschungsgruppe-digital-health`, NOT runtime infrastructure), and there is NO
   `docs/adr/` directory (§9 references `docs/ARCHITECTURE.md` and
   `docs/arc42/09_architecture_decisions.md` — do not invent ADR files).
6. **Cross-link** the conformance/publishing skills as evidence rather than
   re-deriving their rules: `skills/bpmn-conformance` (the BPMN 2.0 gate
   `npm run check:conformance`; evidence for §6/§8), `skills/moddle-extension-review`
   (descriptor conventions; evidence for §5/§8 and the breaking-change risk in §11),
   `skills/bpmn-naming-publishing` (npm/bpmn.io publishing rules
   `npm run check:packages`; evidence for §2/§7). The canonical project context and
   quality-gate description live in `AGENTS.md`.
7. **Summarize** for the user: which sections were filled (derived), which need
   human input, and the top open questions.

Constraints:
- NO speculation anywhere. When in doubt, placeholder. Strongest derivable section
  is §5 Building Block View (the three workspace packages); §1 and §10 are mostly
  ⚠️ HUMAN INPUT (goals, stakeholders, quality scenarios are not in code).
- All derived content is marked as draft requiring human verification.
- Do not modify any source file, descriptor, or tool; only write the arc42 output.
  Never "fix" issues you spot — report them in §11 Risks and Technical Debt
  (e.g. a moddle descriptor change that renames/removes a type/property is a
  BREAKING/MAJOR risk; the `--legacy-peer-deps` workaround; the XSD gate being
  informational-by-default because the standard XSD cannot validate extensions).
- Clinical content is synthetic-only and PII-sensitive: never copy real or
  realistic patient data into the arc42 output.
- Present the result as a PROPOSED first draft (or stub-fill) for human review.
