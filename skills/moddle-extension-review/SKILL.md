---
name: moddle-extension-review
description: Review a bpmn-moddle extension descriptor (packages/*/src/moddle/*.json) against bpmn.io conventions before merging. Use when adding or changing a moddle type, property, namespace, or prefix. Checks namespace separation, Element superClass, isAttr/isMany, and XSD-extension risks.
---

# Moddle extension review

Reviews the JSON moddle descriptors that define how clinical data serializes into
BPMN `<extensionElements>`. Pair this with `bpmn-conformance` (the roundtrip tool
proves the descriptor actually round-trips the example files losslessly).

## Inputs

- `packages/terminology/src/moddle/clinical.json` (`term:` / `https://clinical-bpmn.org/terminology/v1`)
- `packages/fhir-mapping/src/moddle/fhir-mapping.json` (`fhirmap:` / `https://clinical-bpmn.org/fhir-mapping/v1`)

## Checklist (verify each, cite the line)

1. **Header** — `name`, `uri`, `prefix` all present. The `uri` is a stable,
   versioned namespace URL; the `prefix` is unique and is **never** `bpmn`/`bpmndi`.
2. **Extension elements hook in correctly** — every type meant to live inside
   `<extensionElements>` declares `"superClass": ["Element"]`. Types that add an
   attribute to an existing BPMN element use `"extends": ["bpmn:FlowNode", …]`.
3. **Property kinds** — attributes use `"isAttr": true`; repeating children use
   `"isMany": true`. A repeating child must reference its own declared type.
4. **Namespace separation** — clinical data carries the custom prefix, never
   `bpmn:`. Visual data belongs in `bpmndi`, not in these extensions.
5. **No structural changes to the BPMN core** — extensions only add attributes/
   nested elements; they never redefine standard elements.
6. **Top-level extension risk** — flag any attempt to extend `bpmn:definitions`
   itself: the standard XSD does not cleanly allow top-level `extensionElements`
   (known OMG issue), so it will not XSD-validate.
7. **Drift** — anything used in `docs/`, `examples/`, the README, or the
   properties panel must be defined here. (The roundtrip tool reports
   `unparsable content <term:…>` for undefined-but-used elements.)

## Prove it round-trips

```bash
npm run check:roundtrip                       # all files, warnings non-fatal
node tools/moddle-roundtrip.mjs --strict      # fail on any dropped extension content
```

If the descriptor is a **breaking** schema change (renamed/removed type or
property), that is a MAJOR version bump per CONTRIBUTING.md — say so explicitly.
Descriptor files under review require human sign-off; do not merge autonomously.
