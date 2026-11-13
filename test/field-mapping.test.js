"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { facilityNumber, bracketNumbers, resolveTag, mappingMode, hasTag } = require("../lib/core");
const { makeService } = require("../lib/service");
const { Client } = require("../lib/client");
const { createMock } = require("./mock-piwigo");

for (const value of ["0042", "0000", "9999", "1042", 1042, 9999])
  test(`exact facility number accepted ${JSON.stringify(value)}`, () => assert.equal(facilityNumber(value), String(value)));
for (const value of [42, 0, "42", "042", "00042", "00420", " 0042", "0042 ", "0042\n",
  "0042-01", "[0042]", "4.2", "1e03", "+042", "-042", "４２４２", null, undefined, true, {}, ["0042"]])
  test(`no normalization for ${JSON.stringify(value)}`, () => assert.throws(() => facilityNumber(value), /exakt vier/));
for (const name of ["[0042]", "[0042] Anlage", "Anlage [0042]", "Ort [0042] Betrieb"])
  test(`exact bracket token ${name}`, () => assert.equal(resolveTag([{ id: 123, name }], "0042").tagId, 123));
for (const name of ["[42]", "[042]", "[00042]", "[00420]", "[0042-01]", "0042", "[ 0042 ]", "[[0042]]", "facility:0042", "[1042]"])
  test(`no partial bracket match ${name}`, () => assert.throws(() => resolveTag([{ id: 123, name }], "0042"), /Kein sichtbares/));
test("multiple tags fail closed", () => assert.throws(() => resolveTag([
  { id: 123, name: "[0042] A" }, { id: 456, name: "[0042] B" }
], "0042"), e => e.status === 409));
for (const name of ["[0042] und [0178]", "[0042] und [0042]"])
  test(`multiple number tokens fail closed ${name}`, () => assert.throws(() => resolveTag([{ id: 123, name }], "0042"), /Mehrdeutige/));
test("malformed tag response rejected", () => assert.throws(() => resolveTag(null, "0042"), e => e.status === 502));
test("bracket extraction preserves zeroes", () => assert.deepEqual(bracketNumbers("[0042] / [0178]"), ["0042", "0178"]));
test("new view defaults to field and existing views retain manual mode", () => {
  assert.equal(mappingMode({}), "field");
  assert.equal(mappingMode({ mapping_json: '{"817":123}' }), "manual");
  assert.equal(mappingMode({ mapping_mode: "field", mapping_json: '{"817":999}' }), "field");
  assert.throws(() => mappingMode({ mapping_mode: "oops" }));
});
test("live image tag name must still match", () => {
  assert.equal(hasTag({ tags: [{ id: 123, name: "[0042] A" }] }, 123, "0042"), true);
  assert.equal(hasTag({ tags: [{ id: 123, name: "[0178] A" }] }, 123, "0042"), false);
  assert.equal(hasTag({ tags: [{ id: 123, name: "[0042] [0178]" }] }, 123, "0042"), false);
  assert.equal(hasTag({ tags: [{ id: 123 }] }, 123, "0042"), false);
});

const user = { user: { id: 2, role_id: 40 } };
const cfg = { mapping_mode: "field", number_field: "facilitynr", page_size: 12 };
function harness(client, actor = user) {
  const row = { id: 817, facilitynr: "0042", othernumber: "0178" };
  const Table = { findOne: async () => ({ pk_name: "id",
    getFields: async () => [{ name: "facilitynr" }, { name: "othernumber" }],
    getRow: async (where, options) => {
      assert.deepEqual(options, { forUser: actor.user });
      return where.id === 817 ? row : null;
    }
  }) };
  return { row, svc: makeService(Table, {}, () => client) };
}
test("row 817 matches field 0042, not PK or browser-provided number/tag", async () => {
  const { svc } = harness({ tags: async () => [{ id: 123, name: "[0042] A" }],
    list: async (id) => { assert.equal(id, 123); return { images: [] }; } });
  const result = await svc.operations.list(1, cfg, { id: 817, number: "0178", facilitynr: "0178", tag_id: 999 }, user);
  assert.equal(Object.hasOwn(result, "assignment"), false);
});
test("assignment debug metadata is restricted to administrators", async () => {
  const admin = { user: { id: 1, role_id: 1 } };
  const { svc } = harness({ tags: async () => [{ id: 123, name: "[0042] A" }],
    list: async () => ({ images: [] }) }, admin);
  const result = await svc.operations.list(1, cfg, { id: 817 }, admin);
  assert.deepEqual(result.assignment, { field: "facilitynr", number: "0042", tagId: 123, tagName: "[0042] A" });
});
test("custom field selects only exact other number", async () => {
  const { svc } = harness({ tags: async () => [{ id: 456, name: "[0178] B" }],
    list: async id => { assert.equal(id, 456); return {}; } });
  await svc.operations.list(1, { ...cfg, number_field: "othernumber" }, { id: 817 }, user);
});
test("missing field and invalid number stop before any network call", async () => {
  const { svc, row } = harness({ tags: async () => { assert.fail("network"); } });
  await assert.rejects(svc.operations.list(1, { ...cfg, number_field: "missing" }, { id: 817 }, user), /Feld fehlt/);
  row.facilitynr = 42;
  await assert.rejects(svc.operations.list(1, cfg, { id: 817 }, user), e => e.status === 422);
});
test("row authorization precedes Piwigo tag lookup", async () => {
  const { svc } = harness({ tags: async () => { assert.fail("network"); } });
  await assert.rejects(svc.operations.list(1, cfg, { id: 999 }, user), e => e.status === 403);
  await assert.rejects(svc.operations.list(1, cfg, { id: 817 }, {}), e => e.status === 403);
});
test("ambiguous or missing assignment blocks every image route", async () => {
  let tags = [{ id: 123, name: "[0042] A" }, { id: 456, name: "[0042] B" }];
  const { svc } = harness({ tags: async () => tags,
    info: async () => { assert.fail("info"); }, list: async () => { assert.fail("list"); } });
  for (const operation of ["list", "detail", "media"])
    await assert.rejects(svc.operations[operation](1, cfg, { id: 817, image_id: 1, size: "thumb" }, user), e => e.status === 409);
  tags = [];
  for (const operation of ["list", "detail", "media"])
    await assert.rejects(svc.operations[operation](1, cfg, { id: 817, image_id: 1, size: "thumb" }, user), e => e.status === 404);
});
test("renaming between resolution and image check denies access", async () => {
  const { svc } = harness({ tags: async () => [{ id: 123, name: "[0042] A" }],
    info: async () => ({ id: 1, tags: [{ id: 123, name: "[0178] A" }] }) });
  await assert.rejects(svc.operations.detail(1, cfg, { id: 817, image_id: 1 }, user), e => e.status === 403);
  await assert.rejects(svc.operations.media(1, cfg, { id: 817, image_id: 1, size: "thumb" }, user), e => e.status === 403);
});
test("HTTP field lookup, media, field change and duplicate tag are fresh", async () => {
  const { server, state, calls } = createMock();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const client = new Client({ base_url: `http://127.0.0.1:${server.address().port}/gallery/`, allow_http: true },
      { env: { PIWIGO_API_KEY: "fixture-only-not-a-real-key" } });
    const { svc, row } = harness(client);
    const body = { id: 817, image_id: 1, size: "thumb" };
    const result = await svc.operations.list(1, cfg, body, user);
    assert.equal(result.images.length, 12);
    assert.equal(Object.hasOwn(result, "assignment"), false);
    assert.equal((await svc.operations.media(1, cfg, body, user)).type, "image/png");
    state.removed = true;
    await assert.rejects(svc.operations.media(1, cfg, body, user), e => e.status === 403);
    state.removed = false;
    state.tags.push({ id: 777, name: "Doppelt [0042]" });
    await assert.rejects(svc.operations.list(1, cfg, body, user), e => e.status === 409);
    state.tags.pop();
    row.facilitynr = "9999";
    await assert.rejects(svc.operations.media(1, cfg, body, user), e => e.status === 404);
    assert.equal(calls.filter(call => call.method === "pwg.tags.getList").length, 5);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
