"use strict";
const { PiwigoError, integer } = require("./core");
const { PREVIEW_SIZES, previewSize, imageMetadata } = require("./presentation");

const READ_METHODS = new Set([
  "pwg.getVersion", "pwg.session.getStatus", "pwg.tags.getList",
  "pwg.tags.getImages", "pwg.images.getInfo"
]);

// Process-local bound, shared across views. No result or authorization cache.
class Limiter {
  constructor(limit = 4, maxQueue = 128) {
    this.limit = limit;
    this.maxQueue = maxQueue;
    this.active = 0;
    this.queue = [];
  }
  async run(fn) {
    if (this.active >= this.limit) {
      if (this.queue.length >= this.maxQueue)
        throw new PiwigoError("Bilddienst ausgelastet. Bitte erneut versuchen.", 503);
      await new Promise(resolve => this.queue.push(resolve));
    } else this.active++;
    try { return await fn(); }
    finally {
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }
}
const limiter = new Limiter();

function baseUrl(value, allowHttp) {
  let u;
  try { u = new URL(value); }
  catch (_) { throw new PiwigoError("Piwigo-Basis-URL ist ungültig.", 500); }
  if (u.username || u.password || u.search || u.hash ||
      (u.protocol !== "https:" && !(allowHttp && u.protocol === "http:")))
    throw new PiwigoError("Piwigo benötigt HTTPS ohne Zugangsdaten, Query oder Fragment in der URL.", 500);
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u;
}

function parseMediaUrl(value, base) {
  let u;
  if (typeof value !== "string" || !value || value.length > 4096)
    throw new PiwigoError("Ungültige Piwigo-Bildadresse.", 502);
  try { u = new URL(value, base); }
  catch (_) { throw new PiwigoError("Ungültige Piwigo-Bildadresse.", 502); }
  return u;
}

function safeMediaUrl(value, base, options = {}) {
  const u = parseMediaUrl(value, base);
  const deny = reason => { throw new PiwigoError(`Bildadresse außerhalb der freigegebenen Piwigo-Instanz: ${reason}`, 502); };
  if (u.username || u.password || u.hash)
    deny("Zugangsdaten oder Fragment in der Bildadresse.");
  // Explicit opt-in, same hostname, default ports only. Never send a key over HTTP
  // when the API base is HTTPS, and never rewrite a different server's hostname.
  if (options.upgradeHttps === true && base.protocol === "https:" &&
      u.protocol === "http:" && u.hostname === base.hostname && !u.port && !base.port)
    u.protocol = "https:";
  if (u.protocol !== base.protocol)
    deny("abweichendes Protokoll (HTTP/HTTPS). Als Administrator die Bildadresse prüfen.");
  if (u.hostname !== base.hostname)
    deny("abweichender Hostname. Als Administrator die Bildadresse prüfen.");
  if (u.port !== base.port)
    deny("abweichender Port. Als Administrator die Bildadresse prüfen.");
  if (!u.pathname.startsWith(base.pathname))
    deny("Bildpfad liegt außerhalb des konfigurierten Installationspfads.");
  if (/%2f|%5c|%2e|%00/i.test(u.pathname))
    deny("nicht freigegebene Prozentkodierung im Bildpfad.");
  return u;
}

function mediaEntry(info, size, preferred = "medium") {
  if (!["thumb", "preview"].includes(size)) throw new PiwigoError("Ungültige Vorschaugröße.");
  previewSize({ detail_size: preferred });
  const candidates = size === "thumb" ? ["thumb", "small", "xsmall"] :
    PREVIEW_SIZES.slice(0, PREVIEW_SIZES.indexOf(preferred) + 1).reverse();
  const derivatives = info.derivatives || {};
  const variant = candidates.find(k => derivatives[k] && derivatives[k].url);
  if (!variant) throw new PiwigoError("Für dieses Bild ist keine passende Vorschau verfügbar.", 404);
  return { variant, url: derivatives[variant].url };
}

async function readLimited(response, limit) {
  if (Number(response.headers.get("content-length") || 0) > limit) {
    if (response.body) await response.body.cancel().catch(() => {});
    throw new PiwigoError("Piwigo-Antwort überschreitet die Größenbegrenzung.", 502);
  }
  if (!response.body) throw new PiwigoError("Leere Piwigo-Antwort.", 502);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new PiwigoError("Piwigo-Antwort überschreitet die Größenbegrenzung.", 502);
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}

class Client {
  constructor(cfg, options = {}) {
    this.base = baseUrl(cfg.base_url, cfg.allow_http === true);
    if (cfg.api_key !== undefined && cfg.api_key !== null && cfg.api_key !== "") {
      this.key = cfg.api_key;
    } else {
      const envName = cfg.api_key_env || "PIWIGO_API_KEY";
      if (typeof envName !== "string" || !/^[A-Z_][A-Z0-9_]*$/.test(envName))
        throw new PiwigoError("Ungültiger Name der API-Key-Umgebungsvariable.", 500);
      this.key = (options.env || process.env)[envName];
    }
    // Never trim, echo or fall back to another key after a supplied key fails.
    if (typeof this.key !== "string" || !this.key.length || this.key.length > 4096 ||
        /[^\x21-\x7e]/.test(this.key))
      throw new PiwigoError("Piwigo-API-Key fehlt oder enthält ungültige Zeichen. Modulkonfiguration beziehungsweise alternative Server-Umgebungsvariable prüfen.", 503);
    this.timeout = integer(cfg.timeout_ms || 15000, "Timeout", 1000, 60000);
    this.upgradeMediaHttps = cfg.upgrade_media_https === true;
    this.fetch = options.fetch || globalThis.fetch;
  }
  async request(url, init, limit, json = true) {
    return limiter.run(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      try {
        const response = await this.fetch(url, {
          ...init, redirect: "manual", signal: controller.signal,
          headers: { ...init.headers, "X-PIWIGO-API": this.key }
        });
        if (response.status >= 300 && response.status < 400) {
          if (response.body) await response.body.cancel().catch(() => {});
          throw new PiwigoError("Piwigo liefert eine Weiterleitung. Basis-URL/Proxy-Konfiguration prüfen.", 502);
        }
        if (!response.ok) {
          if (response.body) await response.body.cancel().catch(() => {});
          if (response.status === 401 || response.status === 403)
            throw new PiwigoError("Piwigo verweigert den Zugriff. API-Key und Dienstkontorechte prüfen.", 502);
          throw new PiwigoError(`Piwigo-HTTP-Fehler ${response.status}.`, 502);
        }
        const bytes = await readLimited(response, limit);
        if (!json) {
          const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
          if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(type))
            throw new PiwigoError("Nicht unterstütztes oder unsicheres Vorschauformat.", 502);
          return { bytes, type };
        }
        let data;
        try { data = JSON.parse(bytes.toString("utf8")); }
        catch (_) { throw new PiwigoError("Piwigo liefert kein gültiges JSON.", 502); }
        if (!data || data.stat !== "ok") {
          const code = Number(data && data.err);
          throw new PiwigoError(code === 404 ? "Bild oder Schlagwort ist in Piwigo nicht verfügbar." :
            `Piwigo-API-Fehler${Number.isInteger(code) ? ` ${code}` : ""}. Berechtigung und Konfiguration prüfen.`,
          code === 404 ? 404 : 502);
        }
        return data.result;
      } catch (e) {
        if (e instanceof PiwigoError) throw e;
        throw new PiwigoError(controller.signal.aborted ?
          "Zeitüberschreitung beim Piwigo-Abruf." : "Piwigo ist nicht erreichbar oder die TLS-Verbindung ist ungültig.", 502);
      } finally { clearTimeout(timer); }
    });
  }
  async call(method, params = {}) {
    if (!READ_METHODS.has(method))
      throw new PiwigoError("Diese Piwigo-Methode ist im lesenden Plugin gesperrt.", 403);
    const body = new URLSearchParams({ ...params, method });
    return this.request(new URL("ws.php?format=json", this.base), {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body
    }, 8 * 1024 * 1024);
  }
  async list(tagId, page, perPage, order) {
    const result = await this.call("pwg.tags.getImages", {
      tag_id: tagId, page, per_page: perPage, order
    });
    if (!result || !Array.isArray(result.images) || !result.paging)
      throw new PiwigoError("Unvollständige Piwigo-Seitenantwort.", 502);
    const paging = {
      page: integer(result.paging.page, "Antwortseite", 0),
      per_page: integer(result.paging.per_page, "Antwortseitengröße", 1, perPage),
      total: integer(result.paging.total_count, "Trefferzahl", 0)
    };
    if (paging.page !== page || result.images.length > paging.per_page)
      throw new PiwigoError("Widersprüchliche Piwigo-Seitenantwort.", 502);
    const ids = new Set();
    const images = result.images.map(i => {
      const id = integer(i.id, "Piwigo-Bild-ID");
      if (ids.has(id)) throw new PiwigoError("Doppelte Bild-ID in Piwigo-Seite.", 502);
      ids.add(id);
      return imageMetadata(i);
    });
    return { paging, images };
  }
  async tags() {
    // Fresh lookup on every authorized request. No stale name-to-ID authorization.
    const result = await this.call("pwg.tags.getList");
    if (!result || !Array.isArray(result.tags))
      throw new PiwigoError("Ungültige Piwigo-Schlagwortliste.", 502);
    return result.tags;
  }
  async info(id) {
    const result = await this.call("pwg.images.getInfo", { image_id: id, comments_per_page: 0 });
    if (!result || Number(result.id) !== id)
      throw new PiwigoError("Unerwartete Piwigo-Bildantwort.", 502);
    return result;
  }
  async media(info, size, preferred = "medium") {
    const entry = mediaEntry(info, size, preferred);
    const url = safeMediaUrl(entry.url, this.base, { upgradeHttps: this.upgradeMediaHttps });
    return this.request(url, { method: "GET" }, 12 * 1024 * 1024, false);
  }
  mediaDiagnostic(info, preferred = "medium") {
    const redact = value => String(value).split(this.key).join("[redacted]")
      .split(encodeURIComponent(this.key)).join("[redacted]");
    const describe = u => ({ origin: redact(u.origin), path: redact(u.pathname),
      query_omitted: !!u.search, credentials_omitted: !!(u.username || u.password), fragment_omitted: !!u.hash });
    return { api_base: describe(this.base), upgrade_https_enabled: this.upgradeMediaHttps,
      previews: ["thumb", "preview"].map(size => {
        const item = { size, allowed: false };
        try {
          const entry = mediaEntry(info, size, preferred);
          item.variant = entry.variant;
          const original = parseMediaUrl(entry.url, this.base);
          item.returned = describe(original);
          const effective = safeMediaUrl(entry.url, this.base, { upgradeHttps: this.upgradeMediaHttps });
          item.effective = describe(effective);
          item.https_upgraded = original.protocol !== effective.protocol;
          item.allowed = true;
        } catch (e) {
          item.reason = e instanceof PiwigoError ? e.message : "Bildadresse konnte nicht geprüft werden.";
        }
        return item;
      })
    };
  }
}
module.exports = { Client, READ_METHODS, baseUrl, safeMediaUrl, readLimited, Limiter };
