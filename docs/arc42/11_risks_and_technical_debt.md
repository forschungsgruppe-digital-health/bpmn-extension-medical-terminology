# 11. Risks and Technical Debt

_Lists technically observable risks and debt. Likelihood, impact, and
prioritization require maintainer review._

## 11.1 Compatibility and schema risks

| ID | Item | Evidence / consequence | Suggested follow-up |
|---|---|---|---|
| R-1 | Renaming or removing a moddle type/property silently breaks consumers | `AGENTS.md`; serialized `term:` data depends on `clinical.json` | Require human sign-off, an ADR, and a MAJOR release; consider an automated descriptor diff |
| R-2 | The core BPMN XSD gate is informational by default | `tools/validate-xsd.sh`; standard XSD permits foreign extension content | Keep extension validation and moddle roundtrip as the authoritative extension checks; decide whether strict core validation should gate releases |
| R-3 | Unknown extension content is warning-level in normal roundtrip mode | `tools/moddle-roundtrip.mjs` | Run strict mode when validating an externally supplied descriptor or fixture |

## 11.2 Runtime and integration risks

| ID | Item | Evidence / consequence | Suggested follow-up |
|---|---|---|---|
| R-4 | Default SNOMED and FHIR providers depend on remote endpoints | `extension/src/config/terminology-config.js`; adapters | Define host-level proxy, authentication, timeout, retry, and offline behavior |
| R-5 | Browser CORS and remote availability can prevent searches | README and adapter transport design | Use a same-origin proxy or consumer-supplied `fetchFn`; document deployment expectations |
| R-6 | Eagerly bundled FHIR package resources increase startup and application size | ADR-0002; generated HL7 JSON resource | Revisit lazy loading or curated subsets without breaking zero-configuration defaults |
| R-7 | External terminology licensing and version selection are deployment concerns | package-backed FHIR resources and provider configuration | Maintain explicit package/version inventories and consumer governance |

## 11.3 Test and maintenance debt

| ID | Item | Evidence / consequence | Suggested follow-up |
|---|---|---|---|
| R-8 | The private demo has no dedicated unit-test script | `demo/package.json` | Keep integration smoke coverage in the build or add focused tests if demo behavior grows |
| R-9 | The package-convention tool intentionally checks only `extension/` | `tools/check-package-conventions.mjs` | Update the tool if another workspace becomes publishable |
| R-10 | Raw ESM publishing delegates compatibility to consumer bundlers and Node versions | `extension/package.json`; no build script | Keep peer/runtime support documented and test representative host versions |
| R-11 | Optional package discovery depends on bundler-visible JSON resources | `extension/src/vite/plugin.js`; ADR-0002 | Keep explicit package registration and clear missing-resource errors as supported paths; bundled defaults must not use this path |

## 11.4 Supply-chain and data risks

- Dependencies are installed from the lockfile in CI, but the repository's
  quality gate does not replace an organization-wide dependency, secret, or
  static-analysis program.
- Terminology package URLs and remote servers are external inputs and should be
  reviewed for provenance and licensing before a production release.
- BPMN fixtures are synthetic by rule; contributors must not replace them with
  real or realistic patient data.

## 11.5 Lifecycle

The package is pre-1.0 (`extension/package.json` currently reports `0.1.0`).
Public APIs and descriptor details therefore require compatibility review even
when SemVer permits evolution. The release process is automated, but the
decision whether a descriptor change is additive or breaking remains a human
responsibility.

---

[← Architecture index](../ARCHITECTURE.md) · [Previous](10_quality_requirements.md) · [Next →](12_glossary.md)
