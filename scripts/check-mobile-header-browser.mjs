// After bun run build. Uses the same external Playwright setup as check-timeline-browser.mjs.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs bun scripts/check-mobile-header-browser.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const build = await Bun.build({ entrypoints: ["test/helpers/mobile-header-browser.tsx"], target: "browser" });
assert(build.success, String(build.logs));
const bundle = await build.outputs[0].text();
const server = Bun.serve({ port: 0, fetch(req) {
  const path = new URL(req.url).pathname;
  if (path === "/test.js") return new Response(bundle, { headers: { "content-type": "text/javascript" } });
  if (path === "/styles.css") return new Response(Bun.file("public/styles.css"));
  if (path === "/data/events.v1.json") return new Response(Bun.file("public/data/events.v1.json"));
  if (path === "/built") return new Response(Bun.file("public/index.html"));
  const asset = Bun.file(`public${path}`);
  if (path !== "/" && !path.includes("..") && asset.size) return new Response(asset);
  return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script type="module" src="/test.js"></script>', { headers: { "content-type": "text/html" } });
} });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
let checks = 0;
const check = (value, label) => { assert(value, label); checks++; };
try {
  for (const width of [320, 360, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(server.url.href);
    await page.waitForSelector(".app-header");
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const prefs = () => page.evaluate(() => window.headerTest.prefs());
    const read = () => page.evaluate(() => window.headerTest.read());
    const preserve = async (action, label) => {
      const before = await read();
      const originalPane = await page.locator(".scroll-pane").elementHandle();
      await action(); await settle();
      const after = await read();
      const desired = await page.evaluate(ms => window.headerTest.leftFor(ms), before.ms);
      check(Math.abs(after.left - Math.max(0, Math.min(after.limit, desired))) <= 1, `${width}: ${label}`);
      check(await originalPane.evaluate(el => el === document.querySelector(".scroll-pane")), `${label}: pane remains mounted`);
    };
    const noOverflow = async (label, textScale = 1) => {
      const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        controls: [...document.querySelectorAll(".app-header button")].filter(el => el.getClientRects().length).map(el => {
          const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height };
        }) }));
      if (textScale === 1) check(geometry.scroll <= geometry.width, `${width} ${label}: sideways page overflow ${JSON.stringify(geometry)}`);
      // Pre-existing settings rows overflow at 200% root text. Scope the new
      // header/panel acceptance without silently changing unrelated settings.
      check(await page.locator(".app-header").evaluate(el => el.scrollWidth <= el.clientWidth), `${label}: header overflow`);
      check(await page.locator(".mobile-filters-panel").evaluate(el => el.hidden || el.scrollWidth <= el.clientWidth), `${label}: panel overflow`);
      for (const r of geometry.controls) check(r.left >= 0 && r.right <= width && r.width >= 44 && r.height >= 44, `${label}: clipped/short target ${JSON.stringify(r)}`);
    };
    if (width >= 768) {
      check(!(await page.locator(".mobile-filters-trigger").isVisible()), "desktop trigger hidden");
      check(await page.locator(".desktop-types").isVisible(), "desktop filters retained");
      check(await page.locator(".desktop-focus").isVisible(), "desktop Focus retained");
      check(await page.locator(".desktop-account").isVisible(), "desktop account retained");
      check(!(await page.locator(".mobile-account").isVisible()), "no duplicate account entry");
      check((await page.locator(".app-counts").isVisible()), "desktop counts retained");
      await page.close(); continue;
    }
    check(!(await page.locator(".mobile-filters-panel").isVisible()), "filters collapsed by default");
    check(!(await page.locator(".desktop-account").isVisible()), "mobile account strip absent");
    check(!(await page.locator(".desktop-types").isVisible()), "mobile type strip absent");
    check(!(await page.locator(".desktop-focus").isVisible()), "mobile Focus strip absent");
    check(!(await page.locator(".app-counts").isVisible()), "mobile subtitle absent");
    await noOverflow("collapsed");
    const trigger = page.getByRole("button", { name: /^Filters/ });
    await page.locator(".scroll-pane").evaluate(el => { el.scrollLeft += 180; }); await settle();
    await preserve(() => trigger.click(), "opening filters retains time");
    check(await trigger.getAttribute("aria-expanded") === "true", "expanded state");
    const panel = page.getByRole("region", { name: "Filters", exact: true });
    const types = panel.getByRole("group", { name: "Event types" });
    const games = panel.getByRole("group", { name: "Focus on one game" });
    check(await types.getByRole("button").count() === 7, "all type choices present");
    check(await games.getByRole("button").count() === 8, "all enabled games plus custom in chooser");
    const gameLabels = await games.getByRole("button").evaluateAll(els => els.map(el => el.getAttribute("aria-label")));
    check(gameLabels[1].startsWith("Honkai") && gameLabels[2].startsWith("Genshin") && gameLabels[3].includes("A very long custom"), "chosen game order + custom game");
    check(!gameLabels.some(s => s.includes("Zenless")), "hidden game excluded");
    for (const chips of [types, games]) {
      const geometry = await chips.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth,
        top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom,
        children: [...el.children].map(c => ({ top: c.getBoundingClientRect().top, right: c.getBoundingClientRect().right })) }));
      check(geometry.client >= geometry.scroll, "no chip scroller");
      check(new Set(geometry.children.map(c => c.top)).size > 1, "chips wrap to multiple rows");
      check(geometry.children.every(c => c.right <= width), "no offscreen chip");
    }
    const baseline = await prefs();
    await types.getByRole("button", { name: "All types", exact: true }).click(); await settle();
    check((await prefs()).visibleCategories.length === 0, "All types clears all");
    check(await panel.isVisible(), "selection leaves panel open");
    check(await trigger.getAttribute("aria-label") === "Filters — active", "active cue with no types");
    await types.getByRole("button", { name: "Banners", exact: true }).click();
    check((await prefs()).visibleCategories.join() === "banner", "partial category selection");
    await types.getByRole("button", { name: "All types", exact: true }).click(); await settle();
    check((await prefs()).visibleCategories.length === 6, "partial All selects all");
    await preserve(() => games.getByRole("button", { name: /^Honkai/ }).click(), "focus with closest-edge clamp");
    check((await prefs()).focusGame === "hsr", "single focus");
    await games.getByRole("button", { name: /^Honkai/ }).click();
    check((await prefs()).focusGame === null, "focused chip returns All");
    // Reset is reachable even when no rows exist and changes exactly two fields.
    await types.getByRole("button", { name: "All types", exact: true }).click();
    await games.getByRole("button", { name: /^A very long custom/ }).click();
    await panel.getByRole("button", { name: "Reset filters", exact: true }).click(); await settle();
    const reset = await prefs();
    check(reset.focusGame === null && reset.visibleCategories.length === 6, "reset restores filters");
    const { focusGame: f1, visibleCategories: c1, ...rest1 } = baseline;
    const { focusGame: f2, visibleCategories: c2, ...rest2 } = reset;
    check(JSON.stringify(rest1) === JSON.stringify(rest2), "reset preserves every unrelated preference");
    check(await trigger.getAttribute("aria-label") === "Filters", "default cue cleared");
    await preserve(() => panel.getByRole("button", { name: "Collapse filters" }).click(), "collapse retains time");
    check(await trigger.evaluate(el => document.activeElement === el), "collapse restores focus");
    await preserve(() => trigger.click(), "reopen retains time");
    await preserve(() => trigger.click(), "header toggle closes");
    await trigger.click();
    await types.getByRole("button", { name: "Shop / exchange", exact: true }).click();
    await page.keyboard.press("Escape");
    check(!(await panel.isVisible()), "Escape collapses filters");
    check(await trigger.evaluate(el => el === document.activeElement), "filter Escape returns focus");
    await trigger.click();
    const selected = (await prefs()).visibleCategories;
    await page.getByRole("tab", { name: "Checklist", exact: true }).click();
    check(JSON.stringify((await prefs()).visibleCategories) === JSON.stringify(selected), "Checklist shares filters");
    check(await panel.isVisible(), "view change retains disclosure");
    await page.getByRole("tab", { name: "Timeline", exact: true }).click();
    check(JSON.stringify((await prefs()).visibleCategories) === JSON.stringify(selected), "Timeline shares filters");
    await panel.getByRole("button", { name: "Reset filters" }).click();
    await panel.getByRole("button", { name: "Collapse filters" }).click();
    const account = page.getByRole("button", { name: /^Account:/ });
    check((await account.getAttribute("aria-label")).includes("Guest"), "guest is local");
    await account.click();
    const details = page.getByRole("region", { name: "Account details" });
    check(await details.getByRole("button", { name: "Continue with Google" }).isVisible(), "sign-in reachable");
    await details.getByRole("button", { name: "Continue with Google" }).click();
    check(await details.locator("output").textContent() === "sign-in", "original action fires");
    await page.keyboard.press("Escape");
    check(!(await details.isVisible()), "Escape dismisses account");
    check(await account.evaluate(el => el === document.activeElement), "Escape returns focus");
    await account.click(); await page.locator(".app-wordmark").click();
    check(!(await details.isVisible()), "outside click dismisses account");
    for (const kind of ["synced", "syncing", "pending", "offline", "network", "auth", "schema", "error"]) {
      await page.evaluate(kind => window.headerTest.account({ kind, pending: kind === "synced" ? 0 : 3,
        lastSuccessfulSyncAt: "2026-10-21T12:00:00Z" }), kind); await settle();
      check(await account.locator(".account-cue").getAttribute("data-tone") ===
        (kind === "synced" ? "synced" : kind === "syncing" ? "busy" : ["auth", "schema", "error"].includes(kind) ? "warning" : "waiting"), `${kind} truthful cue`);
    }
    await page.evaluate(() => window.headerTest.account({ kind: "synced", pending: 0 }, true)); await settle();
    check(await account.locator(".account-cue").getAttribute("data-tone") === "waiting", "cached offline account never green");
    await page.evaluate(() => window.headerTest.account({ kind: "synced", pending: 0, clockWarning: true })); await settle();
    check((await account.getAttribute("aria-label")).includes("clock"), "clock warning exposed");
    await account.click();
    check((await details.textContent()).includes("test@example.test"), "email remains accessible");
    await details.getByRole("button", { name: "Retry sync" }).click();
    check(await details.locator("output").textContent() === "retry", "retry handler fires");
    await details.getByRole("button", { name: "Sign out", exact: true }).click();
    check((await account.getAttribute("aria-label")).includes("Guest"), "sign out clears account cue");
    await page.keyboard.press("Escape");
    for (const theme of ["light", "dark"]) for (const scale of [1, 2]) {
      await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme;
        document.documentElement.style.fontSize = `${16 * scale}px`; }, { theme, scale });
      await settle(); await noOverflow(`${theme} ${scale * 100}% text`, scale);
      await trigger.click(); await noOverflow(`${theme} ${scale * 100}% expanded`, scale);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/header-${width}-${theme}-${scale}.png` });
      await panel.getByRole("button", { name: "Collapse filters" }).click();
    }
    check(errors.length === 0, errors.join("\n"));
    await page.close();
  }
  // Production bundle + real AuthRoot guest bootstrap, with local preferences
  // seeded before first migration. No OAuth or cloud account is exercised.
  for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, serviceWorkers: "block" });
    await context.addInitScript(() => {
      localStorage.setItem("gacha-tracker:v1:prefs", JSON.stringify({ onboarded: true, view: "timeline",
        regionConfirmed: true, knownGames: ["genshin", "hsr", "wuwa", "zzz", "nte", "endfield", "czn"] }));
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(new URL("/built", server.url).href);
    await page.waitForSelector(".app-header");
    check(await page.getByRole("button", { name: "Jump to today", exact: true }).isVisible(), "built Timeline controls reachable");
    if (width === 320) {
      check(await page.getByRole("button", { name: /^Account: Guest/ }).isVisible(), "built real AuthRoot guest entry");
      await page.getByRole("button", { name: /^Account: Guest/ }).click();
      check(await page.getByRole("region", { name: "Account details" }).getByRole("button", { name: "Continue with Google" }).isVisible(), "built real sign-in entry");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /^Filters/ }).click();
      check(await page.getByRole("button", { name: "Reset filters" }).isVisible(), "built filters usable");
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "built mobile no page overflow");
    } else check(await page.locator(".desktop-account").isVisible(), "built desktop account entry retained");
    check(errors.length === 0, errors.join("\n"));
    await context.close();
  }
  console.log(`Mobile header/filter Chromium checks passed: ${checks}`);
} finally { await browser.close(); server.stop(true); }
