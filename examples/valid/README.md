# Valid BPMN fixtures

These BPMN files contain only synthetic data and are used by the conformance
checks.

| File | Purpose |
|---|---|
| `minimal-valid.bpmn` | Small, structurally valid BPMN fixture |
| `lung-cancer-staging.bpmn` | Synthetic clinical workflow without terminology extensions |
| `lung-cancer-staging-annotated.bpmn` | Synthetic clinical workflow with `mt:` terminology annotations |

The terminology-annotated demo fixture is
[`demo/public/sample.bpmn`](../../demo/public/sample.bpmn). It uses the
`mt:` namespace only.

## Terminology notices

`lung-cancer-staging-annotated.bpmn` and
[`demo/public/sample.bpmn`](../../demo/public/sample.bpmn) contain individual
codes with their display texts from SNOMED CT (German National Edition, release
`http://snomed.info/sct/11000274103/version/20260815`), LOINC, OPS, ATC-GM, the
KDL and the IHE Deutschland XDS value sets, for illustration. They contain no
ICD-10-GM codes. These terminologies remain under their publishers' licences;
using SNOMED CT requires an Affiliate Licence (in Germany via BfArM/MLDS).

Both files carry the SNOMED CT, LOINC, OPS, ATC-GM and KDL notices as an XML
comment. bpmn-js drops XML comments when it imports a diagram. The demo adds the
notices back to its XML view and download, but a diagram saved by another
application contains them only if that application adds them; include the
notices yourself when you pass such a file on. See
[Licensing and terminology rights](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/licensing/)
and [`extension/THIRD_PARTY_NOTICES.md`](../../extension/THIRD_PARTY_NOTICES.md).
