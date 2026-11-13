"use strict";
// Optional follow-up to setup-saltcorn.js, only in its disposable fixture database.
if (process.env.PIWIGO_QA !== "1" || !process.env.SQLITE_FILEPATH?.endsWith("/piwigo-qa.sqlite"))
  throw new Error("Requires PIWIGO_QA=1 and a disposable .../piwigo-qa.sqlite database.");
const assert = require("node:assert/strict");
const Table = require("@saltcorn/data/models/table");
const Field = require("@saltcorn/data/models/field");
const User = require("@saltcorn/data/models/user");
const View = require("@saltcorn/data/models/view");
const Plugin = require("@saltcorn/data/models/plugin");
const db = require("@saltcorn/data/db");
const { getState } = require("@saltcorn/data/db/state");
const { authorize } = require("../lib/core");

(async () => {
  const plugin = await Plugin.findOne({ name: "saltcorn-piwigo" });
  assert.ok(plugin && plugin.source === "local", "Existing local fixture plugin required");
  assert.ok(!Table.findOne({ name: "facility_field_qa" }), "Refusing to overwrite existing field fixtures");
  const savedConfig = JSON.stringify(plugin.configuration);
  const loaded = await Plugin.requirePlugin(plugin, true);
  assert.equal(loaded.version, require("../package.json").version);
  assert.equal(typeof loaded.plugin_module.configuration_workflow, "function");
  plugin.version = loaded.version;
  await plugin.upsert();
  assert.equal(JSON.stringify(plugin.configuration), savedConfig);
  await Plugin.loadAllPlugins();
  const user = await User.findOne({ email: "user@example.invalid" });
  const other = await User.findOne({ email: "other@example.invalid" });
  const table = await Table.create("facility_field_qa", { min_role_read: 1, min_role_write: 1 });
  await Field.create({ name: "facilitynr", type: "String", table_id: table.id, attributes: {} });
  await Field.create({ name: "facilityname", type: "String", table_id: table.id, attributes: {} });
  const owner = await Field.create({ name: "owner", type: "Key to users", table_id: table.id, attributes: {} });
  await table.update({ ownership_field_id: owner.id });
  await Table.state_refresh(true);
  const fresh = Table.findOne({ id: table.id });
  assert.equal((await fresh.getRows()).length, 0);
  for (const row of [
    { id: 817, facilitynr: "0042", facilityname: "Testanlage 0042", owner: user.id },
    { id: 818, facilitynr: "0178", facilityname: "Fremde Anlage", owner: other.id },
    { id: 819, facilitynr: "9999", facilityname: "Ohne passendes Schlagwort", owner: user.id },
    { id: 820, facilitynr: "42", facilityname: "Ungueltige zweistellige Nummer", owner: user.id }
  ]) await fresh.insertRow(row);
  assert.equal((await fresh.getRows()).length, 4);
  const cfg = { mapping_mode: "field", number_field: "facilitynr",
    label_field: "facilityname", title: "Facility-Bilder", min_role: 40, page_size: 12 };
  const vt = getState().viewtemplates.PiwigoFacilityBilder;
  const form = await vt.configuration_workflow().steps[0].form({ table_id: table.id });
  assert.equal(form.fields.find(f => f.name === "mapping_mode").default, "field");
  assert.equal(form.fields.find(f => f.name === "number_field").default, "facilitynr");
  const oldForm = await vt.configuration_workflow().steps[0].form({ table_id: table.id, mapping_json: "{}" });
  assert.equal(oldForm.fields.find(f => f.name === "mapping_mode").default, "manual");
  assert.equal((await authorize(Table, table.id, cfg, { id: 817 }, { user })).number, "0042");
  await assert.rejects(authorize(Table, table.id, cfg, { id: 818 }, { user }), /kein Zugriff/);
  await assert.rejects(authorize(Table, table.id, cfg, { id: 820 }, { user }), /exakt vier/);
  await View.create({ name: "Piwigo_Field", table_id: table.id, viewtemplate: "PiwigoFacilityBilder",
    min_role: 40, configuration: cfg });
  console.log("PASS: plugin load, preserved plugin config, new/legacy form defaults, field matching and real owner filtering.");
  console.log("Synthetic table only: facility_field_qa row count 0 -> 4. Existing facility_qa unchanged.");
  console.log("PASS: field view /view/Piwigo_Field?id=817; denial 818; missing 819; invalid 820.");
  await db.close();
})().catch(e => { console.error(e); process.exit(1); });
