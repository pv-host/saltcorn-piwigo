"use strict";
// Pass an authenticated Playwright page from the disposable Saltcorn fixture.
// No production credentials, writes, or external Piwigo calls.
const assert = require("node:assert/strict");
module.exports = async function navigationRegression(page, base = "http://127.0.0.1:8090") {
  let failPage = false, emptyPage = false, failMedia = false;
  const orders = [];
  const listPattern = "**/view/Piwigo_Field/list";
  const mediaPattern = "**/view/Piwigo_Field/media";
  await page.route(listPattern, async route => {
    const body = route.request().postDataJSON();
    orders.push(body.order);
    if (body.page === 1 && failPage)
      return route.fulfill({ status: 503, json: { success: false, error: "Synthetischer Seitenausfall" } });
    const response = await route.fetch(), data = await response.json();
    if (data.success) {
      data.paging.total = 14;
      data.images = data.images.filter(i => i.id <= 14);
      if (body.page === 1 && emptyPage) data.images = [];
    }
    await route.fulfill({ response, json: data });
  });
  await page.route(mediaPattern, route => {
    if (failMedia && route.request().postDataJSON().size === "preview")
      return route.fulfill({ status: 403, json: { success: false, error: "Synthetisch gesperrtes Bild" } });
    return route.continue();
  });
  const ready = () => page.waitForFunction(() => {
    const d = document.querySelector("dialog");
    return d?.open && d.querySelector(".pw-detail img")?.naturalWidth > 0 &&
      !d.querySelector(".pw-detail-prev").disabled;
  });
  try {
    await page.goto(`${base}/view/Piwigo_Field?id=817`);
    await page.waitForSelector(".pw-card");
    assert.equal(await page.locator(".pw-card").count(), 12);
    await page.locator(".pw-card").first().click();
    await page.waitForFunction(() => document.querySelector(".pw-detail img")?.naturalWidth > 0);
    assert.equal(await page.locator(".pw-detail-prev").isDisabled(), true);
    await page.keyboard.press("Escape");
    await page.locator(".pw-sort").selectOption("filename");
    await page.waitForSelector(".pw-card");
    await page.locator(".pw-card").last().click();
    await ready();
    failPage = true;
    await page.locator(".pw-detail-next").click();
    await page.getByText("Synthetischer Seitenausfall", { exact: true }).waitFor();
    assert.equal(await page.locator(".pw-detail-position").innerText(), "Bild 12 / 14");
    assert.equal(await page.locator(".pw-detail-next").isEnabled(), true);
    failPage = false;
    await page.locator(".pw-detail-next").click();
    await ready();
    assert.equal(await page.locator(".pw-detail-position").innerText(), "Bild 13 / 14");
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelector(".pw-detail-position").textContent === "Bild 12 / 14");
    await ready();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector(".pw-detail-position").textContent === "Bild 13 / 14");
    await ready();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector(".pw-detail-position").textContent === "Bild 14 / 14" &&
      !document.querySelector(".pw-detail-prev").disabled);
    assert.equal(await page.locator(".pw-detail-next").isDisabled(), true);
    assert.ok(orders.slice(1).every(order => order === "filename"));
    await page.locator(".pw-close").click();
    failMedia = true;
    await page.locator(".pw-card").first().click();
    await page.getByText("Synthetisch gesperrtes Bild", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Bildadresse prüfen", exact: true }).isVisible(), true);
    assert.equal(await page.locator(".pw-detail-next").isEnabled(), true);
    await page.keyboard.press("Escape");
    failMedia = false;
    emptyPage = true;
    await page.locator(".pw-card").last().click();
    await ready();
    await page.locator(".pw-detail-next").click();
    await page.getByText("Bildbestand geändert. Bitte die Galerie aktualisieren.", { exact: true }).waitFor();
    assert.equal(await page.locator(".pw-detail-next").isDisabled(), true);
    await page.locator(".pw-detail-prev").click();
    await ready();
    assert.equal(await page.locator(".pw-detail-next").isEnabled(), true);
    await page.locator(".pw-close").click();
    return "PASS: first/last boundaries, both cross-page directions, keyboard/focus, sort, retry, media failure and vanished page.";
  } finally {
    await page.unroute(listPattern);
    await page.unroute(mediaPattern);
  }
};
