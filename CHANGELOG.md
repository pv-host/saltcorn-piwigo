# Änderungen

## 0.3.1

Optionale Bildvergrößerung in der Einzelbildansicht. Die vorhandene Darstellung bleibt ohne ausdrückliche Aktivierung in der View-Konfiguration unverändert.

- **Freigabe:** Neue Checkbox „Vergrößern in der Einzelbildansicht erlauben“, Standard aus; gilt für alle berechtigten Betrachter dieser View.
- **Bedienung:** Vergrößern, Verkleinern, Einpassen; 100/150/200/300/400 Prozent, verschiebbarer Bildausschnitt. Bildwechsel und erneutes Öffnen setzen zurück.
- **Sicherheit:** Nur lokale Skalierung der bereits geladenen Vorschau. Keine neuen API-Methoden, zusätzlichen Bildabrufe oder Originaldateien.
- **Prüfung:** 207 automatisierte Tests bestanden; tatsächliches Speichern/Ausschalten der Checkbox, normaler Benutzer, Zoom-Grenzen, Fehlerfälle, Navigation und Desktop-/Mobilansicht lokal in Saltcorn 1.6.2 geprüft.

## 0.3.0

Konfigurierbare Bildunterschriften und Einzelbilddarstellung sowie eine zurückhaltende Admin-Fußzeile. Verbindungsdaten, exakter vierstelliger Vergleich und rein lesender Zugriff bleiben erhalten.

- **Fußzeile:** Zuordnung rechtsbündig neben der Seitennavigation, mobil darunter. Nur Administratoren; die Listenantwort normaler Benutzer enthält keine `assignment`-Daten mehr.
- **Textvorlagen:** Separate Vorschau-/Einzelbildvorlagen, beide Datumsfelder, Dateiname, Titel, Beschreibung, Abmessungen, Bild-ID und Facility-Anzeigename. Leere Vorlagen blenden Unterschriften aus; sichere Textausgabe ohne HTML-Ausführung.
- **Navigation:** Vorheriges/nächstes Bild und Pfeiltasten, auch über Seitengrenzen; konfigurierbar abschaltbar, sichere Grenzen und Wiederholungsmöglichkeit nach Abruffehlern.
- **Bildgröße:** Konfigurierbare Piwigo-Variante, maximale Dialogbreite und Bildhöhe. Nur gleich große oder kleinere Ersatzvarianten; keine Originaldownloads.
- **Kompatibilität:** Fehlende neue Einstellungen verwenden Standardwerte. Bei `medium` entfällt der bisherige Ersatz durch die größere Variante `large`; stattdessen werden kleinere Varianten gewählt.
- **Prüfung:** 201 automatisierte Tests sowie lokale Saltcorn-1.6.2-Browserregression mit synthetischer Piwigo-API. Kein Produktionstest.

## 0.2.2

Präzisere Diagnose abgelehnter Piwigo-Bildadressen und eine optionale HTTPS-Korrektur für Reverse-Proxy-Situationen. Die vom Nutzer beschriebene HTTPS-Adresse mit `i.php?...` wird bereits von der bisherigen URL-Prüfung akzeptiert; die tatsächlich abweichende API-Adresse der Zielinstallation ist noch zu ermitteln.

- **Fehlertexte:** Unterscheiden Protokoll, Hostname, Port, Installationspfad, Zugangsdaten/Fragment und Prozentkodierung.
- **Admin-Diagnose:** „Bildadresse prüfen“ in den Bilddetails zeigt geladene Plugin-Version, API-Basis, ausgewählte Thumbnail-/Preview-Adressen und den konkreten Ablehnungsgrund; keine Query oder Geheimnisse.
- **HTTPS-Korrektur:** Standardmäßig aus; nur gleicher Host, Standardports und HTTPS-API-Basis. Keine Hostfreigabe, keine Weiterleitungen und keine Umstellung auf HTTP.
- **API-Key-Hilfe:** Konfigurationsfeld nennt ausdrücklich das Format `pkid-...:SCHLUESSEL`.
- **Prüfung:** 183 automatische Tests bestanden; lokale Saltcorn-/Browserprüfung gegen erlaubte und abweichende synthetische Bildadressen. Kein Nachweis einer Behebung auf dem Produktivserver.

## 0.2.1

Der API-Key kann direkt in der Saltcorn-Modulkonfiguration eingegeben werden. Der exakte vierstellige Facility-Abgleich und der rein lesende Piwigo-Betrieb bleiben unverändert.

- **Eingabe:** Maskiertes Feld „Piwigo-API-Key“; gespeicherter Wert beim Wiederöffnen erhalten.
- **Bestandsschutz:** Leeres Feld verwendet weiterhin die bisherige Umgebungsvariable; ein eingegebener Modul-Key hat Vorrang.
- **Fehlerbehandlung:** Keine Ausgabe des Keys in Galerie, Diagnose oder Fehlern; kein stiller Ersatzversuch bei ungültigem Modul-Key.
- **Speicherung:** Keine zusätzliche Plugin-Verschlüsselung; Hinweis zum Schutz der Konfiguration, Datenbank und Backups.
- **Prüfung:** 159 automatische Tests bestanden; tatsächliche Saltcorn-1.6.2-Konfiguration sowie Galerie mit Modul-Key ohne API-Key-Umgebungsvariable geprüft, gegen synthetische Piwigo-Fixture.

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
