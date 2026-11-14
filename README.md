# saltcorn-piwigo 0.3.1

Lesende, datensatzgebundene Piwigo-Galerie für Saltcorn. Zielumgebung: **Saltcorn 1.6.2 und Piwigo 16.5.0**; die lokale Saltcorn-Ausführung wurde mit einem synthetischen Piwigo-API-Nachbau geprüft, nicht mit der produktiven Piwigo-Instanz.

## Enthaltene Funktionen

- **Eine Piwigo-Instanz:** Konfigurierbare Basis-URL, API-Key direkt im maskierten Modul-Konfigurationsfeld und Timeout; Umgebungsvariable weiterhin als Alternative.
- **Facility-Galerie:** Kacheln oder Liste, Seitenwechsel, vier Sortierungen und manuelle Aktualisierung.
- **Bildunterschriften:** Separate Textvorlagen für Vorschau und Einzelbild, beispielsweise Aufnahmedatum, Dateiname, Beschreibung und Abmessungen.
- **Bilddetails:** Konfigurierbare Bildvariante, Dialogbreite und maximale Bildhöhe; Vor-/Zurück-Blättern per Button oder Pfeiltaste, auch über Ergebnisseiten hinweg.
- **Optionale Bildvergrößerung:** Pro View freischaltbare Zoom-Bedienleiste in der Einzelbildansicht, 100 bis 400 Prozent der eingepassten Vorschau, ohne weitere Bildabrufe.
- **Admin-Fußzeile:** Feldnummer, Schlagwort und Tag-ID rechtsbündig neben der Seitennavigation. Auf schmalen Bildschirmen darunter; für normale Benutzer weder im HTML noch in der Listenantwort enthalten.
- **Exakte Feldzuordnung:** Wählbares Saltcorn-Feld, z. B. `facilitynr="0042"`, wird 1:1 mit `[0042]` im Namen eines Piwigo-Schlagworts verglichen. Kein Auffüllen oder unscharfer Vergleich.
- **Bestandsschutz:** Bereits vorhandene 0.1.0-Views behalten ihre manuelle Datensatz-ID/Tag-ID-Zuordnung, bis der Administrator ausdrücklich auf Feldzuordnung umstellt.
- **Administration:** Verbindung prüfen und vorhandene Tag-IDs suchen, ausschließlich für Saltcorn-Administratoren.
- **Bildadressdiagnose:** In den Bilddetails „Bildadresse prüfen“ wählen. Zeigt nur Administratoren die laufende Plugin-Version, geladene API-Basis und die tatsächlich ausgewählten API-Vorschauadressen ohne Query, Zugangsdaten oder Fragmente.
- **Datensatzrechte:** Für jeden Listen-, Detail- und Bildabruf erneute Prüfung über Saltcorn `getRow(..., {forUser})`; für Bilddaten zusätzlich aktuelle Tag-Mitgliedschaft über Piwigo.
- **Kein Vollimport:** Nur die angeforderte Ergebnisseite wird gelesen. Vorschauen werden bei Bedarf geladen.

Keine Uploads, Bild-/Tag-Änderungen, Löschungen, Originaldownloads, öffentlichen Links, automatische Tabellenanlage oder Hintergrundsynchronisation. Mehrere Facility-Tags an einem Bild bleiben möglich; mehrere Alias-Tags mit derselben Nummer werden nicht zusammengeführt, sondern als mehrdeutige Zuordnung abgelehnt.

## Installation

### Paket bereitstellen

Das ZIP enthält den vollständigen Ordner `saltcorn-piwigo` einschließlich Tests und Dokumentation. Diesen Ordner an einem dauerhaften Ort auf dem Saltcorn-Server ablegen; bei Containern muss er auch nach einem Neustart im Container verfügbar sein.

Beispiel unter Linux, auszuführen mit dem Benutzer und der Umgebung der Saltcorn-Installation:

```sh
unzip saltcorn-piwigo-0.3.1.zip -d /opt/saltcorn-plugins
saltcorn install-plugin -d /opt/saltcorn-plugins/saltcorn-piwigo
```

Danach Saltcorn über den verwendeten Dienstmanager neu starten. Das Paket ist privat und nicht auf npm oder GitHub veröffentlicht; `saltcorn-piwigo` als npm-Quelle ist daher kein gültiger Installationsweg für diese Lieferung.

Es gibt keine eigenen Laufzeit-Fremdabhängigkeiten. Die Saltcorn-Module stammen aus der vorhandenen Saltcorn-Installation; im produktiven Plugin-Ordner kein ungezieltes `npm install` ausführen, da die Entwicklungsabhängigkeiten sonst eine zusätzliche Saltcorn-Kopie erzeugen können.

### Bestehende Installation aktualisieren

Vorher Datenbank, Plugin-Konfiguration und View-Konfigurationen sichern. Den vorhandenen lokalen Plugin-Quellordner durch den Inhalt des neuen `saltcorn-piwigo`-Ordners ersetzen; Source und Location des bestehenden Plugin-Eintrags müssen auf diesen Ordner zeigen, nicht auf das ZIP oder dessen Elternverzeichnis.

Beim Update muss auch die von Saltcorn geladene lokale Modulkopie gezielt erneuert werden; ein bloßer Austausch des Quellordners reicht bei bereits zwischengespeichertem Plugin nicht aus. Der konkrete Deploymentweg hängt von Source, Location und Laufzeitumgebung der vorhandenen Installation ab; anschließend Saltcorn neu starten und unter den Modulinformationen Version `0.3.1` sowie in den Bilddetails den Administrator-Button „Bildadresse prüfen“ kontrollieren.

## Bildvergrößerung freigeben ab 0.3.1

Unter **Views → gewünschte Piwigo-View → Configure** die Checkbox **„Vergrößern in der Einzelbildansicht erlauben“** aktivieren und speichern. Die Einstellung `detail_zoom` ist standardmäßig ausgeschaltet, auch bei bestehenden Views; nach Aktivierung steht sie allen berechtigten Betrachtern dieser View zur Verfügung, nicht nur Administratoren.

- **Vergrößern / Verkleinern:** Stufen 100, 150, 200, 300 und 400 Prozent. 100 Prozent entspricht der eingepassten Ansicht, nicht der Originalauflösung.
- **Einpassen:** Setzt die Ansicht auf 100 Prozent zurück. Auch Bildwechsel, Schließen und erneutes Öffnen starten wieder eingepasst.
- **Ausschnitt verschieben:** Im vergrößerten Bildbereich scrollen, auf Touchgeräten wischen. Ist dieser Bereich per Tab fokussiert, verschieben Pfeiltasten den Ausschnitt; außerhalb des Bereichs bleibt die bisherige Einzelbildnavigation erhalten.
- **Bildqualität:** Es wird nur die bereits geladene, konfigurierte Piwigo-Vorschau skaliert. Für schärfere Details gegebenenfalls eine größere Bildvariante wie `xlarge` konfigurieren; Zoomen erzeugt keine zusätzlichen Bilddetails und lädt keine Originaldatei nach.
- **Deaktivieren:** Checkbox ausschalten und speichern; beim nächsten Laden der View entfällt die Zoom-Bedienleiste. Die Freigabe steuert die Plugin-Bedienung, nicht den allgemeinen Browser-Zoom oder einen Kopierschutz.

Die konfigurierte maximale Bildhöhe begrenzt den sichtbaren Ausschnitt, nicht die vergrößerten Bildabmessungen innerhalb des Scrollbereichs. Die vorhandenen Datensatzrechte, Medienprüfung und Größenlimits bleiben unverändert.

## Neue Anzeigeoptionen ab 0.3.0

Die Einstellungen liegen in **Views → gewünschte Piwigo-View → Configure**, nicht in der Modul-Verbindungskonfiguration. Bestehende Views funktionieren auch ohne erneutes Speichern mit Standardwerten.

### Bildunterschriften

„Bildunterschrift: Vorschau“ und „Bildunterschrift: Einzelbild“ sind unabhängig voneinander. Jede Vorlage erlaubt Text und Zeilenumbrüche, höchstens 4096 Zeichen; eine leere Vorlage blendet die betreffende Unterschrift aus.

Beispiel für Vorschauen:

```text
{file}
Aufnahme: {date_creation}
```

Beispiel für Einzelbilder:

```text
{name}
{file}
Aufnahme: {date_creation}
Import: {date_available}
{dimensions} px
{comment}
```

| Platzhalter | Inhalt |
|---|---|
| `{name}` | Bildtitel, ersatzweise Dateiname |
| `{file}` | Dateiname |
| `{date_creation}` | Aufnahmedatum aus Piwigo; bleibt leer, wenn nicht vorhanden |
| `{date_available}` | Importdatum aus Piwigo |
| `{date}` | Kompatibilitätswert: Aufnahmedatum, ersatzweise Importdatum |
| `{comment}` | Beschreibung als Text; enthaltenes HTML wird nicht ausgeführt |
| `{width}`, `{height}`, `{dimensions}` | Abmessungen laut Piwigo-Metadaten, nicht die ausgewählte Vorschaugröße |
| `{id}` | Piwigo-Bild-ID |
| `{facility}` | Anzeigename aus dem in der View gewählten `label_field` |

Fehlende Werte werden leer ausgegeben; selbst geschriebene Beschriftungen wie „Aufnahme:“ bleiben stehen. Unbekannte Platzhalter bleiben als Text sichtbar. Andere Metadaten, Tags, GPS, EXIF oder Original-URLs sind nicht freigegeben; HTML, JavaScript und berechnete Ausdrücke werden nicht unterstützt.

„Datumsformat der Bildunterschriften“ bietet den unveränderten Piwigo-Wert, `TT.MM.JJJJ` oder `TT.MM.JJJJ HH:mm`. Es findet keine Zeitzonenverschiebung statt und kein zusätzlicher EXIF-Abruf; das Aufnahmedatum muss in Piwigo gepflegt sein.

### Einzelbilder blättern und vergrößern

- **Navigation:** Standardmäßig aktiv, mit „Im Einzelbild vor- und zurückblättern“ abschaltbar. Buttons und Pfeiltasten folgen der gewählten Galeriesortierung; erster und letzter Treffer haben keinen Umlauf.
- **Seitengrenzen:** Benötigte Folgeseiten werden erst beim Blättern abgefragt. Die zugrunde liegende Galerie behält ihre Seite; nach Schließen bleibt man dort, wo der Dialog geöffnet wurde.
- **Bildbestand:** Keine feste Momentaufnahme. Ändern sich Zuordnungen oder Bilder während des Blätterns, können Positionen wechseln; bei verschwundener Folgeseite die Galerie aktualisieren. Jede neue Anfrage durchläuft weiterhin die Rechteprüfung.
- **Piwigo-Bildvariante:** `thumb`, `xsmall`, `small`, `medium` (Standard), `large`, `xlarge` oder `xxlarge`. Fehlt die gewählte Variante, wird die nächstkleinere verfügbare Variante verwendet. Keine Originaldateien und kein Ausweichen auf größere Varianten.
- **Dialogbreite:** 320 bis 2400 Pixel, Standard 900. Kleine Bildschirme begrenzen die Breite automatisch.
- **Bildhöhe:** Maximal 30 bis 85 Prozent der Fensterhöhe, Standard 60. Bilder werden nicht beschnitten; bei großem Bild oder langer Unterschrift lässt sich der Dialog innen scrollen, die Bedienleiste bleibt oben.

Für eine größere Ansicht beispielsweise `xlarge`, 1200 Pixel Breite und 75 Prozent Bildhöhe wählen. Die tatsächlichen Auflösungen und verfügbaren Varianten stammen aus Piwigo; kleinere Ersatzbilder können beim Vergrößern unscharf wirken und das unveränderte 12-MiB-Limit gilt je Bildabruf.

### Admin-Fußzeile

Die Zuordnungszeile, beispielsweise `facilitynr = 0313 · Schlagwort: [0313] BGA Dorn (Tag-ID 139)`, steht ausschließlich für Saltcorn-Administratoren (Rollen-ID 1) rechts neben der Seitennavigation. Diese Angaben werden dynamisch aus der aufgelösten Zuordnung erzeugt und nicht fest eingetragen; im manuellen Altmodus gibt es keine Feldnummer-Zeile.

Im lokalen Test wurde der bestehende Plugin-Datensatz beibehalten und mit der Saltcorn-Modellfunktion `Plugin.requirePlugin(plugin, true)` neu geladen; die zurückgegebene Version wurde am bestehenden Datensatz gespeichert. Das ist kein unmittelbar im Browser ausführbarer Befehl und setzt den richtigen Saltcorn-Node-/Datenbankkontext voraus; `test/setup-field-saltcorn.js` demonstriert es ausschließlich für die isolierte Testdatenbank und darf nicht produktiv ausgeführt werden.

Den oben gezeigten `install-plugin -d`-Befehl nur für eine Erstinstallation ohne bestehenden Eintrag verwenden. Bestehende Plugin-Einträge, Konfigurationen oder Cacheverzeichnisse nicht pauschal löschen; bei Ladefehlern zunächst Source, Location und Serverprotokoll prüfen.

Im tatsächlichen Plugin-Ordner müssen `package.json`, `index.js` und `lib/` direkt vorhanden sein. Die gemeldeten Fehler `reading 'main'` und `reading 'configuration_workflow'` betreffen das Laden/Registrieren; die neue Zuordnungslogik ist kein Nachweis ihrer Behebung auf dem Zielserver.

### Piwigo-Dienstkonto und API-Key

Ein eigenes normales Piwigo-Konto verwenden und diesem ausschließlich die für Saltcorn vorgesehenen Alben und Bilder freigeben. Anschließend in dessen Piwigo-Profil einen persönlichen API-Key erzeugen; Piwigo dokumentiert dafür die Profilfunktion „API Keys“ und den Header `X-PIWIGO-API` ([Piwigo-Web-API](https://github.com/Piwigo/Piwigo/wiki/Piwigo-Web-API)).

Den vollständigen Wert im Format `pkid-…:…` direkt im Feld **„Piwigo-API-Key“ der Modulkonfiguration** eintragen und speichern. Danach in einer Galerie als Administrator „Verbindung prüfen“ ausführen; für diesen Weg ist keine Umgebungsvariable erforderlich.

Das Feld wird als Passwortfeld maskiert angezeigt, der gespeicherte Wert bleibt beim erneuten Öffnen erhalten. **Die Maskierung ist keine Verschlüsselung:** Das Plugin speichert den Key in der Saltcorn-Modulkonfiguration ohne zusätzliche Verschlüsselung; entsprechend berechtigte Administratoren, Datenbankzugriffe sowie Backups oder Konfigurationsexporte können den Wert enthalten.

Die Modulkonfiguration nur über HTTPS und durch vertrauenswürdige Administratoren bearbeiten. Den echten Schlüssel nicht in die View-Konfiguration, Quelltexte, Tickets oder Screenshots kopieren; normale Galerieansichten und Diagnoseantworten geben ihn nicht aus.

Ein nicht leeres Modul-Key-Feld hat Vorrang vor der Umgebungsvariable. Bei ungültigem oder abgelehntem Modul-Key erfolgt kein Ausweichversuch mit einem anderen Schlüssel; zum Wechsel auf den Umgebungsvariablenweg das Modul-Key-Feld ausdrücklich leeren und speichern.

Alternativ kann bei leerem Modul-Key-Feld weiterhin die Umgebungsvariable `PIWIGO_API_KEY` verwendet werden. Für systemd kann beispielsweise eine bestehende geschützte EnvironmentFile genutzt werden:

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
| Piwigo-API-Key | Vollständiger API-Key; maskiertes Eingabefeld, Vorrang vor der Umgebungsvariable |
| Umgebungsvariable | Optionaler Alternativweg bei leerem API-Key-Feld; Standard `PIWIGO_API_KEY`, nur der Variablenname |
| Timeout | `15000` Millisekunden; zulässig 1000 bis 60000 |
| HTTP-Bildadressen desselben Hosts auf HTTPS korrigieren | Standard aus; ausschließlich für HTTP-Vorschauadressen desselben HTTPS-API-Hosts mit Standardports |
| HTTP erlauben | Produktiv ausgeschaltet lassen |

Die URL muss unmittelbar auf die tatsächliche Installation zeigen. HTTP-Weiterleitungen, externe Bildhosts/CDNs und Vorschauadressen außerhalb des konfigurierten Piwigo-Pfads werden absichtlich abgelehnt; die TLS-Zertifikatsprüfung wird nicht abgeschaltet.

Die optionale HTTPS-Korrektur ersetzt ausschließlich `http:` durch `https:`, wenn die API-Basis HTTPS verwendet, beide Hostnamen identisch sind und beide URLs Standardports nutzen. Pfad und Query bleiben erhalten; abweichende Hosts, Sonderports, Pfade, Zugangsdaten, Fragmente und gesperrte Pfadkodierungen werden dadurch nicht freigegeben.

Diese Korrektur ist keine Weiterleitungsfreigabe: Der Abruf geht unmittelbar an die geprüfte HTTPS-Adresse. „HTTP erlauben“ ist kein Ersatz dafür und sollte produktiv ausgeschaltet bleiben.

## Facility-Ansicht einrichten

Eine neue Saltcorn-View auf der vorhandenen Facility-Tabelle erstellen und den Typ `PiwigoFacilityBilder` auswählen. Es werden keine Änderungen an der Facility-Tabelle vorgenommen.

In der View-Konfiguration werden Überschrift, optionales Anzeigename-Feld, Seitengröße, Mindestberechtigung und die Zuordnung festgelegt. Die View kann direkt mit ihrer Datensatz-ID aufgerufen oder als Unteransicht der Facility-Detailseite eingebunden werden.

### Exakter Vergleich über ein Saltcorn-Feld

Für neue Views ist „Feldwert = [NNNN] im Piwigo-Schlagwort (exakt)“ voreingestellt. Unter „Saltcorn-Feld mit vierstelliger Facilitynummer“ das vorhandene Feld auswählen, beispielsweise `facilitynr`; wenn dieses Feld existiert, wird es vorgeschlagen.

Der vollständige Feldwert muss exakt aus vier ASCII-Ziffern bestehen. Verglichen wird er mit den vier Ziffern zwischen `[` und `]` im Schlagwortnamen; beschreibender Text vor oder hinter der Klammernummer ist erlaubt.

| Saltcorn-Feldwert | Piwigo-Schlagwort | Ergebnis |
|---|---|---|
| `0042` | `[0042] Biogasanlage Muster` | Treffer |
| `0042` | `Biogasanlage Muster [0042]` | Treffer |
| `1042` | `[1042] Muster` | Treffer |
| `42` | `[0042] Muster` | Ungültiger Feldwert; kein Auffüllen |
| `0042` | `[42] Muster` | Kein Treffer |
| `0042` | `[00420] Muster` oder `[0042-01] Muster` | Kein Treffer |
| `0042` | `Muster 0042` oder `[[0042]] Muster` | Kein Treffer |
| ` 0042` oder `0042 ` | `[0042] Muster` | Ungültiger Feldwert; kein Trimmen |
| `0042` | Ein Schlagwort mit `[0042]` und `[0178]` | Mehrdeutig; keine Freigabe |
| `0042` | Zwei sichtbare Schlagworte mit `[0042]` | Mehrdeutig; keine Freigabe |

**Führende Nullen müssen erhalten bleiben: für `0042` ein Saltcorn-Feld vom Typ String verwenden.** Ein Integer-Feld liefert den Wert `42`; dieser wird absichtlich nicht zu `0042` umgewandelt. Bereits vierstellige Integer-Werte wie `1042` sind zulässig.

Der Saltcorn-Primärschlüssel bleibt nur für das Öffnen und die Berechtigungsprüfung zuständig. Beispiel: Datensatz `id=817`, `facilitynr="0042"` und Piwigo-Tag-ID `123` mit Namen `[0042] Musteranlage`; verknüpft wird ausschließlich die Nummer `0042`, nicht `817` oder `123`.

Das Plugin liest die sichtbare Schlagwortliste des Piwigo-Dienstkontos und verwendet erst nach eindeutigem Namensvergleich die gefundene interne Tag-ID für den Bildabruf. Ohne eindeutigen Treffer erscheint ein Hinweis, niemals eine unbeschränkte Galerie; die gefundene Feld-/Tag-Verbindung wird oberhalb der Bilder angezeigt.

### Bestehende Views von 0.1.0 umstellen

Die View-Konfiguration öffnen, den Zuordnungsmodus ausdrücklich auf Feldvergleich setzen, das Nummernfeld auswählen und speichern. Die bisherige JSON-Zuordnung wird im Feldmodus ignoriert; ein fehlender Treffer fällt nicht auf die alte Zuordnung zurück.

Vor der Umstellung Werteformat, eindeutige Nummern, Schreibrechte und die Sichtbarkeit der Schlagworte für das Dienstkonto prüfen. Das Plugin verändert weder Feldtypen noch gespeicherte Werte oder Piwigo-Schlagworte.

### Manuelle ID-Zuordnung als Bestandsmodus

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

**Im Feldmodus ist das Nummernfeld sicherheitsrelevant: Wer dessen Wert ändern darf, kann damit die Bildzuordnung ändern.** Das Feld daher über alle Schreibwege einschließlich Bearbeitungsviews, API und Importen vor unberechtigten Änderungen schützen; reine Ausblendung in einem Formular reicht nicht.

Die fachliche Facilitynummer sollte in Saltcorn eindeutig gepflegt werden. Zwei lesbare Datensätze mit identischem Feldwert führen bewusst zur gleichen Bildgruppe; das Plugin legt keinen Unique-Constraint an und prüft nicht die gesamte Tabelle auf Dubletten.

Nur vertrauenswürdige Administratoren dürfen Plugin- und View-Konfiguration bearbeiten. Im Bestandsmodus bleibt die Zuordnung ausschließlich in der administrativen View-Konfiguration.

Der Integrationsbetrieb verwendet ein Piwigo-Dienstkonto: Die individuellen Piwigo-Rechte der einzelnen Saltcorn-Benutzer werden dadurch nicht automatisch abgebildet. Saltcorn ist hier das freigegebene Zugangsportal; wenn persönliche Piwigo-Rechte zwingend maßgeblich bleiben sollen, darf diese erste Version nicht ohne Erweiterung dafür verwendet werden.

## Bedienung und Datenmenge

Die Vorgabe ist 48 Bilder pro Seite, konfigurierbar von 1 bis 96. Server-seitige Begrenzungen werden anhand der Piwigo-Antwort berücksichtigt; eine kleinere tatsächlich gelieferte Seitengröße wird für die Navigation übernommen.

Vorschaubilder werden erst in der Nähe des sichtbaren Bereichs angefragt. Der Browser lädt höchstens vier Vorschauen gleichzeitig; der Plugin-Prozess begrenzt alle Piwigo-Anfragen zusammen auf vier aktive Anfragen und 128 wartende Anfragen.

Jede Vorschau führt vor der Bildauslieferung eine aktuelle Bild-/Tag-Prüfung aus. Im Feldmodus wird zusätzlich bei jeder Listen-, Detail- und Bildanfrage die sichtbare Schlagwortliste frisch gelesen; die Bilddetails müssen weiterhin dieselbe Tag-ID und dieselbe Klammernummer enthalten.

Es gibt bewusst keinen Ergebnis- oder Rechtecache. Eine Vorschau benötigt im Feldmodus zwei JSON-Abfragen plus den Medienabruf; die zusätzliche Last der Schlagwortlisten muss mit dem realen Bestand und der erwarteten Benutzerzahl im Pilotbetrieb geprüft werden.

API-Antworten sind auf 8 MiB, Bildantworten auf 12 MiB begrenzt. Es gibt keine automatische Wiederholung fehlgeschlagener Anfragen; „Aktualisieren“ startet einen neuen Abruf.

Die vier Sortierungen sind Aufnahmedatum absteigend/aufsteigend, Importdatum absteigend und Dateiname. Bei fehlendem Aufnahmedatum zeigt die Karte das Importdatum an, die Sortierung „Aufnahmedatum“ bleibt jedoch die tatsächliche Piwigo-Sortierung nach dem Aufnahmedatum.

## Sicherheit und Betriebsgrenzen

- **Piwigo-Schreibschutz:** Nur fünf fest definierte lesende Web-API-Methoden sind im Client freigegeben. Die Einschränkung des Dienstkontos bleibt zusätzlich notwendig.
- **Bildzugriff:** Normale Galeriebenutzer erhalten geprüfte Bildbytes über Saltcorn und temporäre Blob-URLs, keine direkten Piwigo-Bild-URLs. Die administrative Bildadressdiagnose zeigt Herkunft und Pfad, aber keine Query, Zugangsdaten oder Fragmente.
- **Ausgabe:** Titel und Metadaten werden als Text ausgegeben; HTML-Beschreibungen erscheinen gegebenenfalls als sichtbarer Quelltext. SVG und HTML sind als Vorschau gesperrt.
- **Cache:** Antworten erhalten `private, no-store`; bereits vom Benutzer angesehene oder gespeicherte Bilder können technisch nicht zurückgerufen werden.
- **Mehrfachzuordnungen:** Ein Bild ist über jede zulässige Facility-Zuordnung sichtbar. Andere Facility-Tags, Albumlisten und GPS-Daten werden nicht ausgegeben.
- **Direkter Piwigo-Zugriff:** Der Proxy macht öffentlich erreichbare Piwigo-Dateien nicht nachträglich privat. Ohne Anmeldung direkt erreichbare Originale/Vorschauen müssen bei vertraulichen Beständen auf Piwigo-/Webserver-Ebene abgesichert werden.
- **Grenzen des Prüfzeitpunkts:** Zwischen Berechtigungsprüfung und Übertragung besteht ein kurzer unvermeidlicher Zeitraum. Ein bereits laufender Transfer wird durch eine unmittelbar folgende Rechteänderung nicht atomar zurückgerufen.
- **Mandantenbetrieb:** Eine Umgebungsvariable gehört zum Serverprozess. Administratoren, die Plugin-Konfiguration bearbeiten können, müssen vertrauenswürdig sein; diese Version ist nicht für gegeneinander nicht vertrauenswürdige Saltcorn-Mandantenadministratoren ausgelegt.

## Fehlerbehebung

### „Bildadresse außerhalb der freigegebenen Piwigo-Instanz“

Die Meldung stammt aus der URL-Prüfung des Plugins, nicht aus der API-Key-Authentifizierung. Verglichen werden die geladene Piwigo-Basis-URL und die in `pwg.images.getInfo` zurückgelieferte ausgewählte Vorschauadresse; die Domain der Saltcorn-Seite ist dafür nicht maßgeblich.

Eine Piwigo-Adresse der Form `https://piwigo.example.org/i.php?/piwigo-galleries/...-xl.jpg` ist bei Basis `https://piwigo.example.org/` zulässig. Die Adresse aus der Piwigo-Browseransicht muss jedoch nicht dieselbe Variante oder Herkunft haben wie die von der API gelieferte Thumbnail-/Medium-Adresse.

Als Administrator eine betroffene Bildkarte öffnen und in den Bilddetails **„Bildadresse prüfen“** anklicken, auch wenn die Vorschau selbst fehlschlägt. Die Diagnose führt keinen Bildabruf aus; `allowed: true` bestätigt nur die URL-Prüfung, nicht Erreichbarkeit oder Bildinhalt.

- **`plugin_version`:** Tatsächlich geladene Plugin-Version; erwartet wird `0.3.1`.
- **`api_base`:** Tatsächlich geladene Basis-Konfiguration, nicht nur ein eventuell noch nicht übernommener Formularwert.
- **`returned`:** Herkunft und Pfad der jeweils ausgewählten API-Vorschau; `thumb` und `preview` werden getrennt geprüft.
- **`reason`:** Konkreter Ablehnungsgrund bei Protokoll, Hostname, Port, Installationspfad oder Prozentkodierung.
- **`effective` / `https_upgraded`:** Tatsächlich erlaubte Zieladresse und Hinweis, ob die optionale HTTPS-Korrektur angewendet wurde.

Nur wenn `returned.origin` HTTP für denselben Host liefert, während `api_base.origin` HTTPS verwendet und beide Standardports nutzen, die Option **„HTTP-Bildadressen desselben Hosts auf HTTPS korrigieren“** einschalten und speichern. Bei anderem Host, Port oder Pfad die Piwigo-/Proxy-/Modulkonfiguration prüfen; nicht die Sicherheitsprüfung pauschal abschalten oder die Saltcorn-Domain als Bildserver freigeben.

Die Diagnose enthält keine Query-Werte oder API-Keys, kann aber interne Hostnamen und Pfade zeigen. Diese Informationen nur gezielt für die Fehleranalyse teilen.

| Meldung / Verhalten | Prüfen |
|---|---|
| API-Key fehlt oder ist ungültig | Vollständigen Key in der Modulkonfiguration speichern; keine Leerzeichen/Zeilenumbrüche. Alternativ bei leerem Feld die Server-Umgebungsvariable prüfen |
| Piwigo verweigert Zugriff | Key vollständig, nicht abgelaufen und nicht widerrufen? Dienstkonto berechtigt? |
| Weiterleitung | Kanonische HTTPS-URL einschließlich Unterverzeichnis verwenden; Reverse Proxy prüfen |
| Feld muss exakt vier Ziffern enthalten | String-Wert wie `0042` verwenden; keine Leerzeichen, keine automatische Nullenergänzung |
| Nummernfeld fehlt | In der View ein tatsächlich vorhandenes Feld auswählen |
| Kein sichtbares Schlagwort mit `[NNNN]` | Exakte Schreibweise, zugeordnete Bilder und Sichtbarkeit für das Dienstkonto prüfen |
| Mehrdeutige Zuordnung | Genau ein sichtbares Schlagwort mit genau einer vierstelligen Klammernummer verwenden |
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
