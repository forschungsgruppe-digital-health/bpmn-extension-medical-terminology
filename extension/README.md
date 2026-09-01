# @forschungsgruppe-digital-health/terminology

Medical terminology for bpmn-js.

The package exports the `term:` moddle descriptor, a bpmn-js properties-panel
module, terminology providers, default service factories, and a Vite
package-discovery plugin. See the
[repository README](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology#readme)
for setup and integration examples.

Package discovery is bundler-neutral. For non-Vite applications, the bundled
`fdh-terminology-discover` CLI can generate a plain ESM package registry, which
is then passed through `packageDiscovery`. The CLI is optional: applications
can also import CodeSystem JSON directly and provide a `packages` object. See
the repository README for the CLI, Vite filtering, and manual-import examples.

Install the package with npm:

```bash
npm install @forschungsgruppe-digital-health/terminology
```

The package resolves its FHIR terminology dependencies directly from Simplifier;
no additional npm registry configuration is required for those dependencies.

Medical terminology data is stored only in `bpmn:extensionElements` under the
`term:` namespace.


## Funding

This work is part of **MiHUB – Medical Informatics Hub**, a Digital Progress Hub
(Digitaler FortschrittsHub Gesundheit) of the German Medical Informatics
Initiative (MII).

MiHUB is funded by the German Federal Ministry of Research, Technology and Space
(Bundesministerium für Forschung, Technologie und Raumfahrt, BMFTR) under grant
number **01ZZ2506A** (01/2026 – 12/2029). The responsibility for the content of
this publication lies with the authors.

- Project: <https://mihubx.de/mihub/>
- Funding record: [Förderkatalog des Bundes, FKZ 01ZZ2506A](https://foerderportal.bund.de/foekat/jsp/SucheAction.do?actionMode=view&fkz=01ZZ2506A)
- Funder: BMFTR ([ROR 04pz7b180](https://ror.org/04pz7b180))

<details>
<summary>Förderhinweis (deutsch)</summary>

Das diesem Repository zugrunde liegende Vorhaben wurde mit Mitteln des
Bundesministeriums für Forschung, Technologie und Raumfahrt (BMFTR) unter dem
Förderkennzeichen 01ZZ2506A gefördert. Die Verantwortung für den Inhalt dieser
Veröffentlichung liegt bei den Autor:innen.

</details>


## License

MIT © Technische Universität Dresden, Forschungsgruppe Digital Health.
See the [repository LICENSE](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/main/LICENSE).

### bpmn.io watermark

This extension targets [bpmn.io](https://bpmn.io). bpmn-js is a peer dependency and
is not distributed with this package. bpmn-js is published under MIT terms with one
additional condition: the code that renders the bpmn.io watermark must not be removed
or altered, and the watermark must stay fully visible and unobstructed in any website
or application that uses it. See <https://bpmn.io/license/>.

### Terminology content

This extension stores code system identifiers and codes only. It ships no SNOMED CT,
LOINC or ICD-10 content — no display names, descriptions, hierarchies or excerpts.
Using those terminologies in an application requires the licenses of their respective
publishers: an Affiliate License via BfArM/MLDS for SNOMED CT, the LOINC Copyright
Notice and License for LOINC, and the BfArM terms of use for ICD-10-GM.
