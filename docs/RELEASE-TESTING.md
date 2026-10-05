# Release-Kandidaten testen

Diese Checkliste richtet sich an Maintainer und Integratoren. Getestet wird der
heruntergeladene npm-Stage in einer Host-Anwendung mit bpmn-js. Ausschließlich
synthetische klinische Testdaten verwenden.

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

- [ ] **Defaults:** `{}` verwenden. Standardanbieter und gebündelte Terminologien erscheinen.
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

- [ ] **Standardserver überschreiben:** Requests gehen im Netzwerk-Tab an den eigenen Server:

```js
{
  serverConfig: { fhirBaseUrl: 'https://EUER-FHIR-SERVER/fhir' }
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
`bpmn:extensionElements` im `term:`-Namensraum. Beispiele: [Generated XML](../README.md#generated-xml).

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
| Über den dokumentierten `fetchFn` eine synthetische ungültige Antwort liefern; siehe [request routing](../README.md#cors-and-host-owned-request-routing) | Datenbezogene Fehlermeldung |
| Nach Fehler den gültigen Endpunkt wiederherstellen und erneut suchen | Fehler verschwindet; Auswahl funktioniert |

## 7. Ergebnis und Freigabe

```text
Version / Stage-ID / Commit:
Tester / Datum:
Node / npm / Browser:
bpmn-js / Properties-Panel-Versionen:
Verwendete Server und Terminologiepakete:
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
