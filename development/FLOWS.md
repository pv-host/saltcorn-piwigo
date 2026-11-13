# Bedienabläufe und Abnahme 0.2.0

## Erweiterung 0.3.0: Anzeige und Einzelbildnavigation
- Administrator: Zuordnung rechtsbündig neben der Seitennavigation, mobil darunter. Normale Benutzer erhalten weder Element noch Zuordnungsdaten.
- Separate Vorlagen für Vorschau und Einzelbild speichern, wieder öffnen und mit Aufnahmedatum, Dateiname, Beschreibung und Abmessungen prüfen. Leere Vorlage blendet die Unterschrift aus; HTML bleibt Text.
- Datum ohne Zeitzonenverschiebung; fehlendes Aufnahmedatum bleibt bei {date_creation} leer.
- Einzelbild: vor/zurück per Schaltfläche und Pfeiltaste, einschließlich Seitengrenze in beiden Richtungen; erster/letzter Treffer ohne Umlauf.
- Navigation abschaltbar. Escape, Schließen und erneutes Öffnen brechen alte Abrufe ab.
- Variante, Dialogbreite und maximale Bildhöhe konfigurieren; mobile Begrenzung und kleinere Ersatzvariante prüfen.
- Fehlerfälle: fehlendes Bild, ausfallender Seitenabruf, geänderte Treffermenge und verweigerter Zugriff; Diagnose und Schließen bleiben bedienbar.
- Bestehende Hauptabläufe unten wiederholen; Screenshots bei 1280 und 375 px prüfen.

## Erweiterung 0.2.2: Abgelehnte Bildadressen
- Piwigo-Adresse der Form `/i.php?/piwigo-galleries/...-xl.jpg` bleibt bei passender Herkunft erlaubt.
- Neue HTTPS-Korrektur standardmäßig aus; nur gleicher Host und Standardports werden optional von HTTP auf HTTPS umgesetzt.
- Bilddetails zeigen „Bildadresse prüfen“ nur für Administratoren, auch wenn die Bildauslieferung scheitert.
- Diagnose zeigt Plugin-Version, geladene API-Basis und tatsächlich ausgewählte API-Vorschauadressen ohne Query, Credentials oder Fragment.
- Fremde Benutzer, Datensätze und nicht zugeordnete Bilder bleiben gesperrt; Diagnose ruft keine Bildadresse ab.
- Konkrete Fehlerursachen unterscheiden Protokoll, Host, Port, Pfad und Kodierung; keine pauschale Domainfreigabe.

## Erweiterung 0.2.1: API-Key in der Modulkonfiguration
- Maskiertes Feld „Piwigo-API-Key“, Speichern und Wiederöffnen ohne Wertverlust.
- Verbindung, Tags, Galerie und Bildvorschau funktionieren ohne API-Key-Umgebungsvariable.
- Eingegebener Modul-Key hat Vorrang; ungültiger Key löst keinen Ersatzversuch aus.
- Leeres Feld erhält die bisherige Umgebungsvariablen-Alternative.
- Keine Ausgabe des Keys in Galerie-HTML, Diagnose, Fehlerantworten oder normalen Benutzerrouten.
- Warnhinweis zur Speicherung in der Modulkonfiguration und zum Schutz von Datenbank/Backups.

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
