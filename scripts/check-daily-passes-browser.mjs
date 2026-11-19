// After bun run build, with bun run serve running locally.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
// CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium bun scripts/check-daily-passes-browser.mjs
import assert from "node:assert/strict";
import { PROFILE_KEYS, profileKeys } from "../src/client/state/storage.ts";
import { readableHue } from "../src/client/state/theme.ts";
import { GAMES } from "../src/shared/games.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = new URL(process.env.DAILY_PASSES_SMOKE_URL || "http://localhost:3000/");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
const profile = "local:passes-browser";
const keys = profileKeys(profile);
const recoveryKey = `${keys.passes}:op:broken`;
const now = new Date("2026-11-18T03:00:00.000Z");
const passes = [
  { game: "genshin", lastDay: "2026-11-17", days: 0, tone: "critical" },
  { game: "hsr", lastDay: "2026-11-18", days: 0, tone: "critical" },
  { game: "czn", lastDay: "2026-11-24", days: 7, tone: "soon" },
  { game: "wuwa", lastDay: "2026-11-26", days: 8, tone: "positive" },
];
const fixtures = [
  [PROFILE_KEYS.profiles, JSON.stringify({ schemaVersion: 2, guestProfileId: profile, legacyMigrated: true })],
  ...passes.map(({ game, lastDay }) => {
    const op = { opId: crypto.randomUUID(), kind: "set", game, region: "europe", lastDay,
      actionDay: "2026-11-17", createdAt: "2026-11-18T02:59:59.000Z", basedOn: [] };
    return [`${keys.passes}:op:${op.opId}`, JSON.stringify(op)];
  }),
];

function rgb(color) {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const channels = hex.length === 3 ? [...hex].map(digit => digit.repeat(2)) : hex.match(/../g);
    return channels.map(channel => parseInt(channel, 16));
  }
  const channels = color.match(/[\d.]+/g).map(Number);
  return color.startsWith("color(srgb") ? channels.map(channel => channel * 255) : channels;
}

function luminance(color) {
  const [r, g, b] = rgb(color).map(value => value / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function assertContrast(color, backgrounds, description) {
  for (const background of backgrounds) {
    const values = [luminance(color), luminance(background)];
    const ratio = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
    assert(ratio >= 4.5, `${description} has ${ratio.toFixed(2)}:1 contrast on ${background}`);
  }
}

async function checkCount(row, { days, tone }) {
  const result = await row.getByText(String(days), { exact: true }).evaluate((el, tone) => {
    const number = getComputedStyle(el);
    const label = getComputedStyle(el.parentElement);
    return {
      color: number.color,
      token: number.getPropertyValue(`--color-${tone}`).trim(),
      backgrounds: ["--color-ground", "--color-glow"].map(key => number.getPropertyValue(key).trim()),
      label: label.color,
      status: getComputedStyle(el.parentElement.parentElement).color,
      ink: number.getPropertyValue("--color-ink").trim(),
      weight: Number(number.fontWeight),
      numerals: number.fontVariantNumeric,
      wrapping: label.whiteSpace,
    };
  }, tone);
  assert.deepEqual(rgb(result.color), rgb(result.token));
  assert.deepEqual(rgb(result.label), rgb(result.ink));
  assert.equal(result.status, result.label);
  assert(result.weight >= 600);
  assert.equal(result.numerals, "tabular-nums");
  assert.equal(result.wrapping, "nowrap");
  assertContrast(result.color, result.backgrounds, `${days} game-days left`);
}

try {
  const viewports = [[320, 800], [360, 800], [1440, 900]];
  for (const [theme, width, height] of ["dark", "light"].flatMap(theme => viewports.map(size => [theme, ...size]))) {
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
    }, [...fixtures, [keys.prefs, JSON.stringify({ region: "europe", regionConfirmed: true, onboarded: true, theme })]]);
    await page.goto(url.href);
    const section = page.getByRole("region", { name: "Daily passes" });
    const quick = section.getByRole("button", { name: "Add 30 days to Genshin Impact, Europe" });
    const manage = section.getByRole("button", { name: "Manage daily passes" });
    await quick.waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
    assert.equal(await manage.getAttribute("aria-expanded"), "false");
    const summaries = section.locator("ul").first();
    assert.match(await summaries.innerText(), /Expired · 0 game-days left/);
    assert.match(await summaries.innerText(), /Active · 0 game-days left/);
    assert(await section.evaluate(el => el.scrollWidth <= el.clientWidth), `${width}px summary overflows`);
    const nameColors = new Set();
    for (const pass of passes) {
      const label = GAMES[pass.game].short;
      const row = summaries.getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });
      await checkCount(row, pass);
      const identity = await row.getByText(label, { exact: true }).evaluate(el => {
        const style = getComputedStyle(el);
        return {
          hue: style.getPropertyValue("--game-hue").trim(),
          color: style.color,
          backgrounds: ["--color-ground", "--color-glow"].map(key => style.getPropertyValue(key).trim()),
          weight: Number(style.fontWeight),
        };
      });
      assert.deepEqual(rgb(identity.hue), rgb(readableHue(GAMES[pass.game].hue, theme)));
      if (theme === "light") assert.deepEqual(rgb(identity.color), rgb(identity.hue));
      assert(identity.weight >= 600);
      assertContrast(identity.color, identity.backgrounds, `${theme} ${pass.game} name`);
      nameColors.add(identity.color);
    }
    assert.equal(nameColors.size, passes.length);

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
    const europe = section.getByRole("list", { name: "Passes by region" }).getByRole("listitem").filter({ hasText: /^Europe/ });
    for (const pass of passes) {
      await section.getByRole("combobox", { name: /^Game/ }).selectOption(pass.game);
      await checkCount(europe, pass);
    }
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
    console.log(`Daily Passes Chromium smoke passed in ${theme} at ${width}×${height}`);
    await page.close();
  }
} finally { await browser.close(); }
