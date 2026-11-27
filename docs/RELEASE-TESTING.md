# Release-Kandidaten testen

Diese Checkliste richtet sich an Maintainer und Integratoren. Getestet wird der
heruntergeladene npm-Stage in einer Host-Anwendung mit bpmn-js. Ausschließlich
synthetische klinische Testdaten verwenden.

Abschnitt 7 prüft zusätzlich die öffentliche Demo, die mit der Promotion von
`dev` nach `main` über `pages.yml` deployt wird.

## 1. Gestagetes Paket installieren

- [ ] Stage-Version mit der erwarteten RC-Version abgleichen.
- [ ] Paket herunterladen und in der Host-Anwendung installieren:

```bash
npm login --registry=https://registry.npmjs.org
npm stage view <stage-id> --registry=https://registry.npmjs.org
npm stage download <stage-id> --registry=https://registry.npmjs.org
npm install /pfad/zum/heruntergeladenen-paket.tgz
```

`<stage-id>` durch die ID des Kandidaten ersetzen. npm CLI 11.15.0 oder neuer
und ein npm-Account mit den erforderlichen Paketrechten werden benötigt.

- [ ] Installierte Version abgleichen:

```bash
npm ls @forschungsgruppe-digital-health/bpmn-extension-medical-terminology
```

## 2. Einbindung prüfen

- [ ] Paket nach dem [Quick Start](../README.md#quick-start) einbinden.
- [ ] Anwendung starten und BPMN-Modell öffnen.
- [ ] Properties Panel und Terminologie-Gruppe sind sichtbar.
- [ ] Keine unerwarteten Fehler in der Browserkonsole.
- [ ] Die Host-Anwendung kann das Modell als BPMN-XML speichern.

## 3. Defaults und Konfigurationsoptionen prüfen

Jeden Fall separat testen: Optionen im folgenden Beispiel ersetzen, Anwendung
neu starten und die erwartete Wirkung prüfen. Das Terminologie-Modul wie im
Quick Start in `additionalModules` einbinden; bisheriges Terminologie-Modul
ersetzen, nicht ein zweites hinzufügen.

```js
import {
  createDefaultTerminologyModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const terminologyModule = createDefaultTerminologyModule({
  // Optionen des jeweiligen Testfalls einsetzen.
});
```

- [ ] **Defaults:** `{}` verwenden. Nur die gebündelten Terminologien (HL7, IHE XDS, KDL) erscheinen; es gehen keine Requests an Terminologieserver; die Konsole meldet je einmal, dass SNOMED CT und die FHIR-Anbieter deaktiviert sind (zwei Meldungen).

Für die folgenden Tests jeweils `serverConfig: { fhirBaseUrl: 'https://EUER-FHIR-SERVER/fhir' }` und `snomedConfig: { edition: '11000274103' }` ergänzen; nur Server verwenden, die ihr nutzen dürft. Konkreter Entwicklungs-Endpunkt: `https://tx.fhir.de/fhir` von HL7 Deutschland, nur für Entwicklung und nicht-kommerzielle Forschung. Die [Nutzungsbedingungen](https://tx.fhir.de/de/terms) beachten: erlaubt sind Entwicklung, Validierung und nicht-kommerzielle Forschung; automatisierte Massenabfragen nur nach vorheriger Absprache. Laut [Startseite](https://tx.fhir.de/de) ist der Server nicht als primärer Terminologieserver eines Produktivsystems gedacht und dient nur der Validierung. Den Endpunkt `tx.fhir.de` so nur für lokale Tests in der eigenen Host-Anwendung verwenden: Builds, die andere aufrufen oder herunterladen können (öffentliche Demo, PR-Vorschau-Artefakte), fallen unter die [Freigabe-Gates](#76-freigabe-gates). `snomedConfig` nur mit gültiger SNOMED-CT-Affiliate-Lizenz setzen. Ohne Lizenz SNOMED CT weglassen. Anleitung: [Connecting a terminology server](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/terminology-server/).

- [ ] **Gruppen deaktivieren:** Folgende Optionen einzeln testen. Nur die jeweilige Gruppe verschwindet:

```js
{ enableSnomed: false }
{ enableFhirDefaults: false }
{ enablePackageDefaults: false }
```

Die drei Zeilen sind separate Optionsobjekte, kein gemeinsamer JavaScript-Block.

- [ ] **Einzelnen Anbieter deaktivieren:** LOINC verschwindet; andere bleiben verfügbar:

```js
{ disabledProviderIds: [ 'loinc' ] }
```

- [ ] **Eigenen Server setzen:** Requests gehen im Netzwerk-Tab an den eigenen Server; SNOMED-Anfragen nutzen `http://snomed.info/sct/11000274103?fhir_vs`:

```js
{
  serverConfig: { fhirBaseUrl: 'https://EUER-FHIR-SERVER/fhir' },
  snomedConfig: { edition: '11000274103' }
}
```

- [ ] **Server ohne SNOMED-Edition:** LOINC, ICD-10-GM, OPS und ATC sind verfügbar, SNOMED CT nicht; die Konsole nennt `snomedConfig.edition`.

- [ ] **Nur aktive SNOMED-Konzepte:** Bei SNOMED CT suchen. Der `$expand`-Request enthält `activeOnly=true`. Mit `snomedConfig: { edition: '11000274103', expandParameters: { activeOnly: 'false' } }` enthält der Request `activeOnly=false`, und inaktive Konzepte erscheinen wieder; mit `activeOnly: null` fehlt der Parameter ganz.

- [ ] **Value Set ohne Edition:** `snomedConfig: { valueSetUri: 'https://EUER-FHIR-SERVER/ValueSet/eigenes' }` setzen. SNOMED CT bleibt verfügbar; die Konsole warnt einmal, dass das Value Set keine Edition nennt, und nennt `compose.include.version`.

- [ ] **Suchdrosselung:** Bei LOINC zwei Zeichen tippen: Im Netzwerk-Tab erscheint kein Request; das Panel zeigt „Enter at least 3 characters to search LOINC.“. Danach zügig weitertippen: genau ein `$expand`-Request, etwa 300 ms nach dem letzten Tastendruck. Bei einem gebündelten Anbieter (z. B. KDL) erscheinen Treffer schon ab dem ersten Zeichen. Mit `createTerminologyPropertiesPanelModule({ serverSearchDebounceMs: 0, serverSearchMinLength: 1 })` sucht auch LOINC ab dem ersten Zeichen bei jedem Tastendruck.

- [ ] **LOINC nur Term-Codes:** Bei LOINC (tx.fhir.de) nach `glucose` suchen. Das Panel zeigt „The server found matches, but LOINC hides every code on the first page of results. Add more words to narrow the search.“ statt „No matching terminology concepts found.“. Bei `sodium` erscheinen nur Codes der Form `2951-2`, keine `LP…`/`LA…`-Codes, und die Ergebnisanzeige nennt keine Gesamtzahl des Servers. Mit `fhirProviderOverrides: [{ id: 'loinc', codePattern: null }]` erscheinen wieder alle Codes.

- [ ] **Server-Release ohne Pin:** Ohne `fhirProviderOverrides` bei OPS nach `Lobektomie` suchen und einen Treffer übernehmen. Im Netzwerk-Tab enthält der `$expand`-Request keinen Versionsparameter. Die Antwort meldet den Release in `used-codesystem` (tx.fhir.de: `http://fhir.de/CodeSystem/bfarm/ops|2026`). Im gespeicherten XML steht genau dieser Release in `mt:coding/@version` (`2026`). Es erscheint keine Warnung „Version unavailable“.

- [ ] **ATC-GM statt WHO-ATC:** Bei ATC nach `Metformin` suchen. Der Request nutzt `url=http://fhir.de/ValueSet/bfarm/atc`. Der Treffer `A10BA02` „Metformin“ wird mit `system="http://fhir.de/CodeSystem/bfarm/atc"` gespeichert, nicht mit `http://www.whocc.no/atc`. Bestehende WHO-ATC-Codings im geladenen Modell bleiben unverändert erhalten. ATC-GM-Inhalte unterliegen den Nutzungsbedingungen von WIdO und BfArM einschließlich des Pflichthinweises; siehe [Licensing and terminology rights](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/licensing/#publisher-copyright-and-trademark-notices).

- [ ] **Release pinnen:** Einen Release setzen, den der Server hat. Suchergebnisse und gespeicherte Version entsprechen dem Pin (tx.fhir.de: `2025`):

```js
{
  fhirProviderOverrides: [
    { id: 'icd-10-gm', expandParameters: { valueSetVersion: '2025' } }
  ]
}
```

- [ ] **Einzelnen Anbieter überschreiben:** Nur LOINC verwendet den anderen Endpunkt:

```js
{
  fhirProviderOverrides: [
    { id: 'loinc', baseUrl: 'https://EUER-FHIR-SERVER/fhir' }
  ]
}
```

- [ ] **SNOMED über Snowstorm:** Suche funktioniert; URL, Branch und Sprache stimmen im Netzwerk-Tab:

```js
{
  snomedConfig: {
    transport: 'snowstorm',
    baseUrl: 'https://EUER-SNOWSTORM-SERVER',
    branch: 'MAIN/SNOMEDCT-DE',
    language: 'de',
    languageStrategy: 'header'
  }
}
```

Server-Platzhalter durch eigene erreichbare Endpunkte ersetzen.

- [ ] **Snowstorm ohne Branch:** `branch` aus dem Beispiel entfernen und neu laden. SNOMED CT fehlt in der Anbieterauswahl; die Konsole meldet `SNOMED CT is disabled: no Snowstorm branch is configured`. Es gehen keine Requests an Snowstorm.

- [ ] **Sprache:** `language: 'en'` und `languageStrategy: 'param'` im Snowstorm-Beispiel testen; Request-Parameter prüfen. Übersetzung hängt vom Server ab.
- [ ] **Zusätzliche Anbieter und Labels:** Beispiele unter [Default service configuration](../README.md#default-service-configuration) und [external overrides](../README.md#out-of-the-box-defaults-and-external-overrides) testen; Anbieter und Labels stimmen.
- [ ] **Dynamischer Loader:** Mit `loaderConfig: false` deaktivieren; anschließend nach [Programmatic Usage](../README.md#programmatic-usage) aktivieren und einen CodeSystem-Anbieter laden.
- [ ] **Annotierbare BPMN-Typen:** In `createTerminologyPropertiesPanelModule` einen Typ mit `includeTypes` ergänzen und einen Default-Typ mit `excludeTypes` ausschließen. Ausschlüsse haben Vorrang; BPMN-Vererbung gilt. `targetTypes` ersetzt weiterhin die Default-Liste. Siehe [Konfiguration annotierbarer Elemente](../demo/ANNOTATIONS.md).
- [ ] **Annotationen ausblenden:** Im Quick Start `TerminologyPropertiesPanelModule` durch das folgende Modul ersetzen. UI ist ausgeblendet; gespeicherte XML-Daten bleiben erhalten:

```js
import {
  createTerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

const propertiesPanelModule = createTerminologyPropertiesPanelModule({
  showAnnotations: false
});
// In additionalModules anstelle von TerminologyPropertiesPanelModule verwenden.
```

## 4. Vite Package Discovery prüfen

- [ ] Plugin nach [Package Discovery with Vite](../README.md#package-discovery-with-vite) einbinden.
- [ ] Default-Discovery: Erwartete gebündelte Anbieter erscheinen.
- [ ] Zusätzliches installiertes Terminologiepaket mit dem dortigen `packages`-Beispiel auswählen.
- [ ] `include` und `exclude` im Plugin sowie Whitelist in `packageDiscovery` nach [external overrides](../README.md#out-of-the-box-defaults-and-external-overrides) einzeln testen. Nur ausgewählte Anbieter beziehungsweise CodeSystems erscheinen.
- [ ] Mit `packageAutoDiscovery: false` automatische Discovery deaktivieren. Explizite `packageDiscovery`-Einträge bleiben verfügbar.
- [ ] Bei mehreren installierten CodeSystem-/Paketversionen stimmen Unterscheidung und Versionslabels; siehe [Versionsbeschreibung](../README.md#default-service-configuration).

## 5. UI und XML prüfen

- [ ] Freitextannotation und Terminologieannotation anlegen.
- [ ] Nach Code und Bezeichnung suchen; Treffer auswählen.
- [ ] Leere Suche, keine Treffer und Ergebnisanzahl prüfen.
- [ ] Annotation bearbeiten und speichern; weitere Bearbeitung abbrechen.
- [ ] Coding ersetzen, weitere Codings hinzufügen und Annotation löschen.
- [ ] Fehlende Pflichtangaben, doppelte Annotation-ID und doppelte Codes prüfen.
- [ ] Während einer Bearbeitung das BPMN-Element wechseln.
- [ ] Hinzufügen, Bearbeiten und Löschen mit Undo/Redo prüfen.
- [ ] Anbietergruppen, Sortierung und Quellen-/Versionslabels kontrollieren.
- [ ] Schnell hintereinander suchen und Anbieter wechseln: Keine veralteten Ergebnisse.
- [ ] Coding mit nicht mehr verfügbarer lokaler CodeSystem-Version prüfen: Warnung sichtbar, Daten erhalten; siehe [Versionsbeschreibung](../README.md#default-service-configuration).

Bei allen Änderungen das durch die Host-Anwendung gespeicherte XML prüfen:
ID, Freitext, System-URI, Code und CodeSystem-Version stimmen; abgebrochene oder
ungültige Eingaben werden nicht gespeichert. Terminologiedaten stehen unter
`bpmn:extensionElements` im `mt:`-Namensraum. Beispiele: [Generated XML](../README.md#generated-xml).

## 6. Fehler absichtlich provozieren

Jeden Fehler separat einbauen und danach zurücksetzen. UI, Konsole und
gegebenenfalls Build-Ausgabe auf passende Fehlermeldungen prüfen.

| Test / Anleitung | Erwartetes Verhalten |
|---|---|
| Im [Vite-Plugin](../README.md#package-discovery-with-vite) eine nicht vorhandene kanonische CodeSystem-URL unter `include` auswählen | Verständlicher Build-/Discovery-Fehler |
| `packageProviderOptions: { 'unbekannter-provider': {} }` setzen | Konfigurationsfehler benennt den Anbieter |
| `snomedConfig: { transport: 'ungueltig' }` setzen | Fehlermeldung nennt erlaubte Transporte |
| `snomedConfig: { transport: 'snowstorm' }` ohne eigene Server-Overrides setzen | Fehlermeldung erklärt die fehlende Basis-URL |
| `packageAutoDiscovery: true` ohne Plugin oder bereitgestellte Registry verwenden | Warnung; Basisanbieter bleiben nutzbar |
| FHIR-Basis-URL auf `http://127.0.0.1:1/fhir` setzen oder HTTP 401/403/500 über eigenen Testserver simulieren; siehe [request routing](../README.md#cors-and-host-owned-request-routing) | Verständliche Fehlermeldung; Ursache nachvollziehbar |
| Gepinnten Release setzen, den der Server nicht hat: `fhirProviderOverrides: [{ id: 'icd-10-gm', expandParameters: { valueSetVersion: '1999' } }]` | Panel: „ICD-10-GM could not answer this request (HTTP 404). The configured value set or version may not exist on this server.“, ohne Absturz; andere Anbieter funktionieren weiter |
| CORS nicht erlaubt: einen Server ohne CORS-Freigabe für den eigenen Origin verwenden. Alternativ bei tx.fhir.de einen nicht erlaubten Header senden, dann scheitert der Preflight mit 403: `fhirProviderOverrides: [{ id: 'loinc', headers: { 'X-Client-App': 'test' } }]` | Panel: „LOINC could not be reached. …“; die Konsole zeigt einen CORS-Fehler |
| Über den dokumentierten `fetchFn` eine synthetische ungültige Antwort liefern; siehe [request routing](../README.md#cors-and-host-owned-request-routing) | Datenbezogene Fehlermeldung |
| Nach Fehler den gültigen Endpunkt wiederherstellen und erneut suchen | Fehler verschwindet; Auswahl funktioniert |

## 7. Öffentliche Demo prüfen (bei Änderungen an `demo/` oder den Pages-Workflows)

Die Demo wie in `pages.yml` bauen, am besten in einem frischen Checkout oder
Worktree. Lokal vorher `demo/.env.local` umbenennen: Vite lädt die Datei auch
beim Build, und ein dort gesetzter Server hat Vorrang vor der Live-Suche.
Danach die Datei wieder zurückbenennen.

```bash
mv demo/.env.local demo/.env.local.bak   # nur falls vorhanden
VITE_OPT_IN_FHIR_BASE_URL=https://tx.fhir.de/fhir npm run build --workspace=demo
npm run preview --workspace=demo         # http://localhost:4173
```

Diesen Testbuild nur lokal verwenden, nicht veröffentlichen und nicht
weitergeben. Die PR-Vorschau (`docs-preview.yml`) baut die Demo wie `pages.yml`
mit der Repository-Variable `DEMO_OPT_IN_FHIR_BASE_URL`; solange sie leer ist,
bietet auch das Vorschau-Artefakt keine Live-Suche (siehe 7.6).

Im Netzwerk-Tab nach `tx.fhir.de` filtern; im Tab „Application“ (Chrome) bzw.
„Web-Speicher“ (Firefox) den Session Storage beobachten.

Die Demo erscheint deutsch, wenn der Browser Deutsch vor Englisch bevorzugt,
sonst englisch. Die Schritte nennen die englische Beschriftung und in Klammern
die deutsche. Die Abschnitte 7.1 bis 7.3 einmal in jeder Sprache durchlaufen.

### 7.0 Sprache

- [ ] Mit deutscher Browsersprache öffnet die Demo deutsch (`<html lang="de">`), sonst englisch. Die Wahl wird nicht gespeichert: Nach dem Neuladen gilt wieder die Browsersprache.
- [ ] Der Umschalter DE | EN im Banner und in jedem Dialog wechselt alle Texte in Kopfzeile, Banner, Fußzeile und Dialogen; der aktive Knopf hat `aria-pressed="true"`. Properties Panel und Diagramme bleiben englisch (`<main lang="en">`).
- [ ] Im Lizenzhinweis den Link zur Live-Suche öffnen, im Einwilligungsdialog die Sprache wechseln und den Dialog mit „Not now“ („Jetzt nicht“) schließen: Der Fokus liegt auf demselben Link in der neuen Sprache, nicht auf der Seite.
- [ ] Die Pflichthinweise erscheinen in beiden Sprachen unverändert: SNOMED CT und LOINC englisch, BfArM und WIdO deutsch.

### 7.1 Einwilligung

- [ ] Vor der Einwilligung gehen keine Requests an tx.fhir.de; LOINC, ICD-10-GM, OPS, ATC und SNOMED CT fehlen in der Anbieterauswahl.
- [ ] „Accept“ („Akzeptieren“) im Lizenzhinweis schaltet die Live-Suche nicht ein.
- [ ] „Live search…“ („Live-Suche…“) öffnet den Einwilligungsdialog. „Not now“ („Jetzt nicht“), Escape oder ein Klick auf den Hintergrund schließen nur diesen Dialog; ein offener Lizenzhinweis darunter bleibt offen. Es gehen keine Requests.
- [ ] Der Dialog nennt HL7 Deutschland e.V. als Empfänger mit Datenschutzerklärung, Nutzungsbedingungen und Lizenzseite.
- [ ] „Switch on live search“ („Live-Suche einschalten“): LOINC, ICD-10-GM, OPS und ATC erscheinen, SNOMED CT nicht. Das Banner meldet, dass die Live-Suche an ist, und nennt tx.fhir.de. Der Session Storage enthält `fdh-demo-live-search-consent-v1` mit `granted: true`, `host: "tx.fhir.de"` und Zeitpunkt.
- [ ] Neu laden im selben Tab: Die Live-Suche ist weiter an. In einem neu geöffneten Tab (nicht „Tab duplizieren“, das den Session Storage kopiert) ist sie aus.

### 7.2 Drosselung

- [ ] Bei LOINC `Lo` eingeben: kein Request an tx.fhir.de; das Panel zeigt „Enter at least 3 characters to search LOINC.“.
- [ ] Bei OPS zügig `Lobektomie` tippen: genau ein `$expand`-Request mit `filter=Lobektomie`, etwa 300 ms nach dem letzten Tastendruck.
- [ ] Dieselbe Suche wiederholen: kein weiterer Request (Cache).

### 7.3 Details und Widerruf

- [ ] Solange die Live-Suche an ist, öffnet „Live search details“ („Details zur Live-Suche“) im Banner die Einwilligungsinformation erneut.
- [ ] „Turn off live search“ („Live-Suche ausschalten“): LOINC, ICD-10-GM, OPS und ATC verschwinden aus der Auswahl, `fdh-demo-live-search-consent-v1` ist gelöscht, das Banner zeigt wieder den Standardtext. Danach gehen keine Requests mehr an tx.fhir.de.

### 7.4 Fail-closed

- [ ] Ohne `VITE_OPT_IN_FHIR_BASE_URL` bauen (entspricht einer leeren Repository-Variable `DEMO_OPT_IN_FHIR_BASE_URL`): keine Live-Suche, kein „Live search…“ („Live-Suche…“), keine Requests an Terminologieserver.
- [ ] Mit einem Host bauen, für den `demo/index.html` keinen Betreiber nennt (kein `[data-live-search-operator]`-Block), z. B. `VITE_OPT_IN_FHIR_BASE_URL=https://terminology.example.org/fhir`: keine Live-Suche, kein „Live search…“ („Live-Suche…“), keine Requests an diesen Host.

### 7.5 SNOMED-CT-Freischaltung (nur lokaler Testbuild)

Nur mit gültiger SNOMED-CT-Affiliate-Lizenz testen und diesen Build nie
veröffentlichen:

```bash
VITE_OPT_IN_FHIR_BASE_URL=https://tx.fhir.de/fhir VITE_OPT_IN_SNOMED_EDITION=11000274103 npm run build --workspace=demo
npm run preview --workspace=demo
```

- [ ] Nur `11000274103` (German National Edition) wird akzeptiert: Ein Build mit einer anderen Modul-ID, z. B. `VITE_OPT_IN_SNOMED_EDITION=900000000000207008`, bietet kein „SNOMED CT…“ an und meldet in der Browser-Konsole eine Warnung.
- [ ] Solange die Live-Suche aus ist, fehlt „SNOMED CT…“ im Banner.
- [ ] Nach dem Einschalten der Live-Suche erscheint „SNOMED CT…“. Der Dialog zeigt drei Aussagen, keine davon angehakt; „Unlock SNOMED CT“ („SNOMED CT freischalten“) bleibt deaktiviert, bis alle drei angehakt sind.
- [ ] „Cancel“ („Abbrechen“) oder Escape: SNOMED CT bleibt gesperrt. Beim erneuten Öffnen sind die Aussagen wieder nicht angehakt.
- [ ] „Unlock SNOMED CT“ („SNOMED CT freischalten“): SNOMED CT erscheint in der Auswahl; Suchen gehen an tx.fhir.de mit `http://snomed.info/sct/11000274103?fhir_vs`. Der Session Storage enthält `fdh-demo-snomed-self-declaration-v1` mit Host und Edition. Nach dem Neuladen im selben Tab bleibt SNOMED CT freigeschaltet.
- [ ] „Lock SNOMED CT“ („SNOMED CT sperren“): SNOMED CT verschwindet, der Eintrag ist gelöscht, die Live-Suche bleibt an.
- [ ] Erneut freischalten, dann „Turn off live search“ („Live-Suche ausschalten“): SNOMED CT und die vier FHIR-Anbieter verschwinden, beide Einträge im Session Storage sind gelöscht.

### 7.6 Freigabe-Gates

Die Gates gelten für die öffentliche Demo (`pages.yml`) und für die
PR-Vorschau-Artefakte (`docs-preview.yml`): Beide lesen die URL der Live-Suche
aus derselben Repository-Variable `DEMO_OPT_IN_FHIR_BASE_URL`. Die
Vorschau-Artefakte werden nicht deployt, sind im öffentlichen Repository aber
für angemeldete GitHub-Nutzer herunterladbar.

`npm run check:demo-gates` sichert das technisch ab. Die Prüfung ist Teil von
`check:conformance` und läuft damit in `verify`, in der PR-Validierung
(`validate.yml`) und vor dem Bau der öffentlichen Demo (`pages.yml`).
`docs-preview.yml` führt sie zusätzlich als eigenen Schritt vor dem Bau aus, damit
ein Pull Request, der die Gates in den geprüften Dateien verletzt, kein
Vorschau-Artefakt erhält. Das gilt nur, solange der Pull Request diesen Schritt
nicht selbst entfernt: `docs-preview.yml` läuft in der Fassung des Pull Requests.
Ändert ein Pull Request auch `docs-preview.yml`, fängt ihn nur die fehlschlagende
PR-Validierung (`validate.yml`) und das Review ab; das Vorschau-Artefakt kann dann
trotzdem entstehen.

Die Prüfung schlägt fehl, wenn ein Workflow unter `.github/workflows/`, eine
lokale Action unter `.github/actions/`, ein npm-Skript einer versionierten
`package.json` oder eine versionierte Env-Datei (`.env*`, `demo/.env*`)
`VITE_OPT_IN_FHIR_BASE_URL` auf etwas anderes als
`${{ vars.DEMO_OPT_IN_FHIR_BASE_URL }}` setzt oder
`VITE_OPT_IN_SNOMED_EDITION`, `VITE_OPT_IN_SNOMED_EDITION_VERSION`,
`VITE_FHIR_BASE_URL`, `VITE_SNOMED_*` oder `VITE_SNOWSTORM_*` überhaupt setzt.
Sie erkennt die üblichen Zuweisungen (YAML-Schlüssel, `NAME=…`, `export`,
`+=`, `${NAME:=…}`, Schreiben nach `$GITHUB_ENV`, `core.exportVariable`), aber
keine Werte, die `demo/vite.config.js` oder der Demo-Code selbst festlegen.
Verglichen wird der ganze Wert: Text, der an den Ausdruck angehängt ist, eine
YAML-Folgezeile oder ein mehrzeiliger Wert (auch `NAME<<EOF` für `$GITHUB_ENV`)
lässt die Prüfung fehlschlagen. Kommentare und der Text von `name:`- und
`description:`-Werten zählen nicht.

Vor dem Setzen der Repository-Variable `DEMO_OPT_IN_FHIR_BASE_URL`:

- [ ] Die schriftliche Bestätigung von HL7 Deutschland e.V. liegt vor, dass `tx.fhir.de` für die Live-Suche der öffentlichen Demo und der PR-Vorschau-Artefakte so genutzt werden darf.
- [ ] Die oder der Datenschutzbeauftragte der TU Dresden hat den Einwilligungsdialog (`#live-search-overlay` in `demo/index.html`) und die Hinweise in Banner und Lizenzdialog geprüft.
- [ ] Datum und Ablageort beider Nachweise sind festgehalten. Fehlt einer, bleibt `DEMO_OPT_IN_FHIR_BASE_URL` leer. Nach wesentlichen Änderungen am Einwilligungsdialog erneut prüfen lassen.

Bevor `VITE_OPT_IN_SNOMED_EDITION` jemals in einem öffentlichen Build gesetzt wird:

- [ ] Die schriftliche Bestätigung des BfArM liegt vor, dass die Freischaltung per Selbstauskunft in der öffentlichen Demo zulässig ist.
- [ ] Die Nutzung in der öffentlichen Demo ist in der MLDS-Nutzungserklärung angegeben.
- [ ] Datum und Ablageort beider Nachweise sind festgehalten. Bis dahin setzen weder `pages.yml` noch `docs-preview.yml` `VITE_OPT_IN_SNOMED_EDITION`; `npm run check:demo-gates` lässt das nicht zu. Die Sperre aufzuheben erfordert eine Änderung an `tools/check-demo-gates.mjs` per Pull Request, erst nachdem beide Nachweise festgehalten sind. Die Prüfung erfasst nur die oben genannten Dateien: Änderungen an `demo/vite.config.js` oder am Demo-Code, die diese Variablen setzen oder Werte fest einbauen, brauchen im Review dieselbe Freigabe.

## 8. Ergebnis und Freigabe

```text
Version / Stage-ID / Commit:
Tester / Datum:
Node / npm / Browser:
bpmn-js / Properties-Panel-Versionen:
Verwendete Server und Terminologiepakete:
Öffentliche Demo (Abschnitt 7): geprüft / nicht betroffen
Bestanden:
Fehler und Issue-Links:
Nicht getestet, mit Begründung:
Entscheidung: freigeben / überarbeiten
```

Ein berechtigter Maintainer gibt den Kandidaten mit 2FA frei oder verwirft ihn:

```bash
npm stage approve <stage-id> --registry=https://registry.npmjs.org
# Alternativ bei Ablehnung:
npm stage reject <stage-id> --registry=https://registry.npmjs.org
```

Freigabe veröffentlicht genau die gestagete Version; ein RC wird dadurch nicht
zur stabilen `1.0.0`. Nach Überarbeitung einen neuen Kandidaten wie
`1.0.0-rc.2` verwenden. Derselbe Paket-Tarball wird nach erfolgreichem Staging
automatisch in GitHub Packages mit dem Tag `rc` veröffentlicht. npm-Reject
löscht diese GitHub-Kopie nicht. Einzelne GitHub-Paketversionen kann ein
Package-Admin separat löschen; der GitHub-Release und Git-Tag bleiben davon
unberührt. Bestehende Paketversionen werden nicht überschrieben.

Referenz: [npm staged publishing](https://docs.npmjs.com/staged-publishing/).
