// Central language configuration for the terminology package.
// Edit this file to set the preferred language and strategy for
// requests to external terminology servers (e.g. FHIR ValueSet/$expand or Snowstorm).
//
// Priority order (applied in code, highest first):
// 1) Provider/adapter-specific configuration passed at construction time
// 2) This file (terminology-language-config.js)
// 3) Browser language (navigator.languages / navigator.language)
// 4) Fallback: 'en'
//
// Fields:
// - language: short ISO code, e.g. 'de' or 'en'.
// - languageStrategy:
//     'param'  -> send language as a query parameter (FHIR: displayLanguage; Snowstorm: language)
//     'header' -> send language in the HTTP 'Accept-Language' header
//
// Notes:
// - Many FHIR servers (e.g. Ontoserver) accept displayLanguage as a query parameter.
// - If the server does not honour the query parameter, try 'header' strategy.
// - Provider-specific overrides should only be used when necessary; this central file
//   is the recommended single source of truth for application language.

export default {
  // ISO language code (short form), e.g. 'de', 'en', 'fr'
  language: 'de',

  // How to send the language to the terminology server:
  // 'param' -> set ValueSet/$expand?displayLanguage=<lang> or Snowstorm ?language=<lang>
  // 'header' -> send Accept-Language: <lang>
  // If undefined, adapter defaults to 'param'.
  languageStrategy: 'param'
};
