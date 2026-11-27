const HOST_SEPARATORS = Object.freeze({ de: ' und ', en: ' and ' });

/**
 * Show the variant of the demo's banner and licence dialog that matches the
 * terminology server this build contacts.
 *
 * The page carries both variants: elements marked `data-server-mode="none"`
 * (visible by default) and `data-server-mode="configured"` (hidden by
 * default). Inside the configured variant:
 *
 * - `[data-demo-server-host]` receives every contacted host;
 * - `[data-demo-fhir]` is shown only with a FHIR server, and
 *   `[data-demo-fhir-host]` receives its host;
 * - `[data-demo-snomed]` is shown only when SNOMED CT is configured;
 *   `[data-demo-snomed-host]`, `[data-demo-snomed-edition]` and
 *   `[data-demo-snomed-release]` receive its host, edition module id and
 *   release; `[data-demo-snomed-edition-info]`,
 *   `[data-demo-snomed-release-info]` and `[data-demo-snomed-snowstorm]`
 *   are shown only when that detail applies;
 * - `[data-demo-operator="<host>"]` is shown only when this build contacts
 *   exactly that host;
 * - `[data-demo-mode="local"]` is shown for a server configured at build time
 *   (local previews), `[data-demo-mode="opt-in"]` for the public demo's live
 *   search after the visitor's consent (`description.optIn`);
 * - `[data-demo-hosting]` (the notice on hosting the published demo) is shown
 *   in the serverless variant and while the live search is on, and hidden only
 *   for a server configured at build time (local previews).
 *
 * Values are written with `textContent` only. Several hosts are joined with
 * "and", or "und" inside a German text (`[data-i18n][lang="de"]`).
 *
 * @param {ParentNode} root - Document or element that holds the notices.
 * @param {(ReturnType<typeof import('./terminology-config.js').describeDemoTerminologyServer> & { optIn?: boolean }) | null} description
 */
export function applyServerNotice(root, description) {
  if (!root) {
    return;
  }

  const configured = Boolean(description);
  const optIn = Boolean(description?.optIn);
  const fhirHost = description?.fhirBaseUrl ? description.fhirHost : null;
  const snomed = description?.snomed ?? null;
  const hosts = [ ...new Set([ fhirHost, snomed?.host ].filter(Boolean)) ];

  setHidden(root, '[data-server-mode="none"]', configured);
  setHidden(root, '[data-server-mode="configured"]', !configured);

  for (const node of root.querySelectorAll('[data-demo-server-host]')) {
    const language = node.closest('[data-i18n]')?.getAttribute('lang');

    node.textContent = hosts.join(HOST_SEPARATORS[language] ?? HOST_SEPARATORS.en);
  }

  setHidden(root, '[data-demo-mode="local"]', !configured || optIn);
  setHidden(root, '[data-demo-mode="opt-in"]', !configured || !optIn);
  setHidden(root, '[data-demo-hosting]', configured && !optIn);

  setHidden(root, '[data-demo-fhir]', !fhirHost);
  setText(root, '[data-demo-fhir-host]', fhirHost ?? '');

  setHidden(root, '[data-demo-snomed]', !snomed);
  setText(root, '[data-demo-snomed-host]', snomed?.host ?? '');
  setHidden(root, '[data-demo-snomed-edition-info]', !snomed?.edition);
  setText(root, '[data-demo-snomed-edition]', snomed?.edition ?? '');
  setHidden(root, '[data-demo-snomed-release-info]', !snomed?.edition || !snomed?.editionVersion);
  setText(root, '[data-demo-snomed-release]', snomed?.editionVersion ?? '');
  setHidden(root, '[data-demo-snomed-snowstorm]', snomed?.transport !== 'snowstorm');

  for (const node of root.querySelectorAll('[data-demo-operator]')) {
    node.hidden = !hosts.includes(node.getAttribute('data-demo-operator'));
  }
}

function setHidden(root, selector, hidden) {
  for (const node of root.querySelectorAll(selector)) {
    node.hidden = hidden;
  }
}

function setText(root, selector, text) {
  for (const node of root.querySelectorAll(selector)) {
    node.textContent = text;
  }
}
