# @forschungsgruppe-digital-health/bpmn-extension-medical-terminology

Medical terminology for bpmn-js.

The package exports the `mt:` moddle descriptor, a bpmn-js properties-panel
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

For staged candidates, use the
[download and test checklist](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/dev/docs/RELEASE-TESTING.md).
For stable-release registry configuration and package access, see the
[compatibility and installation guide](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/blob/dev/docs-site/src/content/docs/compatibility.md#installing-it-today).

```bash
npm install @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

Yarn 4 cannot resolve this package's Simplifier-hosted dependencies. Use npm
to install the package.

The package resolves its FHIR terminology dependencies directly from Simplifier;
no additional npm registry configuration is required for those dependencies.

Medical terminology data is stored only in `bpmn:extensionElements` under the
`mt:` namespace.

## Terminology licences

No terminology server is preconfigured. Without configuration the package
offers only its bundled code systems (HL7 Terminology, IHE XDS, KDL) and
contacts no server. SNOMED CT, LOINC, ICD-10-GM, OPS, and ATC become available
once you set `serverConfig.fhirBaseUrl` to a terminology server you are
licensed to use, and, for SNOMED CT, `snomedConfig.edition` to the edition your
licence covers (for example `11000274103`, German National Edition):

```js
createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl: 'https://terminology.example.org/fhir' },
  snomedConfig: { edition: '11000274103' }
});
```

The built-in FHIR providers pin no release: the server answers from its current
release, and each coding stores the version the server reports. The `atc`
provider uses the German ATC-GM (`http://fhir.de/CodeSystem/bfarm/atc`). For a
worked example against a FHIR terminology server, SNOMED CT, authentication and
troubleshooting, see
[Connecting a terminology server](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/terminology-server/).

The MIT License covers only this package's code. You need your own licences for
the terminologies you use (SNOMED CT: Affiliate Licence, in Germany via
BfArM/MLDS; LOINC: <https://loinc.org/license>; ICD-10-GM and OPS: the BfArM
terms; ATC-GM: the WIdO and BfArM terms) and must show the publishers' notices
in your application. A public terminology server has its own terms of use as
well. [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) lists every bundled
source with its terms, and the notices to show.


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

The package ships no SNOMED CT, LOINC, ICD-10-GM, OPS or ATC content — no display
names, descriptions, hierarchies or excerpts. When a modeller selects a concept, the
extension stores its code system URI, version, code and display text in the BPMN file.
Using those terminologies in an application requires the licences of their respective
publishers: an Affiliate Licence for SNOMED CT (in Germany via BfArM/MLDS), the LOINC
Copyright Notice and License for LOINC, the BfArM terms of use for ICD-10-GM and OPS,
and the WIdO and BfArM terms for ATC-GM. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
and [Licensing](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/licensing/).
