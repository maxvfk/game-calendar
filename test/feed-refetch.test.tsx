import { afterAll, beforeAll, expect, setSystemTime, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { FeedState } from "../src/client/api.ts";
import { failedFeedState, nextFeedState, useFeed } from "../src/client/state/useFeed.ts";
import type { EventFeed } from "../src/shared/feed.ts";

/**
 * Keeping an open page's feed current.
 *
 * On 2026-11-15 a phone tab opened on Nov 10 was restored from memory without a
 * reload and still showed that feed; the page-wide notice said updates had
 * stopped although the server had published that morning. These pin when the
 * page asks again, and that an older or failed answer never replaces what is
 * already shown.
 */

const feed = (generatedAt: string) => ({ generatedAt, events: [], sources: [], dateConflicts: [] }) as unknown as EventFeed;
const NOV10 = feed("2026-11-10T13:38:00.000Z");
const NOV15 = feed("2026-11-15T12:52:11.400Z");
const MIN = 60 * 1000;

test("a newer feed replaces the shown one; an equal or older copy never does", () => {
  const shown: FeedState = { status: "ready", feed: NOV15 };
  expect(nextFeedState({ status: "loading" }, NOV10)).toEqual({ status: "ready", feed: NOV10 });
  expect(nextFeedState({ status: "error", message: "x" }, NOV10)).toEqual({ status: "ready", feed: NOV10 });
  expect(nextFeedState({ status: "ready", feed: NOV10 }, NOV15)).toEqual(shown);
  expect(nextFeedState(shown, NOV10)).toBe(shown); // cached fallback older than the screen
  expect(nextFeedState(shown, feed(NOV15.generatedAt))).toBe(shown); // same object: no re-render
});

test("a failed refresh keeps a shown feed; it only errors before anything is shown", () => {
  const shown: FeedState = { status: "ready", feed: NOV10 };
  expect(failedFeedState(shown, new Error("offline"))).toBe(shown);
  expect(failedFeedState({ status: "loading" }, new Error("Feed request failed (503)."))).toEqual({
    status: "error", message: "Feed request failed (503).",
  });
});

// ---- the hook in a DOM ----------------------------------------------------

const keys = ["window", "document", "navigator", "HTMLElement", "Event", "IS_REACT_ACT_ENVIRONMENT"] as const;
const saved = new Map(keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
let win: Window;

beforeAll(() => {
  win = new Window({ url: "http://localhost/" });
  for (const key of keys) {
    Object.defineProperty(globalThis, key, {
      configurable: true, writable: true,
      value: key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "window" ? win : (win as never)[key],
    });
  }
});

afterAll(async () => {
  setSystemTime();
  await win.happyDOM.close();
  for (const key of keys) {
    const value = saved.get(key);
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(win.document, "visibilityState", { configurable: true, get: () => state });
}

async function mount(load: (signal: AbortSignal) => Promise<EventFeed>, minIntervalMs: number, pollMs: number) {
  const { createRoot } = await import("react-dom/client");
  const host = win.document.createElement("div");
  win.document.body.append(host);
  const root: Root = createRoot(host as unknown as HTMLElement);
  const seen: FeedState[] = [];
  function Probe() {
    const state = useFeed(load, minIntervalMs, pollMs);
    seen.push(state);
    return <p>{state.status === "ready" ? state.feed.generatedAt : state.status}</p>;
  }
  await act(async () => { root.render(<Probe />); });
  return { host, root, seen, text: () => host.textContent };
}

const fire = async (target: { dispatchEvent(event: never): unknown }, type: string, init: Record<string, unknown> = {}) => {
  const event = new win.Event(type);
  for (const [k, v] of Object.entries(init)) Object.defineProperty(event, k, { value: v });
  await act(async () => { target.dispatchEvent(event as never); await Promise.resolve(); });
};

test("returning to the page refetches after the throttle, not before", async () => {
  setSystemTime(new Date("2026-11-10T14:00:00.000Z"));
  setVisibility("visible");
  const answers = [NOV10, NOV15];
  let calls = 0;
  const load = async () => answers[Math.min(calls++, answers.length - 1)]!;
  const page = await mount(load, 10 * MIN, 60 * 60 * MIN);
  try {
    expect(calls).toBe(1);
    expect(page.text()).toBe(NOV10.generatedAt);

    // Switching apps and back within the throttle does not ask again.
    setSystemTime(new Date("2026-11-10T14:05:00.000Z"));
    await fire(win.document, "visibilitychange");
    expect(calls).toBe(1);

    // Hidden pages are left alone even after the throttle.
    setSystemTime(new Date("2026-11-15T15:10:00.000Z"));
    setVisibility("hidden");
    await fire(win.document, "visibilitychange");
    expect(calls).toBe(1);

    // The tab comes back five days later: it asks and shows the new feed.
    setVisibility("visible");
    await fire(win.document, "visibilitychange");
    expect(calls).toBe(2);
    expect(page.text()).toBe(NOV15.generatedAt);
  } finally {
    await act(async () => page.root.unmount());
  }
});

test("a back/forward-cache restore refetches; an ordinary pageshow does not", async () => {
  setSystemTime(new Date("2026-11-10T14:00:00.000Z"));
  setVisibility("visible");
  let calls = 0;
  const page = await mount(async () => (calls++ === 0 ? NOV10 : NOV15), 10 * MIN, 60 * 60 * MIN);
  try {
    setSystemTime(new Date("2026-11-15T15:10:00.000Z"));
    await fire(win, "pageshow", { persisted: false });
    expect(calls).toBe(1);
    await fire(win, "pageshow", { persisted: true });
    expect(calls).toBe(2);
    expect(page.text()).toBe(NOV15.generatedAt);
  } finally {
    await act(async () => page.root.unmount());
  }
});

test("an older cached answer or a failure keeps the newer feed on screen", async () => {
  setSystemTime(new Date("2026-11-15T13:00:00.000Z"));
  setVisibility("visible");
  const answers: Array<EventFeed | Error> = [NOV15, NOV10, new Error("Feed request timed out.")];
  let calls = 0;
  const load = async () => { const a = answers[calls++]!; if (a instanceof Error) throw a; return a; };
  const page = await mount(load, 0, 60 * 60 * MIN);
  try {
    await fire(win.document, "visibilitychange");
    expect(calls).toBe(2);
    expect(page.text()).toBe(NOV15.generatedAt);
    await fire(win.document, "visibilitychange");
    expect(calls).toBe(3);
    expect(page.text()).toBe(NOV15.generatedAt);
  } finally {
    await act(async () => page.root.unmount());
  }
});

test("a first load that failed recovers when the connection returns, without waiting for the throttle", async () => {
  setSystemTime(new Date("2026-11-15T13:00:00.000Z"));
  setVisibility("visible");
  let calls = 0;
  const load = async () => { if (calls++ === 0) throw new Error("Feed request failed (503)."); return NOV15; };
  const page = await mount(load, 10 * MIN, 60 * 60 * MIN);
  try {
    expect(page.text()).toBe("error");
    await fire(win, "online");
    expect(calls).toBe(2);
    expect(page.text()).toBe(NOV15.generatedAt);
  } finally {
    await act(async () => page.root.unmount());
  }
});

test("a page that stays visible polls; unmounting stops every trigger", async () => {
  setSystemTime(); // real timers drive the poll
  setVisibility("visible");
  let calls = 0;
  const page = await mount(async () => { calls++; return NOV15; }, 0, 20);
  await act(async () => { await new Promise((r) => setTimeout(r, 75)); });
  expect(calls).toBeGreaterThanOrEqual(2);
  await act(async () => page.root.unmount());
  const after = calls;
  await new Promise((r) => setTimeout(r, 60));
  await fire(win.document, "visibilitychange");
  await fire(win, "online");
  expect(calls).toBe(after);
});
