/**
 * FHIR Version Configuration for the terminology package.
 *
 * Centralises the FHIR version used for terminology operations
 * (ValueSet/$expand, CodeSystem/$lookup). Currently targets FHIR R4 (4.0.1).
 *
 * The @types/fhir library provides separate type namespaces per version:
 *   - fhir4  (R4 4.0.1)
 *   - fhir5  (R5 5.0.0)
 *
 * JSDoc annotations throughout this package reference fhir4.* types.
 * When switching to R5, change these references to fhir5.*.
 *
 * @module fhir-version
 */

/**
 * @typedef {'R4' | 'R5'} FhirVersionCode
 */

/**
 * @typedef {Object} FhirVersionConfig
 * @property {FhirVersionCode} version - FHIR version identifier
 * @property {string} fhirRelease - Full FHIR release string (e.g. '4.0.1')
 * @property {string} mimeType - FHIR content type for Accept/Content-Type headers
 * @property {string} expandOperation - Operation URL for ValueSet expansion
 * @property {string} lookupOperation - Operation URL for CodeSystem lookup
 */

/** @type {FhirVersionConfig} */
export const FHIR_R4 = Object.freeze({
  version: 'R4',
  fhirRelease: '4.0.1',
  mimeType: 'application/fhir+json',
  expandOperation: 'ValueSet/$expand',
  lookupOperation: 'CodeSystem/$lookup'
});

/** @type {FhirVersionConfig} */
export const FHIR_R5 = Object.freeze({
  version: 'R5',
  fhirRelease: '5.0.0',
  mimeType: 'application/fhir+json',
  expandOperation: 'ValueSet/$expand',
  lookupOperation: 'CodeSystem/$lookup'
});

/**
 * Active FHIR version used by this package.
 *
 * To switch versions:
 * 1. Change this assignment to FHIR_R5
 * 2. Update JSDoc type references from fhir4.* to fhir5.*
 * 3. Run the full test suite to verify compatibility
 *
 * @type {FhirVersionConfig}
 */
export const ACTIVE_FHIR_VERSION = FHIR_R4;

/**
 * FHIR mime type for HTTP Accept and Content-Type headers.
 * @type {string}
 */
export const FHIR_MIME_TYPE = ACTIVE_FHIR_VERSION.mimeType;
