"use strict";
// Synthetic Piwigo 16.5-shaped contract fixture, NOT a real Piwigo installation.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=", "base64");

function createMock() {
  const calls = [];
  const state = { removed: false, outage: false, total: 120000, cap: 48, auth: true, mediaOrigin: null,
    tags: [{ id: 123, name: "[0042] Testanlage" }, { id: 456, name: "Anlage [0178]" }] };
  const server = http.createServer(async (req, res) => {
    if (state.outage) { res.writeHead(503); res.end("offline"); return; }
    if (req.headers["x-piwigo-api"] !== "fixture-only-not-a-real-key") {
      res.writeHead(401); res.end("Unauthorized"); return;
    }
    if (req.url.startsWith("/gallery/preview.png")) {
      res.setHeader("Content-Type", "image/png");
      const imageFile = path.join(__dirname, "fixture-preview.png");
      res.end(fs.existsSync(imageFile) ? fs.readFileSync(imageFile) : pixel);
      return;
    }
    if (!req.url.startsWith("/gallery/ws.php")) { res.writeHead(404); res.end(); return; }
    let body = "";
    for await (const c of req) body += c;
    const p = new URLSearchParams(body);
    const method = p.get("method");
    calls.push({ method, params: Object.fromEntries(p) });
    const origin = `http://127.0.0.1:${server.address().port}/gallery/`;
    const img = id => ({
      id, name: id === 1 ? "BHKW · Kontrollaufnahme" : `Anlage / Aufnahme ${String(id).padStart(6, "0")}`,
      file: `IMG_${String(id).padStart(6, "0")}.jpg`, date_creation: "2026-11-10 10:15:00",
      date_available: "2026-11-11 09:00:00",
      comment: "<b>Beschreibung als Text, nicht als HTML</b>", width: 640, height: 420,
      tags: [{ id: state.removed ? 999 : 123, name: state.tags[0].name }, { id: 456, name: "private other facility" }],
      derivatives: { thumb: { url: (state.mediaOrigin || origin) + "preview.png" }, medium: { url: (state.mediaOrigin || origin) + "preview.png" } },
      element_url: origin + "original.jpg"
    });
    let result;
    switch (method) {
      case "pwg.getVersion": result = "16.5.0"; break;
      case "pwg.session.getStatus":
        result = { version: "16.5.0", username: state.auth ? "saltcorn-readonly" : "guest", status: state.auth ? "normal" : "guest" }; break;
      case "pwg.tags.getList":
        result = { tags: state.tags }; break;
      case "pwg.tags.getImages": {
        const page = Number(p.get("page")), perPage = Math.min(Number(p.get("per_page")), state.cap);
        const total = Number(p.get("tag_id")) === 123 ? state.total : 0;
        const images = Array.from({ length: Math.max(0, Math.min(perPage, total - page * perPage)) },
          (_, i) => img(page * perPage + i + 1));
        result = { paging: { page, per_page: perPage, count: images.length, total_count: total }, images };
        break;
      }
      case "pwg.images.getInfo": result = img(Number(p.get("image_id"))); break;
      default:
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ stat: "fail", err: 501, message: "Method not allowed" })); return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ stat: "ok", result }));
  });
  return { server, calls, state };
}
if (require.main === module) {
  const { server, state } = createMock();
  if (process.env.MOCK_MEDIA_HOST_MISMATCH === "1") state.mediaOrigin = "https://media.example.invalid/gallery/";
  server.listen(Number(process.env.MOCK_PORT || 8091), "127.0.0.1",
    () => console.log("Synthetic Piwigo fixture listening on loopback"));
}
module.exports = { createMock };
