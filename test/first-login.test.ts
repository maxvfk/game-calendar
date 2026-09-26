import { describe, expect, test } from "bun:test";
import { applyMutation, emptySyncState, type SyncState } from "../src/shared/sync.ts";
import { bootstrapLocalProfile, profileKeys } from "../src/client/state/storage.ts";
import {
  guestMutations, pendingPlan, readAccountBinding, savePlan, writeAccountCache,
} from "../src/client/account/firstLogin.ts";
import {
  decodeCloudRow, hasCloudData, hasGuestData, materializeCloud, personalCounts, readPersonalState,
  type PersonalState,
} from "../src/client/account/remote.ts";
import { defaults } from "../src/client/state/usePrefs.ts";
import { callbackUrl } from "../src/client/account/AuthRoot.tsx";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const profileId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const earlier = "2026-09-20T12:00:00.000Z";
const later = "2026-09-21T12:00:00.000Z";
const uid = (n: number) => `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, "0")}`;
function guest(): PersonalState {
  return { progress: { "opaque:event#1": { status: "done", note: "Keep", at: earlier } },
    daily: { "dailies:zzz": { days: ["2026-09-19", "2026-09-20"], at: earlier } },
    ignored: { "opaque:ignored": { at: earlier } },
    prefs: { ...defaults(), onboarded: true, theme: "light" },
    customGames: {}, customEvents: {} };
}

function withRows(...rows: Parameters<typeof applyMutation>[1][]): SyncState {
  return rows.reduce((state, row) => applyMutation(state, row).state, emptySyncState());
}

describe("S4 explicit first login", () => {
  test("OAuth returns to the existing Pages base path, never a missing callback route", () => {
    expect(callbackUrl("https://maxvfk.github.io/game-calendar/")).toBe(
      "https://maxvfk.github.io/game-calendar/");
    expect(callbackUrl("http://localhost:3000/")).toBe("http://localhost:3000/");
  });
  test("guest choices and settings do not mutate cloud before confirmation", () => {
    const local = guest();
    const cloud = withRows({ kind: "progress", key: "opaque:event#1", deleted: true,
      payload: null, changedAt: later, mutationId: uid(1) },
    { kind: "daily", key: { subjectId: "dailies:zzz", dayKey: "2026-09-20" },
      completed: false, changedAt: later, mutationId: uid(2) },
    { kind: "ignored", key: "opaque:ignored", ignored: false,
      changedAt: later, mutationId: uid(3) },
    { kind: "preference", key: "theme", value: "dark", unset: false,
      changedAt: later, mutationId: uid(4) });
    expect(hasGuestData(local)).toBe(true);
    expect(hasCloudData(cloud)).toBe(true);
    expect(personalCounts(local).daily).toBe(2);
    const imported = guestMutations(local, "cloud", cloud, later);
    expect(imported.filter((row) => row.kind === "preference" && row.key === "theme")).toHaveLength(0);
    expect(imported.filter((row) => row.kind === "daily")).toHaveLength(2);
    let combined = cloud;
    for (const row of imported) combined = applyMutation(combined, row).state;
    const state = materializeCloud(combined);
    expect(state.progress["opaque:event#1"]).toBeUndefined();
    expect(state.daily["dailies:zzz"]?.days).toEqual(["2026-09-19"]);
    expect(state.ignored["opaque:ignored"]).toBeUndefined();
    expect(state.prefs.theme).toBe("dark");
    const override = guestMutations(local, "local", cloud, "2026-09-22T12:00:00.000Z");
    expect(override.some((row) => row.kind === "preference" && row.key === "theme" &&
      row.value === "light")).toBe(true);
    expect(cloud.progress["opaque:event#1"]?.deleted).toBe(true);
  });

  test("persisted plan retries exact IDs and owner/profile binding gates cache", () => {
    const store = new MemoryStorage();
    const local = bootstrapLocalProfile(store);
    const rows = guestMutations(guest(), "local", emptySyncState(), later);
    savePlan(store, profileId, ownerId, local.profileId, rows);
    expect(pendingPlan(store, profileId, ownerId, local.profileId)).toEqual(rows);
    expect(() => pendingPlan(store, profileId, uid(8), local.profileId)).toThrow();
    expect(readAccountBinding(store, profileId, ownerId)).toBe(false);
    writeAccountCache(store, profileId, ownerId, guest());
    expect(readAccountBinding(store, profileId, ownerId)).toBe(true);
    expect(readAccountBinding(store, profileId, uid(8))).toBe(false);
    expect(readPersonalState(profileKeys(profileId), store).progress["opaque:event#1"]?.note)
      .toBe("Keep");
    expect(store.getItem(profileKeys(profileId).syncMeta)).toContain("baseline");
  });

  test("cloud-only materialization retains preference resets and custom tombstones", () => {
    const state = withRows({ kind: "preference", key: "focusGame", value: null,
      unset: false, changedAt: earlier, mutationId: uid(5) },
    { kind: "preference", key: "gameOrder", value: null,
      unset: true, changedAt: earlier, mutationId: uid(6) },
    { kind: "customGame", key: "mygame:old", payload: null, deleted: true,
      changedAt: earlier, mutationId: uid(7) });
    const output = materializeCloud(state);
    expect(output.prefs.focusGame).toBeNull();
    expect(output.prefs.gameOrder).toBeUndefined();
    expect(output.customGames).toEqual({});
  });

  test("cloud rows are validated before entering the account cache", () => {
    const base = { key: "theme", changed_at: earlier, mutation_id: uid(8), unset: false };
    expect(() => decodeCloudRow("preferences", { ...base, value: 123 })).toThrow();
    expect(decodeCloudRow("preferences", { ...base, value: "light" })).toMatchObject({
      kind: "preference", key: "theme", value: "light", changedAt: earlier,
    });
    expect(() => decodeCloudRow("preferences", { ...base,
      changed_at: "infinity", value: "light" })).toThrow();
  });

  test("opaque event IDs cannot change a local map's prototype", () => {
    const state = withRows({ kind: "progress", key: "__proto__", deleted: false,
      payload: { status: "done", effort: null, daily: null, note: null },
      changedAt: earlier, mutationId: uid(9) });
    const output = materializeCloud(state);
    expect(Object.hasOwn(output.progress, "__proto__")).toBe(true);
    expect(output.progress["__proto__"]?.status).toBe("done");
    expect(Object.prototype).not.toHaveProperty("status");
  });
});
