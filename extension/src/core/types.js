/**
 * Core type definitions and constants for the terminology package.
 *
 * FHIR R4 types from @types/fhir are used for JSDoc annotations.
 * When migrating to R5, update the fhir4.* references to fhir5.*.
 *
 * @module types
 */

// ─── JSDoc Type Aliases (from @types/fhir) ──────────────────
//
// These typedefs make fhir4 types available for JSDoc throughout
// the package. When switching to R5, change 'fhir4' to 'fhir5'.

/**
 * A FHIR R4 Coding — corresponds to a single code+system pair.
 * Our internal Concept type is a superset of fhir4.Coding with
 * additional provider-specific properties.
 *
 * @typedef {import('@types/fhir').fhir4.Coding} FhirCoding
 */

/**
 * A FHIR R4 CodeableConcept — wraps one or more Codings.
 * @typedef {import('@types/fhir').fhir4.CodeableConcept} FhirCodeableConcept
 */

/**
 * A FHIR R4 ValueSet — used by ValueSet/$expand responses.
 * @typedef {import('@types/fhir').fhir4.ValueSet} FhirValueSet
 */

/**
 * A FHIR R4 ValueSet expansion contains entry.
 * @typedef {import('@types/fhir').fhir4.ValueSetExpansionContains} FhirValueSetExpansionContains
 */

/**
 * A FHIR R4 CodeSystem — used by CodeSystem/$lookup responses.
 * @typedef {import('@types/fhir').fhir4.CodeSystem} FhirCodeSystem
 */

/**
 * A FHIR R4 Parameters resource — used for $lookup responses.
 * @typedef {import('@types/fhir').fhir4.Parameters} FhirParameters
 */

/**
 * A FHIR R4 Bundle — used when searching for CodeSystem resources.
 * @typedef {import('@types/fhir').fhir4.Bundle} FhirBundle
 */

// ─── Internal Types ─────────────────────────────────────────

/**
 * A terminology concept. Aligns with fhir4.Coding but includes
 * additional properties for provider-specific metadata.
 *
 * To convert to a FHIR Coding:
 *   const /** @type {FhirCoding} *\/ coding = { system: c.system, code: c.code, display: c.display, version: c.version };
 *
 * @typedef {Object} Concept
 * @property {string} code - Code value (maps to fhir4.Coding.code)
 * @property {string} display - Display text (maps to fhir4.Coding.display)
 * @property {string} system - CodeSystem URI (maps to fhir4.Coding.system)
 * @property {string} [version] - Code system version (maps to fhir4.Coding.version)
 * @property {boolean} [active] - Whether the concept is active
 * @property {Record<string, unknown>} [properties] - Provider-specific extras
 */

/**
 * @typedef {Object} SearchResult
 * @property {Concept[]} concepts
 * @property {number} total
 */

/**
 * @typedef {Object} SearchOptions
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {string} [language]
 * @property {boolean} [activeOnly]
 * @property {Record<string, string>} [filter] - Provider-specific filters
 */

/**
 * @typedef {Object} TerminologyCapabilities
 * @property {boolean} search
 * @property {boolean} lookup
 * @property {boolean} hierarchy
 * @property {boolean} validate
 */

/**
 * @typedef {Object} ConnectionConfig
 * @property {string} baseUrl
 * @property {{ type: 'Bearer'|'Basic'|'ApiKey', token?: string, credentials?: string, apiKey?: string, headerName?: string }} [auth]
 * @property {typeof fetch} [fetchFn]
 * @property {number} [timeoutMs]
 * @property {Record<string, string>} [headers]
 */
