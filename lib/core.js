"use strict";

class PiwigoError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function integer(value, label, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) ||
      Number(value) < min || Number(value) > max)
    throw new PiwigoError(`${label}: ungültiger Zahlenwert.`);
  return Number(value);
}

function authenticated(req, minRole = 80) {
  const user = req && req.user;
  const role = integer(minRole, "Mindestrolle", 1, 99);
  if (!user || !user.id || !Number.isInteger(user.role_id) || user.role_id < 1 ||
      user.role_id > role)
    throw new PiwigoError("Keine Berechtigung für diese Bilderansicht.", 403);
  return user;
}

function parseMapping(text) {
  let map;
  try {
    if (typeof text !== "string" || text.length > 1000000) throw new Error();
    map = JSON.parse(text);
  } catch (_) {
    throw new PiwigoError("Die Facility-Tag-Zuordnung ist kein gültiges JSON-Objekt.", 500);
  }
  if (!map || Array.isArray(map) || typeof map !== "object")
    throw new PiwigoError("Die Facility-Tag-Zuordnung muss ein JSON-Objekt sein.", 500);
  const result = new Map();
  const used = new Set();
  for (const [key, value] of Object.entries(map)) {
    const id = String(integer(key, "Datensatz-ID"));
    const tag = integer(value, "Tag-ID");
    if (result.has(id) || used.has(tag))
      throw new PiwigoError("Doppelte Datensatz- oder Tag-ID in der Zuordnung.", 500);
    result.set(id, tag);
    used.add(tag);
  }
  return result;
}

async function authorize(Table, tableId, viewCfg, body, req) {
  const user = authenticated(req, viewCfg.min_role || 80);
  const id = integer(body.id, "Datensatz-ID");
  const table = await Table.findOne({ id: tableId });
  if (!table) throw new PiwigoError("Tabelle nicht verfügbar.", 404);
  await table.getFields();
  const row = await table.getRow({ [table.pk_name]: id }, { forUser: user });
  if (!row) throw new PiwigoError("Datensatz nicht verfügbar oder kein Zugriff.", 403);
  const tagId = parseMapping(viewCfg.mapping_json || "{}").get(String(id));
  if (!tagId)
    throw new PiwigoError("Für diesen Datensatz ist noch kein Piwigo-Schlagwort zugeordnet.", 404);
  return { row, tagId, user, table };
}

function hasTag(image, tagId) {
  return Array.isArray(image.tags) && image.tags.some(t => Number(t.id) === tagId);
}

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function errorResult(e) {
  return {
    error: e instanceof PiwigoError ? e.message : "Interner Fehler beim Bildabruf.",
    status: e instanceof PiwigoError ? e.status : 500
  };
}

module.exports = { PiwigoError, integer, authenticated, parseMapping, authorize, hasTag, esc, errorResult };
