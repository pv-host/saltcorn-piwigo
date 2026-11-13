# Änderungen

## 0.2.0

Feldbasierte Zuordnung entsprechend der Anforderung eines exakten 1:1-Vergleichs vierstelliger Nummern. Die Erweiterung bleibt vollständig lesend gegenüber Piwigo und verändert keine vorhandenen Saltcorn-Tabellen.

- **Nummernfeld:** Pro View wählbar, Vorschlag `facilitynr`; Vergleich mit genau `[NNNN]` innerhalb des Piwigo-Schlagwortnamens.
- **Keine Normalisierung:** `0042` passt zu `[0042]`; `42`, Leerzeichen, andere Längen und Teilstrings passen nicht. Führende Nullen bleiben erhalten.
- **Eindeutigkeit:** Fehlende Tags, doppelte passende Tags und mehrere Klammernummern im passenden Tag führen zu verständlichen Fehlern ohne Bilderfreigabe.
- **Aktualität:** Nummer aus berechtigungsgeprüftem Datensatz und Schlagwortliste bei jedem Abruf frisch gelesen; vor Medienauslieferung zusätzlich aktuelle Bildmitgliedschaft und Klammernummer geprüft.
- **Anzeige:** Erkannte Verbindung aus Feldname, Nummer und Schlagwort oberhalb der Galerie.
- **Migration:** Alte JSON-Views bleiben unverändert; Feldmodus wird ausdrücklich gewählt und verwendet keinen JSON-Fallback.
- **Sicherheit:** Neue Vertrauensgrenze des bearbeitbaren Nummernfelds dokumentiert; dessen Schreibrechte müssen administrativ geschützt werden.
- **Prüfung:** 138 automatisierte Tests bestanden; lokale Saltcorn-1.6.2-/Browserprüfung mit synthetischer Piwigo-Fixture, nicht mit produktivem Piwigo.

## 0.1.0

Erste lesende Version für Saltcorn 1.6.2 und den Piwigo-16.5.0-API-Vertrag. Auslieferung als eigenständiges lokales Plugin, ohne Änderungen an bestehenden Plugins oder Produktivsystemen.

- **Ansicht:** Facility-Galerie, Listenmodus, Pagination, Sortierung und Detailvorschau.
- **Verbindung:** Eine Piwigo-Instanz, API-Key aus Server-Umgebungsvariable, begrenzte Anfragen.
- **Zuordnung:** Administrative JSON-Zuordnung von Saltcorn-Primärschlüssel zu Piwigo-Tag-ID.
- **Sicherheit:** Benutzer-/Datensatzprüfung, aktuelle Tag-Prüfung vor Bildern, keine Original-URLs und keine Piwigo-Schreibmethoden.
- **Diagnose:** Administrator-only Verbindungsprüfung und Tag-ID-Suche.
- **Prüfung:** Automatische Tests und lokale Saltcorn-/Browserprüfung gegen synthetischen Piwigo-Nachbau; produktive Piwigo-Prüfung offen.
