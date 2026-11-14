"use strict";
const assert = require("node:assert/strict");
// Authenticated local fixture page, detail_zoom=true on Piwigo_Field.
module.exports = async function zoomRegression(page) {
  let mediaCalls = 0;
  const count = request => {
    if (request.url().endsWith("/Piwigo_Field/media") && request.postDataJSON()?.size === "preview") mediaCalls++;
  };
  page.on("request", count);
  try {
    await page.goto("http://127.0.0.1:8090/view/Piwigo_Field?id=817");
    await page.waitForSelector(".pw-card");
    await page.locator(".pw-card").first().click();
    await page.waitForFunction(() => document.querySelector(".pw-zoom-in")?.disabled === false);
    assert.equal(await page.locator(".pw-zoom-out").isDisabled(), true);
    const original = await page.locator(".pw-detail img").getAttribute("src");
    const before = mediaCalls;
    for (const expected of ["150 %", "200 %", "300 %", "400 %"]) {
      await page.locator(".pw-zoom-in").click();
      assert.equal(await page.locator(".pw-zoom-level").innerText(), expected);
    }
    assert.equal(await page.locator(".pw-zoom-in").isDisabled(), true);
    assert.equal(await page.locator(".pw-zoom-stage").evaluate(s => s.scrollHeight > s.clientHeight), true);
    assert.equal(await page.locator(".pw-detail img").getAttribute("src"), original);
    // Thumbnails may still finish loading, but no new preview request is needed.
    assert.equal(mediaCalls, before);
    await page.locator(".pw-zoom-stage").focus();
    await page.keyboard.press("ArrowRight");
    assert.match(await page.locator(".pw-detail-position").innerText(), /^Bild 1 \//);
    await page.locator(".pw-zoom-out").click();
    assert.equal(await page.locator(".pw-zoom-level").innerText(), "300 %");
    await page.locator(".pw-zoom-reset").click();
    assert.equal(await page.locator(".pw-zoom-level").innerText(), "100 %");
    assert.equal(await page.locator(".pw-zoom-reset").isDisabled(), true);
    await page.locator(".pw-zoom-in").click();
    await page.locator(".pw-detail-next").click();
    await page.waitForFunction(() => document.querySelector(".pw-zoom-in")?.disabled === false);
    assert.equal(await page.locator(".pw-zoom-level").innerText(), "100 %");
    await page.locator(".pw-zoom-in").click();
    await page.keyboard.press("Escape");
    await page.locator(".pw-card").first().click();
    await page.waitForFunction(() => document.querySelector(".pw-zoom-in")?.disabled === false);
    assert.equal(await page.locator(".pw-zoom-level").innerText(), "100 %");
    await page.locator(".pw-close").click();
    return "PASS: zoom limits, scrolling, keyboard, fit, no new media calls, reset on navigation and reopen.";
  } finally { page.off("request", count); }
};
