# Prüfbericht: saltcorn-piwigo 0.3.1

Prüfdatum der Zoom-Erweiterung: 14. November 2026. Die Ergebnisse beziehen sich auf dieses lokale Plugin-Paket; es wurde weder im Produktiv-Saltcorn installiert noch mit der produktiven Piwigo-Instanz verbunden.

## Abnahme der Zoom-Freigabe 0.3.1

207 automatisierte Tests bestanden, ohne ausgelassene Tests. Der Lauf steht in `development/evidence/unit-tests-0.3.1.tap`; die wiederholbare Zoom-Browserprüfung liegt in `development/zoom-regression.js`.

- **View-Konfiguration:** Checkbox aktiviert, gespeichert, wieder geöffnet und ausgeschaltet; ohne Freigabe keine Zoom-Bedienleiste.
- **Berechtigte Betrachter:** Normaler Benutzer kann nach Freigabe zoomen, erhält aber weiterhin keine Admin-Zuordnungszeile; fremder Datensatz bleibt gesperrt.
- **Zoom-Bedienung:** Sämtliche Stufen und Grenzen, Verkleinern und Einpassen geprüft. Vergrößerter Ausschnitt scrollbar, Pfeiltaste im fokussierten Bildbereich löst keinen Bildwechsel aus.
- **Rücksetzen:** Nach Bildwechsel und Schließen/Wiederöffnen wieder 100 Prozent.
- **Medienzugriff:** Dieselbe Blob-Bildadresse beim Zoomen; keine neue Preview-Anfrage. Bei synthetischem Medienfehler bleiben alle Zoomknöpfe deaktiviert, Admin-Diagnose bleibt erreichbar.
- **Responsive Ansicht:** Desktop 1280 × 900 und mobil 375 × 812, einschließlich Fensterverkleinerung bei aktivem 200-%-Zoom; keine horizontale Überbreite von Seite oder Dialog. Bildausschnitt hat absichtlich eigene Scrollbereiche.
- **Regression:** `development/browser-regression.js` bestanden; Galerie-Pagination, Liste/Kacheln, Aktualisierung, Diagnose, Tag-Suche sowie Legacy-View und deren fehlende Zuordnung erneut geprüft. Keine JavaScript-Pageerrors.

Die Nachweise `v031-desktop-zoom.png` und `v031-mobile-zoom.png` zeigen ausdrücklich synthetische Bilder. Die nachfolgenden Abschnitte dokumentieren die bisherigen Versionen; deren Testläufe bleiben zur Nachvollziehbarkeit erhalten.

## Ergebnis

Die erweiterte lesende Version wurde unter Node.js 20.20.2 mit einer echten lokalen Saltcorn-1.6.2-Installation auf SQLite erprobt. Piwigo wurde durch einen synthetischen HTTP-Nachbau des benötigten 16.5.0-API-Vertrags ersetzt.

Die automatischen Tests prüfen Eingabevalidierung, Rollen, Datensatzkontext, Tag-Mitgliedschaft, Pagination, URL-Grenzen, Geheimnisschutz, Ausgabe, Timeouts, Ressourcenlimits und die Sperre von Schreibmethoden. Hinzu kommen exakte Feld-/Klammervergleiche, Bestandskompatibilität, Modul-Key, URL-Diagnose, sichere HTTPS-Korrektur sowie die neuen Anzeigevorlagen und Größenoptionen; der aktuelle Testlauf steht in `development/evidence/unit-tests-0.3.0.tap`.

## Abnahme der neuen Anzeigeoptionen

Die neue Version wurde in der bestehenden lokalen Saltcorn-Installation geladen, ohne deren Verbindungsdaten zu ersetzen. Die folgenden Prüfungen betreffen 0.3.0; die danach aufgeführten Basisprüfungen und älteren Bildnachweise dokumentieren zusätzlich die Entwicklung der Vorgängerversionen.

| Bereich | Prüfergebnis |
|---|---|
| Admin-Fußzeile | Bei 1280 px neben der Navigation und rechtsbündig, bei 375 px darunter; keine horizontale Überbreite |
| Normale Benutzer | Kein Zuordnungselement, keine `assignment`-Daten in der Listenantwort, kein Diagnosebutton |
| Konfiguration | Separate Vorlagen, Datumsformat, Variante, Breite und Höhe im echten Saltcorn-Formular gespeichert und erneut geöffnet |
| Vorlagen | Dateiname, Titel, Aufnahme-/Importdatum, Beschreibung und Abmessungen angezeigt; Beschreibung mit HTML als Klartext |
| Leere Vorlagen | Beide Unterschriften nach Speichern leerer Felder ausgeblendet |
| Abschaltbare Navigation | Buttonleiste ausgeblendet; Pfeiltaste verändert das Bild nicht |
| Seitengrenzen | Bild 12 → 13 sowie 13 → 12 per Button/Pfeiltaste; Sortierwert `filename` bleibt beim Folgeseitenabruf erhalten |
| Anfang/Ende | Erster Treffer ohne Zurück; letzter Treffer ohne Weiter, kein Umlauf |
| Fehlerfälle | Synthetischer Seitenausfall wiederholbar; gesperrte Vorschau mit bedienbarer Diagnose/Navigation; verschwundene Folgeseite mit Aktualisierungshinweis |
| Tastatur | Fokus bleibt beim Navigieren im Dialog; Escape schließt; erneutes Öffnen funktioniert |
| Bildgröße | 1200 px Dialogbreite und 75 % maximale Bildhöhe geprüft; mobil begrenzt. Nicht vorhandenes `xlarge` fällt auf vorhandenes `medium` zurück |
| Zugriffsschutz | Fremder Datensatz und Admin-Diagnose als normaler Benutzer: HTTP 403. Ohne CSRF-Token: HTTP 302 auf Startseite, keine Bilderantwort |
| Regression | Galerie-Pagination, Kacheln/Liste, Aktualisierung, Sortierung, Verbindungstest, Tag-Suche, Legacy-View sowie fehlende/ungültige Zuordnung erneut bedient |
| Browser | Chromium bei 1280 × 900 und 375 × 812; keine JavaScript-Pageerrors in den geprüften Abläufen |

`development/browser-regression.js` enthält die wiederholbare Navigationsregression für eine bereits angemeldete Playwright-Seite der lokalen Fixture. Für Anfang/Ende werden Browserantworten auf 14 synthetische Treffer begrenzt; Fehlerfälle werden ebenfalls nur lokal simuliert.

Die neuen Screenshots heißen `v030-desktop-footer.png`, `v030-desktop-detail.png`, `v030-mobile-footer.png` und `v030-mobile-detail.png`. Bei großen gewählten Bildern oder langen Unterschriften ist internes Scrollen im Dialog beabsichtigt; die Bedienleiste bleibt sichtbar.

## Ausgeführte Prüfungen

| Bereich | Ergebnis und genaue Reichweite |
|---|---|
| JavaScript-Syntax | `node --check` für Einstiegspunkt, Bibliotheken und Testskripte erfolgreich |
| Automatische Tests | 201 Tests erfolgreich, keine übersprungenen Tests |
| Saltcorn-Installation | Bestehenden lokalen Testeintrag gezielt mit `Plugin.requirePlugin(plugin, true)` aktualisiert; Version 0.3.0 geprüft, vorhandene Plugin-Konfiguration erhalten |
| i.php-Adresse | HTTPS-Adresse mit Bildpfad in der Query bei passender API-Herkunft akzeptiert; Query bleibt unverändert |
| Differenzierte URL-Prüfung | Protokoll, Host, Port, Installationspfad, Prozentkodierung, Zugangsdaten und Fragment geprüft |
| Optionale HTTPS-Korrektur | Automatisierter Request-Test bestätigt HTTPS-Ziel und unveränderten API-Key-Header; fremde Hosts, Sonderports und gesperrte Pfade bleiben abgelehnt; Standard aus |
| Admin-Bilddiagnose | In Saltcorn bei erlaubten und abgelehnten Fixture-Adressen geöffnet; tatsächlich ausgewählte Varianten und geladene Basis sichtbar, ohne Medienabruf durch die Diagnose |
| Diagnose-Geheimnisschutz | Query, Credentials, Fragment sowie im Pfad eingebetteter Test-Key werden nicht ausgegeben; Datensatz- und Bildmitgliedschaftsprüfung bleiben aktiv |
| Modul-Key-Eingabe | Tatsächliches Passwortfeld in Saltcorn 1.6.2; Speichern, Wiederöffnen ohne Wertverlust, Leeren und erneutes Setzen erfolgreich |
| Betrieb ohne Umgebungsvariable | Saltcorn-Prozess ausdrücklich mit `env -u PIWIGO_API_KEY` gestartet; Diagnose, Tags, Galerie, zwölf dekodierte Vorschaubilder und Detailansicht erfolgreich mit Key aus Modulkonfiguration |
| Key-Auswahl | Modul-Key hat Vorrang; leeres Feld verwendet alternative Umgebungsvariable; ungültige Werte werden ohne Ausweichversuch abgelehnt |
| Geheimnisschutz | Key nicht im Galerie-HTML für Administrator oder normalen Benutzer; nicht in Diagnose oder abgefangenen API-Fehlern; normale Benutzer erhalten kein Modul-Key-Formular |
| Konfigurationsformulare | Plugin- und View-Workflow erzeugt, im Browser gespeichert; Moduswechsel blendet JSON-Feld beziehungsweise Feldwahl passend ein |
| Exakter Vergleich | Datensatz 817 mit String `0042` findet ausschließlich Tag 123 mit `[0042] Testanlage`; Primärschlüssel und Browserparameter ersetzen den Feldwert nicht |
| Keine Normalisierung | `42`, Leerzeichen einschließlich Zeilenumbruch, falsche Länge, Nicht-ASCII-Ziffern und geklammerter Saltcorn-Feldwert abgelehnt |
| Teilstrings | `[42]`, `[00420]`, `[00042]`, `[0042-01]` und `[[0042]]` ergeben keinen Treffer |
| Mehrdeutigkeit | Zwei Tags mit derselben Nummer oder mehrere gültige Klammernummern in einem passenden Tag blockieren Listen-, Detail- und Medienzugriff |
| Änderungen | Änderung des Feldwerts, Umbenennung eines Tags zwischen Auflösung und Bildprüfung und Entfernen der Bildmitgliedschaft geprüft; kein dauerhafter Zuordnungscache |
| Bestandsmodus | Bestehende JSON-Galerie und deren Leermeldung erneut im Browser geprüft; alte Formulare behalten den manuellen Standard |
| Besitzerrechte | Reale Saltcorn-Tabelle mit Besitzerfeld: eigener Datensatz erlaubt, fremder Datensatz verweigert, Administratorzugriff erlaubt |
| Anonyme Zugriffe | Kein Galeriezugriff; Saltcorn-Routen verweigern beziehungsweise leiten um |
| CSRF | Anfrage ohne Token mit HTTP 302 auf `/` abgefangen; Server protokolliert `invalid csrf token`. Ein Client mit automatischer Weiterleitung sieht anschließend HTTP 200 der Startseite, nicht eine erfolgreiche Bilderantwort |
| Direkte Routenzugriffe | Fremder Datensatz und administrative Tag-Suche als Nichtadministrator mit HTTP 403 abgelehnt |
| Galerie | Erste Seite und zwölf Vorschaubilder im Browser erfolgreich geladen |
| Pagination | Seite 2 liefert andere Bild-IDs; Zurück funktioniert; API-Test berücksichtigt serverseitig auf 20 reduzierte Seitengröße |
| Große Trefferzahl | Nachbau meldet 120.000 Bilder; erste, zweite und letzte API-Seite geprüft, ohne den gesamten Bestand an den Client zu übertragen |
| Sortierung | Vier Sortierwerte und serverseitige Seitengröße geprüft; Browserauswahl setzt Seitenzustand zurück und löst neue Abfrage aus |
| Kacheln/Liste | Wechsel in beide Richtungen geprüft |
| Detailvorschau | Bilddetails und größere Vorschau geladen; Beschreibung als Text, Schließen per Button und Escape |
| Diagnose | Piwigo-Version, technischer Benutzer und Rolle aus dem Nachbau angezeigt |
| Tag-ID-Suche | Teilzeichenfolgensuche liefert erwartete ID; Ausgabe nur für Administratoren |
| Fehlende Zuordnung | Expliziter Hinweis, keine unbeschränkte Bildabfrage |
| Entfernte Zuordnung | Automatische Tests verweigern Details und Bilddaten nach Entfernung der Facility-Tag-Mitgliedschaft |
| Desktop | Aktuelle Browserprüfung mit 1280 × 900 Pixeln |
| Mobil | Browserprüfung mit 375 × 812 Pixeln; Dokumentbreite 375 Pixel, keine horizontale Überbreite; Detaildialog passt in den Bildschirm |
| Browserfehler | Keine JavaScript-Pageerrors während der dokumentierten Bedienabläufe |

Die Screenshots in `development/evidence/` zeigen die Galerie in der echten lokalen Saltcorn-Oberfläche mit ausdrücklich synthetischen Testbildern. Sie dokumentieren keine echten Anlagenbilder und keine Verbindung zu einer produktiven Piwigo-Installation.

Die neuen Nachweise heißen `field-desktop-0.2.0.png` und `field-mobile-0.2.0.png`; ältere Screenshots dokumentieren den Bestandsmodus. Die Browserprüfungen folgten `development/FLOWS.md`, einschließlich Feldkonfiguration, Galerie, Diagnose, Suche, Fehlern, Mobilansicht und Besitzerrechten.

Für 0.2.1 wurden Modulkonfiguration, Galeriebedienung, Vorschauen, Diagnose, Suche, Bestandsmodus, Mobilbreite und die Ablehnung fremder Datensätze/administrativer Funktionen erneut geprüft. `module-key-0.2.1.png` zeigt das neue maskierte Konfigurationsfeld; sämtliche dabei verwendeten Schlüssel sind synthetische Fixture-Werte und keine echten Zugangsdaten.

Die neue Aufnahme `media-diagnostic-0.2.2.png` dokumentiert den administrativen Diagnoseablauf bei absichtlich abweichender Fixture-Bildherkunft. Die URL-Diagnose wurde auch bei 375 px ohne horizontale Überbreite geprüft; die HTTPS-Korrektur ist auf Request-Ebene mit simuliertem Fetch getestet, nicht als echte TLS-Verbindung zur Produktivinstanz.

Für den Feldtest wurde ausschließlich die neue synthetische Tabelle `facility_field_qa` angelegt, Zeilenzahl 0 auf 4. Die vorhandene Fixture-Tabelle `facility_qa` wurde nicht geändert; `test/setup-field-saltcorn.js` verweigert das Überschreiben bereits bestehender Feld-Fixtures.

## API-Prüfung

Die benötigten Methodennamen und Parameter wurden im Piwigo-16.5.0-Quellstand nachgesehen, einschließlich Tag-Seitenabfrage, Bildinformationen und Sitzungsstatus ([Piwigo 16.5.0 API-Deklarationen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/ws.php), [Sitzungsfunktionen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/ws_functions/pwg.php)).

Die Bilddetail-Implementierung prüft in diesem Versionsstand sichtbare Bilder und verfügbare Kategorien; eine leere Menge gefundener Tag-IDs führt in der Tag-Hilfsfunktion zu einer leeren Bildmenge, nicht zu einem unbeschränkten Bestand ([Bildinformationen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/ws_functions/pwg.images.php), [Tag-Hilfsfunktionen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/functions_tag.inc.php)).

Die geprüfte Standardkonfiguration begrenzt API-Bildseiten auf maximal 500 Bilder und führt die vom Plugin benötigten Leseoperationen nicht in der Standardliste gesperrter API-Key-Methoden ([Piwigo-16.5.0-Konfiguration](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/config_default.inc.php)).

## Noch nicht nachgewiesen

- **Reales Piwigo:** Login per echtem API-Key, reale Bildauslieferung und konkrete Album-/Privatsphärenregeln der Zielinstallation.
- **Aktueller Bildadressenfehler:** Die vom Nutzer genannte Browser-Bildadresse wird mit dessen angegebener Basis bereits akzeptiert. Der tatsächliche API-Rückgabewert beziehungsweise die geladene Konfiguration des Zielservers ist noch nicht bekannt; eine produktive Fehlerbehebung wird daher nicht behauptet.
- **Gemeldete Installationsfehler:** Die lokale Registrierung und beide Konfigurationsworkflows funktionieren; damit ist die Ursache der früher gemeldeten Ladefehler auf dem Zielserver nicht nachgewiesen oder behoben.
- **Produktivdatenmenge:** Laufzeit, CPU-/Speicherlast und Parallelbetrieb mit tatsächlich 120.000 Bilddateien; die Fixture simuliert die API-Trefferzahl.
- **Zusätzliche Schlagwortlast:** Im Feldmodus wird die sichtbare Tag-Liste je Abruf neu gelesen. Last und Latenz mit echten Tags und parallelen Nutzern sind noch zu messen.
- **PostgreSQL:** Die lokale Saltcorn-Integration lief auf SQLite, nicht auf PostgreSQL. Das Plugin verwendet die Saltcorn-Modelle und enthält keine eigenen Datenbankabfragen.
- **Besondere Infrastruktur:** Reverse Proxy, Medien-CDN, zusätzliche Piwigo-Bildschutz-Plugins und abweichende Authentifizierung.
- **Andere Plattformen:** Kein separater Lauf unter Node.js 18, anderen Saltcorn-Versionen oder mobilen Betriebssystem-Browsern.
- **Gesamtsicherheitsaudit:** Die verwendeten Saltcorn-/Piwigo-/Node-Komponenten wurden nicht umfassend auditiert.

## Empfohlene Pilotabnahme

Das Paket zunächst in einer Testinstanz mit einem eingeschränkten normalen Piwigo-Konto installieren. Anschließend mindestens eine kleine, eine umfangreiche und eine gesperrte Facility prüfen; direkte Piwigo-Dateiadressen zusätzlich ohne Anmeldung auf Vertraulichkeit testen.

Erst nach dieser Prüfung für weitere Facilities freigeben. Echte API-Keys und personenbezogene Bilddaten waren weder Bestandteil der lokalen Tests noch des ausgelieferten Pakets.
