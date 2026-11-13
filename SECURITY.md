# Sicherheitsmodell

Das Plugin ist ein serverseitig vermittelter, lesender Zugang zu einer konfigurierten Piwigo-Instanz. Die Freigabe erfolgt über Saltcorn-View-/Datensatzrechte plus die administrativ festgelegte Tag-Zuordnung; die Piwigo-Rechte gelten für das Dienstkonto.

## Vertrauensgrenzen

- **Administratoren:** Können Ziel-URL und Namen der Secret-Umgebungsvariable festlegen. Sie sind vertrauenswürdig; Konfiguration ist keine Sicherheitsgrenze gegen einen bösartigen Saltcorn-Administrator.
- **Normale Benutzer:** Können weder Verbindung noch Tag-Zuordnung über Datensatzfelder oder Browserparameter ändern.
- **Piwigo:** Wird als vertrauenswürdiges Quellsystem behandelt. Freitexte werden trotzdem nicht als HTML interpretiert; Medien sind auf dieselbe Herkunft und den konfigurierten Installationspfad beschränkt.
- **Dienstkonto:** Muss auf die beabsichtigten Alben/Bilder begrenzt werden. Seine individuellen Freigaben sind nicht automatisch die Piwigo-Freigaben jedes Saltcorn-Benutzers.

## Schutzmaßnahmen

- **Authentifizierung:** Kein öffentlicher Modus; numerische Rollen-ID und Benutzer-ID erforderlich.
- **Datensatzprüfung:** Saltcorn `getRow` mit `forUser`, einschließlich Besitzerregeln.
- **Bildprüfung:** Aktueller `pwg.images.getInfo`-Abruf und numerischer Tag-Vergleich vor jeder Vorschau.
- **API-Auswahl:** Nur `pwg.getVersion`, `pwg.session.getStatus`, `pwg.tags.getList`, `pwg.tags.getImages`, `pwg.images.getInfo`.
- **Transport:** HTTPS als Standard, keine Redirects, kein Abschalten der Zertifikatsprüfung.
- **Secrets:** Nur serverseitige Umgebungsvariable, keine Rückgabe des Keys und keine Ausgabe fremder API-Fehlermeldungen.
- **Ressourcen:** Deadline, Antwortgrößenlimit, Seitengrößenlimit und begrenzte Warteschlange pro Prozess.
- **Browser:** CSRF-Integration in Saltcorn, Textausgabe statt HTML, Bild-MIME-Allowlist, `nosniff`, `no-store`.

## Bekannte Grenzen

Kein persönlicher Piwigo-Login und keine automatische Synchronisation beider Berechtigungssysteme. Bereits übermittelte Bilder lassen sich nicht zurückrufen; Änderungen während einer laufenden Übertragung sind nicht atomar.

Direkt öffentlich erreichbare Piwigo-Dateien müssen unabhängig vom Plugin geschützt werden. Externe Medien-CDNs und besondere Bildschutz-Plugins können mit der strengen URL-/Header-Behandlung inkompatibel sein und benötigen vor Freigabe einen gezielten Test.

Das Paket installiert keine zusätzlichen Laufzeitabhängigkeiten. Sicherheitsupdates von Saltcorn, Node.js, Piwigo und deren eigenen Abhängigkeiten bleiben Bestandteil des Betriebs; die Kompatibilitätsprüfung ist kein umfassendes Audit dieser Produkte.
