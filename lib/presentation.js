"use strict";
const { integer, PiwigoError } = require("./core");
const THUMB_CAPTION = "{name}\n{file}\n{date}";
const DETAIL_CAPTION = "{name}\n{file} · {date}\n{comment}";
const PREVIEW_SIZES = ["thumb", "xsmall", "small", "medium", "large", "xlarge", "xxlarge"];

function previewSize(cfg = {}) {
  const size = cfg.detail_size == null ? "medium" : cfg.detail_size;
  if (!PREVIEW_SIZES.includes(size)) throw new PiwigoError("Ungültige Detailbild-Variante.");
  return size;
}
function displaySettings(cfg = {}) {
  const template = (key, fallback) => {
    const value = cfg[key] == null ? fallback : cfg[key];
    if (typeof value !== "string" || value.length > 4096)
      throw new PiwigoError("Bildunterschrift muss Text mit höchstens 4096 Zeichen sein.");
    return value;
  };
  const date_format = cfg.date_format || "iso";
  if (!["iso", "de_date", "de_datetime"].includes(date_format))
    throw new PiwigoError("Ungültiges Datumsformat.");
  return {
    thumbnail_caption: template("thumbnail_caption", THUMB_CAPTION),
    detail_caption: template("detail_caption", DETAIL_CAPTION),
    date_format, detail_size: previewSize(cfg),
    detail_navigation: cfg.detail_navigation !== false,
    detail_max_width: integer(cfg.detail_max_width ?? 900, "Detailbreite", 320, 2400),
    detail_max_height: integer(cfg.detail_max_height ?? 60, "Detailhöhe", 30, 85)
  };
}
function imageMetadata(info) {
  const dimension = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : "";
  return {
    id: integer(info.id, "Bild-ID"), name: String(info.name || info.file || `Bild ${info.id}`),
    file: String(info.file || ""), comment: String(info.comment_raw ?? info.comment ?? ""),
    date: String(info.date_creation || info.date_available || ""),
    date_creation: String(info.date_creation || ""), date_available: String(info.date_available || ""),
    width: dimension(info.width), height: dimension(info.height)
  };
}
// Also embedded in the browser. Pure text substitution, never HTML or JavaScript evaluation.
function captionText(template, item, dateFormat, facility) {
  const date = value => {
    const raw = String(value || "");
    if (dateFormat === "iso") return raw;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(raw);
    if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) return raw;
    return `${m[3]}.${m[2]}.${m[1]}` + (dateFormat === "de_datetime" && m[4] ? ` ${m[4]}` : "");
  };
  const values = {
    id: item.id, name: item.name, file: item.file, comment: item.comment,
    date: date(item.date), date_creation: date(item.date_creation), date_available: date(item.date_available),
    width: item.width, height: item.height,
    dimensions: item.width && item.height ? `${item.width} × ${item.height}` : "",
    facility: facility || ""
  };
  return template.replace(/\{([a-z_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? "") : match).trim();
}
module.exports = { THUMB_CAPTION, DETAIL_CAPTION, PREVIEW_SIZES, previewSize, displaySettings, imageMetadata, captionText };
