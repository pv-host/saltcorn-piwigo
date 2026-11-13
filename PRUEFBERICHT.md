# Prüfbericht: saltcorn-piwigo 0.1.0

Prüfdatum: 11. November 2026. Die Ergebnisse beziehen sich auf dieses lokale Plugin-Paket; es wurde weder im Produktiv-Saltcorn installiert noch mit der produktiven Piwigo-Instanz verbunden.

## Ergebnis

Die erste lesende Version wurde unter Node.js 20.20.2 mit einer echten lokalen Saltcorn-1.6.2-Installation auf SQLite erprobt. Piwigo wurde durch einen synthetischen HTTP-Nachbau des benötigten 16.5.0-API-Vertrags ersetzt.

Die automatischen Tests prüfen Eingabevalidierung, Rollen, Datensatzkontext, Tag-Mitgliedschaft, Pagination, URL-Grenzen, Geheimnisschutz, Ausgabe, Timeouts, Ressourcenlimits und die Sperre von Schreibmethoden. Der vollständige Testlauf steht in `development/evidence/unit-tests.tap`.

## Ausgeführte Prüfungen

| Bereich | Ergebnis und genaue Reichweite |
|---|---|
| JavaScript-Syntax | `node --check` für Einstiegspunkt, Bibliotheken und Testskripte erfolgreich |
| Automatische Tests | 83 Tests erfolgreich, keine übersprungenen Tests |
| Saltcorn-Installation | Lokales Paket über `saltcorn install-plugin -d …` in Saltcorn 1.6.2 registriert |
| Konfigurationsformulare | Plugin- und View-Workflow mit echten Saltcorn-Modellen erzeugt; View-Formular im Browser geöffnet, JSON-Feld als Textarea bestätigt |
| Besitzerrechte | Reale Saltcorn-Tabelle mit Besitzerfeld: eigener Datensatz erlaubt, fremder Datensatz verweigert, Administratorzugriff erlaubt |
| Anonyme Zugriffe | Kein Galeriezugriff; Saltcorn-Routen verweigern beziehungsweise leiten um |
| CSRF | Anfrage ohne Token von Saltcorn abgefangen; Server protokolliert `invalid csrf token` |
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
| Desktop | Browserprüfung mit 1360 × 960 Pixeln |
| Mobil | Browserprüfung mit 375 × 812 Pixeln; Dokumentbreite 375 Pixel, keine horizontale Überbreite; Detaildialog passt in den Bildschirm |
| Browserfehler | Keine JavaScript-Pageerrors während der dokumentierten Bedienabläufe |

Die Screenshots in `development/evidence/` zeigen die Galerie in der echten lokalen Saltcorn-Oberfläche mit ausdrücklich synthetischen Testbildern. Sie dokumentieren keine echten Anlagenbilder und keine Verbindung zu einer produktiven Piwigo-Installation.

## API-Prüfung

Die benötigten Methodennamen und Parameter wurden im Piwigo-16.5.0-Quellstand nachgesehen, einschließlich Tag-Seitenabfrage, Bildinformationen und Sitzungsstatus ([Piwigo 16.5.0 API-Deklarationen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/ws.php), [Sitzungsfunktionen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/ws_functions/pwg.php)).

Die Bilddetail-Implementierung prüft in diesem Versionsstand sichtbare Bilder und verfügbare Kategorien; eine leere Menge gefundener Tag-IDs führt in der Tag-Hilfsfunktion zu einer leeren Bildmenge, nicht zu einem unbeschränkten Bestand ([Bildinformationen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/ws_functions/pwg.images.php), [Tag-Hilfsfunktionen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/functions_tag.inc.php)).

Die geprüfte Standardkonfiguration begrenzt API-Bildseiten auf maximal 500 Bilder und führt die vom Plugin benötigten Leseoperationen nicht in der Standardliste gesperrter API-Key-Methoden ([Piwigo-16.5.0-Konfiguration](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/config_default.inc.php)).

## Noch nicht nachgewiesen

- **Reales Piwigo:** Login per echtem API-Key, reale Bildauslieferung und konkrete Album-/Privatsphärenregeln der Zielinstallation.
- **Produktivdatenmenge:** Laufzeit, CPU-/Speicherlast und Parallelbetrieb mit tatsächlich 120.000 Bilddateien; die Fixture simuliert die API-Trefferzahl.
- **PostgreSQL:** Die lokale Saltcorn-Integration lief auf SQLite, nicht auf PostgreSQL. Das Plugin verwendet die Saltcorn-Modelle und enthält keine eigenen Datenbankabfragen.
- **Besondere Infrastruktur:** Reverse Proxy, Medien-CDN, zusätzliche Piwigo-Bildschutz-Plugins und abweichende Authentifizierung.
- **Andere Plattformen:** Kein separater Lauf unter Node.js 18, anderen Saltcorn-Versionen oder mobilen Betriebssystem-Browsern.
- **Gesamtsicherheitsaudit:** Die verwendeten Saltcorn-/Piwigo-/Node-Komponenten wurden nicht umfassend auditiert.

## Empfohlene Pilotabnahme

Das Paket zunächst in einer Testinstanz mit einem eingeschränkten normalen Piwigo-Konto installieren. Anschließend mindestens eine kleine, eine umfangreiche und eine gesperrte Facility prüfen; direkte Piwigo-Dateiadressen zusätzlich ohne Anmeldung auf Vertraulichkeit testen.

Erst nach dieser Prüfung für weitere Facilities freigeben. API-Key und personenbezogene Bilddaten waren weder Bestandteil der lokalen Tests noch des ausgelieferten Pakets.
