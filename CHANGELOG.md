# Änderungen

## 0.1.0

Erste lesende Version für Saltcorn 1.6.2 und den Piwigo-16.5.0-API-Vertrag. Auslieferung als eigenständiges lokales Plugin, ohne Änderungen an bestehenden Plugins oder Produktivsystemen.

- **Ansicht:** Facility-Galerie, Listenmodus, Pagination, Sortierung und Detailvorschau.
- **Verbindung:** Eine Piwigo-Instanz, API-Key aus Server-Umgebungsvariable, begrenzte Anfragen.
- **Zuordnung:** Administrative JSON-Zuordnung von Saltcorn-Primärschlüssel zu Piwigo-Tag-ID.
- **Sicherheit:** Benutzer-/Datensatzprüfung, aktuelle Tag-Prüfung vor Bildern, keine Original-URLs und keine Piwigo-Schreibmethoden.
- **Diagnose:** Administrator-only Verbindungsprüfung und Tag-ID-Suche.
- **Prüfung:** Automatische Tests und lokale Saltcorn-/Browserprüfung gegen synthetischen Piwigo-Nachbau; produktive Piwigo-Prüfung offen.
