import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  bootstrapLocalProfile, KEYS, PROFILE_KEYS, profileKeys, readJson,
} from "../src/client/state/storage.ts";
import { usePrefs } from "../src/client/state/usePrefs.ts";
import { useProgress } from "../src/client/state/useProgress.ts";
import { useDailyLog } from "../src/client/state/useDailyLog.ts";
import { useMarkSet } from "../src/client/state/useMarkSet.ts";
import { useCustom } from "../src/client/state/useCustom.ts";
import { buildExportData, parseImportData } from "../src/client/state/export.ts";

class MemoryStorage {
  readonly items = new Map<string, string>();
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

function fixture() {
  const store = new MemoryStorage();
  store.setItem(KEYS.completions, JSON.stringify({ "event:old": { at: "2026-09-20T12:00:00Z" } }));
  store.setItem(KEYS.daily, JSON.stringify({ "dailies:zzz": { days: ["2026-09-20"], at: "2026-09-20T12:00:00Z" } }));
  store.setItem(KEYS.ignored, JSON.stringify({ "event:hidden": { at: "2026-09-20T12:00:00Z" } }));
  store.setItem(KEYS.prefs, JSON.stringify({ theme: "light", knownGames: ["zzz"] }));
  store.setItem(KEYS.customGames, JSON.stringify({ "mygame:a": { id: "mygame:a", name: "A", hue: "#112233", at: "2026-09-20T12:00:00Z" } }));
  store.setItem(KEYS.customEvents, "{}");
  return store;
}

describe("S2 local profile bootstrap", () => {
  test("migrates every v1 store, seeds completions once, and leaves all legacy keys intact", () => {
    const store = fixture();
    const originals = new Map(store.items);
    const first = bootstrapLocalProfile(store);
    expect(first.profileId).toMatch(/^local:/);
    expect(store.getItem(PROFILE_KEYS.activeProfile)).toBe(first.profileId);
    expect(JSON.parse(store.getItem(PROFILE_KEYS.profiles)!)).toEqual({
      schemaVersion: 2, guestProfileId: first.profileId, legacyMigrated: true,
    });
    expect(JSON.parse(store.getItem(first.keys.progress)!)).toEqual({
      "event:old": { status: "done", at: "2026-09-20T12:00:00Z" },
    });
    for (const key of ["daily", "ignored", "prefs", "customGames", "customEvents"] as const) {
      expect(store.getItem(first.keys[key])).toBe(originals.get(KEYS[key]) ?? null);
    }
    for (const [key, value] of originals) expect(store.getItem(key)).toBe(value);

    // An intentional clear must remain empty even though v1 completions survive.
    store.setItem(first.keys.progress, "{}");
    store.setItem(first.keys.prefs, JSON.stringify({ theme: "dark" }));
    const again = bootstrapLocalProfile(store);
    expect(again).toEqual(first);
    expect(store.getItem(first.keys.progress)).toBe("{}");
    expect(JSON.parse(store.getItem(first.keys.prefs)!).theme).toBe("dark");
  });

  test("keeps nonempty v1 progress instead of superseded completions", () => {
    const store = fixture();
    const newer = { "event:new": { status: "doing", at: "2026-09-21T12:00:00Z" } };
    store.setItem(KEYS.progress, JSON.stringify(newer));
    const { keys } = bootstrapLocalProfile(store);
    expect(JSON.parse(store.getItem(keys.progress)!)).toEqual(newer);
  });

  test("retries a partial migration without replacing a newer scoped value", () => {
    const store = fixture();
    // Fail at the real guest key after it is created.
    const originalSet = store.setItem.bind(store);
    store.setItem = (key, value) => {
      if (key.endsWith(":daily") && key.includes(":v2:profile:")) throw new Error("quota");
      originalSet(key, value);
    };
    const first = bootstrapLocalProfile(store);
    expect(JSON.parse(store.getItem(PROFILE_KEYS.profiles)!).legacyMigrated).toBe(false);
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: store });
    try {
      expect(readJson(first.keys.daily, {})).toEqual(JSON.parse(store.getItem(KEYS.daily)!));
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
    store.setItem = originalSet;
    store.setItem(first.keys.progress, JSON.stringify({ "event:new": { status: "done", at: "2026-09-22T12:00:00Z" } }));
    bootstrapLocalProfile(store);
    expect(JSON.parse(store.getItem(PROFILE_KEYS.profiles)!).legacyMigrated).toBe(true);
    expect(JSON.parse(store.getItem(first.keys.progress)!)).toHaveProperty("event:new");
    expect(store.getItem(first.keys.daily)).toBe(store.getItem(KEYS.daily));
  });

  test("forces guest active on signed-out boot while leaving another profile cache inert", () => {
    const store = fixture();
    const guest = bootstrapLocalProfile(store);
    const accountId = "01234567-89ab-cdef-0123-456789abcdef";
    store.setItem(profileKeys(accountId).progress, JSON.stringify({ secret: { status: "done" } }));
    store.setItem(PROFILE_KEYS.activeProfile, accountId);
    const next = bootstrapLocalProfile(store);
    expect(next.profileId).toBe(guest.profileId);
    expect(next.keys.progress).not.toBe(profileKeys(accountId).progress);
    expect(store.getItem(PROFILE_KEYS.activeProfile)).toBe(guest.profileId);
    expect(store.getItem(profileKeys(accountId).progress)).toContain("secret");
  });

  test("recovers the same guest from an incomplete registry", () => {
    const store = fixture();
    const guest = bootstrapLocalProfile(store);
    store.setItem(guest.keys.progress, JSON.stringify({ "event:new": { status: "done" } }));
    store.setItem(PROFILE_KEYS.profiles, JSON.stringify({
      schemaVersion: 2, guestProfileId: guest.profileId,
    }));
    expect(bootstrapLocalProfile(store).profileId).toBe(guest.profileId);
    expect(store.getItem(guest.keys.progress)).toContain("event:new");
  });
});

function Snapshot({ keys }: { keys: ReturnType<typeof profileKeys> }) {
  const prefs = usePrefs(keys.prefs).prefs;
  const progress = useProgress(keys.progress).progress;
  const daily = useDailyLog(keys.daily).logs;
  const ignored = useMarkSet(keys.ignored).marks;
  const custom = useCustom(Date.parse("2026-09-25T12:00:00Z"), keys);
  const backup = buildExportData(progress, daily, ignored, { games: custom.games, events: custom.events }, prefs);
  return createElement("pre", null, JSON.stringify(backup));
}

test("all user hooks and export/import read only the selected profile", () => {
  const store = new MemoryStorage();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: store });
  try {
    const a = profileKeys("local:one");
    const b = profileKeys("local:two");
    store.setItem(a.progress, JSON.stringify({ "event:a": { status: "done", at: "2026-09-20T12:00:00Z" } }));
    store.setItem(b.progress, JSON.stringify({ "event:b": { status: "doing", at: "2026-09-21T12:00:00Z" } }));
    store.setItem(a.prefs, JSON.stringify({ theme: "light" }));
    store.setItem(b.prefs, JSON.stringify({ theme: "dark" }));
    const snapshot = (keys: typeof a) => parseImportData(JSON.parse(
      renderToStaticMarkup(createElement(Snapshot, { keys })).replace(/^<pre>|<\/pre>$/g, "").replace(/&quot;/g, '"'),
    ));
    expect(snapshot(a)?.progress).toHaveProperty("event:a");
    expect(snapshot(a)?.progress).not.toHaveProperty("event:b");
    expect((snapshot(a)?.prefs as { theme: string }).theme).toBe("light");
    expect(snapshot(b)?.progress).toHaveProperty("event:b");
    expect(snapshot(b)?.progress).not.toHaveProperty("event:a");
    expect((snapshot(b)?.prefs as { theme: string }).theme).toBe("dark");
    expect(readJson(a.progress, {})).toHaveProperty("event:a");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("pre-paint uses guest scoped prefs and v1 only on first upgrade", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(script).toBeDefined();
  const paint = (store: MemoryStorage) => {
    const doc = { documentElement: { dataset: {} as Record<string, string> },
      querySelector: () => ({ setAttribute: () => {} }) };
    Function("localStorage", "window", "document", script!)(store,
      { matchMedia: () => ({ matches: false }) }, doc);
    return doc.documentElement.dataset.theme;
  };
  const store = fixture();
  expect(paint(store)).toBe("light");
  const guest = bootstrapLocalProfile(store);
  store.setItem(guest.keys.prefs, JSON.stringify({ theme: "dark" }));
  expect(paint(store)).toBeUndefined();
  store.setItem(guest.keys.prefs, JSON.stringify({ theme: "light" }));
  expect(paint(store)).toBe("light");
  // A remote profile might have been active before an expired/missing or
  // different-account session. No remote theme may be painted before Auth.
  const remote = "01234567-89ab-cdef-0123-456789abcdef";
  store.setItem(PROFILE_KEYS.activeProfile, remote);
  store.setItem(profileKeys(remote).prefs, JSON.stringify({ theme: "dark" }));
  store.setItem("sb-vzzudezdigjwbwfejlsg-auth-token", "expired-or-other-user-session");
  expect(paint(store)).toBe("light");
  store.setItem(guest.keys.prefs, JSON.stringify({ theme: "dark" }));
  store.setItem(profileKeys(remote).prefs, JSON.stringify({ theme: "light" }));
  expect(paint(store)).toBeUndefined();
});
