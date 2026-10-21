// Real CSS/scroll regression, separate from happy-dom. After bun run build:
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs bun scripts/check-timeline-browser.mjs
// Use an installed Playwright Chromium (playwright install chromium).
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const build = await Bun.build({ entrypoints: ["test/helpers/timeline-browser.tsx"], target: "browser" });
assert(build.success, String(build.logs));
const bundle = await build.outputs[0].text();
const server = Bun.serve({ port: 0, fetch(req) {
  const path = new URL(req.url).pathname;
  if (path === "/test.js") return new Response(bundle, { headers: { "content-type": "text/javascript" } });
  if (path === "/styles.css") return new Response(Bun.file("public/styles.css"));
  return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script type="module" src="/test.js"></script>', { headers: { "content-type": "text/html" } });
} });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
let checks = 0;
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 },
      timezoneId: process.env.TIMELINE_TIMEZONE || "UTC" });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const read = () => page.evaluate(() => window.timelineTest.read());
    const patch = async p => { await page.evaluate(p => window.timelineTest.patch(p), p); await settle(); };
    const reset = async () => { await page.goto(server.url.href); await page.waitForFunction(() => window.timelineTest); await settle(); };
    const filtered = async (kind) => {
      await page.evaluate(kind => {
        const t = window.timelineTest;
        t.patch({ rows: t.rows.filter(r => kind === "game" ? r.event.game === "hsr" : r.event.type !== "banner") });
      }, kind);
      await settle();
    };
    // The closest feasible pixel offset is the oracle, not scrollLeft equality.
    // Calendar conversion is independently covered by timeline-days.test.ts;
    // this checks the mounted React lifecycle and actual native CSS geometry.
    const preserve = async (action, label) => {
      const before = await read();
      await action();
      const after = await read();
      const desired = await page.evaluate(ms => window.timelineTest.leftFor(ms), before.ms);
      const expected = Math.max(0, Math.min(after.limit, desired));
      assert(Math.abs(after.left - expected) <= 1,
        `${label}, width=${width}: ${JSON.stringify({ before, after, desired, expected })}`);
      checks++;
    };
    await reset();
    const first = await read();
    const todayX = await page.evaluate(() => window.timelineTest.leftFor(Date.parse("2026-10-20T12:34Z")) + window.timelineTest.read().width / 2);
    assert(Math.abs((todayX - first.left) / first.width - (width >= 1024 ? .25 : .20)) < .01); checks++;
    await page.evaluate(() => { document.querySelector(".scroll-pane").scrollLeft = 0; }); await settle();
    await preserve(() => filtered("game"), "later origin / nearest feasible left clamp");
    for (const group of ["game", "ending"]) for (const dayWidth of [32, 72, 108]) {
      await reset(); await patch({ group, dayWidth });
      await page.evaluate(() => window.timelineTest.inspect(window.timelineTest.target)); await settle();
      await preserve(() => filtered("game"), `game filter (${group}, ${dayWidth})`);
      await preserve(async () => { await page.evaluate(() => window.timelineTest.patch({ rows: window.timelineTest.rows })); await settle(); }, "restore game");
      await preserve(() => filtered("category"), "category filter");
      await preserve(() => patch({ showUpcoming: false }), "Upcoming off / shorter max, feasible centre");
      await preserve(() => patch({ showUpcoming: true }), "Upcoming on");
      await preserve(() => patch({ group: group === "game" ? "ending" : "game", splitUpcoming: false }), "mode/split");
      await preserve(async () => { await page.evaluate(() => window.timelineTest.patch({ rows: [...window.timelineTest.rows] })); await settle(); }, "feed replacement");
      await preserve(() => patch({ now: Date.parse("2026-12-22T12:34Z") }), "clock moves capped origin");
      await preserve(() => patch({ now: Date.parse("2026-12-22T12:34:01Z") }), "one-second clock tick");
      await preserve(() => patch({}), "ordinary rerender");
      await preserve(async () => {
        await patch({ rows: [] });
        await page.evaluate(() => window.timelineTest.patch({ rows: window.timelineTest.rows })); await settle();
      }, "empty then restored");
      await preserve(() => page.getByRole("button", { name: "Show a longer stretch of time", exact: true }).click().then(settle), "zoom centre");
      // Inspect the far right, then shorten max enough to force real native clamp.
      await page.evaluate(() => { const el = document.querySelector(".scroll-pane"); el.scrollLeft = el.scrollWidth; }); await settle();
      await preserve(async () => { await filtered("game"); await patch({ showUpcoming: false }); }, "shortened max / nearest feasible clamp");
      // Re-expanding after clamping retains the NEW inspected centre.
      await preserve(() => patch({ showUpcoming: true }), "expand after clamp");
      // No delivered scroll event/RAF between scrolling and changing bounds.
      await reset(); await patch({ group, dayWidth });
      await page.evaluate(() => {
        const t = window.timelineTest;
        t.inspect(t.target);
        t.patch({ rows: t.rows.filter(r => r.event.game === "hsr") });
      }); await settle();
      const rapid = await read();
      const rapidDesired = await page.evaluate(() => window.timelineTest.leftFor(window.timelineTest.target));
      assert(Math.abs(rapid.left - Math.max(0, Math.min(rapid.limit, rapidDesired))) <= 1); checks++;
    }
    // Jump remains explicit and uses the responsive fraction.
    await reset();
    await page.evaluate(() => window.timelineTest.inspect(window.timelineTest.target)); await settle();
    await page.getByRole("button", { name: "Jump to today", exact: true }).click();
    await page.waitForTimeout(600); // allow the intentional smooth scroll
    const jumped = await read();
    assert(Math.abs(jumped.left - first.left) <= 1); checks++;
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`Timeline temporal viewport Chromium checks passed: ${checks}`);
} finally { await browser.close(); server.stop(true); }
