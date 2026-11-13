"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Client, baseUrl, safeMediaUrl } = require("../lib/client");
const { makeService } = require("../lib/service");
const root = baseUrl("https://piwigo.example.org", false);
const base = baseUrl("https://piwigo.example.org/gallery/", false);
const key = "synthetic-only:secret-value";
const config = { base_url: base.href, api_key: key };
const image = url => ({ id: 7, tags: [{ id: 123 }], derivatives: { thumb: { url }, medium: { url } } });

test("Piwigo i.php query-style derivative accepted, query unchanged", () => {
  const url = "https://piwigo.example.org/i.php?/piwigo-galleries/2023/2023_12_12/20231212_100026-xl.jpg";
  assert.equal(safeMediaUrl(url, root).href, url);
});
test("HTTPS upgrade disabled by default", () => {
  assert.throws(() => safeMediaUrl("http://piwigo.example.org/gallery/a.jpg", base), /Protokoll/);
});
test("explicit same-host standard-port HTTPS upgrade preserves path/query", () => {
  assert.equal(safeMediaUrl("http://piwigo.example.org/gallery/i.php?/folder/a.jpg", base,
    { upgradeHttps: true }).href, "https://piwigo.example.org/gallery/i.php?/folder/a.jpg");
});
for (const [url, reason] of [
  ["https://other.example.org/gallery/a.jpg", /Hostname/],
  ["https://piwigo.example.org:8443/gallery/a.jpg", /Port/],
  ["https://piwigo.example.org/outside/a.jpg", /Installationspfad/],
  ["https://piwigo.example.org/gallery/a%2ejpg", /Prozentkodierung/],
  ["https://user:password@piwigo.example.org/gallery/a.jpg", /Zugangsdaten/],
  ["https://piwigo.example.org/gallery/a.jpg#fragment", /Fragment/],
  ["http://piwigo.example.org:8080/gallery/a.jpg", /Protokoll/],
  ["http://other.example.org/gallery/a.jpg", /Protokoll/],
  ["file:///gallery/a.jpg", /Protokoll/]
]) test(`specific denial remains with HTTPS option: ${url}`, () => {
  assert.throws(() => safeMediaUrl(url, base, { upgradeHttps: true }), reason);
});
test("custom API ports are not silently rewritten", () => {
  assert.throws(() => safeMediaUrl("http://piwigo.example.org:8443/gallery/a.jpg",
    baseUrl("https://piwigo.example.org:8443/gallery/", false), { upgradeHttps: true }), /Protokoll/);
});
test("HTTP API base never causes HTTPS downgrade", () => {
  assert.throws(() => safeMediaUrl("https://piwigo.example.org/gallery/a.jpg",
    baseUrl("http://piwigo.example.org/gallery/", true), { upgradeHttps: true }), /Protokoll/);
});
test("strict media rejection occurs before fetch and cannot leak key", async () => {
  const c = new Client({ ...config, upgrade_media_https: true }, { fetch: async () => assert.fail("network") });
  await assert.rejects(c.media(image("https://other.example.org/gallery/a.jpg"), "thumb"), /Hostname/);
});
test("upgraded media request sends key only to original HTTPS origin", async () => {
  const c = new Client({ ...config, upgrade_media_https: true }, { fetch: async (url, init) => {
    assert.equal(url.origin, base.origin);
    assert.equal(url.protocol, "https:");
    assert.equal(init.headers["X-PIWIGO-API"], key);
    assert.equal(init.redirect, "manual");
    return new Response("fixture", { headers: { "content-type": "image/png" } });
  } });
  assert.equal((await c.media(image("http://piwigo.example.org/gallery/a.jpg"), "thumb")).type, "image/png");
});
test("diagnostic does not fetch media and omits query, credentials and fragment", () => {
  const c = new Client(config, { fetch: async () => assert.fail("network") });
  const result = c.mediaDiagnostic(image("https://username:password@other.example.org/a.jpg?token=SECRET_QUERY#SECRET_HASH"));
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /username|password|SECRET_QUERY|SECRET_HASH|synthetic-only/);
  assert.equal(result.previews[0].returned.credentials_omitted, true);
  assert.equal(result.previews[0].returned.query_omitted, true);
  assert.equal(result.previews[0].returned.fragment_omitted, true);
  assert.equal(result.previews[0].allowed, false);
});
test("diagnostic redacts a key embedded in path, raw and URL-encoded", () => {
  const c = new Client(config);
  const info = image(`${base.href}${key}/a.jpg`);
  info.derivatives.medium.url = `${base.href}${encodeURIComponent(key)}/a.jpg`;
  const text = JSON.stringify(c.mediaDiagnostic(info));
  assert.ok(!text.includes(key) && !text.includes(encodeURIComponent(key)));
});
test("diagnostic indicates returned versus effective HTTPS origin", () => {
  const c = new Client({ ...config, upgrade_media_https: true });
  const result = c.mediaDiagnostic(image("http://piwigo.example.org/gallery/i.php?/folder/file.jpg"));
  assert.equal(result.api_base.origin, "https://piwigo.example.org");
  assert.equal(result.previews[0].returned.origin, "http://piwigo.example.org");
  assert.equal(result.previews[0].effective.origin, "https://piwigo.example.org");
  assert.equal(result.previews[0].https_upgraded, true);
  assert.equal(result.previews[0].allowed, true);
});
test("diagnostic distinguishes selected thumbnail and preview variants", () => {
  const c = new Client(config);
  const result = c.mediaDiagnostic({ derivatives: {
    thumb: { url: `${base.href}thumb.jpg` }, medium: { url: "https://other.example.org/medium.jpg" },
    large: { url: `${base.href}large.jpg` }
  } });
  assert.equal(result.previews[0].variant, "thumb");
  assert.equal(result.previews[0].allowed, true);
  assert.equal(result.previews[1].variant, "medium");
  assert.equal(result.previews[1].allowed, false);
});
test("diagnostic safely reports missing or malformed media URLs", () => {
  const c = new Client(config);
  assert.equal(c.mediaDiagnostic({}).previews[0].allowed, false);
  assert.match(c.mediaDiagnostic(image("http://[invalid")).previews[0].reason, /Ungültige/);
});

const cfg = { mapping_json: '{"42":123}', min_role: 80 };
const Table = { findOne: async () => ({ pk_name: "id", getFields: async () => [],
  getRow: async where => where.id === 42 ? { id: 42 } : null }) };
test("URL diagnostic is administrator only, before any client request", async () => {
  const svc = makeService(Table, {}, () => assert.fail("client"));
  for (const req of [{}, { user: { id: 2, role_id: 40 } }])
    await assert.rejects(svc.operations.media_diagnostic(1, cfg, { id: 42, image_id: 7 }, req), e => e.status === 403);
});
test("URL diagnostic still checks row and image membership", async () => {
  const svc = makeService(Table, {}, () => ({ info: async () => ({ id: 7, tags: [{ id: 999 }] }),
    mediaDiagnostic: () => assert.fail("diagnostic") }));
  const admin = { user: { id: 1, role_id: 1 } };
  await assert.rejects(svc.operations.media_diagnostic(1, cfg, { id: 99, image_id: 7 }, admin), /kein Zugriff/);
  await assert.rejects(svc.operations.media_diagnostic(1, cfg, { id: 42, image_id: 7 }, admin), /nicht zugeordnet/);
});
test("URL diagnostic returns running package version and checked image ID", async () => {
  const svc = makeService(Table, {}, () => ({
    info: async () => image(`${base.href}a.jpg`),
    mediaDiagnostic: info => new Client(config).mediaDiagnostic(info)
  }));
  const result = await svc.operations.media_diagnostic(1, cfg, { id: 42, image_id: 7 }, { user: { id: 1, role_id: 1 } });
  assert.equal(result.image_id, 7);
  assert.equal(result.plugin_version, require("../package.json").version);
  assert.equal(result.previews[0].allowed, true);
});
