# saltcorn-piwigo 0.1.0

Lesende, datensatzgebundene Piwigo-Galerie für Saltcorn. Zielumgebung: **Saltcorn 1.6.2 und Piwigo 16.5.0**; die lokale Saltcorn-Ausführung wurde mit einem synthetischen Piwigo-API-Nachbau geprüft, nicht mit der produktiven Piwigo-Instanz.

## Enthaltene Funktionen

- **Eine Piwigo-Instanz:** Konfigurierbare Basis-URL, serverseitiger API-Key und Timeout.
- **Facility-Galerie:** Kacheln oder Liste, Seitenwechsel, vier Sortierungen und manuelle Aktualisierung.
- **Bilddetails:** Größere Vorschau, Dateiname, Datum und Beschreibung als sicherer Text.
- **Stabile Zuordnung:** Ein Piwigo-Tag je Facility-Datensatz; Zuordnung über numerische IDs in der administrativen View-Konfiguration.
- **Administration:** Verbindung prüfen und vorhandene Tag-IDs suchen, ausschließlich für Saltcorn-Administratoren.
- **Datensatzrechte:** Für jeden Listen-, Detail- und Bildabruf erneute Prüfung über Saltcorn `getRow(..., {forUser})`; für Bilddaten zusätzlich aktuelle Tag-Mitgliedschaft über Piwigo.
- **Kein Vollimport:** Nur die angeforderte Ergebnisseite wird gelesen. Vorschauen werden bei Bedarf geladen.

Keine Uploads, Bild-/Tag-Änderungen, Löschungen, Originaldownloads, öffentlichen Links, automatische Tabellenanlage oder Hintergrundsynchronisation. Mehrere Facility-Tags an einem Bild bleiben möglich; mehrere Alias-Tags je Facility und eine eigene Zuordnungstabelle sind in 0.1.0 noch nicht enthalten.

## Installation

### Paket bereitstellen

Das ZIP enthält den vollständigen Ordner `saltcorn-piwigo` einschließlich Tests und Dokumentation. Diesen Ordner an einem dauerhaften Ort auf dem Saltcorn-Server ablegen; bei Containern muss er auch nach einem Neustart im Container verfügbar sein.

Beispiel unter Linux, auszuführen mit dem Benutzer und der Umgebung der Saltcorn-Installation:

```sh
unzip saltcorn-piwigo-0.1.0.zip -d /opt/saltcorn-plugins
saltcorn install-plugin -d /opt/saltcorn-plugins/saltcorn-piwigo
```

Danach Saltcorn über den verwendeten Dienstmanager neu starten. Das Paket ist privat und nicht auf npm oder GitHub veröffentlicht; `saltcorn-piwigo` als npm-Quelle ist daher kein gültiger Installationsweg für diese Lieferung.

Es gibt keine eigenen Laufzeit-Fremdabhängigkeiten. Die Saltcorn-Module stammen aus der vorhandenen Saltcorn-Installation; im produktiven Plugin-Ordner kein ungezieltes `npm install` ausführen, da die Entwicklungsabhängigkeiten sonst eine zusätzliche Saltcorn-Kopie erzeugen können.

### Piwigo-Dienstkonto und API-Key

Ein eigenes normales Piwigo-Konto verwenden und diesem ausschließlich die für Saltcorn vorgesehenen Alben und Bilder freigeben. Anschließend in dessen Piwigo-Profil einen persönlichen API-Key erzeugen; Piwigo dokumentiert dafür die Profilfunktion „API Keys“ und den Header `X-PIWIGO-API` ([Piwigo-Web-API](https://github.com/Piwigo/Piwigo/wiki/Piwigo-Web-API)).

Der vollständige Wert im Format `pkid-…:…` muss dem Saltcorn-Serverprozess als Umgebungsvariable `PIWIGO_API_KEY` bereitgestellt werden. Den echten Schlüssel nicht in die View-Konfiguration, Quelltexte, Tickets oder Screenshots kopieren.

Für systemd kann beispielsweise eine bestehende geschützte EnvironmentFile genutzt werden:

```ini
# Inhalt einer nur administrativ lesbaren Environment-Datei:
PIWIGO_API_KEY=HIER_DEN_VOLLSTAENDIGEN_PIWIGO_API_KEY_EINTRAGEN
```

Die Datei muss im tatsächlichen Saltcorn-Dienst mit `EnvironmentFile=` eingebunden sein; anschließend den Dienst neu starten. Alternativ die Variable über die vorhandene Container-/Secret-Verwaltung setzen; eine Variable in einer interaktiven Shell allein erreicht einen bereits laufenden systemd- oder Docker-Dienst nicht.

### Plugin konfigurieren

In Saltcorn die Konfiguration des Plugins `saltcorn-piwigo` öffnen. Folgende Werte setzen:

| Feld | Beispiel / Bedeutung |
|---|---|
| Piwigo-Basis-URL | `https://bilder.example.org/piwigo/`, ohne `ws.php` |
| Umgebungsvariable | `PIWIGO_API_KEY`, nur der Variablenname |
| Timeout | `15000` Millisekunden; zulässig 1000 bis 60000 |
| HTTP erlauben | Produktiv ausgeschaltet lassen |

Die URL muss unmittelbar auf die tatsächliche Installation zeigen. HTTP-Weiterleitungen, externe Bildhosts/CDNs und Vorschauadressen außerhalb des konfigurierten Piwigo-Pfads werden absichtlich abgelehnt; die TLS-Zertifikatsprüfung wird nicht abgeschaltet.

## Facility-Ansicht einrichten

Eine neue Saltcorn-View auf der vorhandenen Facility-Tabelle erstellen und den Typ `PiwigoFacilityBilder` auswählen. Es werden keine Änderungen an der Facility-Tabelle vorgenommen.

In der View-Konfiguration werden Überschrift, optionales Anzeigename-Feld, Seitengröße, Mindestberechtigung und die Zuordnung festgelegt. Die View kann direkt mit ihrer Datensatz-ID aufgerufen oder als Unteransicht der Facility-Detailseite eingebunden werden.

### Zuordnung über IDs

Beispiel:

```json
{
  "42": 123,
  "178": 456
}
```

- **`42`:** Primärschlüssel des Saltcorn-Facility-Datensatzes, typischerweise `facility.id`.
- **`123`:** Numerische Piwigo-Tag-ID des zugehörigen Schlagworts, beispielsweise mit dem Namen `facility:0042`.
- **`178` / `456`:** Zweite Datensatz-/Tag-Verbindung.

**Der linke Wert ist nicht automatisch die fachliche Facilitynummer.** Wenn die Facilitynummer `0042` lautet, der Datensatz aber `id=817` hat, muss der Eintrag `"817": 123` heißen.

Der tatsächliche Name des Schlagworts ist frei; bestehende Piwigo-Schlagworte können unverändert genutzt werden. Ein neuer Namensstandard wie `facility:0042` ist hilfreich, wird aber weder erzwungen noch automatisch angelegt.

Tag-IDs lassen sich im Administrationsbereich der Galerie suchen. Dazu darf die Zuordnung zunächst `{}` sein: Die Galerie zeigt den Hinweis auf die fehlende Zuordnung, die administrativen Diagnosefunktionen bleiben verfügbar.

Die Suche zeigt maximal 100 passende Tags aus der für das Dienstkonto verfügbaren Tag-Liste. Leere oder nicht sichtbare Tags können in dieser Liste fehlen; Sichtbarkeit und tatsächliche Bildzuordnung gegebenenfalls direkt in Piwigo prüfen.

### Berechtigungen

Die View selbst muss für die vorgesehenen Benutzer freigegeben sein. Zusätzlich begrenzt die Plugin-View die maximale Rollen-ID, standardmäßig 80; jede Facility wird danach erneut mit den Saltcorn-Datensatzrechten geprüft.

Standardrollen sind 1 für Administrator, 40 für Mitarbeiter und 80 für Benutzer. Kleinere IDs besitzen mehr Rechte; die tatsächlich konfigurierte Rollenstruktur der Installation bleibt maßgeblich.

Die Zuordnung bleibt absichtlich in der administrativen View-Konfiguration und nicht in einem gewöhnlich bearbeitbaren Datensatzfeld. Nur vertrauenswürdige Administratoren dürfen Plugin- und View-Konfiguration bearbeiten.

Der Integrationsbetrieb verwendet ein Piwigo-Dienstkonto: Die individuellen Piwigo-Rechte der einzelnen Saltcorn-Benutzer werden dadurch nicht automatisch abgebildet. Saltcorn ist hier das freigegebene Zugangsportal; wenn persönliche Piwigo-Rechte zwingend maßgeblich bleiben sollen, darf diese erste Version nicht ohne Erweiterung dafür verwendet werden.

## Bedienung und Datenmenge

Die Vorgabe ist 48 Bilder pro Seite, konfigurierbar von 1 bis 96. Server-seitige Begrenzungen werden anhand der Piwigo-Antwort berücksichtigt; eine kleinere tatsächlich gelieferte Seitengröße wird für die Navigation übernommen.

Vorschaubilder werden erst in der Nähe des sichtbaren Bereichs angefragt. Der Browser lädt höchstens vier Vorschauen gleichzeitig; der Plugin-Prozess begrenzt alle Piwigo-Anfragen zusammen auf vier aktive Anfragen und 128 wartende Anfragen.

Jede Vorschau führt vor der Bildauslieferung eine aktuelle Bild-/Tag-Prüfung aus. Das kostet zusätzliche API-Aufrufe, verhindert aber die Verwendung einer veralteten Tag-Mitgliedschaft als Zugriffsberechtigung; 0.1.0 besitzt deshalb bewusst keinen dauerhaften Ergebnis- oder Rechtecache.

API-Antworten sind auf 8 MiB, Bildantworten auf 12 MiB begrenzt. Es gibt keine automatische Wiederholung fehlgeschlagener Anfragen; „Aktualisieren“ startet einen neuen Abruf.

Die vier Sortierungen sind Aufnahmedatum absteigend/aufsteigend, Importdatum absteigend und Dateiname. Bei fehlendem Aufnahmedatum zeigt die Karte das Importdatum an, die Sortierung „Aufnahmedatum“ bleibt jedoch die tatsächliche Piwigo-Sortierung nach dem Aufnahmedatum.

## Sicherheit und Betriebsgrenzen

- **Piwigo-Schreibschutz:** Nur fünf fest definierte lesende Web-API-Methoden sind im Client freigegeben. Die Einschränkung des Dienstkontos bleibt zusätzlich notwendig.
- **Bildzugriff:** Kein öffentliches Bild-URL wird an den Browser weitergegeben; der Browser erhält die geprüften Bildbytes über Saltcorn und verwendet temporäre Blob-URLs.
- **Ausgabe:** Titel und Metadaten werden als Text ausgegeben; HTML-Beschreibungen erscheinen gegebenenfalls als sichtbarer Quelltext. SVG und HTML sind als Vorschau gesperrt.
- **Cache:** Antworten erhalten `private, no-store`; bereits vom Benutzer angesehene oder gespeicherte Bilder können technisch nicht zurückgerufen werden.
- **Mehrfachzuordnungen:** Ein Bild ist über jede zulässige Facility-Zuordnung sichtbar. Andere Facility-Tags, Albumlisten und GPS-Daten werden nicht ausgegeben.
- **Direkter Piwigo-Zugriff:** Der Proxy macht öffentlich erreichbare Piwigo-Dateien nicht nachträglich privat. Ohne Anmeldung direkt erreichbare Originale/Vorschauen müssen bei vertraulichen Beständen auf Piwigo-/Webserver-Ebene abgesichert werden.
- **Grenzen des Prüfzeitpunkts:** Zwischen Berechtigungsprüfung und Übertragung besteht ein kurzer unvermeidlicher Zeitraum. Ein bereits laufender Transfer wird durch eine unmittelbar folgende Rechteänderung nicht atomar zurückgerufen.
- **Mandantenbetrieb:** Eine Umgebungsvariable gehört zum Serverprozess. Administratoren, die Plugin-Konfiguration bearbeiten können, müssen vertrauenswürdig sein; diese Version ist nicht für gegeneinander nicht vertrauenswürdige Saltcorn-Mandantenadministratoren ausgelegt.

## Fehlerbehebung

| Meldung / Verhalten | Prüfen |
|---|---|
| API-Key fehlt | Variable im tatsächlichen Saltcorn-Serverprozess gesetzt? Nach Änderung neu gestartet? |
| Piwigo verweigert Zugriff | Key vollständig, nicht abgelaufen und nicht widerrufen? Dienstkonto berechtigt? |
| Weiterleitung | Kanonische HTTPS-URL einschließlich Unterverzeichnis verwenden; Reverse Proxy prüfen |
| Noch kein Schlagwort zugeordnet | Richtigen Primärschlüssel in `mapping_json` eintragen |
| Keine Bilder sichtbar | Tag-ID, zugeordnete Bilder und Piwigo-Sichtbarkeit des Dienstkontos prüfen |
| Bild nicht zugeordnet | Facility-Tag wurde entfernt oder falsche Bild-ID angefragt |
| Vorschau nicht verfügbar | Vorschaugrößen, MIME-Typ, Piwigo-Bildschutz und gleiche URL-Herkunft prüfen |
| Datensatz nicht verfügbar | Saltcorn-View-Rechte, Tabellenrechte und Besitzerregeln prüfen |

Die Diagnose zeigt Piwigo-Version, technischen Benutzer und Kontostatus nur Administratoren an. Sie warnt bei einem Piwigo-Administrator-/Webmasterkonto; die eigentlichen Bildrechte müssen zusätzlich mit repräsentativen Facilities geprüft werden.

## Tests und Weiterentwicklung

Die automatischen Tests benötigen Node.js ab Version 18 und keine zusätzlich installierten Testbibliotheken:

```sh
cd saltcorn-piwigo
npm test
```

Die optionalen Saltcorn-Integrationstests und Browserprüfungen sind im Prüfbericht beschrieben. `test/setup-saltcorn.js` ist ausschließlich für eine neue, wegwerfbare Testdatenbank gedacht und nicht für die Produktivinstallation.

Der API-Vertrag wurde anhand der Piwigo-16.5.0-Deklarationen und Implementierungen geprüft: Tag-Seitenabfrage und Bilddetails sowie deren Zugriffskontrolle sind im entsprechenden Versionsstand beschrieben ([Piwigo 16.5.0 Web-API](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/ws.php), [Bildinformationen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/ws_functions/pwg.images.php), [Schlagwortabfragen](https://raw.githubusercontent.com/Piwigo/Piwigo/16.5.0/include/ws_functions/pwg.tags.php)).

Vor produktiver Freigabe mit eurem realen Piwigo mindestens eine sichtbare, eine gesperrte und eine umfangreiche Facility testen. Der Nachbau mit einer Trefferzahl von 120.000 belegt Seitennavigation und begrenzte Antworten, nicht die Leistung eines echten Bestands mit 120.000 Bilddateien.
