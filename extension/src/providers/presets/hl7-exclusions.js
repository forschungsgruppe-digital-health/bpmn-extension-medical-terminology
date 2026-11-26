// Third-party code systems in hl7.terminology.r4.
//
// hl7.terminology.r4 is CC0-1.0 for HL7's own content, but it also carries a
// few code systems whose content belongs to third parties. Those are not
// redistributed: the bundled preset (tools/generate-hl7-code-systems.mjs),
// default build-time discovery and the default runtime registry filter leave
// them out. Integrators who need them must license them from the owner and
// serve them from their own terminology server, or select the package
// explicitly.
//
// This module has no imports so that the Node generator in tools/ can load it.

/**
 * Canonical URLs of the excluded code systems, with the reason for each.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EXCLUDED_HL7_CODE_SYSTEMS = Object.freeze({
  'http://www.ada.org/snodent':
    'SNODENT, American Dental Association; marked as Third Party IP',
  'http://terminology.hl7.org/CodeSystem/ADAUniversalToothDesignationSystem':
    'American Dental Association; no licence statement',
  'http://terminology.hl7.org/CodeSystem/ADAToothSurfaceCodes':
    'American Dental Association; no licence statement',
  'http://terminology.hl7.org/CodeSystem/v3-HealthcareProviderTaxonomyHIPAA':
    'NUCC Health Care Provider Taxonomy; marked as Third Party IP, retired',
  'http://terminology.hl7.org/CodeSystem/color-names':
    'CSS color names, World Wide Web Consortium; W3C licence, not HL7 content',
  'http://terminology.hl7.org/CodeSystem/color-rgb':
    'CSS RGB colors, World Wide Web Consortium; W3C licence, not HL7 content'
});

/** Text HL7 puts in `CodeSystem.copyright` for content owned by a third party. */
export const THIRD_PARTY_IP_MARKER = '("Third Party IP")';

/**
 * Reason why an hl7.terminology.r4 code system must not be redistributed.
 *
 * Checks the URL list first, then the Third Party IP marker in
 * `CodeSystem.copyright`.
 *
 * @param {{ url?: unknown, copyright?: unknown } | null | undefined} codeSystem
 * @returns {string | null} The reason, or `null` when the code system may be redistributed.
 */
export function getHl7ExclusionReason(codeSystem) {
  const url = codeSystem?.url;

  if (typeof url === 'string' && Object.prototype.hasOwnProperty.call(EXCLUDED_HL7_CODE_SYSTEMS, url)) {
    return EXCLUDED_HL7_CODE_SYSTEMS[url];
  }

  if (String(codeSystem?.copyright || '').includes(THIRD_PARTY_IP_MARKER)) {
    return 'marked as Third Party IP in CodeSystem.copyright';
  }

  return null;
}
