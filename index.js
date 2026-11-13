"use strict";
const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const Table = require("@saltcorn/data/models/table");
const { authenticated, integer, esc, errorResult } = require("./lib/core");
const { makeService } = require("./lib/service");
const { render } = require("./lib/ui");

const configuration_workflow = () => new Workflow({
  steps: [{
    name: "Piwigo-Verbindung",
    form: async () => new Form({ fields: [
      { name: "base_url", label: "Piwigo-Basis-URL", type: "String", required: true,
        sublabel: "Kanonische URL, z.B. https://bilder.example.org/piwigo/ (ohne ws.php)." },
      { name: "api_key_env", label: "Umgebungsvariable für den API-Key", type: "String",
        required: true, default: "PIWIGO_API_KEY",
        sublabel: "Nur Variablenname, NICHT den Schlüssel eintragen. Im Saltcorn-Serverprozess setzen." },
      { name: "timeout_ms", label: "Timeout je Piwigo-Anfrage (ms)", type: "Integer", default: 15000 },
      { name: "allow_http", label: "HTTP ausdrücklich erlauben (nur abgeschottetes Testnetz)", type: "Bool", default: false,
        sublabel: "Produktiv HTTPS verwenden. Bei HTTP werden API-Key und Bilder unverschlüsselt übertragen." }
    ] })
  }]
});

function makeView(pluginCfg) {
  const { routes } = makeService(Table, pluginCfg);
  return {
    name: "PiwigoFacilityBilder",
    description: "Lesende Piwigo-Galerie mit administrativer Facility-Tag-Zuordnung",
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
            { name: "mapping_json", label: "Zuordnung: Saltcorn-Datensatz-ID zu Piwigo-Tag-ID",
              type: "String", fieldview: "textarea", required: true, default: "{}",
              sublabel: 'JSON-Objekt, z.B. {"42": 123, "178": 456}. Links: Primärschlüssel der Facility, NICHT automatisch deren Facilitynummer. Rechts: numerische Piwigo-Tag-ID. Ein Tag je Datensatz; keine automatischen Änderungen.' },
            { name: "page_size", label: "Bilder pro Seite (1 bis 96)", type: "Integer", default: 48 },
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
        return render({ id, viewname, title: cfg.title || "Bilder", admin: user.role_id === 1 });
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
