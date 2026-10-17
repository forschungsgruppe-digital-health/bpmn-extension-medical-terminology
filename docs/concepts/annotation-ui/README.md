# Pen-and-Paper-Entwürfe: Terminologie-Annotation im Diagramm (Issue #17)

Diese Skizzen sind Pen-and-Paper-Entwürfe im Sinne von Issue
[#17](https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology/issues/17).
Sie zeigen zwei Ideen, wie annotierte BPMN-Elemente im Diagramm erkennbar gemacht werden
können. **Keine der beiden Varianten ist bereits beschlossen.** Diese Seite dient als
Diskussionsgrundlage für den Vergleich und die anschließende Designentscheidung.

Beide Entwürfe verwenden denselben kleinen, offensichtlich synthetischen Beispielprozess
(Task A–D) und zeigen jeweils:

- die Zustände **keine**, **eine** und **mehrere** Annotationen am Element,
- ein Verhalten bei **dichten Diagrammen / kleinem Zoom**,
- den Ablauf **Element auswählen → Annotation anlegen → Anzeigen → Bearbeiten/Entfernen**.

## Entwurf 1 – Unaufdringlicher Marker (Badge) + Details im Panel

![Entwurf 1](./concept-1-badge-indicator.svg)

Ein Badge (`T · n`) am Element zeigt nur, *dass* annotiert wurde. Inhalte (System, Code,
Display) werden ausschließlich über eine definierte Interaktion (Klick oder Tastatur) im
Eigenschaftenpanel angezeigt. Vorbild ist die Overlay-Aktualisierung von
[`bpmn-js-bpmnlint`](https://github.com/bpmn-io/bpmn-js-bpmnlint/blob/main/lib/Linting.js),
technisch umsetzbar über die
[diagram-js-Overlays-API](https://github.com/bpmn-io/diagram-js/blob/main/lib/features/overlays/Overlays.js).

**Vorteile:** geringe Diagrammlast, robuster bei dichten Diagrammen, klare Trennung
zwischen Indikator und Inhalt.
**Nachteile:** keine automatische Kollisionsvermeidung mit Labels/Linien/anderen Badges;
HTML-Overlays sind nicht automatisch Teil des normalen SVG-Exports – ein exportierbarer
Indikator bräuchte eine zusätzliche SVG-Darstellung.

## Entwurf 2 – Sichtbarer Kurzinhalt direkt am Element

![Entwurf 2](./concept-2-inline-label.svg)

Ein kurzer Text (z. B. `Beispielterm`, bei mehreren Annotationen `Beispielterm +2`)
erscheint direkt am Element. Vollständige Angaben und Bearbeitung bleiben im
Eigenschaftenpanel.

**Vorteile:** annotierter Inhalt ist im Diagramm selbst sofort sichtbar; als SVG-Grafik im
aktiven Diagrammlayer grundsätzlich exportierbar (anders als reine HTML-Overlays).
**Nachteile:** höhere Informationsdichte, größeres Risiko von Überlappungen bei vielen
Annotationen oder kleinem Zoom; Kürzungsregeln für lange Begriffe nötig.

## Gemeinsame Anforderungen (beide Entwürfe)

- Daten ausschließlich aus `term:` unter `bpmn:extensionElements`; BPMN-Core und BPMN-DI
  bleiben unverändert.
- Aktualisierung bei Import, Hinzufügen, Ändern, Undo/Redo und Entfernen von Annotationen.
- Tastaturzugang und programmatisch bestimmbarer Name/Rolle/Zustand; Hover allein reicht
  laut [WCAG 2.2, SC 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
  nicht aus.
- `bpmn:TextAnnotation`/`Association` werden nicht zur Duplizierung klinischer Inhalte
  genutzt, da sie zusätzliche Core-/DI-Strukturen erzeugen.
- Export-/SVG-Verhalten ist vor der technischen Auswahl zu testen.

## Erkenntnisse aus dem HL7 Field Guide (mit Seitenangaben)

Quelle: *HL7 Field Guide to Shareable Clinical Pathways*, Fassung 2025-10-31
(verlinkt in Issue #17).

| Seite(n) | Aussage des Leitfadens | Übertragung auf die Erweiterung |
|---|---|---|
| S. 15–16 | BPMN wurde gewählt, weil klinisches Personal die Diagramme mit minimalem Training lesen und auf Richtigkeit prüfen kann. | Spricht für ein ruhiges, wenig überladenes Diagramm (tendenziell Entwurf 1). |
| S. 26 | Die native BPMN/DMN-„Annotation“ ist ausschließlich erläuternder Text ohne Einfluss auf die Ausführung. | Bestätigt: klinische Semantik gehört in `term:`-Extensions, nicht in `bpmn:TextAnnotation`; ein neuer visueller Indikator ist ein eigenständiges UI-Element. |
| S. 82 („Information, Semantics, and Terminologies“) | Konzepte (Rollen, Beobachtungen, Interventionen, Diagnosen) sollen mit Standardvokabularen verknüpft werden, um Mapping/Lokalisierung zu erleichtern. | Annotierte Begriffe sollten erkennbar mit Terminologiesystem/Konzeptart verknüpft dargestellt werden, nicht nur als Freitext. |
| S. 93–94 (Asset Metadata Set) | „Used Vocabularies“ ist ein eigenes Metadatenfeld auf Modellebene. | Stützt die Idee, das Terminologiesystem auch in einer Übersicht/im Panel separat auszuweisen. |

Die HL7-Quelle macht **keine** Aussage dazu, ob ein Badge oder ein Kurzinhalt am Element
visuell vorzuziehen ist; das bleibt eine UI-Designentscheidung dieses Projekts.

## Weitere Quellen

- Iglesias, Juarez, Campos (2022): *Business Process Model and Notation and openEHR Task
  Planning for Clinical Pathway Standards in Infections: Critical Analysis*,
  [doi.org/10.2196/29927](https://doi.org/10.2196/29927).
- *On the Annotation of Health Care Pathways to Allow the Application of Care-Plans That
  Generate Data for Multiple Purposes* (2021),
  [doi.org/10.3389/fdgth.2021.688218](https://doi.org/10.3389/fdgth.2021.688218).
- WCAG 2.2: [Keyboard (2.1.1)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html),
  [Name, Role, Value (4.1.2)](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html),
  [Use of Color (1.4.1)](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- [bpmn-js-Overlay-Beispiel](https://github.com/bpmn-io/bpmn-js-examples/tree/main/overlays),
  [diagram-js Overlays.js](https://github.com/bpmn-io/diagram-js/blob/main/lib/features/overlays/Overlays.js),
  [bpmn-js BaseViewer.js (SVG-Export)](https://github.com/bpmn-io/bpmn-js/blob/develop/lib/BaseViewer.js).

## Status

Diese Seite deckt die Rechercheaufgabe und die zwei Pen-and-Paper-Entwürfe aus Issue #17
ab. Vergleich und begründete Designentscheidung sowie der konkrete technische
Umsetzungsplan sind noch offen (siehe Issue-Akzeptanzkriterien).
