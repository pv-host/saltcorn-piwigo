"use strict";
const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const Table = require("@saltcorn/data/models/table");
const { authenticated, integer, esc, errorResult, mappingMode } = require("./lib/core");
const { makeService } = require("./lib/service");
const { render } = require("./lib/ui");
const { THUMB_CAPTION, DETAIL_CAPTION, PREVIEW_SIZES, displaySettings } = require("./lib/presentation");

const configuration_workflow = () => new Workflow({
  steps: [{
    name: "Piwigo-Verbindung",
    form: async () => new Form({ fields: [
      { name: "base_url", label: "Piwigo-Basis-URL", type: "String", required: true,
        sublabel: "Kanonische URL, z.B. https://bilder.example.org/piwigo/ (ohne ws.php)." },
      { name: "api_key", label: "Piwigo-API-Key", type: "String", input_type: "password",
        attributes: { autocomplete: "new-password" },
        sublabel: "Vollständige API-Key-ID und geheimen Schlüssel gemeinsam eingeben: pkid-...:SCHLUESSEL (Doppelpunkt erforderlich). Hat Vorrang vor der Umgebungsvariable. Maskiert, aber ohne zusätzliche Plugin-Verschlüsselung gespeichert; Datenbank und Backups schützen. Leer = Umgebungsvariable verwenden." },
      { name: "api_key_env", label: "Umgebungsvariable für den API-Key", type: "String",
        default: "PIWIGO_API_KEY",
        sublabel: "Optionaler Alternativweg, nur wenn oben kein API-Key eingetragen ist. Nur Variablenname; Standard PIWIGO_API_KEY. Im Saltcorn-Serverprozess setzen." },
      { name: "timeout_ms", label: "Timeout je Piwigo-Anfrage (ms)", type: "Integer", default: 15000 },
      { name: "upgrade_media_https", label: "HTTP-Bildadressen desselben Hosts auf HTTPS korrigieren",
        type: "Bool", default: false,
        sublabel: "Nur bei HTTPS-Basis-URL und identischem Host mit Standardports. Hilft, wenn die API hinter einem Reverse Proxy HTTP-Vorschauadressen liefert. Keine Freigabe fremder Hosts, Ports oder Pfade; Weiterleitungen bleiben gesperrt." },
      { name: "allow_http", label: "HTTP ausdrücklich erlauben (nur abgeschottetes Testnetz)", type: "Bool", default: false,
        sublabel: "Produktiv HTTPS verwenden. Bei HTTP werden API-Key und Bilder unverschlüsselt übertragen." }
    ] })
  }]
});

function makeView(pluginCfg) {
  const { routes } = makeService(Table, pluginCfg);
  return {
    name: "PiwigoFacilityBilder",
    description: "Lesende Piwigo-Galerie: Saltcorn-Feld exakt gegen [NNNN] im Schlagwort",
    display_state_form: false,
    configuration_workflow: () => new Workflow({
      steps: [{
        name: "Facility-Zuordnung und Anzeige",
        form: async context => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = table ? await table.getFields() : [];
          return new Form({ fields: [
            { name: "title", label: "Überschrift", type: "String", default: "Bilder" },
            { name: "label_field", label: "Anzeigename aus Feld (optional)", type: "String",
              attributes: { options: fields.map(f => f.name) } },
            { name: "mapping_mode", label: "Zuordnungsmodus", type: "String", required: true,
              default: mappingMode(context), attributes: { options: [
                { name: "field", label: "Feldwert = [NNNN] im Piwigo-Schlagwort (exakt)" },
                { name: "manual", label: "Bisherige manuelle Datensatz-ID / Tag-ID-Zuordnung" }
              ] } },
            { name: "number_field", label: "Saltcorn-Feld mit vierstelliger Facilitynummer", type: "String",
              default: fields.some(f => f.name === "facilitynr") ? "facilitynr" : undefined,
              attributes: { options: fields.map(f => f.name) }, showIf: { mapping_mode: "field" },
              sublabel: "Exakter 1:1-Vergleich, z. B. 0042 = [0042]. Kein Auffüllen: 42 ist ungültig. Führende Nullen als String speichern. Änderungen dieses Feldes ändern den Bildzugriff; Schreibrechte administrativ absichern." },
            { name: "mapping_json", label: "Zuordnung: Saltcorn-Datensatz-ID zu Piwigo-Tag-ID",
              type: "String", fieldview: "textarea", default: "{}", showIf: { mapping_mode: "manual" },
              sublabel: 'JSON-Objekt, z.B. {"42": 123, "178": 456}. Links: Primärschlüssel der Facility, NICHT automatisch deren Facilitynummer. Rechts: numerische Piwigo-Tag-ID. Ein Tag je Datensatz; keine automatischen Änderungen.' },
            { name: "page_size", label: "Bilder pro Seite (1 bis 96)", type: "Integer", default: 48 },
            { name: "thumbnail_caption", label: "Bildunterschrift: Vorschau", type: "String", fieldview: "textarea",
              default: THUMB_CAPTION,
              sublabel: "Text mit Platzhaltern: {name}, {file}, {date_creation}, {date_available}, {date}, {comment}, {width}, {height}, {dimensions}, {id}, {facility}. Zeilenumbrüche erlaubt. Leer = keine Unterschrift. Kein HTML." },
            { name: "detail_caption", label: "Bildunterschrift: Einzelbild", type: "String", fieldview: "textarea",
              default: DETAIL_CAPTION,
              sublabel: "Dieselben Platzhalter wie oben. {date_creation} = Aufnahmedatum, {date_available} = Importdatum. {date} verwendet bei fehlendem Aufnahmedatum das Importdatum. Maximal 4096 Zeichen je Vorlage." },
            { name: "date_format", label: "Datumsformat der Bildunterschriften", type: "String", default: "iso",
              attributes: { options: [{ name: "iso", label: "Wie von Piwigo geliefert" },
                { name: "de_date", label: "TT.MM.JJJJ" }, { name: "de_datetime", label: "TT.MM.JJJJ HH:mm" }] } },
            { name: "detail_navigation", label: "Im Einzelbild vor- und zurückblättern", type: "Bool", default: true,
              sublabel: "Auch über Seitengrenzen, in der gewählten Sortierung. Pfeiltasten links/rechts werden ebenfalls unterstützt." },
            { name: "detail_zoom", label: "Vergrößern in der Einzelbildansicht erlauben", type: "Bool", default: false,
              sublabel: "Zeigt Vergrößern, Verkleinern und Einpassen für berechtigte Betrachter dieser View. Bis 400 % der eingepassten Vorschau; Ausschnitt durch Scrollen verschieben. Keine Originaldateien oder zusätzlichen Bildabrufe." },
            { name: "detail_size", label: "Piwigo-Bildvariante im Einzelbild", type: "String", default: "medium",
              attributes: { options: PREVIEW_SIZES },
              sublabel: "medium = Standard; large/xlarge/xxlarge für größere Bilder. Fehlt die Variante, wird eine kleinere verwendet. Keine Originaldateien; Größen hängen von Piwigo ab." },
            { name: "detail_max_width", label: "Maximale Dialogbreite (320 bis 2400 px)", type: "Integer", default: 900 },
            { name: "detail_max_height", label: "Maximale Bildhöhe (30 bis 85 % der Fensterhöhe)", type: "Integer", default: 60,
              sublabel: "Das Bild bleibt vollständig sichtbar und wird nicht beschnitten. Kleine Bildschirme begrenzen die Breite automatisch." },
            { name: "min_role", label: "Maximale Rollen-ID (zusätzlich zu View- und Datensatzrechten)",
              type: "Integer", default: 80,
              sublabel: "Standardrollen: 1 = Administrator, 40 = Mitarbeiter, 80 = Benutzer. Öffentlicher Zugriff ist ausgeschlossen." }
          ] });
        }
      }]
    }),
    get_state_fields: async tableId => {
      const table = await Table.findOne({ id: tableId });
      return [{ name: table ? table.pk_name : "id", type: "Integer", primary_key: true, required: true }];
    },
    run: async (tableId, viewname, cfg, state, extra) => {
      try {
        const req = extra && extra.req;
        const user = authenticated(req, cfg.min_role || 80);
        const table = await Table.findOne({ id: tableId });
        if (!table) throw new Error("Table unavailable");
        const value = state && state[table.pk_name];
        if (value === undefined || value === null || value === "")
          return '<div class="alert alert-info">Bitte einen Facility-Datensatz auswählen.</div>';
        const id = integer(value, "Datensatz-ID");
        await table.getFields();
        const row = await table.getRow({ [table.pk_name]: id }, { forUser: user });
        if (!row) return '<div class="alert alert-warning">Datensatz nicht verfügbar oder kein Zugriff.</div>';
        return render({ id, viewname, title: cfg.title || "Bilder", admin: user.role_id === 1, display: displaySettings(cfg) });
      } catch (e) {
        return `<div class="alert alert-warning">${esc(errorResult(e).error)}</div>`;
      }
    },
    routes
  };
}
module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "saltcorn-piwigo",
  configuration_workflow,
  viewtemplates: cfg => [makeView(cfg || {})]
};
