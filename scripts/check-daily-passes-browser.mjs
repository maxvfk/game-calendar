// After bun run build, with bun run serve running locally.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
// CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium bun scripts/check-daily-passes-browser.mjs
import assert from "node:assert/strict";
import { PROFILE_KEYS, profileKeys } from "../src/client/state/storage.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = new URL(process.env.DAILY_PASSES_SMOKE_URL || "http://localhost:3000/");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
const profile = "local:passes-browser";
const keys = profileKeys(profile);
const recoveryKey = `${keys.passes}:op:broken`;
const now = new Date("2026-11-18T03:00:00.000Z");
const fixtures = [
  [PROFILE_KEYS.profiles, JSON.stringify({ schemaVersion: 2, guestProfileId: profile, legacyMigrated: true })],
  [keys.prefs, JSON.stringify({ region: "europe", regionConfirmed: true, onboarded: true })],
  ...[["genshin", "2026-11-17"], ["hsr", "2026-11-18"]].map(([game, lastDay]) => {
    const op = { opId: crypto.randomUUID(), kind: "set", game, region: "europe", lastDay,
      actionDay: "2026-11-17", createdAt: "2026-11-18T02:59:59.000Z", basedOn: [] };
    return [`${keys.passes}:op:${op.opId}`, JSON.stringify(op)];
  }),
];

try {
  for (const [width, height] of [[320, 800], [360, 800], [1440, 900]]) {
    const mobile = width < 768;
    const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile,
      serviceWorkers: "block" });
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).origin === url.origin ? route.continue() : route.abort());
    await page.clock.setFixedTime(now);
    await page.addInitScript(entries => {
      for (const [key, value] of entries) localStorage.setItem(key, value);
    }, fixtures);
    await page.goto(url.href);
    const section = page.getByRole("region", { name: "Daily passes" });
    const quick = section.getByRole("button", { name: "Add 30 days to Genshin Impact, Europe" });
    const manage = section.getByRole("button", { name: "Manage daily passes" });
    await quick.waitFor();
    assert.equal(await manage.getAttribute("aria-expanded"), "false");
    const summaries = section.locator("ul").first();
    assert.match(await summaries.innerText(), /Expired · 0 game-days left/);
    assert.match(await summaries.innerText(), /Active · 0 game-days left/);
    assert(await section.evaluate(el => el.scrollWidth <= el.clientWidth), `${width}px summary overflows`);

    for (const button of await summaries.getByRole("button").all()) {
      const fits = await button.evaluate(el => {
        const target = el.getBoundingClientRect();
        const text = el.nextElementSibling.getBoundingClientRect();
        const row = el.closest("li").getBoundingClientRect();
        return target.width >= 44 && target.height >= 44 && target.right <= text.left &&
          text.right <= row.right && row.left >= 0 && row.right <= document.documentElement.clientWidth;
      });
      assert(fits, `${width}px summary target or label layout`);
    }

    if (mobile) await quick.tap();
    else await quick.press("Space");
    await summaries.getByText("Active · 29 game-days left", { exact: true }).waitFor();
    assert.equal(await manage.getAttribute("aria-expanded"), "false");
    await section.getByRole("button", { name: /^Undo adding 30 days for Genshin Impact, Europe/ }).click();
    await summaries.getByText("Expired · 0 game-days left", { exact: true }).waitFor();

    await manage.click();
    await section.getByRole("combobox", { name: /^Game/ }).selectOption("genshin");
    const correction = section.getByRole("button", { name: "Correct expiration" });
    assert.equal(await correction.getAttribute("aria-expanded"), "true");
    const numeric = section.getByRole("spinbutton", { name: /excluding today/ });
    assert.equal(await numeric.inputValue(), "");
    await numeric.fill("0");
    await section.getByRole("button", { name: "Save correction" }).click();
    assert.equal(await summaries.getByText("Active · 0 game-days left", { exact: true }).count(), 2);

    await section.getByLabel("Correction method").selectOption("date");
    await section.getByLabel(/Last active game-day \(expires/).fill("2026-11-20");
    // Corrections that share a timestamp are ordered by op ID.
    await page.clock.setFixedTime(new Date(now.getTime() + 1));
    await section.getByRole("button", { name: "Save correction" }).click();
    await summaries.getByText("Active · 2 game-days left", { exact: true }).waitFor();
    assert(await section.evaluate(el => el.scrollWidth <= el.clientWidth), `${width}px open panel overflows`);
    await section.getByRole("button", { name: "Save correction" }).press("Escape");
    assert.equal(await manage.getAttribute("aria-expanded"), "false");
    assert(await manage.evaluate(el => el === document.activeElement));

    await page.evaluate(key => {
      localStorage.setItem(key, "invalid");
      window.dispatchEvent(new StorageEvent("storage", { key }));
    }, recoveryKey);
    await section.getByRole("alert").filter({ hasText: "unreadable" }).waitFor();
    assert(await quick.isDisabled());
    assert.deepEqual(errors, []);
    console.log(`Daily Passes Chromium smoke passed at ${width}×${height}`);
    await page.close();
  }
} finally { await browser.close(); }
