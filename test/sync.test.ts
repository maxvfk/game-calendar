import { describe, expect, test } from "bun:test";
import {
  acknowledgeMutation, applyMutation, compareVersions, emptySyncState,
  logicalKey, mergeSyncState, queueMutation, SyncMutation, SyncOutbox,
} from "../src/shared/sync.ts";
import type { SyncMutation as Mutation, SyncState } from "../src/shared/sync.ts";

const stamp = (day: number) => `2026-09-${String(day).padStart(2, "0")}T12:00:00.000Z`;
const make = (row: Record<string, unknown>): Mutation => SyncMutation.parse(row);
const progress = (id: string, day: number, status: "doing" | "done" | null, key = "opaque:occurrence:/x") =>
  make({ kind: "progress", key, changedAt: stamp(day), mutationId: id,
    deleted: status === null, payload: status === null ? null :
      { status, effort: null, daily: null, note: null } });
const daily = (id: string, day: number, completed: boolean) =>
  make({ kind: "daily", key: { subjectId: "dailies:zzz", dayKey: "2026-09-20" },
    changedAt: stamp(day), mutationId: id, completed });
const ignored = (id: string, day: number, value: boolean) =>
  make({ kind: "ignored", key: "event:x", changedAt: stamp(day),
    mutationId: id, ignored: value });
const pref = (id: string, day: number, key: string, value: unknown) =>
  make({ kind: "preference", key, value, unset: false,
    changedAt: stamp(day), mutationId: id });
const game = (id: string, day: number, deleted: boolean) =>
  make({ kind: "customGame", key: "mygame:a", deleted,
    payload: deleted ? null : { id: "mygame:a", name: "A", hue: "#112233", at: stamp(18) },
    changedAt: stamp(day), mutationId: id });
const event = (id: string, day: number, deleted: boolean, title = "A") =>
  make({ kind: "customEvent", key: "myevent:abcdef", deleted,
    payload: deleted ? null : {
      id: "myevent:abcdef", game: "mygame:a", title, type: "other", summary: null,
      startsAt: stamp(18), startPrecision: "exact", endsAt: stamp(29),
      endPrecision: "exact", repeat: null, at: stamp(18), updatedAt: stamp(day),
    }, changedAt: stamp(day), mutationId: id });

function deliver(snapshot: SyncState, changes: Mutation[]): { state: SyncState; outcomes: string[] } {
  let state = snapshot;
  const outcomes: string[] = [];
  for (const change of changes) {
    const result = applyMutation(state, change);
    state = result.state;
    outcomes.push(result.ack.outcome);
  }
  return { state, outcomes };
}

/** Both devices begin from a separately cloned snapshot, edit offline, then pull remote. */
function twoDevices(seed: Mutation[], a: Mutation[], b: Mutation[], delivery: Mutation[]) {
  const initial = deliver(emptySyncState(), seed).state;
  const deviceA = deliver(structuredClone(initial), a).state;
  const deviceB = deliver(structuredClone(initial), b).state;
  const remote = deliver(structuredClone(initial), delivery).state;
  const pulledA = mergeSyncState(deviceA, remote);
  const pulledB = mergeSyncState(deviceB, remote);
  expect(pulledA).toEqual(remote);
  expect(pulledB).toEqual(remote);
  return remote;
}

describe("logical versions and idempotent delivery", () => {
  test("compares instants, then stable mutation ID regardless of arrival order", () => {
    expect(compareVersions({ changedAt: "2026-09-20T14:00:00+02:00", mutationId: "a" },
      { changedAt: stamp(20), mutationId: "z" })).toBe(-1); // equal instant, a < z
    expect(compareVersions({ changedAt: stamp(21), mutationId: "a" },
      { changedAt: stamp(20), mutationId: "z" })).toBe(1);
  });

  test("duplicate replay, acknowledgement, and durable outbox round trip", () => {
    const tick = daily("tick", 20, true);
    const queued = queueMutation(queueMutation([], tick), tick);
    expect(SyncOutbox.parse(JSON.parse(JSON.stringify(queued)))).toEqual([tick]);
    const first = applyMutation(emptySyncState(), tick);
    const replay = applyMutation(first.state, tick);
    expect(replay.state).toBe(first.state);
    expect(replay.ack.outcome).toBe("accepted");
    expect(acknowledgeMutation(queued, replay.ack)).toEqual([]);
    expect(acknowledgeMutation([], replay.ack)).toEqual([]);
    expect(acknowledgeMutation(queued, { mutationId: "other", outcome: "accepted" })).toEqual(queued);
    expect(() => queueMutation(queued, { ...tick, completed: false } as Mutation)).toThrow();
    expect(() => applyMutation(first.state, { ...tick, completed: false } as Mutation)).toThrow();
  });

  test("superseded acknowledgement permits removal; no acknowledgement retains pending", () => {
    const old = daily("old", 19, true), untick = daily("new", 20, false);
    const pending = queueMutation([], old);
    const remote = deliver(emptySyncState(), [untick, old]);
    expect(remote.outcomes).toEqual(["accepted", "superseded"]);
    expect(acknowledgeMutation(pending, { mutationId: "old", outcome: "superseded" })).toEqual([]);
    expect(pending).toHaveLength(1);
  });

  test("rejects malformed negative state and mismatched custom object IDs", () => {
    expect(() => SyncMutation.parse({ ...progress("bad", 20, null), deleted: false })).toThrow();
    expect(() => SyncMutation.parse({ ...game("bad-game", 20, false), key: "mygame:other" })).toThrow();
    expect(() => SyncMutation.parse({ ...event("bad-event", 20, false), deleted: true })).toThrow();
    expect(() => SyncMutation.parse({ ...daily("bad-day", 20, true),
      key: { subjectId: "dailies:zzz", dayKey: "tomorrow" } })).toThrow();
    expect(() => SyncMutation.parse({ ...pref("bad-pref", 20, "theme", "dark"),
      unset: true, value: null })).toThrow();
  });
});

describe("two offline devices converge", () => {
  const cases: { name: string; seed: Mutation[]; a: Mutation[]; b: Mutation[];
    kind: Mutation["kind"]; key: string; winner: Mutation }[] = [
    { name: "doing versus newer done", seed: [], a: [progress("doing", 19, "doing")],
      b: [progress("done", 20, "done")], kind: "progress", key: "opaque:occurrence:/x",
      winner: progress("done", 20, "done") },
    { name: "same progress row note edit", seed: [progress("base", 18, "doing")],
      a: [make({ ...progress("left", 20, "doing"), payload: {
        status: "doing", effort: null, daily: null, note: "A" } })],
      b: [make({ ...progress("right", 21, "done"), payload: {
        status: "done", effort: null, daily: null, note: "B" } })],
      kind: "progress", key: "opaque:occurrence:/x",
      winner: make({ ...progress("right", 21, "done"), payload: {
        status: "done", effort: null, daily: null, note: "B" } }) },
    { name: "clear defeats stale active", seed: [progress("base", 18, "doing")],
      a: [progress("clear", 21, null)], b: [progress("stale", 20, "done")],
      kind: "progress", key: "opaque:occurrence:/x", winner: progress("clear", 21, null) },
    { name: "untick defeats tick", seed: [daily("base", 18, true)],
      a: [daily("untick", 21, false)], b: [daily("stale", 20, true)],
      kind: "daily", key: logicalKey(daily("base", 18, true)), winner: daily("untick", 21, false) },
    { name: "unignore defeats ignore", seed: [ignored("base", 18, true)],
      a: [ignored("unignore", 21, false)], b: [ignored("stale", 20, true)],
      kind: "ignored", key: "event:x", winner: ignored("unignore", 21, false) },
    { name: "custom event edit defeats stale copy", seed: [event("base", 18, false)],
      a: [event("edit", 21, false, "Renamed")], b: [event("stale", 20, false)],
      kind: "customEvent", key: "myevent:abcdef", winner: event("edit", 21, false, "Renamed") },
    { name: "custom event deletion defeats stale copy", seed: [event("base", 18, false)],
      a: [event("delete", 21, true)], b: [event("stale", 20, false)],
      kind: "customEvent", key: "myevent:abcdef", winner: event("delete", 21, true) },
    { name: "custom game deletion defeats stale copy", seed: [game("base", 18, false)],
      a: [game("delete", 21, true)], b: [game("stale", 20, false)],
      kind: "customGame", key: "mygame:a", winner: game("delete", 21, true) },
  ];

  for (const scenario of cases) test(scenario.name, () => {
    const [left] = scenario.a, [right] = scenario.b;
    if (!left || !right) throw new Error("incomplete fixture");
    for (const delivery of [[left, right, left], [right, left, right]]) {
      const final = twoDevices(scenario.seed, scenario.a, scenario.b, delivery);
      expect(final[scenario.kind][scenario.key]).toEqual(scenario.winner);
    }
  });

  test("independent preference keys survive and same-key tie breaks deterministically", () => {
    const theme = pref("theme", 20, "theme", "light");
    const region = pref("region", 20, "region", "europe");
    const dark = pref("a", 21, "theme", "dark");
    const system = pref("z", 21, "theme", "system");
    for (const delivery of [[theme, region, dark, system], [system, dark, region, theme]]) {
      const final = twoDevices([], [theme, dark], [region, system], delivery);
      expect(final.preference.region?.value).toBe("europe");
      expect(final.preference.theme?.value).toBe("system");
    }
    expect(twoDevices([], [pref("order-a", 20, "gameOrder", ["hsr"])],
      [pref("order-z", 20, "gameOrder", ["zzz"])],
      [pref("order-z", 20, "gameOrder", ["zzz"]), pref("order-a", 20, "gameOrder", ["hsr"])]
    ).preference.gameOrder?.value).toEqual(["zzz"]);
  });

  test("resetting optional gameOrder remains absent after stale offline order arrives", () => {
    const previous = pref("previous-order", 18, "gameOrder", ["hsr"]);
    const reset = make({ ...previous, changedAt: stamp(21), mutationId: "reset-order",
      unset: true, value: null });
    const stale = pref("offline-order", 20, "gameOrder", ["zzz"]);
    for (const delivery of [[reset, stale], [stale, reset]]) {
      const final = twoDevices([previous], [reset], [stale], delivery);
      expect(final.preference.gameOrder?.unset).toBe(true);
      expect(final.preference.gameOrder?.mutationId).toBe("reset-order");
    }
  });

  test("distinct daily tuple keys cannot collide despite punctuation in opaque IDs", () => {
    const a = make({ ...daily("a", 20, true), key: { subjectId: "x|y", dayKey: "2026-09-20" } });
    const b = make({ ...daily("b", 20, true), key: { subjectId: "x", dayKey: "2026-09-20" } });
    expect(logicalKey(a)).not.toBe(logicalKey(b));
    expect(Object.keys(deliver(emptySyncState(), [a, b]).state.daily)).toHaveLength(2);
  });

  test("opaque IDs matching Object prototype names remain ordinary rows", () => {
    const proto = progress("proto", 20, "doing", "__proto__");
    const newer = progress("newer", 21, "done", "__proto__");
    const state = deliver(emptySyncState(), [proto, newer, proto]).state;
    expect(Object.hasOwn(state.progress, "__proto__")).toBe(true);
    expect(state.progress["__proto__"]?.mutationId).toBe("newer");
    expect(Object.getPrototypeOf(state.progress)).toBe(Object.prototype);
  });
});
