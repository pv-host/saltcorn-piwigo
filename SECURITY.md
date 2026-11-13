# Sicherheitsmodell

Das Plugin ist ein serverseitig vermittelter, lesender Zugang zu einer konfigurierten Piwigo-Instanz. Die Freigabe erfolgt über Saltcorn-View-/Datensatzrechte plus die konfigurierte Zuordnung; die Piwigo-Rechte gelten für das Dienstkonto.

## Vertrauensgrenzen

- **Administratoren:** Können Ziel-URL, API-Key in der Modulkonfiguration und alternativ den Namen der Secret-Umgebungsvariable festlegen. Sie sind vertrauenswürdig; Konfiguration ist keine Sicherheitsgrenze gegen einen bösartigen Saltcorn-Administrator.
- **Nummernfeld:** Im Feldmodus legt der gespeicherte Wert den Bildzugriff fest. Unberechtigte Änderungen über Bearbeitungsviews, API oder Importe müssen administrativ ausgeschlossen werden; das Plugin kann diese Schreibrechte nicht automatisch absichern.
- **Browserparameter:** Können weder Nummernfeld noch Tag-ID überschreiben. Der Wert wird ausschließlich aus dem erneut berechtigungsgeprüften Saltcorn-Datensatz gelesen.
- **Eindeutigkeit:** Identische Nummern in zwei Saltcorn-Datensätzen führen zur gleichen Bildgruppe. Die Eindeutigkeit ist administrativ zu pflegen; das Plugin verändert keine Tabellenconstraints.
- **Piwigo:** Wird als vertrauenswürdiges Quellsystem behandelt. Freitexte werden trotzdem nicht als HTML interpretiert; Medien sind auf dieselbe Herkunft und den konfigurierten Installationspfad beschränkt.
- **Dienstkonto:** Muss auf die beabsichtigten Alben/Bilder begrenzt werden. Seine individuellen Freigaben sind nicht automatisch die Piwigo-Freigaben jedes Saltcorn-Benutzers.

## Schutzmaßnahmen

- **Authentifizierung:** Kein öffentlicher Modus; numerische Rollen-ID und Benutzer-ID erforderlich.
- **Datensatzprüfung:** Saltcorn `getRow` mit `forUser`, einschließlich Besitzerregeln.
- **Bildprüfung:** Frische Schlagwortauflösung je Anfrage im Feldmodus; aktueller `pwg.images.getInfo`-Abruf und Tag-ID-Vergleich vor jeder Vorschau, zusätzlich exakte Klammernummer im aktuellen Tag-Namen.
- **Zuordnung:** Exakt vier ASCII-Ziffern ohne Normalisierung. Keine Treffer oder mehrere sichtbare Tags beziehungsweise mehrere Klammernummern im passenden Tag sperren den Abruf; keine Ersatzzuordnung und kein „alle Bilder“-Fallback.
- **API-Auswahl:** Nur `pwg.getVersion`, `pwg.session.getStatus`, `pwg.tags.getList`, `pwg.tags.getImages`, `pwg.images.getInfo`.
- **Transport:** HTTPS als Standard, keine Redirects, kein Abschalten der Zertifikatsprüfung.
- **Secrets:** Modulkonfiguration oder alternativ serverseitige Umgebungsvariable. Das Admin-Eingabefeld ist maskiert, nicht zusätzlich durch das Plugin verschlüsselt; gespeicherte Konfiguration, Admin-Formular, Datenbank und entsprechende Exporte/Backups sind vertraulich zu behandeln. Keine Rückgabe an Galeriebenutzer oder über Diagnoseantworten und keine Ausgabe fremder API-Fehlermeldungen.
- **Key-Auswahl:** Nicht leerer Modul-Key hat Vorrang; Umgebungsvariable nur bei leerem Feld. Ein ungültiger Key wird nicht durch ein anderes Dienstkonto ersetzt; Steuerzeichen, Leerzeichen, Nicht-ASCII und überlange Werte werden abgelehnt.
- **Ressourcen:** Deadline, Antwortgrößenlimit, Seitengrößenlimit und begrenzte Warteschlange pro Prozess.
- **Browser:** CSRF-Integration in Saltcorn, Textausgabe statt HTML, Bild-MIME-Allowlist, `nosniff`, `no-store`.

## Bekannte Grenzen

Kein persönlicher Piwigo-Login und keine automatische Synchronisation beider Berechtigungssysteme. Bereits übermittelte Bilder lassen sich nicht zurückrufen; Änderungen während einer laufenden Übertragung sind nicht atomar.

Direkt öffentlich erreichbare Piwigo-Dateien müssen unabhängig vom Plugin geschützt werden. Externe Medien-CDNs und besondere Bildschutz-Plugins können mit der strengen URL-/Header-Behandlung inkompatibel sein und benötigen vor Freigabe einen gezielten Test.

Das Paket installiert keine zusätzlichen Laufzeitabhängigkeiten. Sicherheitsupdates von Saltcorn, Node.js, Piwigo und deren eigenen Abhängigkeiten bleiben Bestandteil des Betriebs; die Kompatibilitätsprüfung ist kein umfassendes Audit dieser Produkte.
