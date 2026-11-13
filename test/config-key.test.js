"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Client } = require("../lib/client");
const { errorResult } = require("../lib/core");
const { makeService } = require("../lib/service");
const { render } = require("../lib/ui");
const { createMock } = require("./mock-piwigo");
const base = { base_url: "https://piwigo.example/gallery/" };
const key = "synthetic-module-key:not-a-real-secret";

test("configured key works with no environment", () => {
  assert.equal(new Client({ ...base, api_key: key }, { env: {} }).key, key);
});
test("configured key has precedence over environment", () => {
  assert.equal(new Client({ ...base, api_key: key }, { env: { PIWIGO_API_KEY: "different" } }).key, key);
});
test("unused environment name does not block configured key", () => {
  assert.equal(new Client({ ...base, api_key: key, api_key_env: "not a variable" }, { env: {} }).key, key);
});
for (const empty of [undefined, null, ""])
  test(`empty configured key preserves environment mode: ${JSON.stringify(empty)}`, () => {
    assert.equal(new Client({ ...base, api_key: empty, api_key_env: "CUSTOM_KEY" },
      { env: { CUSTOM_KEY: key } }).key, key);
  });
for (const invalid of [" ", "key with spaces", "key\n", "key\r\nheader", "key\0", "key\t", "key\u007f", "key\u0100", 42, true, {}, "a".repeat(4097)])
  test(`invalid configured key rejected without echo or fallback (${typeof invalid}, length ${String(invalid).length})`, () => {
    assert.throws(() => new Client({ ...base, api_key: invalid }, { env: { PIWIGO_API_KEY: key } }),
      e => e.status === 503 && !errorResult(e).error.includes(key) && /API-Key fehlt/.test(e.message));
  });
test("configured key reaches header, not request URL/body or returned diagnostic", async () => {
  const client = new Client({ ...base, api_key: key }, { env: {}, fetch: async (url, init) => {
    assert.equal(init.headers["X-PIWIGO-API"], key);
    assert.ok(!url.href.includes(key));
    assert.ok(!init.body.toString().includes(key));
    return new Response(JSON.stringify({ stat: "ok", result: { version: "16.5.0", username: "fixture", status: "normal" } }));
  } });
  const svc = makeService({}, {}, () => client);
  const result = await svc.operations.diagnostic(1, {}, {}, { user: { id: 1, role_id: 1 } });
  assert.ok(!JSON.stringify(result).includes(key));
  assert.ok(!render({ id: 1, viewname: "v", title: "Bilder", admin: true }).includes(key));
});
test("upstream key echo is not exposed in API errors; no retry with environment key", async () => {
  let requests = 0;
  const client = new Client({ ...base, api_key: key }, { env: { PIWIGO_API_KEY: "different" }, fetch: async () => {
    requests++;
    return new Response(JSON.stringify({ stat: "fail", err: 401, message: key }));
  } });
  await assert.rejects(client.call("pwg.getVersion"), e => !errorResult(e).error.includes(key));
  assert.equal(requests, 1);
});
test("configured key authenticates to HTTP fixture with empty environment", async () => {
  const { server } = createMock();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const client = new Client({ base_url: `http://127.0.0.1:${server.address().port}/gallery/`,
      allow_http: true, api_key: "fixture-only-not-a-real-key" }, { env: {} });
    assert.equal((await client.call("pwg.session.getStatus")).username, "saltcorn-readonly");
    assert.equal((await client.list(123, 0, 12, "id ASC")).images.length, 12);
    assert.equal((await client.media(await client.info(1), "thumb")).type, "image/png");
  } finally { await new Promise(resolve => server.close(resolve)); }
});
