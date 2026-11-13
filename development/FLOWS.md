# Bedienabläufe und Abnahme 0.2.0

Die bestehende Galerie wurde vor Änderung lokal geöffnet: erste Seite, zwölf Karten und Seitennavigation sind vorhanden. Piwigo wird für die Tests ausschließlich synthetisch nachgebildet.

## Feldbasierte Zuordnung
- In der View-Konfiguration „Feldwert = [NNNN]“ wählen und `facilitynr` auswählen.
- Datensatz mit `facilitynr="0042"` öffnen: Schlagwort `[0042] Testanlage` und dessen Bilder erscheinen.
- Datensatz-ID ist unabhängig von der Facilitynummer; keinerlei Auffüllen, Kürzen oder Trimmen.
- `42`, Leerzeichen, Teilstrings, fehlende oder mehrdeutige Tags dürfen keine Bilder freigeben.
- Bestehende Views ohne neuen Modus behalten ihre administrative JSON-Zuordnung.

## Galerie
- Als berechtigter Benutzer öffnen: Karten und Vorschaubilder erscheinen.
- Weiter, Zurück, Sortierung und Aktualisieren auslösen: passende Seitennummer und Bilder.
- Liste und Kacheln umschalten: vorhandene Karten bleiben bedienbar.
- Bilddetails öffnen und mit Schließen sowie Escape schließen: Vorschau und Beschreibung als Text.

## Konfiguration und Administration
- Plugin- und View-Konfiguration öffnen und speichern; Feldwahl und Modus bleiben erhalten.
- Verbindung prüfen und Schlagworte suchen: Ergebnisse nur für Administratoren.
- Nicht berechtigten Datensatz und fehlende Zuordnung öffnen: verständlicher Hinweis, keine Bilder.

## Mobil und Sicherheitsgrenzen
- Bei 375 px Breite Galerie und Dialog bedienen; keine horizontale Überbreite.
- Direkte Routen müssen Rollen-, Besitzer- und CSRF-Prüfung beibehalten.
- Änderungen von Feldwert, Tagname oder Bildmitgliedschaft dürfen nicht durch Cache verborgen werden.
