// After bun run build. External browser tooling, no added project dependencies:
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
// CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium \
// LABEL_SCREENSHOTS=/tmp/label-screenshots bun scripts/check-timeline-label-browser.mjs
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const build = await Bun.build({ entrypoints: ["test/helpers/timeline-label-browser.tsx"], target: "browser" });
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
let checks = 0, truncated = 0, reclaimedGame = 0, fullDates = 0, tinyTails = 0;
const check = (value, context) => { assert(value, context); checks++; };
if (process.env.LABEL_SCREENSHOTS) await mkdir(process.env.LABEL_SCREENSHOTS, { recursive: true });
try {
  console.log(`Browser: ${browser.version()}`);
  for (const width of [320, 360, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(server.url.href);
    await page.waitForFunction(() => window.labelTest, undefined, { timeout: 5000 }).catch(e => { throw new Error(`${e.message}: ${errors.join("; ")}`); });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const theme of ["dark", "light"]) for (const text of [100, 200]) {
      await page.evaluate(({theme, text}) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = `${text}%`; }, { theme, text });
      for (const group of ["game", "ending"]) for (const dayWidth of [6, 32, 72, 108]) {
        await page.evaluate(p => window.labelTest.patch(p), { group, dayWidth }); await settle();
        // Long bars with their start offscreen; narrow/scrolled tails near known ends.
        for (const offset of [0, 5.6, 6]) {
          await page.evaluate(days => window.labelTest.offset(days), offset); await settle();
          const results = await page.evaluate(() => {
            const pane = document.querySelector(".scroll-pane").getBoundingClientRect();
            return [...document.querySelectorAll("[data-timeline-event]")].map(bar => {
              const label = bar.querySelector("[data-timeline-label]");
              const m = [...bar.querySelector("[inert] > span").children].map(el => el.getBoundingClientRect().width);
              const parts = [...label.children];
              const identity = parts.find(el => el.classList.contains("truncate") && !el.classList.contains("eyebrow"));
              const rect = label.getBoundingClientRect(), bounds = bar.getBoundingClientRect();
              const gap = parseFloat(getComputedStyle(label).columnGap);
              return { id: bar.dataset.timelineEvent, m, gap, width: rect.width, unknown: bar.getAttribute("aria-label").includes("End unknown"),
                rect: {left: rect.left, right: rect.right}, bounds: {left: bounds.left, right: bounds.right}, pane: {left:pane.left,right:pane.right}, identity: identity?.getBoundingClientRect().width ?? 0, fullIdentity: identity?.textContent,
                ellipsis: identity ? getComputedStyle(identity).textOverflow : null,
                badge: !!label.querySelector("[data-event-category]"), game: !!label.querySelector(".eyebrow"),
                accessible: bar.getAttribute("aria-label"), title: bar.title,
                day: !!label.querySelector(".border-dashed"), date: parts.some(el => el.textContent.startsWith("→")),
                overflow: Math.max(0, ...parts.map(el => el.getBoundingClientRect().right - rect.right)),
                overlap: parts.some((el, i) => i && el.getBoundingClientRect().left < parts[i - 1].getBoundingClientRect().right - .1),
                contained: rect.width < .1 || rect.left >= Math.max(bounds.left + 8, pane.left + 8) - 1 && rect.right <= Math.min(bounds.right - 8, pane.right - 8) + 1,
              };
            });
          });
          const context = `${width}/${theme}/${text}/${group}/${dayWidth}/${offset}`;
          for (const r of results) {
            const [game, badge, identity, date, compact, minimum, indicators] = r.m;
            const room = Math.max(0, r.width - indicators - r.gap);
            const unknownReservation = r.unknown && badge + compact + r.gap <= room ? compact + r.gap : 0;
            const nameBudget = room - badge - unknownReservation - r.gap;
            const useful = Math.min(identity, minimum);
            const label = `${context} ${r.id}: ${JSON.stringify(r)}`;
            check(r.badge === (badge <= room), `badge priority ${label}`);
            if (badge <= room && nameBudget >= useful + .1) check(r.identity > 0, `needlessly hidden identity ${label}`);
            if (r.identity > 0) {
              check(r.identity >= useful - .1, `ellipsis alone/meaningless prefix ${label}`);
              check(r.ellipsis === "ellipsis", `CSS ellipsis ${label}`);
              if (r.identity < identity - 1) truncated++;
              if (group === "ending" && !r.game && nameBudget >= useful) reclaimedGame++;
            }
            if (group === "ending" && room >= game + badge + useful + 2 * r.gap + unknownReservation + .1) check(r.game, `unnecessary game loss ${label}`);
            check(!r.overlap, `overlapping children ${label}`);
            // Indicators may be clipped on truly tiny tails; visible names/badges must fit fully.
            check(r.overflow < .1 || r.width < indicators + .1 && !r.badge && !r.identity && !r.game, `payload overflow ${label}`);
            if (!r.contained && process.env.LABEL_SCREENSHOTS) await page.screenshot({ path: `${process.env.LABEL_SCREENSHOTS}/failure.png` });
            check(r.contained, `label outside bar/viewport ${label}`);
            check(r.title.startsWith(r.accessible), `tooltip/accessibility mismatch ${label}`);
            check(r.accessible.includes("Type:") && r.accessible.includes("Urgency:"), `lost semantics ${label}`);
            if (r.id.includes("label-2")) check(r.accessible.includes("Vesna") && r.accessible.includes("Official character banner"), `subject and title ${label}`);
            if (r.id.includes("label-3")) check(r.accessible.includes("Weapon Alpha + Weapon Beta"), `ordered subjects ${label}`);
            if (r.id.includes("label-4")) { check(r.accessible.includes("end date only"), `day precision ${label}`); if (r.date) check(r.day, `dashed date ${label}`); }
            if (r.unknown) check(!r.date && r.accessible.includes("End unknown"), `invented date ${label}`);
            if (r.date) fullDates++;
            if (r.width < badge) tinyTails++;
            // Enough room for every measured element restores the full deadline.
            const full = (group === "ending" ? game + r.gap : 0) + badge + identity + date + 2 * r.gap;
            if (room >= full + .1) check(r.date || r.unknown, `full deadline not restored ${label}`);
          }
          if (process.env.LABEL_SCREENSHOTS && width === 320 && theme === "dark" && text === 100 && group === "ending" && offset === 5.6 && dayWidth !== 72) {
            await page.screenshot({ path: `${process.env.LABEL_SCREENSHOTS}/320-dark-ending-${dayWidth}-tail.png` });
          }
          if (process.env.LABEL_SCREENSHOTS && offset === 0 && dayWidth === 72 && (text === 100 || width === 320 && group === "ending")) {
            await page.screenshot({ path: `${process.env.LABEL_SCREENSHOTS}/${width}-${theme}-${group}-${text}.png` });
          }
        }
      }
    }
    check(errors.length === 0, `browser errors ${errors.join("; ")}`);
    await page.close();
  }
  check(truncated > 0 && reclaimedGame > 0 && fullDates > 0 && tinyTails > 0, `matrix must exercise every fit stage: ${JSON.stringify({truncated, reclaimedGame, fullDates, tinyTails})}`);
  console.log(`Timeline labels Chromium: ${checks} checks; truncated=${truncated}, reclaimed game=${reclaimedGame}, full deadlines=${fullDates}, tiny tails=${tinyTails}`);
} finally { await browser.close(); server.stop(true); }
