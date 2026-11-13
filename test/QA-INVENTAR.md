# QA-Inventar

Die Abnahme trennt automatische Vertragstests, echte Saltcorn-Ausführung und Piwigo-Nachbau. Die Piwigo-Fixture ist kein Nachweis einer realen Piwigo-Installation und kein Lasttest mit 120.000 Bilddateien.

## Zu prüfende Bedienabläufe

- **Modul-Key:** Passwortfeld, Speichern und Wiederöffnen; Verbindung und Bilder ohne gesetzte API-Key-Umgebungsvariable; keine Ausgabe in Galerie oder Diagnose. Leeres Feld verwendet weiterhin den bisherigen Umgebungsvariablenweg.
- **Feldzuordnung:** Wählbares Feld; `0042` exakt gegen `[0042]`, keine Nullenergänzung, keine Leerzeichenbereinigung, kein Teilstringvergleich.
- **Eindeutigkeit:** Fehlende Treffer, mehrere passende Tags oder mehrere Klammernummern im passenden Tag sperren den Zugriff.
- **Migration:** Bestehende JSON-Views unverändert; ausdrücklicher Moduswechsel, kein Fallback von Feldmodus auf JSON.
- **Installation:** Lokales Plugin in Saltcorn 1.6.2 registrieren; Plugin- und View-Konfiguration rendern.
- **Galerie:** Authentifiziert eine berechtigte Facility öffnen, erste Seite und Vorschaubilder prüfen.
- **Navigation:** Weiter und zurück; Seitenanzeige und andere Bild-IDs kontrollieren.
- **Sortierung:** Auswahl ändert die API-Sortierung und setzt die Seite zurück.
- **Ansichtswechsel:** Liste und Kacheln funktionieren ohne weiteren Vollabruf.
- **Details:** Öffnen, Vorschau und Beschreibung, Schließen per Button und Escape.
- **Aktualisierung:** Seite erneut laden; während des Abrufs keine irreführende Leermeldung.
- **Administration:** Diagnose und Tag-ID-Suche; normalen Benutzern nicht angeboten und serverseitig gesperrt.
- **Fehlerfälle:** Fehlende Zuordnung, fehlendes Recht, entfernte Tag-Mitgliedschaft, Piwigo-Ausfall.
- **Mobil:** 375 px, keine horizontale Überbreite, erreichbare Bedienelemente und Dialog.
- **Desktop:** 1280 px oder breiter, lesbare Galerie und Listenansicht.
- **Netzwerk:** Browser erhält keine Piwigo-Zugangsdaten oder direkten Bild-URLs; alle Bilddaten über authentifizierte Saltcorn-Routen.

## Sicherheitsprüfungen

- **Datensatzrechte:** Echte Saltcorn-Besitzerprüfung mit zwei Benutzern.
- **Manipulation:** Fremde Datensatz-ID, fremde Bild-ID und beliebige Tag-ID.
- **Rechteentzug:** Bild mit entfernter Facility-Zuordnung wird nicht mehr ausgeliefert.
- **Netzwerkgrenzen:** Keine externen Bildhosts, keine Redirects, keine Schreibmethoden.
- **Ausgabe:** Texte escaped; SVG/HTML nicht als Bild ausgeliefert; keine Originaldatei als Fallback.
- **Grenzen:** Antwortgröße, Seitengröße, Timeouts und begrenzte Anfragewarteschlange.
