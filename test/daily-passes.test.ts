import { describe, expect, test } from "bun:test";
import {
  PassOp,
  addDays,
  dayDiff,
  displayablePasses,
  isPassDay,
  isPassGameId,
  passClockBasis,
  passDay,
  passDayStart,
  passKey,
  passView,
  reducePass,
  reducePasses,
  unionPassOps,
  PassOpIdReused,
} from "../src/shared/dailyPasses.ts";
import { GameId } from "../src/shared/schema.ts";
import { RESERVED_ID_SEGMENTS, knownLane } from "../src/shared/custom.ts";
import { cznDayKey } from "../src/shared/cznDaily.ts";
import { dayKey } from "../src/shared/daily.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Day n of 2026: D(1) = 2026-01-01; negative n walks back into 2025. */
const D = (n: number) => addDays("2025-12-31", n);
const at = (n: number, h = 12) => `${D(n)}T${String(h).padStart(2, "0")}:00:00.000Z`;
type Pass = { game?: string; region?: "asia" | "america" | "europe" };
const extend = (n: number, day: number, days = 30, p: Pass = {}) =>
  PassOp.parse({ opId: id(n), game: p.game ?? "genshin", region: p.region ?? "asia", kind: "extend", actionDay: D(day), createdAt: at(day), days });
const set = (n: number, day: number, lastDay: number | null, basedOn: number[] = [], p: Pass = {}) =>
  PassOp.parse({ opId: id(n), game: p.game ?? "genshin", region: p.region ?? "asia", kind: "set", actionDay: D(day), createdAt: at(day),
    lastDay: lastDay === null ? null : D(lastDay), basedOn: basedOn.map(id) });
const undo = (n: number, day: number, target: number, p: Pass = {}) =>
  PassOp.parse({ opId: id(n), game: p.game ?? "genshin", region: p.region ?? "asia", kind: "undo", actionDay: D(day), createdAt: at(day), targetOp: id(target) });
const resolve = (n: number, day: number, target: number, resolution: "include" | "exclude", p: Pass = {}) =>
  PassOp.parse({ opId: id(n), game: p.game ?? "genshin", region: p.region ?? "asia", kind: "resolve", actionDay: D(day), createdAt: at(day), targetOp: id(target), resolution });
const last = (ops: PassOp[], p: Pass = {}) => reducePass(ops, p.game ?? "genshin", p.region ?? "asia").lastDay;

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) { yield items; return; }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) yield [items[i]!, ...p];
  }
}
const snapshot = (ops: PassOp[]) => JSON.stringify([...reducePasses(ops)]);
function expectOrderIndependent(ops: PassOp[]) {
  const expected = snapshot(ops);
  let n = 0;
  for (const p of permutations(ops)) { expect(snapshot(p)).toBe(expected); n++; }
  return { expected, n };
}

describe("invariant 1: distinct ops survive, replays add nothing", () => {
  test("two devices tap +30 offline the same day: +60", () => {
    expect(last([extend(1, 10), extend(2, 10)])).toBe(D(69));
  });
  test("replaying the same op ID (retry after a lost ACK) adds 0", () => {
    const a = extend(1, 10);
    expect(last([a, a, a])).toBe(D(39));
    expect(unionPassOps([a], [a, { ...a }])).toHaveLength(1);
  });
  test("op ID reuse with different content is refused, never last-wins", () => {
    const a = extend(1, 10);
    expect(() => unionPassOps([a], [{ ...a, days: 31 }])).toThrow(PassOpIdReused);
    expect(() => reducePass([a, { ...a, actionDay: D(11) }], "genshin", "asia")).toThrow(PassOpIdReused);
  });
  test("the same instant spelled with another offset is the same op", () => {
    const a = extend(1, 10);
    expect(unionPassOps([a], [{ ...a, createdAt: `${D(10)}T14:00:00+02:00` }])).toHaveLength(1);
  });
});

describe("invariant 2: convergence whatever the arrival order", () => {
  test("PASS-0 counterexample: expired on day 4, offline taps on days 10 and 12 give 69 in every order", () => {
    const ops = [extend(1, -25), extend(2, 10), extend(3, 12)];
    expect(last([ops[0]!])).toBe(D(4));
    for (const p of permutations([...ops, ops[2]!])) expect(last(p)).toBe(D(69));
    // A narrow register would give 69 for arrival A→B and 71 for B→A.
    expect(last([ops[0]!, ops[2]!])).toBe(D(41));
  });

  const scenarios: [string, PassOp[]][] = [
    ["extends, set, undo, resolve and a foreign pass", [extend(1, 2), extend(2, 5), set(3, 6, 20, [1]), resolve(4, 7, 2, "include"), undo(5, 8, 1), extend(6, 9, 30, { region: "america" })]],
    ["two concurrent sets and a later extend", [set(1, 5, 10), set(2, 5, 40), extend(3, 4), extend(4, 6), undo(5, 7, 2), resolve(6, 8, 3, "exclude")]],
    ["undo of a not-yet-arrived op, undo of an undo, cross-pass undo", [undo(1, 3, 2), extend(2, 2), undo(3, 4, 1), extend(4, 1, 30, { game: "hsr" }), undo(5, 5, 4), extend(6, 6)]],
    ["competing resolves and a resolve that is undone", [extend(1, 3), set(2, 5, 9), resolve(3, 6, 1, "include"), resolve(4, 7, 1, "exclude"), undo(5, 8, 4), extend(6, 10, 7)]],
    ["custom game, CZN and same-day ties broken by createdAt/opId", [extend(1, 3, 30, { game: "mygame:demo" }), extend(2, 3, 30, { game: "czn" }), extend(3, 3), extend(4, 3, 5), set(5, 3, 2, [3]), extend(6, 3, 1)]],
  ];
  for (const [name, ops] of scenarios) {
    test(`exhaustive 6-op permutation invariance: ${name}`, () => {
      expect(expectOrderIndependent(ops).n).toBe(720);
    });
  }

  test("seeded random 6-op sets are permutation invariant", () => {
    let seed = 0x5eed;
    const rand = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let round = 0; round < 12; round++) {
      const ops: PassOp[] = [];
      for (let n = 1; n <= 6; n++) {
        const day = rand(20) - 5, region = (["asia", "america"] as const)[rand(2)]!, p = { region };
        const target = 1 + rand(6);
        const kind = rand(5);
        ops.push(
          kind <= 1 ? extend(n, day, 1 + rand(40), p)
          : kind === 2 ? set(n, day, rand(4) === 0 ? null : day + rand(30), [1 + rand(6), 1 + rand(6)].filter((x, i, a) => a.indexOf(x) === i), p)
          : kind === 3 ? undo(n, day, target === n ? (n % 6) + 1 : target, p)
          : resolve(n, day, target === n ? (n % 6) + 1 : target, rand(2) ? "include" : "exclude", p),
        );
      }
      expectOrderIndependent(ops);
    }
  });
});

describe("invariant 4: undo changes only its target", () => {
  test("undo in the middle removes only that extend", () => {
    expect(last([extend(1, 10), extend(2, 12), extend(3, 12)])).toBe(D(99));
    expect(last([extend(1, 10), extend(2, 12), extend(3, 12), undo(4, 13, 2)])).toBe(D(69));
  });
  test("undo of a set falls back to the previous live set", () => {
    const ops = [set(1, 5, 30), set(2, 6, 50, [1])];
    expect(last(ops)).toBe(D(50));
    const s = reducePass([...ops, undo(3, 7, 2)], "genshin", "asia");
    expect(s.lastDay).toBe(D(30));
    expect(s.winningSet).toBe(id(1));
    expect(s.undone).toEqual([id(2)]);
  });
  test("an undo that arrives before its target applies when the target arrives", () => {
    const u = undo(9, 11, 1);
    expect(last([u])).toBeNull();
    expect(last([u, extend(2, 12)])).toBe(D(41));
    expect(last([u, extend(2, 12), extend(1, 10)])).toBe(D(41));
  });
  test("undo of an undo, or of another pass's op, never applies", () => {
    const s = reducePass([extend(1, 10), undo(2, 11, 1), undo(3, 12, 2), extend(4, 10, 30, { region: "europe" }), undo(5, 12, 4)], "genshin", "asia");
    expect(s.lastDay).toBeNull();
    expect(s.ignored).toEqual([id(3), id(5)]);
    expect(last([extend(4, 10, 30, { region: "europe" }), undo(5, 12, 4)], { region: "europe" })).toBe(D(39));
  });
});

describe("invariant 5 / D3: a manual set never silently erases an unseen extension", () => {
  const base = [extend(1, 15), set(2, 20, 25)];
  test("an earlier unseen extend is a conflict, shown and not applied", () => {
    const s = reducePass(base, "genshin", "asia");
    expect(s.lastDay).toBe(D(25));
    expect(s.conflicts).toEqual([id(1)]);
    expect(s.applied).toEqual([]);
  });
  test("resolve(include) applies it, resolve(exclude) dismisses it, undoing the resolve restores the conflict", () => {
    expect(last([...base, resolve(3, 21, 1, "include")])).toBe(D(55));
    const dismissed = reducePass([...base, resolve(3, 21, 1, "exclude")], "genshin", "asia");
    expect(dismissed).toMatchObject({ lastDay: D(25), conflicts: [], dismissed: [id(1)] });
    expect(reducePass([...base, resolve(3, 21, 1, "include"), undo(4, 22, 3)], "genshin", "asia").conflicts).toEqual([id(1)]);
  });
  test("the latest live resolve wins", () => {
    expect(last([...base, resolve(3, 21, 1, "include"), resolve(4, 22, 1, "exclude")])).toBe(D(25));
    expect(last([...base, resolve(3, 22, 1, "include"), resolve(4, 21, 1, "exclude")])).toBe(D(55));
  });
  test("an extend after the set applies on top of it", () => {
    expect(last([set(1, 20, 25), extend(2, 21)])).toBe(D(55));
    expect(last([set(1, 20, null), extend(2, 21)])).toBe(D(50));
  });
  test("a seen extend sorted after the set by clock skew is not counted twice", () => {
    const skewed = extend(1, 21);
    const s = reducePass([skewed, set(2, 20, 50, [1])], "genshin", "asia");
    expect(s.lastDay).toBe(D(50));
    expect(s.applied).toEqual([]);
    expect(s.conflicts).toEqual([]);
  });
  test("two concurrent sets: the later wins and the other is reported", () => {
    const s = reducePass([set(1, 20, 30), set(2, 21, 40)], "genshin", "asia");
    expect(s).toMatchObject({ lastDay: D(40), winningSet: id(2), concurrentSets: [id(1)] });
    expect(reducePass([set(1, 20, 30), set(2, 21, 40, [1])], "genshin", "asia").concurrentSets).toEqual([]);
  });
  test("a resolve aimed at a set is ignored", () => {
    expect(reducePass([set(1, 20, 30), resolve(2, 21, 1, "exclude")], "genshin", "asia").ignored).toEqual([id(2)]);
  });
});

describe("game-day arithmetic and D1 inclusive display", () => {
  test("calendar arithmetic across leap day, month and year ends", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(dayDiff("2028-02-01", "2028-03-01")).toBe(29);
    expect(dayDiff("2026-02-01", "2026-03-01")).toBe(28);
    const leap = PassOp.parse({ opId: id(1), game: "genshin", region: "asia", kind: "extend", actionDay: "2028-02-10", createdAt: "2028-02-10T00:00:00Z", days: 30 });
    expect(reducePass([leap], "genshin", "asia").lastDay).toBe("2028-03-10");
    expect(() => addDays("2026-02-30", 1)).toThrow();
  });
  test("purchase day is day 1; the remaining count includes today; expiry is the next reset", () => {
    const state = reducePass([extend(1, 10)], "genshin", "asia");
    expect(state.lastDay).toBe(D(39));
    // Asia: UTC+8, 04:00 reset → the game-day opens at 20:00 UTC the previous day.
    const opens = (day: number) => Date.parse(`${D(day - 1)}T20:00:00.000Z`);
    expect(passDayStart(D(10), "genshin", "asia")).toBe(opens(10));
    expect(passView(state, opens(10))).toMatchObject({ status: "active", today: D(10), remainingDays: 30 });
    expect(passView(state, opens(40) - 1)).toMatchObject({ status: "active", today: D(39), remainingDays: 1 });
    expect(passView(state, opens(40))).toMatchObject({ status: "expired", today: D(40), remainingDays: 0, expiresAtMs: opens(40) });
    expect(passView({ ...state, lastDay: null }, opens(40))).toEqual({ status: "none", today: D(40) });
  });
  test("expired +30 starts on the current server-day; active +30 continues from expiry", () => {
    expect(last([extend(1, 1), extend(2, 40)])).toBe(D(69));
    expect(last([extend(1, 1), extend(2, 20)])).toBe(D(60));
  });
  test("same instant, different region: Asia vs America days differ", () => {
    const ms = Date.parse("2026-03-01T22:00:00Z");
    expect(passDay(ms, "genshin", "asia")).toBe("2026-03-02");
    expect(passDay(ms, "genshin", "america")).toBe("2026-03-01");
    expect(passDay(Date.parse("2026-03-02T08:59:59.999Z"), "genshin", "america")).toBe("2026-03-01");
    expect(passDay(Date.parse("2026-03-02T09:00:00.000Z"), "genshin", "america")).toBe("2026-03-02");
  });
  test("Endfield europe runs on the Americas server clock", () => {
    const ms = Date.parse("2026-03-02T08:59:59.999Z");
    expect(passDay(ms, "endfield", "europe")).toBe("2026-03-01");
    expect(passDay(ms, "genshin", "europe")).toBe("2026-03-02");
    expect(passDayStart("2026-03-02", "endfield", "europe")).toBe(Date.parse("2026-03-02T09:00:00Z"));
  });
  test("D8: CZN uses the existing 18:00 UTC policy in every region", () => {
    for (const region of ["asia", "america", "europe"] as const) {
      expect(passDay(Date.parse("2026-03-02T17:59:59.999Z"), "czn", region)).toBe("2026-03-01");
      expect(passDay(Date.parse("2026-03-02T18:00:00.000Z"), "czn", region)).toBe("2026-03-02");
      expect(passDayStart("2026-03-02", "czn", region)).toBe(Date.parse("2026-03-02T18:00:00Z"));
    }
    expect(passDay(Date.parse("2026-03-02T18:00:00Z"), "czn", "asia")).toBe(cznDayKey(Date.parse("2026-03-02T18:00:00Z")));
  });
  test("custom games take the regional default (D7) and day keys match the existing dayKey", () => {
    for (const ms of [Date.parse("2026-03-01T19:59:59.999Z"), Date.parse("2026-03-01T20:00:00Z")]) {
      expect(passDay(ms, "mygame:demo", "asia")).toBe(dayKey(ms, "asia"));
      for (const game of GameId.options.filter((g) => g !== "czn")) expect(passDay(ms, game, "europe")).toBe(dayKey(ms, "europe", game));
    }
    expect(passClockBasis("czn", "asia")).toBe("czn-utc18");
    expect(passClockBasis("endfield", "europe")).toBe("game-override");
    expect(passClockBasis("endfield", "asia")).toBe("regional-default");
    expect(passClockBasis("nte", "asia")).toBe("regional-default");
    expect(passClockBasis("mygame:demo", "asia")).toBe("regional-default");
  });
});

describe("wire validation mirrors the SQL candidate", () => {
  const ok = { opId: id(1), game: "genshin", region: "asia", kind: "extend", actionDay: "2026-03-01", createdAt: "2026-03-01T10:00:00.123+08:00", days: 30 };
  test("game IDs are validated by format; reserved and malformed ones are refused", () => {
    for (const g of [...GameId.options, "futuregame2", "mygame:my-game", "mygame:a"]) expect(isPassGameId(g)).toBe(true);
    for (const g of [...RESERVED_ID_SEGMENTS, "Genshin", "genshin:x", "9game", "", "mygame:", "mygame:Bad", "myevent:abc123", "mygame:" + "a".repeat(61), "a".repeat(33)])
      expect(isPassGameId(g)).toBe(false);
  });
  test("days, dates, instants and IDs", () => {
    expect(PassOp.parse(ok)).toEqual(ok as never);
    for (const patch of [{ days: 0 }, { days: 181 }, { days: 1.5 }, { days: "30" }, { actionDay: "2026-02-30" }, { actionDay: "0000-01-01" },
      { actionDay: "2026-3-1" }, { createdAt: "2026-03-01T10:00:00Z".replace("Z", "") }, { createdAt: "2026-03-01T10:00:00.1234Z" },
      { createdAt: "2026-03-01T24:00:00Z" }, { createdAt: "2026-02-30T10:00:00Z" }, { opId: "AAAAAAAA-0000-4000-8000-000000000001" }, { opId: "not-a-uuid" }, { region: "sea" }, { extra: 1 }])
      expect(PassOp.safeParse({ ...ok, ...patch }).success).toBe(false);
    expect(isPassDay("2028-02-29")).toBe(true);
    expect(isPassDay("2026-02-29")).toBe(false);
  });
  test("per-kind shapes: missing target, self-target, oversized or duplicate basedOn, stray fields", () => {
    const { days: _days, ...common } = ok;
    expect(PassOp.safeParse({ ...common, kind: "undo" }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "undo", targetOp: id(1) }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "undo", targetOp: id(2), days: 30 }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "resolve", targetOp: id(2) }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "resolve", targetOp: id(2), resolution: "maybe" }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "set", lastDay: null }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "set", lastDay: null, basedOn: [id(2), id(2)] }).success).toBe(false);
    expect(PassOp.safeParse({ ...common, kind: "set", lastDay: null, basedOn: Array.from({ length: 501 }, (_, i) => id(i + 10)) }).success).toBe(false);
    const sorted = PassOp.parse({ ...common, kind: "set", lastDay: "2026-03-30", basedOn: Array.from({ length: 500 }, (_, i) => id(600 - i)) });
    expect(sorted.kind === "set" && sorted.basedOn[0]).toBe(id(101));
  });
});

describe("D7: deleted custom games are hidden, never deleted", () => {
  test("ops stay in the reducer input; the same ID returning restores the same state", () => {
    const ops = [extend(1, 10, 30, { game: "mygame:demo" }), extend(2, 10)];
    const states = reducePasses(ops);
    const shown = (games: Record<string, never>) => displayablePasses(states, (g) => knownLane(g, games)).map((s) => s.game);
    expect(shown({})).toEqual(["genshin"]);
    expect(states.get(passKey("mygame:demo", "asia"))!.lastDay).toBe(D(39));
    const again = reducePasses(ops);
    expect(displayablePasses(again, (g) => knownLane(g, { "mygame:demo": {} as never })).map((s) => s.lastDay)).toEqual([D(39), D(39)]);
  });
});
