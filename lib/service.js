"use strict";
const { Client } = require("./client");
const { authorize, authenticated, integer, hasTag, PiwigoError, errorResult, resolveTag } = require("./core");

const ORDERS = {
  newest: "date_creation DESC, id DESC", oldest: "date_creation ASC, id ASC",
  filename: "file ASC, id ASC", added: "date_available DESC, id DESC"
};

function makeService(Table, pluginCfg, clientFactory = () => new Client(pluginCfg)) {
  async function resolve(tableId, cfg, body, req) {
    const auth = await authorize(Table, tableId, cfg, body, req);
    const client = clientFactory();
    const tag = auth.number === undefined ? {} : resolveTag(await client.tags(), auth.number);
    return { ...auth, ...tag, client };
  }
  async function image(tableId, cfg, body, req) {
    const r = await resolve(tableId, cfg, body, req);
    const imageId = integer(body.image_id, "Bild-ID");
    const info = await r.client.info(imageId);
    if (!hasTag(info, r.tagId, r.number))
      throw new PiwigoError("Bild ist dieser Facility nicht zugeordnet.", 403);
    return { ...r, info };
  }
  const operations = {
    async list(tableId, cfg, body, req) {
      const r = await resolve(tableId, cfg, body, req);
      const order = ORDERS[body.order || "newest"];
      if (!order) throw new PiwigoError("Ungültige Sortierung.");
      const page = integer(body.page == null ? 0 : body.page, "Seite", 0, 1000000);
      const perPage = integer(cfg.page_size || 48, "Seitengröße", 1, 96);
      const result = await r.client.list(r.tagId, page, perPage, order);
      return { ...result, label: cfg.label_field ? String(r.row[cfg.label_field] || "") : "",
        assignment: r.number === undefined ? null :
          { field: r.field, number: r.number, tagId: r.tagId, tagName: r.tagName } };
    },
    async detail(tableId, cfg, body, req) {
      const { info } = await image(tableId, cfg, body, req);
      // No other Facility tags, albums, GPS, or Piwigo URLs are exposed.
      return {
        id: info.id, name: String(info.name || info.file || ""),
        file: String(info.file || ""), comment: String(info.comment_raw || info.comment || ""),
        date: String(info.date_creation || info.date_available || ""),
        width: info.width, height: info.height
      };
    },
    async media(tableId, cfg, body, req) {
      if (!["thumb", "preview"].includes(body.size)) throw new PiwigoError("Ungültige Vorschaugröße.");
      const { client, info } = await image(tableId, cfg, body, req);
      return client.media(info, body.size);
    },
    async diagnostic(tableId, cfg, body, req) {
      authenticated(req, 1);
      const client = clientFactory();
      const status = await client.call("pwg.session.getStatus");
      if (!status || !status.username || status.username === "guest" || status.status === "guest")
        throw new PiwigoError("API-Key wurde nicht als angemeldeter Piwigo-Benutzer erkannt.", 502);
      return {
        version: String(status.version || ""), user: String(status.username),
        role: String(status.status || ""),
        warning: ["admin", "webmaster"].includes(status.status) ?
          "Dienstkonto hat Administrationsrechte. Für den Lesebetrieb ein normales Konto verwenden." : ""
      };
    },
    async tags(tableId, cfg, body, req) {
      authenticated(req, 1);
      const client = clientFactory();
      const tags = await client.tags();
      const q = String(body.search || "").toLocaleLowerCase("de").slice(0, 120);
      const matching = tags.filter(t => String(t.name).toLocaleLowerCase("de").includes(q));
      return { total: matching.length, tags: matching.slice(0, 100).map(t => ({
        id: integer(t.id, "Tag-ID"), name: String(t.name)
      })) };
    }
  };
  const routes = {};
  for (const [name, fn] of Object.entries(operations)) {
    routes[name] = async (tableId, viewname, cfg, body, { req, res }) => {
      if (res) {
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
      try {
        const result = await fn(tableId, cfg || {}, body || {}, req);
        if (name === "media") {
          res.setHeader("Content-Type", result.type);
          res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
          res.send(result.bytes);
          return;
        }
        return { json: { success: true, ...result } };
      } catch (e) {
        const result = errorResult(e);
        if (res) res.status(result.status);
        if (name === "media" && res) { res.json(result); return; }
        return { json: result };
      }
    };
  }
  return { routes, operations };
}
module.exports = { makeService, ORDERS };
