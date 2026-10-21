import { Window, type HTMLElement as HappyHTMLElement, type Element as HappyElement } from "happy-dom";
import { act } from "react";
import { strict as assert } from "node:assert";

// Geometry is explicit: happy-dom does not lay out CSS. These tests exercise
// the mounted component's effects and handlers; browser smoke covers rendering.
const win = new Window({ url: "https://example.test" });
let paneWidth = 360;
let desktop = false;
let jumps = 0;
Object.defineProperty(win.HTMLElement.prototype, "clientWidth", { get() {
  return this.classList.contains("scroll-pane") && !this.hidden ? paneWidth : 0;
} });
Object.defineProperty(win.HTMLElement.prototype, "scrollWidth", { get() {
  return this.classList.contains("scroll-pane")
    ? Math.max(paneWidth, parseFloat((this.firstElementChild as HappyHTMLElement | null)?.style.width ?? "0")) : 0;
} });
win.HTMLElement.prototype.scrollTo = function(options: unknown) {
  this.scrollLeft = (options as { left: number }).left;
  jumps++;
};
win.HTMLElement.prototype.getBoundingClientRect = function() {
  return new win.DOMRect(0, 0, this.textContent!.length * 6, 16);
};
Object.assign(globalThis, {
  window: win, document: win.document, navigator: win.navigator,
  HTMLElement: win.HTMLElement, ResizeObserver: class { observe() {} disconnect() {} },
  getComputedStyle: () => ({ columnGap: "6px" }),
  requestAnimationFrame: win.requestAnimationFrame.bind(win),
  cancelAnimationFrame: win.cancelAnimationFrame.bind(win),
  IS_REACT_ACT_ENVIRONMENT: true,
});
win.matchMedia = (() => ({ matches: desktop })) as unknown as typeof win.matchMedia;

const { createRoot } = await import("react-dom/client");
const { Timeline, boardWindow, timelineX, timelineMsAt, timelineEndMs, scrollToToday } = await import("../../src/client/components/Timeline.tsx");
const { GachaEvent } = await import("../../src/shared/schema.ts");
const { clockFor } = await import("../../src/shared/time.ts");
const NOW = Date.parse("2026-10-20T12:34:00Z");
const event = GachaEvent.parse({
  id: "genshin:test:2026-10-01", game: "genshin", title: "Official title", recognitionSubjects: ["Subject A", "Subject B"],
  type: "banner", summary: null, startsAt: "2026-10-01T00:00:00Z", startPrecision: "exact",
  endsAt: "2026-12-25T12:34:00Z", endPrecision: "day", regionScoped: false, regionEnds: null,
  sourceUrl: "https://example.test/event", sourceId: "test", status: "published", confidence: 1,
  extractionMethod: "parser", version: 1, firstSeenAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
});
const row = { event, clock: clockFor(event, "europe", NOW) };
const older = { event: { ...event, id: "genshin:older:2026-09-01", startsAt: "2026-09-01T00:00:00Z" }, clock: { ...row.clock, startsMs: Date.parse("2026-09-01T00:00:00Z") } };
const future = { event: { ...event, id: "genshin:future:2026-11-01", startsAt: "2026-11-01T00:00:00Z" }, clock: { ...row.clock, startsMs: Date.parse("2026-11-01T00:00:00Z"), upcoming: true } };
const container = win.document.createElement("div");
win.document.body.append(container);
const root = createRoot(container as unknown as HTMLElement);
let props = {
  rows: [row], now: NOW, dayWidth: 72, group: "game" as "game" | "ending", showUpcoming: false, splitUpcoming: true,
  onZoom: (width: number) => { props.dayWidth = width; draw(); }, onGroup: () => {}, onOpen: () => {}, isDone: () => false,
};
const draw = () => root.render(<Timeline {...props} />);
const render = () => act(async () => { draw(); });
const pane = () => container.querySelector(".scroll-pane") as HappyHTMLElement;
const click = async (button: HappyElement | null) => {
  assert(button);
  await act(async () => { button.dispatchEvent(new win.MouseEvent("click", { bubbles: true })); });
};
const min = boardWindow([row.clock.startsMs], [row.clock.endsMs!], NOW).min;

await render();
assert.equal(jumps, 1);
assert.equal(pane().scrollLeft, scrollToToday(timelineX(NOW, min, 72), paneWidth));
assert.notEqual(pane().scrollLeft, scrollToToday(timelineX(new Date(2026, 9, 20).getTime(), min, 72), paneWidth));
assert(container.querySelector("[data-timeline-label]")!.textContent!.includes("Subject A + Subject B"));
assert(container.querySelector("[data-timeline-label] .border-dashed"));

const currentMin = () => {
  const plotted = props.rows.filter(r => props.showUpcoming || !r.clock.upcoming);
  return boardWindow(plotted.map(r => r.clock.startsMs), plotted.map(r => r.clock.endsMs ?? r.clock.startsMs + 14 * 86400000), props.now).min;
};
pane().scrollLeft = 900;
await act(async () => { pane().dispatchEvent(new win.Event("scroll")); });
const inspectedBeforeFilters = timelineMsAt(pane().scrollLeft + paneWidth / 2, currentMin(), props.dayWidth);
for (const change of [
  { group: "ending" as const }, { group: "game" as const },
  { rows: [older, row] }, // feed/filter alters the board origin
  { rows: [row] }, { showUpcoming: true, rows: [row, future] },
  { splitUpcoming: false }, { showUpcoming: false },
  { now: NOW + 86400000 }, { now: NOW + 86401000 }, // day boundary + clock tick
  { rows: [{ ...row, event: { ...event } }] }, // feed replacement
  { rows: [] }, { rows: [row] }, // filter all out and back in
]) {
  props = { ...props, ...change };
  await render();
  if (props.rows.length) {
    assert(Math.abs(timelineMsAt(pane().scrollLeft + paneWidth / 2, currentMin(), props.dayWidth) - inspectedBeforeFilters) < 1,
      "filters must preserve the inspected timestamp, not numeric scrollLeft");
  }
  assert.equal(jumps, 1);
}

const inspected = timelineMsAt(pane().scrollLeft + paneWidth / 2, min, 72);
await click(container.querySelector('[aria-label="Show a shorter stretch of time in more detail"]'));
assert.equal(props.dayWidth, 108);
assert(Math.abs(pane().scrollLeft + paneWidth / 2 - timelineX(inspected, min, 108)) < 0.01);
assert.equal(jumps, 1);
await click(Array.from(container.querySelectorAll("button")).find(b => b.textContent === "Jump to today")!);
assert.equal(jumps, 2);
assert.equal(pane().scrollLeft, scrollToToday(timelineX(props.now, min, 108), paneWidth));

// Both modes keep type alone on a narrow tail after identity/game yield.
for (const group of ["game", "ending"] as const) {
  props.group = group;
  await render();
  pane().scrollLeft = timelineX(timelineEndMs(row)!, min, 108) - 38;
  await act(async () => {
    pane().dispatchEvent(new win.Event("scroll"));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  const label = container.querySelector("[data-timeline-label]")!;
  assert.equal(label.textContent, "Bn");
  assert(label.querySelector('[aria-label="Type: Banner"]'));
}
// Below even the badge width, the full accessible name still survives.
pane().scrollLeft = timelineX(timelineEndMs(row)!, min, 108) - 20;
await act(async () => {
  pane().dispatchEvent(new win.Event("scroll"));
  await new Promise(resolve => setTimeout(resolve, 30));
});
const bar = container.querySelector("[data-timeline-event]")!;
assert(bar.getAttribute("aria-label")!.includes("Type: Banner — Subject A + Subject B — Official title"));
assert(bar.getAttribute("aria-label")!.includes("end date only"));
assert(!container.querySelector("[data-timeline-label] [aria-label='Type: Banner']"));

await act(async () => { root.unmount(); });
// Desktop mount, including initially empty/filter-only Timeline.
paneWidth = 1200; desktop = true;
const secondRoot = createRoot(container as unknown as HTMLElement);
await act(async () => { secondRoot.render(<Timeline {...props} rows={[]} />); });
assert.equal(jumps, 2);
await act(async () => { secondRoot.render(<Timeline {...props} />); });
assert.equal(jumps, 3);
assert.equal(pane().scrollLeft, scrollToToday(timelineX(props.now, min, 108), paneWidth, true));
await act(async () => { secondRoot.unmount(); });

// Unknown-end compact text survives alongside type where it can fit. At the
// type-only limit or zero-width tail, End unknown stays in the accessible name.
const unknownEvent = { ...event, endsAt: null, endPrecision: "unknown" as const };
const unknownRow = { event: unknownEvent, clock: clockFor(unknownEvent, "europe", NOW) };
const thirdRoot = createRoot(container as unknown as HTMLElement);
desktop = false;
for (const mode of ["game", "ending"] as const) {
  for (const width of [60, 34, 20]) {
    paneWidth = width;
    await act(async () => { thirdRoot.render(<Timeline {...props} group={mode} rows={[unknownRow]} />); });
    const bar = container.querySelector("[data-timeline-event]")!;
    assert(bar.getAttribute("aria-label")!.includes("End unknown"));
    assert(bar.getAttribute("aria-label")!.includes("Type: Banner"));
    const label = bar.querySelector("[data-timeline-label]")!;
    assert.equal(!!label.querySelector('[aria-label="Type: Banner"]'), width >= 34);
    assert.equal(!!label.querySelector('[aria-label="End unknown"]'), width === 60);
  }
}
await act(async () => { thirdRoot.unmount(); });

// Range changes: test calendar coordinates in both modes/scales, including
// unrepresentable anchors and a scroll immediately followed by a filter (no
// delivered scroll event). Chromium separately verifies native layout/clamp.
const fourthRoot = createRoot(container as unknown as HTMLElement);
paneWidth = 360;
const shortEvent = { ...event, id: "hsr:short:2026-10-15", game: "hsr" as const,
  type: "challenge" as const, startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-11-05T00:00:00Z" };
const shortRow = { event: shortEvent, clock: clockFor(shortEvent, "europe", NOW) };
const fourthRender = () => act(async () => { fourthRoot.render(<Timeline {...props} />); });
const changeKeepingTime = async (change: Partial<typeof props>) => {
  const moment = timelineMsAt(pane().scrollLeft + paneWidth / 2, currentMin(), props.dayWidth);
  props = { ...props, ...change };
  await fourthRender();
  const desired = timelineX(moment, currentMin(), props.dayWidth) - paneWidth / 2;
  const expected = Math.max(0, Math.min(pane().scrollWidth - paneWidth, desired));
  assert(Math.abs(pane().scrollLeft - expected) < .01);
};
for (const group of ["game", "ending"] as const) for (const dayWidth of [32, 72, 108]) {
  props = { ...props, rows: [older, row, shortRow, future], now: NOW, group, dayWidth, showUpcoming: true };
  await fourthRender();
  pane().scrollLeft = timelineX(NOW + 3 * 86400000, currentMin(), dayWidth) - paneWidth / 2;
  await changeKeepingTime({ rows: [shortRow, future] }); // changed origin
  await changeKeepingTime({ showUpcoming: false }); // shorter max, feasible
  await changeKeepingTime({ showUpcoming: true });
  // Right edge no longer fits when Upcoming disappears. Clamp, then preserve
  // that newly inspected moment when the full range returns.
  pane().scrollLeft = pane().scrollWidth - paneWidth;
  await changeKeepingTime({ showUpcoming: false });
  assert.equal(pane().scrollLeft, pane().scrollWidth - paneWidth);
  await changeKeepingTime({ showUpcoming: true });
  await changeKeepingTime({ dayWidth: 13 }); // zoom out to an unscrollable board
  const held = timelineMsAt(pane().scrollLeft + paneWidth / 2, currentMin(), props.dayWidth);
  props.rows = []; await fourthRender();
  props.now += 1000; props.dayWidth = 72; await fourthRender(); // updates while hidden
  props.rows = [shortRow, future]; await fourthRender();
  assert.equal(pane().scrollLeft, Math.max(0, Math.min(pane().scrollWidth - paneWidth,
    timelineX(held, currentMin(), props.dayWidth) - paneWidth / 2)));
  // At the old left edge a later origin cannot preserve the earlier moment.
  await changeKeepingTime({ rows: [older, row] });
  pane().scrollLeft = 0;
  await changeKeepingTime({ rows: [shortRow] });
  assert.equal(pane().scrollLeft, 0);
}
await act(async () => { fourthRoot.unmount(); });
await win.happyDOM.close();
console.log("Timeline DOM navigation passed");
