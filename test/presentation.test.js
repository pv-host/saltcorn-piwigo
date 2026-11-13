"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { displaySettings, imageMetadata, captionText } = require("../lib/presentation");
const { render } = require("../lib/ui");
const { Client } = require("../lib/client");
const { makeService } = require("../lib/service");

test("legacy defaults and intentionally empty captions", () => {
  const defaults = displaySettings();
  assert.equal(defaults.detail_size, "medium");
  assert.equal(defaults.detail_navigation, true);
  assert.equal(defaults.detail_max_width, 900);
  assert.equal(defaults.detail_max_height, 60);
  assert.equal(displaySettings({ thumbnail_caption: "", detail_caption: "", detail_navigation: false }).detail_caption, "");
});
for (const cfg of [{ detail_size: "original" }, { detail_max_width: 2401 }, { detail_max_height: 86 },
  { detail_max_width: "900px" }, { date_format: "script" }, { detail_caption: {} },
  { thumbnail_caption: "x".repeat(4097) }]) {
  test(`invalid display setting rejected: ${JSON.stringify(cfg).slice(0, 70)}`, () => {
    assert.throws(() => displaySettings(cfg));
  });
}
const info = { id: 7, name: "Aufnahme", file: "DSC.jpg", date_creation: "2026-11-10 23:15:00",
  date_available: "2026-11-11 09:00:00", comment: "<b>Nur Text</b>", width: 640, height: 420,
  tags: [{ id: 666 }], latitude: 42, element_url: "https://private.invalid/original.jpg" };
test("metadata whitelist excludes tags, location and URLs", () => {
  const data = imageMetadata(info);
  assert.deepEqual(Object.keys(data).sort(), ["id", "name", "file", "comment", "date",
    "date_creation", "date_available", "width", "height"].sort());
  assert.equal(data.width, 640);
  assert.equal(imageMetadata({ id: 1, width: {}, height: -1 }).width, "");
});
test("caption supports all whitelisted placeholders and both dates", () => {
  assert.equal(captionText("{name} | {file} | {date_creation} | {date_available}\n{comment} {dimensions} {id} {facility}",
    imageMetadata(info), "de_datetime", "Anlage A"),
  "Aufnahme | DSC.jpg | 10.11.2026 23:15 | 11.11.2026 09:00\n<b>Nur Text</b> 640 × 420 7 Anlage A");
});
test("capture date stays empty, legacy date explicitly falls back to import date", () => {
  const data = imageMetadata({ ...info, date_creation: "" });
  assert.equal(captionText("{date_creation}", data, "de_date"), "");
  assert.equal(captionText("{date}", data, "de_date"), "11.11.2026");
  assert.equal(captionText("{date_available}", data, "iso"), "2026-11-11 09:00:00");
});
test("substitution is one pass, unknown placeholders are literal, no evaluation", () => {
  assert.equal(captionText("{name} {constructor} {unknown}", { name: "{file}" }, "iso"),
    "{file} {constructor} {unknown}");
});
test("render escapes inline configuration and restricts footer to admins", () => {
  const html = render({ title: "Bilder", admin: false, display: { detail_caption: "</script><script>alert(1)</script>" } });
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.ok(!html.includes('<p class="pw-assignment'));
  const admin = render({ title: "Bilder", admin: true });
  assert.match(admin, /<footer[\s\S]*<nav class="pw-pagination"[\s\S]*<p class="pw-assignment[\s\S]*<\/footer>/);
});
test("disabled navigation and bounded CSS values are emitted", () => {
  const html = render({ title: "Bilder", display: { detail_navigation: false, detail_max_width: 1400, detail_max_height: 80 } });
  assert.match(html, /aria-label="Einzelbilder" hidden/);
  assert.match(html, /--pw-detail-width:1400px;--pw-detail-height:80vh/);
});
const client = () => new Client({ base_url: "https://piwigo.example.org/", api_key: "synthetic-test-key" });
test("selected preview variant, descending fallback and unchanged thumb", async () => {
  const c = client();
  const image = { derivatives: {
    thumb: { url: "/thumb.jpg" }, small: { url: "/small.jpg" },
    medium: { url: "/medium.jpg" }, xlarge: { url: "/xl.jpg" }
  } };
  c.request = async url => url.pathname;
  assert.equal(await c.media(image, "preview", "xlarge"), "/xl.jpg");
  assert.equal(await c.media(image, "preview", "xxlarge"), "/xl.jpg");
  assert.equal(await c.media(image, "preview", "large"), "/medium.jpg");
  assert.equal(await c.media(image, "preview", "small"), "/small.jpg");
  assert.equal(await c.media(image, "thumb", "xlarge"), "/thumb.jpg");
  assert.equal(c.mediaDiagnostic(image, "xlarge").previews[1].variant, "xlarge");
});
test("no fallback to originals or larger-than-selected derivatives", async () => {
  const c = client();
  c.request = () => assert.fail("must not fetch");
  await assert.rejects(c.media({ derivatives: { xlarge: { url: "/xl.jpg" } }, element_url: "/original.jpg" },
    "preview", "medium"), /keine passende Vorschau/);
  await assert.rejects(c.media({}, "preview", "original"), /Detailbild-Variante/);
});
test("view configuration, not request body, determines preview quality", async () => {
  const Table = { findOne: async () => ({ pk_name: "id", getFields: async () => [],
    getRow: async () => ({ id: 1 }) }) };
  const c = { info: async () => ({ id: 7, tags: [{ id: 123 }] }),
    media: async (_info, size, preferred) => ({ size, preferred }) };
  const svc = makeService(Table, {}, () => c);
  const data = await svc.operations.media(1, { mapping_json: '{"1":123}', detail_size: "large" },
    { id: 1, image_id: 7, size: "preview", detail_size: "original" }, { user: { id: 2, role_id: 40 } });
  assert.deepEqual(data, { size: "preview", preferred: "large" });
});
