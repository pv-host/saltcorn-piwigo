"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Client, readLimited } = require("../lib/client");
const { createMock } = require("./mock-piwigo");
const env = { PIWIGO_API_KEY: "fixture-only-not-a-real-key" };
const make = fetch => new Client({ base_url: "https://piwigo.example/gallery/" }, { fetch, env });
const ok = result => new Response(JSON.stringify({ stat: "ok", result }), { headers: { "content-type": "application/json" } });

test("HTTP fixture: pagination, cap, detail, derivative, no writes", async () => {
  const { server, state, calls } = createMock();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    state.cap = 20;
    const c = new Client({ base_url: `http://127.0.0.1:${server.address().port}/gallery/`, allow_http: true }, { env });
    const status = await c.call("pwg.session.getStatus");
    assert.equal(status.version, "16.5.0");
    const first = await c.list(123, 0, 48, "id ASC");
    assert.equal(first.paging.total, 120000);
    assert.equal(first.paging.per_page, 20);
    assert.equal(first.images.length, 20);
    const next = await c.list(123, 1, 48, "id ASC");
    assert.equal(next.images[0].id, 21);
    const last = await c.list(123, 5999, 48, "id ASC");
    assert.equal(last.images.at(-1).id, 120000);
    const info = await c.info(1);
    const media = await c.media(info, "thumb");
    assert.equal(media.type, "image/png");
    assert.ok(media.bytes.length > 0);
    assert.ok(calls.every(c => !/setInfo|add|delete/.test(c.method)));
    state.outage = true;
    await assert.rejects(c.list(123, 0, 48, "id ASC"), /503/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test("API header and form content", async () => {
  const c = make(async (url, init) => {
    assert.equal(url.href, "https://piwigo.example/gallery/ws.php?format=json");
    assert.equal(init.headers["X-PIWIGO-API"], env.PIWIGO_API_KEY);
    assert.equal(init.redirect, "manual");
    assert.equal(init.body.get("method"), "pwg.getVersion");
    return ok("16.5.0");
  });
  assert.equal(await c.call("pwg.getVersion"), "16.5.0");
});
test("write method denied before network", async () => {
  const c = make(() => { throw new Error("network must not run"); });
  await assert.rejects(c.call("pwg.images.setInfo"), /gesperrt/);
});
for (const code of [301, 302, 307, 308])
  test(`redirect ${code} refused`, async () => {
    await assert.rejects(make(async () => new Response("", { status: code })).call("pwg.getVersion"), /Weiterleitung/);
  });
for (const code of [401, 403, 500])
  test(`HTTP ${code} sanitized`, async () => {
    await assert.rejects(make(async () => new Response("secret", { status: code })).call("pwg.getVersion"),
      e => !e.message.includes("secret") && e.status === 502);
  });
test("Piwigo error message sanitized", async () => {
  await assert.rejects(make(async () => new Response(JSON.stringify({ stat: "fail", err: 401, message: "secret" })))
    .call("pwg.getVersion"), e => !e.message.includes("secret") && /401/.test(e.message));
});
test("invalid JSON handled", async () => {
  await assert.rejects(make(async () => new Response("<html>Login</html>")).call("pwg.getVersion"), /JSON/);
});
test("missing paging fails", async () => {
  await assert.rejects(make(async () => ok({ images: [] })).list(123, 0, 48, "id ASC"), /Seitenantwort/);
});
test("wrong returned page fails", async () => {
  await assert.rejects(make(async () => ok({ images: [], paging: { page: 2, per_page: 48, total_count: 0 } }))
    .list(123, 0, 48, "id ASC"), /Widersprüchliche/);
});
test("duplicate images fail", async () => {
  await assert.rejects(make(async () => ok({ images: [{ id: 1 }, { id: 1 }], paging: { page: 0, per_page: 48, total_count: 2 } }))
    .list(123, 0, 48, "id ASC"), /Doppelte/);
});
test("detail wrong id fails", async () => {
  await assert.rejects(make(async () => ok({ id: 2 })).info(1), /Unerwartete/);
});
test("SVG preview rejected", async () => {
  await assert.rejects(make(async () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }))
    .media({ derivatives: { thumb: { url: "/gallery/thumb.svg" } } }, "thumb"), /unsicheres/);
});
test("no original fallback", async () => {
  await assert.rejects(make(() => {}).media({ element_url: "/gallery/original.jpg" }, "thumb"), /keine passende/);
});
test("response byte limit", async () => {
  await assert.rejects(readLimited(new Response("abcdef"), 3), /Größenbegrenzung/);
});
test("content length limit", async () => {
  await assert.rejects(readLimited(new Response("a", { headers: { "content-length": "999" } }), 3), /Größenbegrenzung/);
});
test("network error redacted", async () => {
  await assert.rejects(make(async () => { throw new Error("secret host info"); }).call("pwg.getVersion"),
    e => /nicht erreichbar/.test(e.message) && !e.message.includes("secret"));
});
test("timeout abort handled", async () => {
  const c = new Client({ base_url: "https://piwigo.example/", timeout_ms: 1000 }, { env,
    fetch: (_, init) => new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("abort"))))
  });
  await assert.rejects(c.call("pwg.getVersion"), /Zeitüberschreitung/);
});
