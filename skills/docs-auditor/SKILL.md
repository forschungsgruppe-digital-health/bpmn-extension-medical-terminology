---
name: docs-auditor
description: Audits ALL repository documentation from five contributor perspectives (maintainer, library consumer, technical project management, release/ops, security & data) across three concerns (development, release/publishing, usage/usability) for a bpmn-js clinical-extension monorepo. Detects inconsistencies (contradictions, version/status drift, stale claims about packages, scripts, moddle prefixes or namespaces, diverged duplicates), gaps, and missing parts that block a role. Mechanically verifies every relative link and #anchor resolves (flagging broken links and orphan docs) and proposes cross-links to connect the docs into one navigable web; then proposes AT MOST THREE documentation merge/consolidation moves. Read-only — returns a report for human review, never edits the repo. Reuses the repo's own conformance skills (bpmn-conformance, moddle-extension-review, bpmn-naming-publishing) for their domains rather than re-deriving them. Use when documentation has grown heterogeneous and you need a role-aware consistency/coverage/connectivity audit plus a small consolidation plan.
---

# docs-auditor

> **Analysis / report skill — READ-ONLY.** It produces findings and a consolidation
> proposal for human review; it NEVER edits the repository. It returns the report
> (offer to persist it only when the human asks). It does **not** replace the repo's
> conformance skills — it **reuses** them for their domains.

You audit the WHOLE repository's documentation for consistency, coverage, and
usability across contributor roles, and propose **at most three** consolidation moves.

## 1. Scope — what counts as "documentation"

Discover the doc surface; do not assume a fixed list. Enumerate with
`git ls-files '*.md' '*.mdx' 'AGENTS*' 'CLAUDE*' '*.adoc'` plus a glob sweep, then group:

- **Root governance/onboarding:** `README.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `AGENTS.md`, `CLAUDE.md`, `docs/EXTENDING.md`, `LICENSE`, any `CODE-HEALTH-*` /
  status / report files, `CHANGELOG`/release-please output.
- **`docs/arc42/`:** the arc42 sections `01_…`–`12_…` (introduction & goals,
  constraints, context, solution strategy, building blocks, runtime, deployment,
  crosscutting, decisions, quality, risks, glossary).
- **`docs/`:** user stories (`docs/user-stories/*-mvp.md`), any design notes. The
  `docs/` directory also holds a built demo (`docs/index.html`, `docs/assets/**`,
  `docs/sample.bpmn`) — that is generated output, **not** documentation; exclude it.
- **Per-package & example docs:** `extension/README.md`, `examples/*/README.md`.
- **Embedded process docs:** `skills/**/SKILL.md` + `skills/README.md`, the agent
  pointer files under `.github/` (`copilot-instructions.md`,
  `instructions/*.instructions.md`, `prompts/*.prompt.md`), and process-bearing
  comments in `package.json` scripts, `release-please-config.json`, `.githooks/**`,
  `.vscode/tasks.json`, and CI workflows under `.github/workflows/`.

Exclude `node_modules/`, build/`dist/` output, the `docs/` demo bundle, and any
vendored third-party docs. Do not audit generated files.

## 2. The audit matrix — five lenses × three concerns

Evaluate each role against each concern. Every finding is tagged with its
`(role, concern)`. Read with that role's questions in mind:

- **Maintainer** — *development:* are the branching/PR/commit-scope/versioning rules
  complete and internally consistent (`CONTRIBUTING.md` ↔ `AGENTS.md` ↔
  `release-please-config.json` ↔ CI)? Are the conformance layers described the same
  way everywhere (bpmnlint / moddle roundtrip / XSD core / package conventions)?
  *release/publishing:* who owns releases; is the linked-version lockstep across
  `terminology` (and the private `demo`) stated once and consistently? *usage:* can a new
  maintainer find "how we work" on one path without contradictions?
- **Library consumer (downstream developer)** — *development:* can I install, import
  the ESM entry points, wire the moddle descriptor and properties-panel provider, and
  run the example without guessing? Are commands copy-pasteable and current
  (`npm install --legacy-peer-deps`, the `check:*`/`verify` scripts)? Are the
  `term:` prefix and namespace URI documented to match the moddle
  descriptors? *release/publishing:* is the GitHub Packages registry/scope install
  story (`@forschungsgruppe-digital-health/*`, `https://npm.pkg.github.com`) clear?
  *usage:* is there one obvious entry point and an accurate doc map?
- **Technical project management (TPM)** — *development:* is "planned vs. where we
  stand" visible (MVP user stories vs. shipped extensions)? *release/publishing:*
  package status, blockers, owners, what is published vs. WIP. *usage:* can a
  non-engineer reviewer understand scope and status quickly and is it consistent
  across README ↔ ARCHITECTURE ↔ user stories?
- **Release / ops (publisher)** — *development:* are the publish/registry/auth and
  git-hook setup docs sufficient to release (`prepare` → `core.hooksPath`,
  `npm run verify`, release-please, `publishConfig.registry`)? *release/publishing:*
  version-lockstep procedure, peer-range agreement across packages, what CI gates a
  tag. *usage:* are release invariants (a breaking moddle change = MAJOR; descriptor
  files need human sign-off) stated where a releaser looks?
- **Security & data** — *development:* is the synthetic-data-only rule and the
  clinical-PII sensitivity documented and matched by the examples (obviously
  artificial content, no real patient data)? *release/publishing:* the
  clinical-data-in-`<extensionElements>` boundary (never `bpmn:`/`bpmndi:`, never core
  structure changes). *usage:* is the healthcare-context caveat visible where a
  consumer first looks? (Check doc-vs-reality; flag any realistic-looking patient data
  in committed `.bpmn`/JSON/examples.)

## 3. What to detect

- **Inconsistencies** — two docs that contradict; status/version/date drift (e.g. a
  README that disagrees with `docs/ARCHITECTURE.md` or the user stories); stale claims (a
  doc names a package, script, file, moddle prefix/namespace URI, or convention that no
  longer matches the repo — e.g. a script renamed in `package.json`, a prefix that
  differs from the moddle descriptor `prefix`, a peer range that diverged); broken or
  wrong links; duplicated content that has *diverged* between copies (e.g. the
  conformance-layer table in `AGENTS.md` vs. `skills/bpmn-conformance/SKILL.md`);
  terminology that shifts meaning.
- **Gaps** — a concern a role needs but no doc covers adequately (e.g. no GitHub
  Packages install/auth instructions for a consumer; no release runbook; an
  undocumented but required setup step).
- **Missing parts** — a doc exists but omits a section its readers need (e.g. a
  package `README.md` without an import example; an arc42 decision section without
  consequences; a README without a doc map).
- **Broken links & poor connectivity** — **every** relative Markdown link and
  `#anchor` must resolve to an existing file / heading; flag broken or wrong targets
  (this is a required mechanical pass — see §4, step 2). Also flag **orphan docs** (no
  inbound link from any other doc and not reachable from the README's navigation) and
  **missing cross-references** between docs that clearly relate but don't link each
  other (e.g. a user story not linked from the package it specifies; an arc42 section
  not linked from `docs/ARCHITECTURE.md`; a deep doc with no "back to index" link; a skill
  not surfaced in `skills/README.md`). Goal: the docs form ONE navigable, connected
  web, not islands.

**Verification rule (critical):** before flagging a doc claim as stale or wrong, verify
it against the live repo (code, `package.json` scripts, the moddle descriptors,
`release-please-config.json`, `git`, open PRs) — recalled or cross-doc "facts" may be
outdated. If you cannot verify, mark the finding **UNVERIFIED**, do not assert it.
Always cite evidence as `file:line`.

## 4. How to run it — orchestrate, don't reinvent

1. **Enumerate** the doc surface (§1) and skim each doc's purpose/owner/last-updated.
2. **Verify links mechanically + build the doc graph (always run this).** Extract every
   relative link and `#anchor` from every doc; check each target resolves (file exists;
   heading slug exists). Model docs as a graph (node per doc, edge per link) to find
   **broken links** and **orphan docs** (no inbound edge, unreachable from the README).
   It is cheap to script — e.g.:
   ```bash
   python3 - <<'PY'
   import re, os, subprocess
   files=[f for f in subprocess.check_output(
            ["git","ls-files","*.md","AGENTS.md","CLAUDE.md"]).decode().split()
          if "node_modules" not in f and not f.startswith("docs/assets")]
   L=re.compile(r'\]\(([^)]+)\)'); broken=[]
   for f in files:
       for t in L.findall(open(f,encoding="utf-8").read()):
           if t.startswith(("http","mailto:","#","tel:")): continue
           p=t.split("#")[0].split("?")[0]
           if p and not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(f),p))): broken.append((f,t))
   print("BROKEN:",*broken,sep="\n") if broken else print("no broken relative links")
   PY
   ```
   Feed broken links + orphans into the report (§5.C-links).
3. **Run the five role lenses** as independent passes so each perspective stays
   unbiased. Each returns structured findings
   `{role, concern, type, severity, evidence(file:line), note}`.
4. **Reuse the repo's own skills for their domains — do not duplicate them:**
   - `skills/bpmn-conformance` → the canonical description of the four check layers
     (bpmnlint / moddle roundtrip / XSD core / package conventions) and their
     blocking/informational status; compare doc claims against it (and against the
     `package.json` scripts) rather than re-deriving.
   - `skills/moddle-extension-review` → whether docs describe the `term:`
     moddle types, prefixes, and namespace URIs as the descriptors actually define them
     (`extension/src/moddle/*.json`).
   - `skills/bpmn-naming-publishing` → whether the publishing/naming docs match the
     enforced conventions (scope prefix, ESM, license, entry points, peer deps, GitHub
     Packages registry). Run `npm run check:packages` only if a doc claim needs it.
   If a deep single-domain analysis is warranted, defer to that skill and cite it.
5. **Synthesize centrally:** dedupe overlapping findings, rank by severity ×
   role-impact, and **adversarially verify** every high-severity finding against source
   before reporting.
6. **Derive the consolidation proposal** (§5.D) from the confirmed findings.

## 5. Output — the report (return it; do not write files)

- **A. Executive summary** — one paragraph + a doc-health snapshot (what is solid vs.
  at risk), readable by a non-engineer.
- **B. Findings table** — `Role | Concern | Type (inconsistency/gap/missing) | Severity
  (blocker/concern/nit) | Evidence (file:line) | Note`. Mark UNVERIFIED items explicitly.
- **C. Coverage map** — for each `role × concern`, state present / partial / absent.
- **C-links. Connectivity & navigability** — (1) **broken links** (each with `file:line`
  and the correct target); (2) **orphan docs** (no inbound link / unreachable from the
  README); (3) **proposed links to add** — a concrete `from-doc → to-doc` list (with the
  one-line reason) that would connect related docs into one navigable web (e.g. link
  each user story from the package README it specifies; link each arc42 section from
  `docs/ARCHITECTURE.md`; add a "back to index" link to deep docs; surface every skill in
  `skills/README.md`; cross-link `AGENTS.md` ↔ `CONTRIBUTING.md` ↔ the conformance
  skills). Read-only: **propose** the links; do not write them. If there are no broken
  links and the graph is well-connected, say so.
- **D. Consolidation proposal — AT MOST 3 suggestions.** Each: *what* to merge / split /
  retire / promote-to-canonical; *why* (which findings it resolves); *affected files*;
  rough *effort*; and *risks*. Order by impact. If fewer than three are warranted, give
  fewer — **do not pad to three.**

## 6. Constraints (hard)

- **MAX 3 consolidation suggestions.** Quality and impact over quantity.
- **Read-only.** Never Edit/Write. Provide the report; offer to persist it only on request.
- **Evidence-based.** Cite `file:line`; never fabricate a doc, a link, or a finding;
  mark uncertainty as UNVERIFIED.
- **Verify before flagging** (see §3) — a recalled fact is not evidence.
- **Respect review boundaries.** Moddle descriptor files
  (`extension/src/moddle/*.json`) require human sign-off, and a renamed/removed type
  or property is a breaking (MAJOR) change. You may report doc issues touching them but
  must only *propose* — never change them — and note that human review applies.

## 7. Edge cases (avoid false positives)

- **Intentional layering is not duplication.** A lean `README.md` that points to
  `docs/ARCHITECTURE.md`/`CONTRIBUTING.md` for depth is good information architecture — do
  not flag the overlap.
- **Single-source skills are not "duplicated."** `skills/<name>/SKILL.md` is the one
  source; the `.github/` and `.claude`/`.agents` pointer files reference it by design.
  Flag drift only if a pointer file *copies and then diverges from* a skill body, not
  its existence.
- **Marked historical / report docs are not "stale."** A dated point-in-time report
  (e.g. a `CODE-HEALTH-*` snapshot) with an explicit date/scope is correct as-is; check
  for the marker before flagging. Flag only *unmarked* stale content.
- **Audience ≠ duplication.** Human docs (`README`/`CONTRIBUTING`) and agent context
  (`AGENTS.md`/`CLAUDE.md`) overlap deliberately for different readers; flag drift
  between them, not their existence.
- **In-flight work.** A doc citing an open PR or a not-yet-published package on a
  feature branch is not "fabricated"; confirm against `gh`/branches and the
  release-please manifest before calling it wrong.

## Relationship to the repo's own skills

`docs-auditor` is an **orchestrator + synthesizer**, not a replacement. It reuses
`bpmn-conformance`, `moddle-extension-review`, and `bpmn-naming-publishing` for their
domains and folds their verdicts into a single cross-role documentation report.
Single-domain depth stays the specialist skill's job; this skill's unique value is the
role × concern matrix, the doc-vs-reality consistency check (docs vs. `package.json`
scripts, moddle descriptors, package/publishing conventions), and the small, prioritized
consolidation plan.

---
*Built on the open Agent Skills standard. Portable frontmatter: `name`, `description`.
Consumed by Claude Code (`.claude/skills`), Codex & Copilot (`.agents/skills`) — see
[`skills/README.md`](../README.md).*
