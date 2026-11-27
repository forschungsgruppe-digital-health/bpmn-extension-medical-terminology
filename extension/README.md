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

To keep the load on a server low, the properties panel sends a search to a
terminology server only from three characters on and 300 ms after the last
keystroke (`serverSearchMinLength`, `serverSearchDebounceMs` of
`createTerminologyPropertiesPanelModule`); bundled code systems search at once.
SNOMED CT over FHIR searches active concepts only (`activeOnly=true`, overridable
through `snomedConfig.expandParameters`), and the Snowstorm transport needs an
explicit `snomedConfig.branch`. The default LOINC provider shows only LOINC term
codes (`codePattern`); set `fhirProviderOverrides: [{ id: 'loinc', codePattern: null }]`
to show Parts and Answers again.

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

The package ships no SNOMED CT, LOINC, ICD-10-GM, OPS or ATC code system — no display
names, descriptions or hierarchies from them, apart from the identifiers and the five
LOINC display names below. Its bundled HL7 Terminology uses a few of
their identifiers in HL7's own concepts: 13 HL7 code systems use the SNOMED CT concept
900000000000013009 (Synonym) 308 times as `designation.use`, and `v3-ActCode` contains
five LOINC codes with the display names given in HL7's code system. When a modeller
selects a concept, the extension stores its code system URI, version, code and display
text in the BPMN file. Files your application saves contain no terminology notices unless
your application adds them.
Using those terminologies in an application requires the licences of their respective
publishers: an Affiliate Licence for SNOMED CT (in Germany via BfArM/MLDS), the LOINC
Copyright Notice and License for LOINC, the BfArM terms of use for ICD-10-GM and OPS,
and the WIdO and BfArM terms for ATC-GM.

**SNOMED CT®** (the notice that clause 8.3.1 of the SNOMED CT Affiliate License
prescribes):

> This software includes SNOMED Clinical Terms® (SNOMED CT®) which is used by
> permission of the International Health Terminology Standards Development Organisation
> (IHTSDO). All rights reserved. SNOMED CT®, was originally created by The College of
> American Pathologists. "SNOMED" and "SNOMED CT" are registered trademarks of the
> IHTSDO.

The IHTSDO trades as SNOMED International. As BfArM permits, "This material" may read
"This software", "This application" or "This document", and the German version may be
used instead. Any use of SNOMED CT requires an Affiliate Licence (in Germany via
BfArM/MLDS).

**LOINC®:**

> This material contains content from LOINC (<http://loinc.org>). LOINC is copyright ©
> Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes
> (LOINC) Committee and is available at no cost under the license at
> <http://loinc.org/license>. LOINC® is a registered United States trademark of
> Regenstrief Institute, Inc.

**ICD-10-GM and OPS:** published by BfArM on behalf of the German Federal Ministry of
Health (BMG); ICD-10-GM builds on the WHO's ICD-10 and the Australian ICD-10-AM. Show
the source statements that the annex to BfArM's download conditions prescribes; they
are quoted in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

**ATC-GM:** WIdO is the author of the ATC-GM, and BfArM publishes it officially. Show
the mandatory WIdO/BfArM statement quoted in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

**KDL:** the bundled presets import the KDL code system (`dvmd.kdl.r4`), which DVMD e.V.
makes available under GPL-3.0-or-later (the package manifest declares none). The GPL
covers only the KDL content; this package's own code is MIT-licensed. A bundler copies
the KDL into your application together with the bundled presets. If you ship a bundle
that contains it, include the GPL text, the DVMD copyright and no-warranty notice, and a
pointer to the source. The notice to include is in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
and [Licensing](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/licensing/).
