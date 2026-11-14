"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { displaySettings, zoomGeometry } = require("../lib/presentation");
const { render } = require("../lib/ui");

test("zoom is opt-in, including existing configurations", () => {
  for (const detail_zoom of [undefined, null, false, "true", 1])
    assert.equal(displaySettings({ detail_zoom }).detail_zoom, false);
  assert.equal(displaySettings({ detail_zoom: true }).detail_zoom, true);
});
test("only validated view zoom flag reaches browser options", () => {
  assert.match(render({ title: "Bilder", display: { detail_zoom: true } }), /"detail_zoom":true/);
  assert.match(render({ title: "Bilder" }), /"detail_zoom":false/);
});
test("landscape fit and zoom preserve aspect ratio", () => {
  assert.deepEqual(zoomGeometry(1200, 600, 600, 500, 1), { width: 600, height: 300, viewportHeight: 300 });
  assert.deepEqual(zoomGeometry(1200, 600, 600, 500, 2), { width: 1200, height: 600, viewportHeight: 300 });
});
test("portrait fit is height limited", () => {
  assert.deepEqual(zoomGeometry(600, 1200, 900, 500, 2), { width: 500, height: 1000, viewportHeight: 500 });
});
test("zoom limits and mobile resize retain aspect", () => {
  assert.deepEqual(zoomGeometry(1000, 1000, 300, 500, 10), { width: 1200, height: 1200, viewportHeight: 300 });
  assert.deepEqual(zoomGeometry(1000, 1000, 300, 500, .5), { width: 300, height: 300, viewportHeight: 300 });
});
test("unloaded or invalid image geometry cannot produce CSS dimensions", () => {
  for (const invalid of [0, -1, NaN, Infinity, undefined])
    assert.equal(zoomGeometry(invalid, 600, 300, 500, 2), null);
});
