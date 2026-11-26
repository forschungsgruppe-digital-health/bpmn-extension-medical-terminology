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

Für die folgenden Tests jeweils `serverConfig: { fhirBaseUrl: 'https://EUER-FHIR-SERVER/fhir' }` und `snomedConfig: { edition: '11000274103' }` ergänzen; nur Server verwenden, die ihr nutzen dürft. Konkreter Entwicklungs-Endpunkt: `https://tx.fhir.de/fhir` von HL7 Deutschland, nur für Entwicklung und nicht-kommerzielle Forschung. Die [Nutzungsbedingungen](https://tx.fhir.de/de/terms) beachten: automatisierte Massenabfragen nur nach vorheriger Absprache, nicht als primärer Terminologieserver eines Produktivsystems. `snomedConfig` nur mit gültiger SNOMED-CT-Affiliate-Lizenz setzen. Ohne Lizenz SNOMED CT weglassen. Anleitung: [Connecting a terminology server](https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/configuration/terminology-server/).

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
    branch: 'MAIN',
    language: 'de',
    languageStrategy: 'header'
  }
}
```

Server-Platzhalter durch eigene erreichbare Endpunkte ersetzen.

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

Im Netzwerk-Tab nach `tx.fhir.de` filtern; im Tab „Application“ (Chrome) bzw.
„Web-Speicher“ (Firefox) den Session Storage beobachten.

### 7.1 Einwilligung

- [ ] Vor der Einwilligung gehen keine Requests an tx.fhir.de; LOINC, ICD-10-GM, OPS, ATC und SNOMED CT fehlen in der Anbieterauswahl.
- [ ] „Accept“ im Lizenzhinweis schaltet die Live-Suche nicht ein.
- [ ] „Live search…“ öffnet den Einwilligungsdialog. „Not now“, Escape oder ein Klick auf den Hintergrund schließen nur diesen Dialog; ein offener Lizenzhinweis darunter bleibt offen. Es gehen keine Requests.
- [ ] Der Dialog nennt HL7 Deutschland e.V. als Empfänger mit Datenschutzerklärung, Nutzungsbedingungen und Lizenzseite.
- [ ] „Switch on live search“: LOINC, ICD-10-GM, OPS und ATC erscheinen, SNOMED CT nicht. Das Banner meldet, dass die Live-Suche an ist, und nennt tx.fhir.de. Der Session Storage enthält `fdh-demo-live-search-consent-v1` mit `granted: true`, `host: "tx.fhir.de"` und Zeitpunkt.
- [ ] Neu laden im selben Tab: Die Live-Suche ist weiter an. In einem neu geöffneten Tab (nicht „Tab duplizieren“, das den Session Storage kopiert) ist sie aus.

### 7.2 Drosselung

- [ ] Bei LOINC `Lo` eingeben: kein Request an tx.fhir.de.
- [ ] Bei OPS zügig `Lobektomie` tippen: genau ein `$expand`-Request mit `filter=Lobektomie`, etwa 300 ms nach dem letzten Tastendruck.
- [ ] Dieselbe Suche wiederholen: kein weiterer Request (Cache).

### 7.3 Details und Widerruf

- [ ] Solange die Live-Suche an ist, öffnet „Live search details“ im Banner die Einwilligungsinformation erneut.
- [ ] „Turn off live search“: LOINC, ICD-10-GM, OPS und ATC verschwinden aus der Auswahl, `fdh-demo-live-search-consent-v1` ist gelöscht, das Banner zeigt wieder den Standardtext. Danach gehen keine Requests mehr an tx.fhir.de.

### 7.4 Fail-closed

- [ ] Ohne `VITE_OPT_IN_FHIR_BASE_URL` bauen (entspricht einer leeren Repository-Variable `DEMO_OPT_IN_FHIR_BASE_URL`): keine Live-Suche, kein „Live search…“, keine Requests an Terminologieserver.
- [ ] Mit einem Host bauen, für den `demo/index.html` keinen Betreiber nennt (kein `[data-live-search-operator]`-Block), z. B. `VITE_OPT_IN_FHIR_BASE_URL=https://terminology.example.org/fhir`: keine Live-Suche, kein „Live search…“, keine Requests an diesen Host.

### 7.5 SNOMED-CT-Freischaltung (nur lokaler Testbuild)

Nur mit gültiger SNOMED-CT-Affiliate-Lizenz testen und diesen Build nie
veröffentlichen:

```bash
VITE_OPT_IN_FHIR_BASE_URL=https://tx.fhir.de/fhir VITE_OPT_IN_SNOMED_EDITION=11000274103 npm run build --workspace=demo
npm run preview --workspace=demo
```

- [ ] Nur `11000274103` (German National Edition) wird akzeptiert: Ein Build mit einer anderen Modul-ID, z. B. `VITE_OPT_IN_SNOMED_EDITION=900000000000207008`, bietet kein „SNOMED CT…“ an und meldet in der Browser-Konsole eine Warnung.
- [ ] Solange die Live-Suche aus ist, fehlt „SNOMED CT…“ im Banner.
- [ ] Nach dem Einschalten der Live-Suche erscheint „SNOMED CT…“. Der Dialog zeigt drei Aussagen, keine davon angehakt; „Unlock SNOMED CT“ bleibt deaktiviert, bis alle drei angehakt sind.
- [ ] „Cancel“ oder Escape: SNOMED CT bleibt gesperrt. Beim erneuten Öffnen sind die Aussagen wieder nicht angehakt.
- [ ] „Unlock SNOMED CT“: SNOMED CT erscheint in der Auswahl; Suchen gehen an tx.fhir.de mit `http://snomed.info/sct/11000274103?fhir_vs`. Der Session Storage enthält `fdh-demo-snomed-self-declaration-v1` mit Host und Edition. Nach dem Neuladen im selben Tab bleibt SNOMED CT freigeschaltet.
- [ ] „Lock SNOMED CT“: SNOMED CT verschwindet, der Eintrag ist gelöscht, die Live-Suche bleibt an.
- [ ] Erneut freischalten, dann „Turn off live search“: SNOMED CT und die vier FHIR-Anbieter verschwinden, beide Einträge im Session Storage sind gelöscht.

### 7.6 Freigabe-Gates

Vor dem Setzen der Repository-Variable `DEMO_OPT_IN_FHIR_BASE_URL`:

- [ ] Die schriftliche Bestätigung von HL7 Deutschland e.V. liegt vor, dass `tx.fhir.de` für die Live-Suche der öffentlichen Demo so genutzt werden darf.
- [ ] Die oder der Datenschutzbeauftragte der TU Dresden hat den Einwilligungsdialog (`#live-search-overlay` in `demo/index.html`) und die Hinweise in Banner und Lizenzdialog geprüft.
- [ ] Datum und Ablageort beider Nachweise sind festgehalten. Fehlt einer, bleibt `DEMO_OPT_IN_FHIR_BASE_URL` leer. Nach wesentlichen Änderungen am Einwilligungsdialog erneut prüfen lassen.

Bevor `VITE_OPT_IN_SNOMED_EDITION` jemals in einem öffentlichen Build gesetzt wird:

- [ ] Die schriftliche Bestätigung des BfArM liegt vor, dass die Freischaltung per Selbstauskunft in der öffentlichen Demo zulässig ist.
- [ ] Die Nutzung in der öffentlichen Demo ist in der MLDS-Nutzungserklärung angegeben.
- [ ] Datum und Ablageort beider Nachweise sind festgehalten. Bis dahin setzen weder `pages.yml` noch `docs-preview.yml` `VITE_OPT_IN_SNOMED_EDITION`.

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
