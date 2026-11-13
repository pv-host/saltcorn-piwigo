"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { integer, authenticated, parseMapping, authorize, hasTag, esc, errorResult } = require("../lib/core");
const { render } = require("../lib/ui");
const { baseUrl, safeMediaUrl, READ_METHODS, Limiter, Client } = require("../lib/client");
const { makeService } = require("../lib/service");

const admin = { user: { id: 1, role_id: 1 } };
const user = { user: { id: 2, role_id: 40 } };
const cfg = { mapping_json: '{"42":123}', page_size: 48, min_role: 40 };
const table = { pk_name: "id", getFields: async () => [], getRow: async (where, opts) => {
  assert.deepEqual(opts, { forUser: user.user });
  return where.id === 42 ? { id: 42 } : null;
} };
const Table = { findOne: async () => table };

test("valid positive IDs", () => assert.equal(integer("0042", "id"), 42));
for (const bad of [null, undefined, "", -1, 0, "1e2", "1.2", "42 OR 1=1", {}, [], "9007199254740992"])
  test(`reject invalid ID ${JSON.stringify(bad)}`, () => assert.throws(() => integer(bad, "id")));
test("page zero allowed", () => assert.equal(integer(0, "page", 0), 0));
test("anonymous access denied", () => assert.throws(() => authenticated({}), /Berechtigung/));
test("public role denied even with id", () => assert.throws(() => authenticated({ user: { id: 3, role_id: 100 } }), /Berechtigung/));
test("string role fail closed", () => assert.throws(() => authenticated({ user: { id: 3, role_id: "1" } }), /Berechtigung/));
test("role threshold honored", () => assert.throws(() => authenticated(user, 1), /Berechtigung/));
test("standard Saltcorn user role 80 allowed by default", () => assert.equal(authenticated({ user: { id: 3, role_id: 80 } }).id, 3));
test("mapping uses row ID not facility label", () => assert.equal(parseMapping('{"42":123}').get("42"), 123));
for (const text of ["null", "[]", "not json", '{"42":"abc"}', '{"42":123,"43":123}', '{"042":123,"42":456}', '{"__proto__":123}'])
  test(`reject mapping ${text}`, () => assert.throws(() => parseMapping(text)));
test("ownership context passed to Saltcorn", async () => assert.equal((await authorize(Table, 1, cfg, { id: 42 }, user)).tagId, 123));
test("missing row denied before mapping", async () => assert.rejects(authorize(Table, 1, cfg, { id: 43 }, user), /kein Zugriff/));
test("missing mapping never loads all photos", async () => assert.rejects(authorize(Table, 1, { mapping_json: "{}" }, { id: 42 }, user), /noch kein/));
test("body cannot select another tag", async () => assert.equal((await authorize(Table, 1, cfg, { id: 42, tag_id: 999 }, user)).tagId, 123));
test("membership matches numeric ID", () => assert.equal(hasTag({ tags: [{ id: "123" }] }, 123), true));
test("missing membership fails", () => assert.equal(hasTag({}, 123), false));
test("HTML escaping", () => assert.equal(esc('<script>"&'), "&lt;script&gt;&quot;&amp;"));
test("unknown errors do not leak details", () => assert.doesNotMatch(errorResult(new Error("PASSWORD")).error, /PASSWORD/));
test("HTTPS required by default", () => assert.throws(() => baseUrl("http://example.org", false), /HTTPS/));
test("explicit HTTP test mode", () => assert.equal(baseUrl("http://127.0.0.1:8000/a", true).pathname, "/a/"));
for (const u of ["https://user:password@example.org/", "https://example.org/?a=b", "https://example.org/#x", "file:///tmp/x"])
  test(`reject base ${u}`, () => assert.throws(() => baseUrl(u, false)));
const base = baseUrl("https://example.org/gallery/", false);
for (const u of ["https://evil.org/a.jpg", "http://example.org/gallery/a.jpg", "/outside/a.jpg",
  "/gallery/../a.jpg", "/gallery/%2fsecret", "https://user:pw@example.org/gallery/a.jpg", "//evil.org/a.jpg"])
  test(`reject media ${u}`, () => assert.throws(() => safeMediaUrl(u, base)));
test("same instance derivative accepted", () => assert.equal(safeMediaUrl("/gallery/_data/i/test.jpg", base).origin, base.origin));
test("write methods absent", () => {
  for (const method of ["pwg.images.setInfo", "pwg.tags.add", "pwg.images.delete", "pwg.session.login"])
    assert.equal(READ_METHODS.has(method), false);
});
test("without configured key an environment key is required", () => assert.throws(() => new Client({ base_url: base.href }, { env: {} }), /fehlt/));
test("CRLF key rejected", () => assert.throws(() => new Client({ base_url: base.href }, { env: { PIWIGO_API_KEY: "a\r\nb" } }), /fehlt/));
test("UI escapes titles and script contexts", () => {
  const html = render({ id: 42, title: "</h2><script>evil()</script>", viewname: "</script><script>bad()", admin: false });
  assert.doesNotMatch(html, /<script>evil\(\)/);
  assert.doesNotMatch(html, /<\/script><script>bad/);
  assert.match(html, /\\u003c/);
});
test("UI has no API credential configuration", () => assert.doesNotMatch(render({ id: 42, title: "Bilder", viewname: "gallery" }), /X-PIWIGO-API|fixture-only/));
test("diagnostic restricted to Saltcorn admin", async () => {
  const svc = makeService(Table, {}, () => { throw new Error("must not be reached"); });
  await assert.rejects(svc.operations.diagnostic(1, cfg, {}, user), /Berechtigung/);
  await assert.rejects(svc.operations.tags(1, cfg, {}, user), /Berechtigung/);
});
test("removed tag blocks detail and media", async () => {
  const svc = makeService(Table, {}, () => ({ info: async () => ({ id: 1, tags: [{ id: 999 }] }) }));
  await assert.rejects(svc.operations.detail(1, cfg, { id: 42, image_id: 1 }, user), /nicht zugeordnet/);
  await assert.rejects(svc.operations.media(1, cfg, { id: 42, image_id: 1, size: "thumb" }, user), /nicht zugeordnet/);
});
test("metadata omits other Facility tags and URLs", async () => {
  const svc = makeService(Table, {}, () => ({ info: async () => ({
    id: 1, tags: [{ id: 123 }, { id: 456, name: "secret facility" }],
    categories: [{ name: "secret album" }], latitude: 23, element_url: "secret URL", name: "Allowed"
  }) }));
  const d = await svc.operations.detail(1, cfg, { id: 42, image_id: 1 }, user);
  assert.equal(d.name, "Allowed");
  assert.doesNotMatch(JSON.stringify(d), /secret|latitude|tags|categories/);
});
test("unknown sorting rejected", async () => {
  const svc = makeService(Table, {}, () => ({}));
  await assert.rejects(svc.operations.list(1, cfg, { id: 42, order: "DROP TABLE" }, user), /Sortierung/);
});
test("all four sorts and configured page size forwarded", async () => {
  const calls = [];
  const svc = makeService(Table, {}, () => ({ list: async (...args) => { calls.push(args); return {}; } }));
  for (const order of ["newest", "oldest", "filename", "added"])
    await svc.operations.list(1, cfg, { id: 42, page: 2, order, tag_id: 999, per_page: 100000 }, user);
  assert.deepEqual(calls.map(c => c.slice(0, 3)), Array(4).fill([123, 2, 48]));
  assert.deepEqual(calls.map(c => c[3]), [
    "date_creation DESC, id DESC", "date_creation ASC, id ASC", "file ASC, id ASC", "date_available DESC, id DESC"
  ]);
});
test("invalid media size rejected", async () => {
  const svc = makeService(Table, {}, () => ({}));
  await assert.rejects(svc.operations.media(1, cfg, { id: 42, image_id: 1, size: "original" }, user), /Vorschaugröße/);
});
test("queue bound and concurrency", async () => {
  const l = new Limiter(1, 1);
  let release;
  const a = l.run(() => new Promise(resolve => { release = resolve; }));
  const b = l.run(async () => 2);
  await assert.rejects(l.run(async () => 3), /ausgelastet/);
  release(1);
  assert.deepEqual(await Promise.all([a, b]), [1, 2]);
  assert.equal(l.active, 0);
});
test("media route sets no-store and nosniff on denial", async () => {
  const svc = makeService(Table, {});
  const headers = {};
  const res = { setHeader: (k,v) => { headers[k] = v; }, status: n => { res.code = n; }, json: x => { res.data = x; } };
  await svc.routes.media(1, "v", cfg, { id: 42, image_id: 1, size: "thumb" }, { req: {}, res });
  assert.equal(res.code, 403);
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});
