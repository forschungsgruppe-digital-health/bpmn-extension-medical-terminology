# MII-TermServ: DFN-Proxy und Browser-Zertifikat testen

Ziel: Beide Wege mit der bestehenden Extension untersuchen, ohne eine eigene
Node-mTLS-Implementierung oder private Schlüssel in der Extension einzubauen.
Die Ergebnisse sind erst nach einem Test mit gültiger Berechtigung und einem
echten Client-Zertifikat belastbar.

## Voraussetzungen

- Zugang zum [MII-TermServ](https://mii-termserv.de/services/access-to-the-server/)
  und ein dafür zugelassenes Client-Zertifikat mit privatem Schlüssel.
- Einen Modeler mit installierter Extension und eine bekannte Browser-Origin,
  zum Beispiel `https://modeler.example.test`.
- Eine aktuell bestätigte FHIR-Basis-URL des TermServ, einschließlich `/fhir`.
  Die alten Hostnamen in der Proxy-Beispielkonfiguration nicht ungeprüft übernehmen.
- Nur synthetische Suchbegriffe verwenden. Zertifikate, Schlüssel, Passwörter,
  echte Patientendaten und sensible Anfrageinhalte weder committen noch in
  Tickets oder Logs übernehmen.

## 1. DFN-Proxy

### Einrichten

1. Den [DFN-Proxy](https://github.com/skfit-uni-luebeck/TermServerDFNProxy)
   als separaten Dienst installieren. Die untersuchte Implementierung ist
   Stand 2023; Kompatibilität mit dem aktuellen TermServ ist noch zu prüfen.
2. In einer privaten `proxy.conf` gemäß
   [Vorlage](https://github.com/skfit-uni-luebeck/TermServerDFNProxy/blob/5218bbaa80e80a239502eacdb075434d4822b5a8/resources/proxy.conf.example)
   `upstream.address`, `upstream.port` und `upstream.protocol` auf den TermServ
   setzen. `mutualTls.enabled`, `mutualTls.keystore.*` und `mutualTls.keypair.*`
   für das Client-Zertifikat konfigurieren.
3. `proxy.hostname`, `proxy.path` und HTTP-/HTTPS-Ports passend zur erreichbaren
   Proxy-Adresse einstellen. Die Zugangsdaten stehen in der Konfiguration im
   Klartext: Datei und Zertifikat vor unbefugtem Zugriff schützen.
   `trust.all` und `trust.selfSigned` nicht als Abkürzung aktivieren.
4. Bei Docker zusätzlich die Zertifikatdatei sicher und möglichst nur lesbar
   einbinden; der konfigurierte Pfad muss **im Container** existieren. Das
   [Compose-Beispiel](https://github.com/skfit-uni-luebeck/TermServerDFNProxy/blob/5218bbaa80e80a239502eacdb075434d4822b5a8/docker-deployment/ts-proxy/docker-compose.yml)
   bindet nur die Konfiguration ein. Sein Port-Mapping und die Ports in der
   Vorlage müssen zueinander passen.
5. Den Proxy nicht öffentlich betreiben. Zugriff durch geeignete Authentifizierung
   und Netzregeln begrenzen: Wer ihn erreichen kann, nutzt möglicherweise das
   hinterlegte Zertifikat. Auch ein lokaler Proxy ist ohne Schutz nicht
   automatisch sicher vor Zugriffen anderer Webseiten. Für den Netzwerkbetrieb
   HTTPS bzw. einen geschützten Same-Origin-Reverse-Proxy verwenden.

### Extension konfigurieren

Die bestehende API reicht grundsätzlich; die URL bezeichnet den **Proxy**,
nicht direkt den TermServ. Beispieladresse und Pfad an das Setup anpassen:

```js
const terminologyModule = createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: 'https://proxy.example.test/fhir'
  }
});
// terminologyModule in additionalModules des Modelers aufnehmen.
```

Default-FHIR-Provider und der Default-Loader nutzen diese URL; der
Default-SNOMED-FHIR-Provider ebenfalls, sofern keine eigene SNOMED-URL gesetzt
ist. Explizit konfigurierte Provider, Loader und Snowstorm können andere URLs
verwenden. Eine neue mTLS-Flag ist für diesen transparenten Proxy nicht nötig.
Die Anzeige im Dropdown dabei nicht umbenennen.

### Testen

1. Proxy-Start, Zertifikat-Zugriff und Verbindung zum TermServ prüfen, ohne
   Passwörter auszugeben. Sicherstellen, dass nur berechtigte Nutzer den Proxy
   erreichen können und TLS-Zertifikate überprüft werden.
2. Im Modeler die Proxy-URL setzen und eine LOINC-Suche durchführen. In den
   Browser-Netzwerktools prüfen, dass der `$expand`-Request an den Proxy geht,
   ein erfolgreiches FHIR-JSON zurückkommt und Ergebnisse angezeigt werden.
   Zusätzlich einen weiteren konfigurierten FHIR-Provider und den Loader testen.
3. Fehlerfälle prüfen: Proxy nicht erreichbar, ungültiges oder abgelaufenes
   Zertifikat, fehlende Berechtigung und vom Upstream abgelehnte Suche.
   Fehler müssen sichtbar sein; nicht still auf einen anderen Server ausweichen.
4. Bei Cross-Origin-Zugriff `OPTIONS`, CORS-Header und tatsächliche GET-Antwort
   einschließlich Fehlerantworten prüfen. Der untersuchte Proxy sendet
   `Access-Control-Allow-Origin: *`, aber kein
   `Access-Control-Allow-Credentials: true`: dafür **nicht** pauschal
   `credentials: 'include'` aktivieren. `Authorization` und FHIR-Header sowie
   Weiterleitungen und URL-Rewriting im echten Suchpfad separat prüfen.
   HTTPS-Seiten können lokales HTTP durch Mixed-Content- oder
   Local-Network-Regeln blockieren.

## 2. Client-Zertifikat im Browser

### Einrichten und vorhandene API testen

Das Zertifikat samt privatem Schlüssel in den Browser- bzw. OS-Zertifikatsspeicher
importieren. Die Zertifikatauswahl und den TLS-Handshake übernimmt der Browser;
JavaScript kann keinen Dateipfad als Client-Zertifikat an `fetch` übergeben.

Für einen ersten Cross-Origin-Test kann die vorhandene `fetchFn` genutzt werden.
Die Option gilt hier nur für die konfigurierte Server-Origin:

```js
const fhirBaseUrl = 'https://terminology.example.test/fhir';
const terminologyOrigin = new URL(fhirBaseUrl).origin;

const terminologyModule = createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl },
  fetchFn: (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    return fetch(input, url.origin === terminologyOrigin
      ? { ...init, credentials: 'include' }
      : init);
  }
});
```

`credentials: 'include'` erlaubt auch Cookies und andere Credentials für diese
Origin. Nicht global für alle Server einschalten. Der Server muss für
Cross-Origin-Anfragen eine passende konkrete `Access-Control-Allow-Origin`
und `Access-Control-Allow-Credentials: true` zurückgeben; `*` genügt hier nicht.
Eigene Provider- und Loader-Transporte können diese `fetchFn` überschreiben.

### Testen

1. Ohne Proxy direkt gegen die tatsächliche TermServ-URL testen. In Chrome und
   Firefox jeweils Betriebssystem, Browserversion, Zertifikatauswahl und
   Ergebnis dokumentieren. Eine Anfrage mit installiertem und eine ohne gültiges
   Zertifikat ausführen.
2. LOINC-Suche, tatsächliche Request-URL, HTTP-Status und sichtbare Ergebnisse
   prüfen. Im Netzwerk-Tab prüfen, ob `OPTIONS` ausgelöst wird und welche
   CORS-Header sowohl Preflight als auch GET zurückgeben.
3. Einen Pfad mit Preflight gesondert testen, etwa wenn die echte Konfiguration
   einen `Authorization`-Header benötigt. Ein einfacher GET mit zulässigen
   Headern löst normalerweise keinen Preflight aus, benötigt aber trotzdem CORS.
   Laut [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#preflight_requests_and_credentials)
   unterscheidet sich das Senden von Client-Zertifikaten beim Preflight zwischen
   Browsern und deren Einstellungen. Nicht aus einem Browser auf alle schließen.
4. Abbruch, Fehlerantwort und Zertifikatsauswahl prüfen. Ein erfolgreicher
   `curl`- oder `OPTIONS`-Test allein beweist weder Browser-Verhalten noch eine
   erfolgreiche authentifizierte Suche.

## Danach: Implementierung und Dokumentation entscheiden

- Wenn der Proxy funktioniert: Konfigurationsbeispiel, Betriebsvoraussetzungen,
  Zugriffsschutz und bekannte Einschränkungen dokumentieren; Integrationstests
  für URL-Weitergabe und Suche ergänzen. Keine eigene Proxy-Implementierung nötig.
- Wenn der Browser-Zugriff funktioniert: prüfen, ob eine gezielte, standardmäßig
  deaktivierte Credentials-Option einfacher als `fetchFn` ist. Falls umgesetzt,
  Tests für Opt-in, unveränderte Defaults, Origin-Begrenzung, Abbruch und
  Fehlermeldungen ergänzen. Die Zertifikatsauswahl bleibt Browser-Sache.
- Pro Weg die getesteten Versionen, Origin, Resultate und Fehlerursachen ohne
  Geheimnisse festhalten. Browser- und Proxy-Tests sind manuelle Integrationstests;
  automatisierte Tests mit Mock-Transporten ersetzen keinen echten mTLS-Test.
