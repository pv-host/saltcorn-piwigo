"use strict";
const { randomBytes } = require("node:crypto");
const { esc } = require("./core");
const { displaySettings, captionText } = require("./presentation");

function browserUI(opts, formatCaption) {
  const root = document.getElementById(opts.uid);
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "1";
  const $ = s => root.querySelector(s);
  const items = $(".pw-items");
  const status = $(".pw-status");
  const dialog = $("dialog");
  let currentPage = 0, total = 0, perPage = 48, generation = 0;
  let lastItems = [], controller = new AbortController(), urls = [];
  let previewController = null, previewUrl = null;
  let label = "", detailState = null, detailBusy = false, pagingController = null, navFocus = null;
  let mode = "grid", observer;
  let jobs = [], active = 0;
  const created = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const caption = (item, template, cls) => {
    const text = formatCaption(template, item, opts.display.date_format, label);
    return text ? created("span", text, cls) : null;
  };
  async function api(route, data, signal, binary) {
    const token = typeof _sc_globalCsrf !== "undefined" ? _sc_globalCsrf :
      document.querySelector('meta[name="csrf-token"]')?.content || "";
    const r = await fetch(`/view/${encodeURIComponent(opts.viewname)}/${route}`, {
      method: "POST", credentials: "same-origin", redirect: "error", signal,
      headers: { "Content-Type": "application/json", "CSRF-Token": token },
      body: JSON.stringify({ id: opts.id, ...data })
    });
    if (binary && r.ok && (r.headers.get("content-type") || "").startsWith("image/"))
      return r.blob();
    let result;
    try { result = await r.json(); }
    catch (_) { throw new Error("Ungültige Antwort. Anmeldung und Verbindung prüfen."); }
    if (!r.ok || !result.success) throw new Error(result.error || "Abruf fehlgeschlagen.");
    return result;
  }
  const report = e => {
    if (e.name !== "AbortError") {
      status.textContent = e.message || "Bildabruf fehlgeschlagen.";
      status.className = "pw-status alert alert-warning";
    }
  };
  function cleanupImages() {
    controller.abort();
    controller = new AbortController();
    if (observer) observer.disconnect();
    jobs = [];
    urls.forEach(u => URL.revokeObjectURL(u));
    urls = [];
  }
  function pump() {
    while (active < 4 && jobs.length) {
      const job = jobs.shift();
      if (job.gen !== generation) continue;
      active++;
      api("media", { image_id: job.id, size: "thumb" }, job.signal, true)
        .then(blob => {
          if (job.gen !== generation || !job.img.isConnected) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          job.img.src = url;
        })
        .catch(e => {
          if (e.name !== "AbortError" && job.gen === generation) {
            job.img.replaceWith(created("span", "Vorschau nicht verfügbar", "pw-noimage"));
          }
        }).finally(() => { active--; pump(); });
    }
  }
  function renderItems() {
    items.className = `pw-items pw-${mode}`;
    items.replaceChildren();
    observer = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach(({ target }) => {
        observer.unobserve(target);
        jobs.push({ img: target, id: Number(target.dataset.id), gen: generation, signal: controller.signal });
        pump();
      });
    }, { rootMargin: "160px" });
    for (const item of lastItems) {
      const button = created("button", undefined, "pw-card");
      button.type = "button";
      button.setAttribute("aria-label", `${item.name}: Bilddetails öffnen`);
      const img = created("img");
      img.alt = item.name;
      img.dataset.id = item.id;
      img.width = 240; img.height = 160;
      button.append(img);
      const text = caption(item, opts.display.thumbnail_caption, "pw-caption");
      if (text) button.append(text);
      button.addEventListener("click", () => {
        detailState = { images: lastItems.slice(), index: lastItems.indexOf(item),
          page: currentPage, total, perPage, order: $(".pw-sort").value };
        showDetail(item.id);
      });
      items.append(button);
      observer.observe(img);
    }
  }
  function navigation() {
    $(".pw-prev").disabled = currentPage === 0;
    $(".pw-next").disabled = (currentPage + 1) * perPage >= total;
    $(".pw-page").textContent = total ? `Seite ${currentPage + 1} / ${Math.ceil(total / perPage)}` : "Keine Ergebnisse";
  }
  async function load(page = 0) {
    generation++;
    const gen = generation;
    cleanupImages();
    items.replaceChildren();
    $(".pw-prev").disabled = true; $(".pw-next").disabled = true;
    $(".pw-refresh").disabled = true;
    status.className = "pw-status text-muted";
    status.textContent = "Bilder werden geladen …";
    if ($(".pw-assignment")) $(".pw-assignment").textContent = "";
    root.setAttribute("aria-busy", "true");
    try {
      const result = await api("list", { page, order: $(".pw-sort").value }, controller.signal);
      if (generation !== gen) return;
      currentPage = result.paging.page; total = result.paging.total; perPage = result.paging.per_page;
      // A previous last page may disappear when upstream tags change.
      if (currentPage > 0 && !result.images.length) { await load(0); return; }
      lastItems = result.images;
      label = result.label || "";
      const assignment = result.assignment;
      if ($(".pw-assignment")) $(".pw-assignment").textContent = opts.admin && assignment ?
        `${assignment.field} = ${assignment.number} · Schlagwort: ${assignment.tagName} (Tag-ID ${assignment.tagId})` : "";
      status.textContent = total ? `${total.toLocaleString("de-DE")} Bilder${result.label ? " · " + result.label : ""}` :
        "Für dieses Schlagwort sind keine Bilder sichtbar. Bei unerwartetem Ergebnis bitte Tag-ID und Piwigo-Rechte prüfen.";
      renderItems();
      navigation();
    } catch (e) { if (generation === gen) report(e); }
    finally {
      if (generation === gen) {
        $(".pw-refresh").disabled = false;
        root.removeAttribute("aria-busy");
      }
    }
  }
  function detailNavigation() {
    const d = detailState;
    if (detailBusy && [$(".pw-detail-prev"), $(".pw-detail-next")].includes(document.activeElement)) {
      navFocus = document.activeElement;
      dialog.focus();
    }
    $(".pw-detail-prev").disabled = !d || detailBusy || (d.index === 0 && d.page === 0);
    $(".pw-detail-next").disabled = !d || detailBusy ||
      (d.index === d.images.length - 1 && (d.end || (d.page + 1) * d.perPage >= d.total));
    $(".pw-detail-position").textContent = d ?
      `Bild ${(d.page * d.perPage + d.index + 1).toLocaleString("de-DE")} / ${d.total.toLocaleString("de-DE")}` : "";
    if (!detailBusy && navFocus) {
      if (dialog.open && document.activeElement === dialog)
        (navFocus.disabled ? $(".pw-close") : navFocus).focus();
      navFocus = null;
    }
  }
  async function moveDetail(delta) {
    if (!opts.display.detail_navigation || !dialog.open || !detailState || detailBusy) return;
    if ($(delta < 0 ? ".pw-detail-prev" : ".pw-detail-next").disabled) return;
    const d = detailState, next = d.index + delta;
    if (next >= 0 && next < d.images.length) {
      d.index = next;
      return showDetail(d.images[next].id);
    }
    detailBusy = true;
    detailNavigation();
    const ctl = new AbortController();
    pagingController = ctl;
    $(".pw-detail-message").textContent = "Weitere Bilder werden geladen …";
    let nextId;
    try {
      const result = await api("list", { page: d.page + delta, order: d.order }, ctl.signal);
      if (ctl.signal.aborted || detailState !== d) return;
      if (!result.images.length) {
        if (delta > 0) d.end = true;
        $(".pw-detail-message").textContent = "Bildbestand geändert. Bitte die Galerie aktualisieren.";
        return;
      }
      d.images = result.images; d.page = result.paging.page;
      d.perPage = result.paging.per_page; d.total = result.paging.total;
      d.index = delta > 0 ? 0 : d.images.length - 1;
      nextId = d.images[d.index].id;
      $(".pw-detail-message").textContent = "";
    } catch (e) {
      if (e.name !== "AbortError") $(".pw-detail-message").textContent = e.message;
    } finally {
      if (pagingController === ctl && dialog.open) {
        detailBusy = false;
        detailNavigation();
      }
    }
    if (nextId && !ctl.signal.aborted && detailState === d) await showDetail(nextId);
  }
  async function showDetail(id) {
    if (previewController) previewController.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    const ctl = new AbortController();
    previewController = ctl;
    detailBusy = true;
    detailNavigation();
    $(".pw-detail-message").textContent = "";
    const content = $(".pw-detail");
    content.replaceChildren(created("p", "Bilddetails werden geladen …"));
    if (!dialog.open) dialog.showModal();
    try {
      const d = await api("detail", { image_id: id }, ctl.signal);
      if (ctl.signal.aborted) return;
      content.replaceChildren();
      const img = created("img"); img.alt = d.name;
      content.append(img);
      const text = caption(d, opts.display.detail_caption, "pw-detail-caption");
      if (text) content.append(text);
      if (opts.admin) {
        const check = created("button", "Bildadresse prüfen", "btn btn-outline-secondary btn-sm");
        check.type = "button";
        const output = created("pre", "", "pw-url-diagnostic");
        output.setAttribute("role", "status");
        check.addEventListener("click", async () => {
          check.disabled = true;
          output.textContent = "API-Vorschauadressen werden geprüft …";
          try {
            const result = await api("media_diagnostic", { image_id: id }, ctl.signal);
            output.textContent = "Nur URL-Prüfung, kein Bildabruf. Query, Zugangsdaten und Fragmente ausgeblendet.\n" +
              JSON.stringify(result, null, 2);
          } catch (e) { if (e.name !== "AbortError") output.textContent = e.message; }
          finally { check.disabled = false; }
        });
        content.append(check, output);
      }
      const blob = await api("media", { image_id: id, size: "preview" }, ctl.signal, true);
      if (ctl.signal.aborted) return;
      previewUrl = URL.createObjectURL(blob);
      img.src = previewUrl;
    } catch (e) {
      if (e.name !== "AbortError") content.append(created("p", e.message, "alert alert-warning"));
    } finally {
      if (previewController === ctl && dialog.open) {
        detailBusy = false;
        detailNavigation();
      }
    }
  }
  dialog.addEventListener("close", () => {
    if (previewController) previewController.abort();
    if (pagingController) pagingController.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    detailState = null; detailBusy = false; pagingController = null; navFocus = null;
    detailNavigation();
    previewUrl = null; $(".pw-detail").replaceChildren();
  });
  $(".pw-detail-prev").addEventListener("click", () => moveDetail(-1));
  $(".pw-detail-next").addEventListener("click", () => moveDetail(1));
  dialog.addEventListener("keydown", e => {
    if (opts.display.detail_navigation && !e.altKey && !e.ctrlKey && !e.metaKey &&
        ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      moveDetail(e.key === "ArrowLeft" ? -1 : 1);
    }
  });
  $(".pw-close").addEventListener("click", () => dialog.close());
  $(".pw-prev").addEventListener("click", () => load(currentPage - 1));
  $(".pw-next").addEventListener("click", () => load(currentPage + 1));
  $(".pw-refresh").addEventListener("click", () => load(currentPage));
  $(".pw-sort").addEventListener("change", () => load(0));
  $(".pw-mode").addEventListener("click", () => {
    mode = mode === "grid" ? "list" : "grid";
    $(".pw-mode").textContent = mode === "grid" ? "Liste" : "Kacheln";
    items.className = `pw-items pw-${mode}`;
  });
  if (opts.admin) {
    const output = $(".pw-admin-output");
    $(".pw-diagnostic").addEventListener("click", async () => {
      output.textContent = "Verbindung wird geprüft …";
      try {
        const d = await api("diagnostic", {});
        output.textContent = `Piwigo ${d.version} · ${d.user} (${d.role})${d.warning ? "\n" + d.warning : ""}`;
      } catch (e) { output.textContent = e.message; }
    });
    $(".pw-tags-form").addEventListener("submit", async e => {
      e.preventDefault();
      output.textContent = "Schlagworte werden geladen …";
      try {
        const d = await api("tags", { search: $(".pw-tag-search").value });
        output.textContent = `${d.total} Treffer (max. 100 angezeigt)\n` +
          d.tags.map(t => `${t.id}  ${t.name}`).join("\n");
      } catch (e) { output.textContent = e.message; }
    });
  }
  const removed = new MutationObserver(() => {
    if (!root.isConnected) {
      cleanupImages(); if (previewController) previewController.abort();
      if (pagingController) pagingController.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      removed.disconnect();
    }
  });
  removed.observe(document.body, { childList: true, subtree: true });
  load();
}

const css = `
.pw-gallery{font-family:inherit;color:inherit;--pw-border:#d8dee5;--pw-soft:#f5f7f9;--pw-small:.875rem}
.pw-gallery *{box-sizing:border-box}
.pw-gallery .pw-heading{font-size:1.25rem;margin:0 0 1rem;font-weight:650}
.pw-gallery .pw-toolbar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:1rem}
.pw-gallery .pw-toolbar label{margin:0;font-size:var(--pw-small)}
.pw-gallery .pw-sort{max-width:100%;width:auto}
.pw-gallery .pw-status{margin:.75rem 0;font-size:var(--pw-small);overflow-wrap:anywhere}
.pw-gallery .pw-status.text-muted,.pw-gallery .pw-assignment.text-muted{color:#596673!important}
.pw-gallery .btn-outline-secondary{color:#596673;border-color:#657585}
.pw-gallery .btn-outline-secondary:hover:not(:disabled){color:#fff;background:#465c70;border-color:#465c70}
.pw-gallery .pw-footer{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin:1rem 0}
.pw-gallery .pw-assignment{font-size:.75rem;overflow-wrap:anywhere;text-align:right;flex:1 1 320px;margin:0 0 0 auto}
.pw-gallery .pw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:1rem}
.pw-gallery .pw-card{display:flex;flex-direction:column;text-align:left;padding:0;background:var(--pw-soft);color:inherit;border:1px solid var(--pw-border);border-radius:.35rem;overflow:hidden;min-width:0;cursor:pointer}
.pw-gallery .pw-card:hover{border-color:#546b84;box-shadow:0 2px 8px #00000012}
.pw-gallery .pw-card:focus-visible{outline:3px solid #0b65c2;outline-offset:3px}
.pw-gallery .pw-card img,.pw-gallery .pw-noimage{width:100%;height:160px;object-fit:contain;background:#e9edf1;display:block}
.pw-gallery .pw-noimage{padding:2rem 1rem;text-align:center;font-size:var(--pw-small)}
.pw-gallery .pw-caption{display:block;white-space:pre-line;font-size:var(--pw-small);padding:.75rem;width:100%;overflow-wrap:anywhere}
.pw-gallery .pw-caption strong{font-size:.95rem;font-weight:600}
.pw-gallery .pw-file,.pw-gallery .pw-date{font-size:.8rem;color:#596673}
.pw-gallery .pw-list{display:grid;gap:.5rem}
.pw-gallery .pw-list .pw-card{flex-direction:row;align-items:center}
.pw-gallery .pw-list img,.pw-gallery .pw-list .pw-noimage{width:100px;height:76px;flex-shrink:0}
.pw-gallery .pw-pagination{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin:0}
.pw-gallery .pw-page{font-size:var(--pw-small)}
.pw-gallery dialog{border:1px solid var(--pw-border);border-radius:.5rem;padding:1rem;width:min(var(--pw-detail-width),calc(100vw - 24px));max-height:90vh;color:inherit}
.pw-gallery dialog::backdrop{background:#152332b0}
.pw-gallery .pw-closebar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between;margin-bottom:.5rem;position:sticky;top:-1rem;background:Canvas;z-index:1;padding:.5rem 0}
.pw-gallery .pw-close{margin-left:auto}
.pw-gallery .pw-detail-navigation{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.pw-gallery .pw-detail-navigation[hidden]{display:none}
.pw-gallery .pw-detail-position,.pw-gallery .pw-detail-message{font-size:var(--pw-small)}
.pw-gallery .pw-detail-message:empty{display:none}
.pw-gallery .pw-detail-caption{display:block;white-space:pre-line;overflow-wrap:anywhere;margin:.75rem 0}
.pw-gallery .pw-detail img{width:100%;max-height:var(--pw-detail-height);display:block;margin:.75rem auto;object-fit:contain}
.pw-gallery .pw-detail-title{font-size:1.2rem;overflow-wrap:anywhere}
.pw-gallery .pw-description{white-space:pre-wrap;overflow-wrap:anywhere}
.pw-gallery .pw-url-diagnostic{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:.75rem;font-size:.8rem}
.pw-gallery .pw-admin{border-top:1px solid var(--pw-border);padding-top:1rem;margin-top:1rem}
.pw-gallery .pw-admin summary{cursor:pointer;font-size:var(--pw-small)}
.pw-gallery .pw-admin form{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}
.pw-gallery .pw-admin input{width:min(100%,320px)}
.pw-gallery .pw-admin-output{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:var(--pw-small);max-height:320px;overflow:auto}
@media(max-width:480px){.pw-gallery .pw-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}.pw-gallery .pw-card img{height:120px}.pw-gallery .pw-caption{padding:.5rem}.pw-gallery .pw-list img{height:76px}.pw-gallery .pw-toolbar{align-items:stretch}.pw-gallery .pw-sort{width:100%}}
`;

function render(options) {
  const uid = `pw-${randomBytes(8).toString("hex")}`;
  const opts = { ...options, uid, display: displaySettings(options.display) };
  const json = JSON.stringify(opts).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<style>${css}</style><section id="${uid}" class="pw-gallery" aria-label="${esc(options.title)}" style="--pw-detail-width:${opts.display.detail_max_width}px;--pw-detail-height:${opts.display.detail_max_height}vh">
    <h2 class="pw-heading">${esc(options.title)}</h2>
    <div class="pw-toolbar">
      <label for="${uid}-sort">Sortierung</label>
      <select id="${uid}-sort" class="pw-sort form-control form-select">
        <option value="newest">Aufnahmedatum: neueste zuerst</option>
        <option value="oldest">Aufnahmedatum: älteste zuerst</option>
        <option value="added">Importdatum: neueste zuerst</option>
        <option value="filename">Dateiname</option>
      </select>
      <button type="button" class="pw-refresh btn btn-outline-secondary btn-sm">Aktualisieren</button>
      <button type="button" class="pw-mode btn btn-outline-secondary btn-sm">Liste</button>
    </div>
    <p class="pw-status text-muted" role="status" aria-live="polite">Bilder werden geladen …</p>
    <div class="pw-items pw-grid"></div>
    <footer class="pw-footer">
    <nav class="pw-pagination" aria-label="Bildseiten">
      <button type="button" class="pw-prev btn btn-outline-secondary btn-sm" disabled>Zurück</button>
      <span class="pw-page"></span>
      <button type="button" class="pw-next btn btn-outline-secondary btn-sm" disabled>Weiter</button>
    </nav>
    ${options.admin ? '<p class="pw-assignment text-muted"></p>' : ""}
    </footer>
    <dialog aria-label="Bilddetails" tabindex="-1">
      <div class="pw-closebar">
        <nav class="pw-detail-navigation" aria-label="Einzelbilder"${opts.display.detail_navigation ? "" : " hidden"}>
          <button type="button" class="pw-detail-prev btn btn-outline-secondary btn-sm" disabled>Vorheriges Bild</button>
          <span class="pw-detail-position" aria-live="polite"></span>
          <button type="button" class="pw-detail-next btn btn-outline-secondary btn-sm" disabled>Nächstes Bild</button>
        </nav>
        <button type="button" class="pw-close btn btn-outline-secondary btn-sm">Schließen</button>
      </div>
      <p class="pw-detail-message" role="status"></p><div class="pw-detail"></div>
    </dialog>
    ${options.admin ? `<details class="pw-admin"><summary>Administration: Verbindung und Tag-IDs</summary>
      <p class="text-muted">Nur lesend. Zuordnungen werden in der View-Konfiguration gepflegt. Die Suche zeigt nur für das Dienstkonto verfügbare Schlagworte.</p>
      <button type="button" class="pw-diagnostic btn btn-outline-secondary btn-sm">Verbindung prüfen</button>
      <form class="pw-tags-form"><input class="pw-tag-search form-control" aria-label="Schlagwortsuche" placeholder="z.B. [0042]" maxlength="120"><button class="btn btn-outline-secondary btn-sm" type="submit">Tag-IDs suchen</button></form>
      <pre class="pw-admin-output" role="status"></pre></details>` : ""}
    <noscript>Für diese Galerie muss JavaScript aktiviert sein.</noscript>
  </section><script>(function(){const start=()=>(${browserUI.toString()})(${json},${captionText.toString()});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();})();</script>`;
}
module.exports = { render, browserUI };
