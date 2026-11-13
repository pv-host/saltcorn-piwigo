"use strict";
// Optional integration harness. Run only against a new disposable SQLite DB.
if (process.env.PIWIGO_QA !== "1" || !process.env.SQLITE_FILEPATH ||
    !process.env.SQLITE_FILEPATH.endsWith("/piwigo-qa.sqlite")) {
  throw new Error("Requires PIWIGO_QA=1 and a disposable .../piwigo-qa.sqlite database.");
}
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
  await Plugin.loadAllPlugins();
  const plugin = await Plugin.findOne({ name: "saltcorn-piwigo" });
  assert.ok(plugin, "Install the local plugin first");
  plugin.configuration = {
    base_url: "http://127.0.0.1:8091/gallery/", api_key_env: "PIWIGO_API_KEY",
    allow_http: true, timeout_ms: 15000
  };
  await plugin.upsert();
  await Plugin.loadAllPlugins();
  const admin = await User.create({ email: "admin@example.invalid", password: "Local-test-only-123!", role_id: 1 });
  const user = await User.create({ email: "user@example.invalid", password: "Local-test-only-123!", role_id: 40 });
  const other = await User.create({ email: "other@example.invalid", password: "Local-test-only-123!", role_id: 40 });
  const table = await Table.create("facility_qa", { min_role_read: 1, min_role_write: 1 });
  await Field.create({ name: "facilityname", type: "String", table_id: table.id, attributes: {} });
  const owner = await Field.create({ name: "owner", type: "Key to users", table_id: table.id, attributes: {} });
  await table.update({ ownership_field_id: owner.id });
  await Table.state_refresh(true);
  const fresh = Table.findOne({ id: table.id });
  await fresh.insertRow({ id: 42, facilityname: "Facility 0042 · Testanlage", owner: user.id });
  await fresh.insertRow({ id: 43, facilityname: "Facility 0178 · Fremder Datensatz", owner: other.id });
  const cfg = { mapping_json: '{"42":123,"43":456}', label_field: "facilityname", title: "Facility-Bilder", min_role: 40, page_size: 12 };
  const vt = getState().viewtemplates.PiwigoFacilityBilder;
  assert.ok(vt, "View template registered");
  const pluginForm = await require("../index").configuration_workflow().steps[0].form();
  const viewForm = await vt.configuration_workflow().steps[0].form({ table_id: table.id });
  assert.ok(pluginForm.fields.length >= 4);
  assert.ok(viewForm.fields.find(f => f.name === "mapping_json"));
  assert.equal((await authorize(Table, table.id, cfg, { id: 42 }, { user })).tagId, 123);
  await assert.rejects(authorize(Table, table.id, cfg, { id: 43 }, { user }), /kein Zugriff/);
  assert.equal((await authorize(Table, table.id, cfg, { id: 43 }, { user: admin })).tagId, 456);
  await assert.rejects(authorize(Table, table.id, cfg, { id: 42 }, {}), /Berechtigung/);
  await View.create({ name: "Piwigo_QA", table_id: table.id, viewtemplate: "PiwigoFacilityBilder", min_role: 40, configuration: cfg });
  await View.create({ name: "Piwigo_Empty", table_id: table.id, viewtemplate: "PiwigoFacilityBilder", min_role: 40, configuration: { ...cfg, mapping_json: "{}" } });
  await getState().setConfig("site_name", "Piwigo Plugin QA");
  console.log("PASS: Saltcorn 1.6.2 registration, configuration forms, ownership and View creation");
  console.log("Fixture views: /view/Piwigo_QA?id=42 and /view/Piwigo_Empty?id=42");
  await db.close();
})().catch(e => { console.error(e); process.exit(1); });
