// After bun run build. External Playwright, same setup as the existing runners:
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs [CHROMIUM_EXECUTABLE_PATH=/path/to/chrome] bun scripts/check-ui-small-fixes-browser.mjs
// Screenshots: UI_POLISH_SCREENSHOTS=/absolute/directory (default /tmp/ui-polish-screenshots).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const builds = await Promise.all(["ui-small-fixes", "timeline"].map(name => Bun.build({ entrypoints: [`test/helpers/${name}-browser.tsx`], target: "browser" })));
for (const build of builds) assert(build.success, String(build.logs));
const [app, timeline] = await Promise.all(builds.map(build => build.outputs[0].text()));
const production = await Bun.file("public/data/events.v1.json").json();
const base = production.events[0];
const events = [
  ["genshin", "Long campaign", "banner", "2026-08-01", "2026-12-10"],
  ["hsr", "Challenge", "challenge", "2026-10-10", "2026-11-10"],
  ["endfield", "Future event", "login", "2026-11-05", "2026-12-01"],
].map(([game, title, type, start, end]) => ({ ...base, id: `${game}:polish:${start}`, game, title, type,
  summary: "A long detail description. ".repeat(16), startsAt: `${start}T00:00:00.000Z`, startPrecision: "exact",
  endsAt: `${end}T00:00:00.000Z`, endPrecision: "exact", regionScoped: false, regionEnds: null, recognitionSubjects: undefined }));
const server = Bun.serve({ port: 0, fetch(req) {
  const path = new URL(req.url).pathname;
  if (path.endsWith("test.js")) return new Response(path.includes("timeline") ? timeline : app, { headers: { "content-type": "text/javascript" } });
  if (path.endsWith("styles.css")) return new Response(Bun.file("public/styles.css"));
  if (path.endsWith("events.v1.json")) return Response.json({ ...production, events });
  if (path === "/before") return new Response('<a href="/game-calendar/">Calendar</a>', { headers: { "content-type": "text/html" } });
  return new Response(`<!doctype html><base href="/game-calendar/"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><div id="root"></div><script type="module" src="${path.includes("timeline") ? "timeline-" : ""}test.js"></script>`, { headers: { "content-type": "text/html" } });
} });
const shots = process.env.UI_POLISH_SCREENSHOTS || "/tmp/ui-polish-screenshots";
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
let checks = 0;
const check = (value, label) => { assert(value, label); checks++; };
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const closed = async page => { await page.waitForFunction(() => !document.querySelector('[role="dialog"]')); await settle(page); };
try {
  // Full App: actual view controls, profile remounts, filters, and scroll.
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => { Date.now = () => Date.parse("2026-11-01T18:00:00Z"); });
    const reset = async () => {
      await page.goto(new URL("/before", server.url).href);
      await page.getByRole("link", { name: "Calendar" }).click();
      await page.waitForSelector(".app-header"); await settle(page);
    };
    await reset();
    const originalURL = page.url();
    const initialLength = await page.evaluate(() => history.length);
    const open = async () => {
      const trigger = page.locator('.scroll-pane button[aria-label*="Long campaign"]').first();
      await trigger.click(); await page.getByRole("dialog").waitFor();
      return trigger;
    };
    const pane = page.locator(".scroll-pane");
    await pane.evaluate(el => { el.scrollLeft += 100; }); await settle(page);
    const left = await pane.evaluate(el => el.scrollLeft);
    const trigger = await open();
    const close = page.getByRole("dialog").getByRole("button", { name: "Close", exact: true });
    check(await close.isVisible(), "visible inside Close");
    check(await close.evaluate(el => el === document.activeElement), "initial keyboard focus");
    await page.keyboard.press("Shift+Tab");
    check(await page.getByRole("dialog").evaluate(el => el.contains(document.activeElement)), "keyboard focus stays inside dialog");
    await close.focus();
    check(await close.evaluate(el => el.offsetHeight >= 44 && el.offsetWidth >= 44), "Close touch size");
    await page.getByRole("dialog").evaluate(el => { el.scrollTop = el.scrollHeight; }); await settle(page);
    const r = await close.boundingBox();
    check(r && r.y >= 0 && r.y + r.height <= 850, "Close reachable after scrolling");
    await page.screenshot({ path: `${shots}/detail-${width}.png` });
    await page.goBack(); await closed(page);
    check(page.url() === originalURL, "Back first dismisses inside base URL");
    check(Math.abs(await pane.evaluate(el => el.scrollLeft) - left) <= 1, "detail preserves inspected scroll");
    check(await trigger.evaluate(el => el === document.activeElement), "focus returns without scrolling");
    await page.goBack();
    check(new URL(page.url()).pathname === "/before", "subsequent Back navigates normally");
    await page.goForward(); await page.waitForSelector(".app-header");
    await page.goForward(); await closed(page);
    check(page.url() === originalURL, "stale Forward does not reopen");
    // New document: verify repeated close paths prune forward tail rather than growing history.
    await reset();
    const length = await page.evaluate(() => history.length);
    for (const method of ["close", "escape", "backdrop", "close", "back"]) {
      await open();
      if (method === "close") await close.click();
      else if (method === "escape") await page.keyboard.press("Escape");
      else if (method === "backdrop") await page.getByRole("button", { name: "Close details", exact: true }).click({ position: { x: 5, y: 5 } });
      else await page.goBack();
      await closed(page);
      await page.waitForFunction(() => !history.state?.__eventclockDetail);
      check(page.url() === originalURL, `${method} consumes only dialog`);
      check(await page.evaluate(() => history.length) <= length + 1, "no accumulating modal entries");
    }
    await open(); await page.reload(); await page.waitForSelector(".app-header"); await closed(page);
    await page.waitForFunction(() => !history.state?.__eventclockDetail);
    await page.goBack(); check(new URL(page.url()).pathname === "/before", "reload consumes modal entry");
    await reset(); await open();
    await page.evaluate(() => window.polishTest.profile("account")); await closed(page);
    await page.waitForFunction(() => !history.state?.__eventclockDetail);
    check(!(await page.getByRole("dialog").count()), "profile switch isolates dialog");
    await open(); await page.evaluate(() => window.polishTest.profile("guest")); await closed(page);
    await page.waitForFunction(() => !history.state?.__eventclockDetail);
    // Checklist entry point, plus deletion of the active custom row.
    await page.getByRole("tab", { name: "Checklist" }).click();
    await page.getByRole("button", { name: "View Long campaign details", exact: true }).click();
    await close.click(); await closed(page);
    await page.getByRole("button", { name: "View Delete me details", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Delete/ }).click(); await closed(page);
    await page.waitForFunction(() => !history.state?.__eventclockDetail);
    check(!(await page.getByRole("button", { name: "View Delete me details", exact: true }).count()), "deleted row consumes history");
    await page.getByRole("tab", { name: "Timeline" }).click(); await settle(page);
    // Closing detail leaves filter/account disclosures and M2 viewport intact.
    await pane.evaluate(el => { el.scrollLeft += 130; }); await settle(page);
    await open(); await close.click(); await closed(page);
    const beforeFilter = await pane.evaluate(el => el.scrollLeft);
    if (width < 768) {
      await page.getByRole("button", { name: /^Filters/ }).click();
      await page.locator(".mobile-filters-panel").getByRole("button", { name: "Login / rewards", exact: true }).click();
      await page.getByRole("button", { name: "Collapse filters", exact: true }).click();
      await page.locator(".mobile-account button").first().click();
      await page.getByRole("button", { name: "Switch profile", exact: true }).waitFor();
      await page.keyboard.press("Escape");
    } else await page.locator(".desktop-types").getByRole("button", { name: "Login / rewards", exact: true }).click();
    await settle(page);
    check(Math.abs(await pane.evaluate(el => el.scrollLeft) - beforeFilter) <= 1, "filter after detail retains inspected moment with same range");
    await page.getByRole("tab", { name: "Checklist" }).click();
    const daily = await page.locator('section').filter({ has: page.getByText(/Today's dailies/) }).first().evaluate(el => ({
      height: el.querySelector('h2').parentElement.getBoundingClientRect().height,
      overflow: el.scrollWidth > el.clientWidth,
      text: el.querySelector('h2').parentElement.textContent,
    }));
    check(!daily.overflow && daily.height < 25, `compact reset row ${JSON.stringify(daily)}`);
    check(daily.text.includes("next:"), "mixed reset attribution in App");
    await page.getByText(/Today's dailies/).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/dailies-${width}.png` });
    const resetParts = await page.getByLabel(/^Next reset:/).evaluate(el => [...el.children].map(child => ({ text: child.textContent, width: child.clientWidth, scroll: child.scrollWidth })));
    check(resetParts.every(part => part.scroll <= part.width), `built-in attribution and group count visible: ${JSON.stringify(resetParts)}`);
    await page.getByText(/Today's dailies/).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/dailies-${width}.png` });
    check(initialLength > 0, "browser history available");
    check(errors.length === 0, `no App errors: ${errors}`);
    await page.close();
  }
  // Race/foreign entry cases, using actual native history rather than mocked popstate.
  const page = await browser.newPage();
  await page.goto(new URL("/game-calendar/history?keep=1#hash", server.url).href);
  await page.waitForFunction(() => window.historyTest);
  const historyURL = page.url();
  await page.evaluate(() => { history.replaceState({ foreign: "keep" }, ""); window.historyTest.open("one"); window.historyTest.open("two"); });
  await page.waitForFunction(() => document.querySelector("output").textContent === "two");
  check(await page.evaluate(() => history.state.foreign === "keep"), "foreign state preserved while open");
  const raceLength = await page.evaluate(() => history.length);
  await page.evaluate(() => { const t = window.historyTest; t.close(); t.open("one"); t.open("last"); });
  await page.waitForFunction(() => document.querySelector("output").textContent === "last");
  check(await page.evaluate(length => history.length === length, raceLength), "rapid reopen replaces forward tail");
  await page.evaluate(() => window.historyTest.close());
  await page.waitForFunction(() => document.querySelector("output").textContent === "closed" && !history.state?.__eventclockDetail);
  check(page.url() === historyURL, "base path/query/hash unchanged");
  check(await page.evaluate(() => history.state.foreign === "keep"), "original state restored after close");
  await page.evaluate(() => { history.replaceState(42, ""); window.historyTest.open("primitive"); });
  await page.evaluate(() => window.historyTest.close());
  await page.waitForFunction(() => history.state === 42);
  check(await page.locator("output").textContent() === "closed", "primitive foreign state preserved");
  await page.evaluate(() => window.historyTest.open("callback"));
  await page.evaluate(() => { history.replaceState({ callback: "untouched" }, ""); window.historyTest.close(); });
  await settle(page);
  check(await page.evaluate(() => history.state.callback === "untouched"), "foreign replacement never traversed");
  await page.evaluate(() => { window.historyTest.open("url-change"); history.replaceState(history.state, "", "?cleaned=1"); window.historyTest.close(); });
  await settle(page);
  check(page.url().endsWith("?cleaned=1"), "URL cleanup preserving history.state is not traversed");
  await page.evaluate(() => window.historyTest.open("absent"));
  await page.evaluate(() => { history.pushState({ external: true }, "", "?external=1"); });
  await page.goBack();
  check(await page.locator("output").textContent() === "closed", "foreign pop closes UI without stale reopen");
  check(!page.url().includes("external"), "foreign URL navigation retained");
  await page.close();
  // Both modes, themes, extreme/intermediate zooms, three timezones and both DST transitions.
  for (const timezoneId of ["UTC", "America/New_York", "Europe/Berlin"]) {
    for (const width of [320, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, timezoneId });
      await page.goto(new URL("/game-calendar/timeline", server.url).href);
      await page.waitForFunction(() => window.timelineTest);
      for (const theme of ["dark", "light"]) for (const group of ["game", "ending"]) for (const dayWidth of [6, 32, 72, 108]) {
        await page.evaluate(({ theme, group, dayWidth }) => {
          document.documentElement.dataset.theme = theme;
          window.timelineTest.patch({ group, dayWidth });
        }, { theme, group, dayWidth }); await settle(page);
        const lines = await page.evaluate(() => {
          const pane = document.querySelector(".scroll-pane"), grid = pane.firstElementChild;
          const root = grid.getBoundingClientRect();
          const rows = [...grid.querySelectorAll("[data-day-boundary]")].map(el => {
            const ms = Number(el.dataset.dayBoundary), r = el.getBoundingClientRect(), css = getComputedStyle(el);
            return { ms, monday: new Date(ms).getDay() === 1, hour: new Date(ms).getHours(), marked: el.dataset.weekStart === "true",
              x: r.left - root.left, width: r.width, height: r.height, pointer: css.pointerEvents, color: css.backgroundColor };
          });
          const today = grid.querySelector(".bg-critical\\/80");
          return { rows, chartWidth: root.width, todayZ: getComputedStyle(today).zIndex, overlayZ: getComputedStyle(rows.length ? grid.querySelector("[data-day-boundary]").parentElement : grid).zIndex,
            dayWidth: window.timelineTest.read().dayWidth };
        });
        const first = lines.rows[0];
        for (let i = 0; i < lines.rows.length; i++) {
          const r = lines.rows[i];
          check(r.marked === r.monday && r.hour === 0, "only Monday local midnight is stronger");
          check(Math.abs(r.x - first.x - i * dayWidth) <= .6, "unchanged day-cell placement");
          check(r.width === (r.monday ? 2 : 1), "stronger width without reflow");
          check(r.pointer === "none" && r.height > 100, "decorative full-height grid line");
        }
        check(lines.rows.some(r => r.monday && r.color !== lines.rows.find(d => !d.monday).color), "theme contrast differs from daily grid");
        check(Number(lines.todayZ) > 0 && lines.overlayZ === "auto", "TODAY stacks above weekly lines");
        // Screenshots include Sunday→Monday and TODAY on the same visible section.
        if (timezoneId === "America/New_York") {
          await page.evaluate(() => {
            const monday = new Date("2026-10-20T12:34:00Z");
            monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
            monday.setHours(12, 0, 0, 0);
            window.timelineTest.inspect(monday.getTime());
          }); await settle(page);
          await page.screenshot({ path: `${shots}/week-${width}-${theme}-${group}-${dayWidth}.png` });
        }
      }
      for (const date of (timezoneId === "Europe/Berlin" ? ["2026-03-29T12:00:00Z", "2026-10-25T12:00:00Z"] : ["2026-03-08T12:00:00Z", "2026-11-01T12:00:00Z"])) {
        await page.evaluate(now => window.timelineTest.patch({ now, rows: [] }), Date.parse(date)); await settle(page);
        const boundaries = await page.locator("[data-day-boundary]").evaluateAll(els => els.map(el => ({ ms: Number(el.dataset.dayBoundary), marked: el.dataset.weekStart === "true" })));
        check(boundaries.every(r => r.marked === (new Date(new Date(r.ms).toLocaleString("en-US", { timeZone: timezoneId })).getDay() === 1)), "DST-week marks follow local dates");
        if (timezoneId !== "UTC") check(boundaries.some((r, i) => i > 0 && r.ms - boundaries[i - 1].ms !== 86400000), "DST grid uses variable-duration local days");
      }
      await page.close();
    }
  }
  console.log(`Small UI fixes Chromium checks passed: ${checks}; screenshots: ${shots}`);
} finally { await browser.close(); server.stop(true); }
