## Entwurf 1 – Badge + Panel

![Entwurf 1](./concept-1-badge-indicator.svg)

Badge (`MT`, weißer Hintergrund mit Kontur) zeigt nur *dass* annotiert wurde; Inhalte
nur im Eigenschaftenpanel (Klick/Tastatur). Technisch als eigener `BaseRenderer` (wie
bpmn-js es für Boundary-Event-Marker macht) statt als HTML-Overlay – dadurch Teil der
normalen Element-Grafik, automatisch im SVG-/PNG-Export enthalten, Update über dieselben
`eventBus`-Hooks (Import, Ändern, Undo/Redo).

- ➕ geringe Diagrammlast, robust bei dichten Diagrammen, SVG-exportierbar
- ➖ keine automatische Kollisionsvermeidung mit Labels/Kontextmenüs

### Erweiterung: Checkbox „Show as comment“

Zusätzliche Panel-Checkbox pro Element schaltet neben dem Badge einen Kommentarblock mit
der Auflistung aller Codings (`system: code – display`) ein/aus. Technisch: neues
optionales Attribut (z. B. `showAsComment`, additive Moddle-Erweiterung, keine Breaking
Change); Renderer zeichnet den Block nur bei `true`, gleiche Formatierungslogik wie im
Panel. Macht die Entwurf-1/2-Entscheidung pro Element statt global: Standard bleibt
ruhig, Aufklappen ist Nutzerwahl. Offen: Persistenz als Modellattribut vs. reiner
Editor-View-State; SVG-`<text>` braucht `<title>`/`<desc>` für Screenreader-Zugang.

## Entwurf 2 – Kurzinhalt am Element

![Entwurf 2](./concept-2-inline-label.svg)

Kurztext (`Beispielterm`, bei mehreren `+2`) direkt am Element; Details im Panel.

- ➕ Inhalt sofort im Diagramm sichtbar, SVG-exportierbar
- ➖ höhere Infodichte, Überlappungsrisiko, braucht Kürzungsregeln

## Gemeinsame Anforderungen

- Daten nur aus `mt:` unter `bpmn:extensionElements`; BPMN-Core/DI unverändert
- Update bei Import, Ändern, Undo/Redo, Entfernen
- Tastaturzugang + Name/Rolle/Zustand programmatisch bestimmbar (Hover reicht laut
  [WCAG 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html) nicht)
- Kein Missbrauch von `TextAnnotation`/`Association` für klinische Inhalte
- Export-/SVG-Verhalten vor technischer Auswahl testen

## HL7 Field Guide (Fassung 2025-10-31)

| Seite | Aussage | Übertragung |
|---|---|---|
| 15–16 | BPMN ist für klinisches Personal mit minimalem Training lesbar | spricht für ruhiges Diagramm (→ Entwurf 1) |
| 26 | native BPMN-„Annotation“ ist nur erläuternder Text, ohne Ausführungsbezug | Semantik bleibt in `mt:`, Indikator ist eigenes UI-Element |
| 82 | Konzepte sollen mit Standardvokabularen verknüpft werden | Terminologiesystem/Konzeptart erkennbar mitanzeigen |
| 93–94 | „Used Vocabularies“ ist eigenes Metadatenfeld | stützt separate Anzeige des Terminologiesystems |


## Weitere Quellen

- Iglesias et al. (2022), [doi.org/10.2196/29927](https://doi.org/10.2196/29927)
- Annotation of Health Care Pathways (2021), [doi.org/10.3389/fdgth.2021.688218](https://doi.org/10.3389/fdgth.2021.688218)
- WCAG 2.2: [Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [Name/Role/Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html), [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [diagram-js Overlays.js](https://github.com/bpmn-io/diagram-js/blob/main/lib/features/overlays/Overlays.js), [bpmn-js BaseViewer.js](https://github.com/bpmn-io/bpmn-js/blob/develop/lib/BaseViewer.js)