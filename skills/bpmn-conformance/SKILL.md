---
name: bpmn-conformance
description: Validate a .bpmn file or a clinical extension change for BPMN 2.0 conformance before commit/PR. Use when editing files under examples/ or docs/, the moddle descriptors (extension/src/moddle/*.json), or any .bpmn. Runs bpmnlint (structure and configured terminology rules), the moddle roundtrip (extension data), and XSD core validation, then explains the results.
---

# BPMN conformance

The decision is made by deterministic CLI tools, not by you. Your job is to **run
them, read their reports, and explain failures** — never to hand-wave a pass.

## Run

From the repo root:

```bash
npm run check:conformance      # bpmnlint + moddle roundtrip + XSD core (the gate)
```

Or individually:

```bash
npm run lint:bpmn              # BPMN 2.0 plus configured terminology rules
npm run check:roundtrip        # lossless/stable serialization of term: data
node tools/moddle-roundtrip.mjs --strict   # promote roundtrip warnings to failures
npm run check:xsd              # BPMN-core XSD validation (informational)
bash tools/validate-xsd.sh --strict        # fail on a schema-invalid core
```

Scope to specific files by appending paths, e.g.
`node tools/moddle-roundtrip.mjs path/to/file.bpmn`.

## Division of labour (do not conflate these)

| Layer | Tool | Checks | Blocking? |
|---|---|---|---|
| Structure and extension rules | `bpmnlint` | disconnected nodes, start/end events, implicit splits, dangling refs, and configured `term:` rules | **yes** |
| Extension data | moddle roundtrip | `term:` content survives parse+serialize, stable output | **yes** on instability; warnings non-fatal (use `--strict`) |
| Standard core | XSD (`xmllint`) | BPMN core matches OMG BPMN20.xsd | **no** (informational) |

## Interpreting results

- **bpmnlint error** → a real structural defect. Fix the diagram.
- **roundtrip not stable (`stable=false`)** → serialization is not idempotent — a
  real bug; investigate the moddle model or the file. Always blocking.
- **roundtrip warning `unparsable content <term:…>`** → the file uses an extension
  element the moddle model does **not** define (e.g. `term:target`). That content
  is silently dropped on save (data loss). Decide: extend the moddle descriptor, or
  remove the stale content. Non-fatal by default; `--strict` makes it block.
- **XSD `fails to validate`** → a BPMN-core issue (e.g. a `dataInputAssociation`
  missing its `targetRef`). Informational because the standard XSD cannot see
  extension content (it passes via `processContents="lax"`). A green XSD does **not**
  mean the extensions are valid — that is the roundtrip's verdict.

Never claim "XSD green ⇒ extensions valid". State which layers passed.
