/**
 * Reading and writing `term:Annotations` on BPMN business objects.
 *
 * These functions are the programmatic counterpart to the properties panel.
 * They operate directly on the moddle business object of a BPMN element, so
 * a caller that wants the change to be undoable must route it through the
 * bpmn-js command stack rather than calling {@link addAnnotation} directly.
 *
 * @module AnnotationHelper
 */

/**
 * A moddle element as produced by bpmn-moddle. bpmn-js publishes this type as
 * `any`, so the package declares its own minimal shape.
 *
 * @typedef {object} ModdleElement - Minimal shape shared by BPMN and terminology moddle elements.
 * @property {string} $type - Namespaced type name, for example `term:Annotation`.
 * @property {ModdleElement} [$parent] - Owning element, maintained by the model.
 */

/**
 * The moddle factory injected by bpmn-js as the `moddle` service.
 *
 * @typedef {object} Moddle - Factory used to create BPMN and terminology moddle elements.
 * @property {(type: string, properties?: object) => ModdleElement} create
 *   Creates a new element of the given namespaced type.
 */

/**
 * A single coded concept bound to a BPMN element.
 *
 * @typedef {object} TerminologyCoding - Coded concept persisted inside a terminology annotation.
 * @property {string} system - Code system URI, for example `http://snomed.info/sct`.
 * @property {string} code - The code within that system.
 * @property {string} [display] - Human-readable label for the code.
 * @property {string} [version] - Code system version the code was taken from.
 */

const DEFAULT_ANN_PREFIX = 'term-ann';
const ANN_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Find the first extension element of a given namespaced type.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @param {string} type - Namespaced type name, for example `term:Annotations`.
 * @returns {ModdleElement | undefined} The element, or `undefined` when the
 *   business object carries no `bpmn:ExtensionElements` or no match.
 * @category Internal helpers
 */
export function getExtensionElement(bo, type) {
  if (!bo.extensionElements) return undefined;
  return bo.extensionElements.values?.find(e => e.$type === type);
}

/**
 * Return the `term:Annotations` container of a BPMN element, if it has one.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @returns {ModdleElement | undefined} The container, or `undefined` when the
 *   element carries no annotations yet.
 * @category Annotations
 */
export function getAnnotationsContainer(bo) {
  return getExtensionElement(bo, 'term:Annotations');
}

/**
 * Read all annotations bound to a BPMN element.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @returns {ModdleElement[]} The `term:Annotation` elements, in document
 *   order. An element without annotations yields an empty array, never
 *   `undefined`.
 * @example
 * ```js
 * import { getAnnotations } from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
 *
 * const annotations = getAnnotations(element.businessObject);
 * for (const annotation of annotations) {
 *   console.log(annotation.id, annotation.codings?.length ?? 0);
 * }
 * ```
 * @category Annotations
 */
export function getAnnotations(bo) {
  const container = getAnnotationsContainer(bo);
  return container?.values || [];
}

/**
 * Collect the identifiers already taken by annotations on one element.
 *
 * Use it to seed {@link createId} when adding several annotations in a row
 * without re-reading the model between them.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @returns {string[]} Non-empty annotation identifiers, in document order.
 * @category Annotations
 */
export function getUsedIds(bo) {
  return getAnnotations(bo)
    .map(annotation => annotation.id)
    .filter(Boolean);
}

/**
 * Build the canonical deduplication key for a coding.
 *
 * The key is `system|code` with both parts trimmed. A coding missing either
 * part has no key and yields an empty string, which callers treat as
 * "not comparable" rather than as a key.
 *
 * @param {TerminologyCoding | undefined} coding - The coding to key.
 * @returns {string} `system|code`, or an empty string when either part is missing.
 * @category Internal helpers
 */
export function getCodingKey(coding) {
  const system = (coding?.system || '').trim();
  const code = (coding?.code || '').trim();

  if (!system || !code) {
    return '';
  }

  return `${system}|${code}`;
}

/**
 * Collect the coding keys already bound to one element.
 *
 * Used by the properties panel to mark search results that are already
 * present on the selected element.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @returns {string[]} Keys in {@link getCodingKey} form, with unkeyable
 *   codings dropped. Duplicates are preserved.
 * @category Annotations
 */
export function getUsedCodingKeys(bo) {
  return getAnnotations(bo).flatMap(annotation =>
    (annotation.codings || []).map(getCodingKey).filter(Boolean)
  );
}

/**
 * Test whether a string is acceptable as an annotation identifier.
 *
 * Accepts letters, digits, dot, underscore and hyphen, after trimming. The
 * restriction keeps identifiers usable as XML attribute values without
 * escaping.
 *
 * @param {string | undefined} id - Candidate identifier.
 * @returns {boolean} `true` when the trimmed value matches the allowed pattern.
 * @category Internal helpers
 */
export function isValidId(id) {
  return ANN_ID_PATTERN.test((id || '').trim());
}

/**
 * Mint an annotation identifier that does not collide with existing ones.
 *
 * Identifiers follow the pattern `term-ann-<n>`, counting up from 1 until an
 * unused value is found.
 *
 * @param {string[]} [existingIds] - Identifiers already in use. Pass the result
 *   of {@link getUsedIds} for the element being edited.
 * @returns {string} An identifier not present in `existingIds`.
 * @category Internal helpers
 */
export function createId(existingIds = []) {
  const normalizedBase = DEFAULT_ANN_PREFIX;
  const idsInUse = new Set(existingIds.filter(Boolean));

  let sequence = 1;
  let candidate = `${normalizedBase}-${sequence}`;

  while (idsInUse.has(candidate)) {
    sequence += 1;
    candidate = `${normalizedBase}-${sequence}`;
  }

  return candidate;
}

/**
 * Return the element's `bpmn:ExtensionElements`, creating it when absent.
 *
 * Mutates the business object. Callers that need undo support must perform
 * this through the bpmn-js command stack.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @param {Moddle} moddle - The moddle factory, injected by bpmn-js.
 * @returns {ModdleElement} The existing or newly created extension container.
 * @category Internal helpers
 */
export function ensureExtensionElements(bo, moddle) {
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] });
  }
  return bo.extensionElements;
}

/**
 * Return the element's `term:Annotations` container, creating it when absent.
 *
 * Creates the surrounding `bpmn:ExtensionElements` as well if needed, and
 * wires the parent links the model expects. Mutates the business object.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @param {Moddle} moddle - The moddle factory, injected by bpmn-js.
 * @returns {ModdleElement} The existing or newly created container.
 * @category Annotations
 */
export function ensureAnnotationsContainer(bo, moddle) {
  const extElements = ensureExtensionElements(bo, moddle);
  let container = getAnnotationsContainer(bo);
  if (!container) {
    container = moddle.create('term:Annotations', { values: [] });
    container.$parent = bo.extensionElements;
    extElements.values.push(container);
  }
  return container;
}

/**
 * Add one annotation to a BPMN element.
 *
 * Creates the `term:Annotations` container on first use. When no identifier is
 * supplied, one is minted with {@link createId}. Codings are created as
 * `term:Coding` children; an empty `version` is dropped rather than written as
 * an empty attribute.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @param {Moddle} moddle - The moddle factory, injected by bpmn-js.
 * @param {object} options
 * @param {string} [options.id] - Identifier for the new annotation. Minted when
 *   omitted or blank.
 * @param {string} [options.text] - Free-text note. Omitted from the model when falsy.
 * @param {TerminologyCoding[]} [options.codings] - Codes to bind.
 * @param {string[]} [options.existingIds] - Identifiers to avoid. Defaults to
 *   the identifiers already on `bo`.
 * @returns {ModdleElement} The created `term:Annotation` element.
 * @example
 * ```js
 * import { addAnnotation } from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';
 *
 * addAnnotation(element.businessObject, moddle, {
 *   text: 'Primary staging investigation',
 *   codings: [ {
 *     system: 'http://snomed.info/sct',
 *     code: '363679005',
 *     display: 'Imaging (procedure)'
 *   } ]
 * });
 * ```
 * @category Annotations
 */
export function addAnnotation(bo, moddle, { id, text, codings, existingIds }) {
  const container = ensureAnnotationsContainer(bo, moddle);
  const props = {
    id: (id || '').trim() || createId(
      existingIds || getUsedIds(bo)
    )
  };
  if (text) props.text = text;

  const annotation = moddle.create('term:Annotation', props);
  annotation.$parent = container;

  if (codings && codings.length > 0) {
    annotation.codings = codings.map(c => {
      const coding = moddle.create('term:Coding', {
        system: c.system,
        code: c.code,
        display: c.display,
        version: c.version || undefined
      });
      coding.$parent = annotation;
      return coding;
    });
  }

  if (!container.values) container.values = [];
  container.values.push(annotation);
  return annotation;
}

/**
 * Remove the annotation at a given position.
 *
 * Out-of-range indices and elements without a container are ignored, so the
 * call is safe against a stale index. Mutates the business object.
 *
 * @param {ModdleElement} bo - Business object of a BPMN element.
 * @param {number} index - Zero-based position in {@link getAnnotations} order.
 * @returns {void}
 * @category Annotations
 */
export function removeAnnotation(bo, index) {
  const container = getAnnotationsContainer(bo);
  if (container?.values && index >= 0 && index < container.values.length) {
    container.values.splice(index, 1);
  }
}
