import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyStaleIssue,
  collectConfirmations,
  type LivenessReport,
  livenessReport,
  type OpenIssue,
  planStaleIssue,
  staleIdsFromBody,
  staleIssueBody,
  type StaleIssueAction,
  type StaleIssueClient,
  unconfirmedSources,
  unknownSources,
  type SourceConfirmation,
} from "../src/ingest/liveness.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";
import { STALE_AFTER_MS, type SourceHealth } from "../src/shared/feed.ts";
import { publicationVerdict } from "../scripts/publication-liveness.ts";

const NOW = Date.parse("2026-11-24T18:00:00.000Z");
const HOUR = 3_600_000;
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * HOUR).toISOString();
const source = (sourceId: string, lastConfirmedAt: string | null): SourceConfirmation => ({
  sourceId, lastConfirmedAt, failingSince: null, firstSeenAt: null, lastStatus: 200, consecutiveFailures: 0,
  requestOnRecord: true,
});
const stale = (ids: string[]) => unconfirmedSources(ids.map((id) => source(id, at(100))), NOW);
const unknown = (ids: string[]) => ids.map((id) => source(id, null));
/**
 * A report over `staleIds` (100 h old), `unknownIds` (no record) and, confirmed two
 * hours ago, every other id in `scheduled`. An id in none of them left the schedule.
 */
const report = (
  staleIds: string[],
  unknownIds: string[] = [],
  scheduled: string[] = ["a", "b", "c"],
): LivenessReport => livenessReport([
  ...staleIds.map((id) => source(id, at(100))),
  ...unknown(unknownIds),
  ...scheduled.filter((id) => !staleIds.includes(id) && !unknownIds.includes(id)).map((id) => source(id, at(2))),
], NOW);
const bodyOf = (action: StaleIssueAction) => (action as { body: string }).body;

describe("per-source liveness", () => {
  test("flags only sources past 48h; no record is unknown, not stale", () => {
    const confirmations = [
      source("b-old", at(240)),
      source("a-fresh", at(2)),
      source("c-edge", new Date(NOW - STALE_AFTER_MS).toISOString()),
      source("d-never", null),
      source("e-just-past", new Date(NOW - STALE_AFTER_MS - 1).toISOString()),
    ];
    const flagged = unconfirmedSources(confirmations, NOW);
    expect(flagged.map((s) => s.sourceId)).toEqual(["b-old", "e-just-past"]);
    expect(flagged[0]!.ageMs).toBe(240 * HOUR);
    expect(unknownSources(confirmations).map((s) => s.sourceId)).toEqual(["d-never"]);
  });

  describe("confirmations from the snapshot store", () => {
    let root: string;
    beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "liveness-")); });
    afterEach(async () => { await rm(root, { recursive: true, force: true }); });

    const meta = (sourceId: string, lastConfirmedAt: string | null, contentChangedAt = at(500)) => Bun.write(
      join(root, `${sourceId}.meta.json`),
      JSON.stringify({
        sourceId, url: "https://example.test/", contentHash: "x", bytes: 1, etag: null,
        lastModified: null, contentChangedAt, lastConfirmedAt, eventCount: 1,
      }),
    );
    const state = (sourceId: string, lastConfirmedAt: string | null, consecutiveFailures: number) => Bun.write(
      join(root, `${sourceId}.state.json`),
      JSON.stringify({ sourceId, lastCheckedAt: at(1), lastConfirmedAt, lastStatus: 503, consecutiveFailures }),
    );

    test("a cache miss is unknown, never stale: the committed meta still counts", async () => {
      await meta("cache-miss", at(3));
      const [confirmation] = await collectConfirmations(new SnapshotStore(root), ["cache-miss"], NOW);
      expect(confirmation).toEqual({
        sourceId: "cache-miss", lastConfirmedAt: at(3), failingSince: null, firstSeenAt: null,
        lastStatus: null, consecutiveFailures: null, requestOnRecord: false,
      });
      expect(unconfirmedSources([confirmation!], NOW)).toEqual([]);
    });

    test("takes the newest of meta and state, and the streak from state", async () => {
      await meta("state-newer", at(100));
      await state("state-newer", at(5), 0);
      await meta("meta-newer", at(4));
      await state("meta-newer", at(80), 7);
      await meta("legacy-meta", null, at(6));
      const byId = Object.fromEntries((await collectConfirmations(
        new SnapshotStore(root), ["state-newer", "meta-newer", "legacy-meta"], NOW,
      )).map((c) => [c.sourceId, c]));
      expect(byId["state-newer"]!.lastConfirmedAt).toBe(at(5));
      expect(byId["meta-newer"]!.lastConfirmedAt).toBe(at(4));
      expect(byId["meta-newer"]!.consecutiveFailures).toBe(7);
      // contentChangedAt is itself a confirmed fetch.
      expect(byId["legacy-meta"]!.lastConfirmedAt).toBe(at(6));
    });

    test("an unparseable date is skipped, not compared: valid older dates still count", async () => {
      // Valid JSON, empty lastConfirmedAt. Compared as NaN it used to discard both
      // valid dates, so the source was neither stale nor unknown and the issue closed.
      await meta("blank", "", at(96));
      await state("blank", at(96), 4);
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["blank"], NOW);
      expect(confirmations[0]!.lastConfirmedAt).toBe(at(96));
      const open = { number: 7, body: staleIssueBody(stale(["blank"]), [], NOW - HOUR) };
      expect(planStaleIssue(open, livenessReport(confirmations, NOW), NOW))
        .toMatchObject({ kind: "update", comment: null });
    });

    test("a date from the future is discarded before it can outvote a real one", async () => {
      // A real confirmation four days old in the state; a mistaken one a week ahead
      // in the meta. Chosen as "newest", the future date read as a recovery.
      await meta("future", at(-7 * 24), at(-7 * 24));
      await state("future", at(96), 4);
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["future"], NOW);
      expect(confirmations[0]!.lastConfirmedAt).toBe(at(96));
      const open = { number: 7, body: staleIssueBody(stale(["future"]), [], NOW - HOUR) };
      expect(planStaleIssue(open, livenessReport(confirmations, NOW), NOW))
        .toMatchObject({ kind: "update", comment: null });
    });

    test("with only a future date, the age is unknown and an open alert stays open", async () => {
      await meta("only-future", at(-24), at(-24));
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["only-future"], NOW);
      expect(confirmations[0]!.lastConfirmedAt).toBeNull();
      const report = livenessReport(confirmations, NOW);
      expect(report.confirmed).toEqual([]);
      const open = { number: 7, body: staleIssueBody(stale(["only-future"]), [], NOW - HOUR) };
      const action = planStaleIssue(open, report, NOW);
      expect(action).toMatchObject({ kind: "update", comment: null });
      expect(staleIdsFromBody(bodyOf(action))).toEqual(["only-future"]);
    });

    test("with no valid date at all, the age is unknown and an open alert stays open", async () => {
      await meta("garbled", "not a date", "also not a date");
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["garbled"], NOW);
      expect(confirmations[0]!.lastConfirmedAt).toBeNull();
      const open = { number: 7, body: staleIssueBody(stale(["garbled"]), [], NOW - HOUR) };
      const action = planStaleIssue(open, livenessReport(confirmations, NOW), NOW);
      expect(action).toMatchObject({ kind: "update", comment: null });
      expect(staleIdsFromBody(bodyOf(action))).toEqual(["garbled"]);
    });

    test("a source added minutes ago, with no meta and no cache, does not open the alert", async () => {
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["brand-new"], NOW);
      expect(confirmations).toEqual([{
        sourceId: "brand-new", lastConfirmedAt: null, failingSince: null, firstSeenAt: null,
        lastStatus: null, consecutiveFailures: null, requestOnRecord: false,
      }]);
      expect(planStaleIssue(null, livenessReport(confirmations, NOW), NOW)).toEqual({ kind: "none" });
    });

    test("a new source that has only ever failed reaches the alert after 48 hours", async () => {
      // Seven 503s, twelve hours apart, through the real bookkeeping. It was never
      // confirmed, so only the start of the streak can age it.
      const store = new SnapshotStore(root);
      const start = NOW - 72 * HOUR;
      await store.recordCheck("new-and-failing", { at: new Date(start).toISOString(), status: 503, ok: false });
      const first = await collectConfirmations(store, ["new-and-failing"], start);
      expect(first[0]).toMatchObject({ lastConfirmedAt: null, failingSince: new Date(start).toISOString() });
      expect(planStaleIssue(null, livenessReport(first, start), start)).toEqual({ kind: "none" });

      for (let i = 1; i <= 6; i++) {
        await store.recordCheck("new-and-failing", {
          at: new Date(start + i * 12 * HOUR).toISOString(), status: 503, ok: false,
        });
      }
      const later = await collectConfirmations(store, ["new-and-failing"], NOW);
      expect(later[0]).toMatchObject({
        lastConfirmedAt: null, failingSince: new Date(start).toISOString(), consecutiveFailures: 7,
      });
      const action = planStaleIssue(null, livenessReport(later, NOW), NOW);
      expect(action.kind).toBe("open");
      expect(bodyOf(action)).toContain(
        `| \`new-and-failing\` | never; failing since ${new Date(start).toISOString()} | 3 d 0 h | 503 | 7 |`,
      );

      // One success ends the streak.
      await store.recordCheck("new-and-failing", { at: new Date(NOW).toISOString(), status: 200, ok: true });
      expect((await store.readState("new-and-failing")).failingSince).toBeNull();
    });

    test("a cache miss restarts the streak but recovers nothing; only a confirmation closes", async () => {
      // Seven 503s over 72 hours open the issue.
      const store = new SnapshotStore(root);
      const start = NOW - 72 * HOUR;
      for (let i = 0; i <= 6; i++) {
        await store.recordCheck("never-ok", { at: new Date(start + i * 12 * HOUR).toISOString(), status: 503, ok: false });
      }
      const opened = planStaleIssue(null, livenessReport(await collectConfirmations(store, ["never-ok"], NOW), NOW), NOW);
      expect(opened.kind).toBe("open");
      const issue = { number: 9, body: bodyOf(opened) };

      // Next cycle: the Actions cache missed, and the source failed again. Its new
      // streak is minutes old, so it is not stale, but nothing was confirmed.
      const missRoot = await mkdtemp(join(tmpdir(), "liveness-miss-"));
      try {
        const missed = new SnapshotStore(missRoot);
        const next = NOW + 12 * HOUR;
        await missed.recordCheck("never-ok", { at: new Date(next).toISOString(), status: 503, ok: false });
        const afterMiss = planStaleIssue(issue, livenessReport(await collectConfirmations(missed, ["never-ok"], next), next), next);
        expect(afterMiss).toMatchObject({ kind: "update", number: 9, comment: null });
        expect(staleIdsFromBody(bodyOf(afterMiss))).toEqual(["never-ok"]);

        // A real confirmation is what recovers it.
        const later = next + 12 * HOUR;
        await missed.recordCheck("never-ok", { at: new Date(later).toISOString(), status: 200, ok: true });
        const closed = planStaleIssue(
          { number: 9, body: bodyOf(afterMiss) },
          livenessReport(await collectConfirmations(missed, ["never-ok"], later), later),
          later,
        );
        expect(closed).toMatchObject({ kind: "close", number: 9 });
        expect((closed as { comment: string }).comment).toContain("Recovered with a confirmed fetch: `never-ok`.");
      } finally {
        await rm(missRoot, { recursive: true, force: true });
      }
    });

    test("a corrupt failingSince restarts the streak instead of being carried forever", async () => {
      await Bun.write(join(root, "corrupt.state.json"), JSON.stringify({
        sourceId: "corrupt", lastCheckedAt: at(84), lastConfirmedAt: null, lastStatus: 503,
        consecutiveFailures: 1, failingSince: "", firstSeenAt: "",
      }));
      const store = new SnapshotStore(root);
      const start = NOW - 72 * HOUR;
      for (let i = 0; i <= 6; i++) {
        await store.recordCheck("corrupt", { at: new Date(start + i * 12 * HOUR).toISOString(), status: 503, ok: false });
      }
      const state = await store.readState("corrupt");
      expect(state).toMatchObject({
        consecutiveFailures: 8,
        failingSince: new Date(start).toISOString(),
        firstSeenAt: new Date(start).toISOString(),
      });
      const action = planStaleIssue(null, livenessReport(await collectConfirmations(store, ["corrupt"], NOW), NOW), NOW);
      expect(action.kind).toBe("open");
    });

    test("a future firstSeenAt or failingSince restarts the clock instead of freezing it", async () => {
      // A cached first sighting a week ahead used to survive every write, and was
      // discarded on every read, so the 48-hour count never began.
      await Bun.write(join(root, "ahead.state.json"), JSON.stringify({
        sourceId: "ahead", lastCheckedAt: null, lastConfirmedAt: null, lastStatus: null,
        consecutiveFailures: 0, firstSeenAt: at(-7 * 24),
      }));
      const store = new SnapshotStore(root);
      const start = NOW - 72 * HOUR;
      await store.recordSeen("ahead", new Date(start).toISOString());
      expect((await store.readState("ahead")).firstSeenAt).toBe(new Date(start).toISOString());
      const plan = async (when: number) =>
        planStaleIssue(null, livenessReport(await collectConfirmations(store, ["ahead"], when), when), when);
      expect(await plan(start + 48 * HOUR)).toEqual({ kind: "none" });
      expect((await plan(start + 48 * HOUR + 1)).kind).toBe("open");

      // The same for a failure streak dated in the future.
      await Bun.write(join(root, "streak.state.json"), JSON.stringify({
        sourceId: "streak", lastCheckedAt: at(80), lastConfirmedAt: null, lastStatus: 503,
        consecutiveFailures: 2, failingSince: at(-7 * 24), firstSeenAt: at(-7 * 24),
      }));
      await store.recordCheck("streak", { at: new Date(start).toISOString(), status: 503, ok: false });
      expect(await store.readState("streak")).toMatchObject({
        consecutiveFailures: 3,
        failingSince: new Date(start).toISOString(),
        firstSeenAt: new Date(start).toISOString(),
      });
    });

    test("the table says what the state shows: no request on record, or no HTTP response", async () => {
      // Cache lost, then this cycle's first sighting: the committed meta proves an
      // earlier request, so the row must not claim the source was never asked.
      await meta("cache-lost", at(100), at(100));
      const store = new SnapshotStore(root);
      await store.recordSeen("cache-lost", at(1));
      // Seven attempts that never got an HTTP response.
      for (let i = 0; i <= 6; i++) {
        await store.recordCheck("no-response", { at: at(72 - i * 12), status: null, ok: false });
      }
      const body = bodyOf(planStaleIssue(
        null, livenessReport(await collectConfirmations(store, ["cache-lost", "no-response"], NOW), NOW), NOW,
      ));
      expect(body).toContain(
        `| \`cache-lost\` | ${at(100)} | 4 d 4 h | no request on record | no request on record |`,
      );
      expect(body).toContain(`| \`no-response\` | never; failing since ${at(72)} | 3 d 0 h | no HTTP response | 7 |`);
      expect(body).not.toContain("no request yet");
      expect(body).not.toContain("| unknown |");
    });

    test("every source failing for days, with old confirmations, opens the issue", async () => {
      // The outage the issue exists for: the runner exits 1 on such a cycle, and
      // refresh.yml still runs this step because the cycle completed.
      for (const id of ["a", "b", "c"]) {
        await meta(id, at(60));
        await state(id, at(60), 5);
      }
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["a", "b", "c"], NOW);
      const action = planStaleIssue(null, livenessReport(confirmations, NOW), NOW);
      expect(action.kind).toBe("open");
      expect(staleIdsFromBody(bodyOf(action))).toEqual(["a", "b", "c"]);
      expect(bodyOf(action)).toContain("| `a` | " + at(60) + " | 2 d 12 h | 503 | 5 |");
    });
  });
});

describe("the single stale-source issue", () => {
  test("nothing stale and no issue: nothing to do", () => {
    expect(planStaleIssue(null, report([]), NOW)).toEqual({ kind: "none" });
  });

  test("opens with a body that records which sources are stale", () => {
    const action = planStaleIssue(null, report(["endfield-wikigg-echoes"]), NOW);
    expect(action.kind).toBe("open");
    expect(staleIdsFromBody(bodyOf(action))).toEqual(["endfield-wikigg-echoes"]);
    expect(bodyOf(action)).toContain("| `endfield-wikigg-echoes` | " + at(100) + " | 4 d 4 h | 200 | 0 |");
  });

  test("an unchanged set updates the body silently; a changed set comments", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a", "b"]), [], NOW - HOUR) };
    expect(planStaleIssue(open, report(["a", "b"]), NOW)).toMatchObject({ kind: "update", number: 7, comment: null });
    expect(planStaleIssue(open, report(["b", "c"]), NOW)).toMatchObject({
      kind: "update", number: 7, comment: "Now stale: `c`. Recovered with a confirmed fetch: `a`.",
    });
  });

  test("closes once every source recovers, claiming only what was checked", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a"]), [], NOW) };
    const action = planStaleIssue(open, report([]), NOW);
    expect(action).toMatchObject({ kind: "close", number: 7 });
    const comment = (action as { comment: string }).comment;
    expect(comment).toStartWith("No monitored scheduled source is past 48 hours without a confirmed fetch");
    expect(comment).toContain("Recovered with a confirmed fetch: `a`.");
    expect(comment).not.toContain("Every scheduled source");
  });

  test("a close names sources still unjudged instead of vouching for them", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a"]), [], NOW) };
    const comment = (planStaleIssue(open, report([], ["b"]), NOW) as { comment: string }).comment;
    expect(comment).toContain("Recovered with a confirmed fetch: `a`.");
    expect(comment).toContain("Not confirmed yet, under 48 hours or age unknown: `b`.");
  });

  test("a source taken off the schedule is no longer monitored, not recovered", () => {
    // The `endfield-wikigg-echoes` case: retired while another source stays stale.
    const open = { number: 7, body: staleIssueBody(stale(["a", "retired"]), [], NOW - HOUR) };
    expect(planStaleIssue(open, report(["a"], [], ["a", "b"]), NOW)).toMatchObject({
      kind: "update", comment: "No longer monitored (left the schedule): `retired`.",
    });
    const onlyRetired = { number: 8, body: staleIssueBody(stale(["retired"]), [], NOW - HOUR) };
    const close = planStaleIssue(onlyRetired, report([], [], ["a", "b"]), NOW) as { kind: string; comment: string };
    expect(close.kind).toBe("close");
    expect(close.comment).toContain("No longer monitored (left the schedule): `retired`.");
    expect(close.comment).not.toContain("Recovered");
  });

  test("a listed source whose age became unknown is not declared recovered", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a", "b"]), [], NOW - HOUR) };
    const onlyUnknown = planStaleIssue(open, report([], ["a"]), NOW);
    expect(onlyUnknown).toMatchObject({ kind: "update", number: 7, comment: "Recovered with a confirmed fetch: `b`." });
    expect(staleIdsFromBody(bodyOf(onlyUnknown))).toEqual(["a"]);
    expect(bodyOf(onlyUnknown)).toContain("| `a` | no record in this run | not confirmed since | 200 | 0 |");
    // Still listed, still unknown: silent; and nothing closes on unknown alone.
    const next = { number: 7, body: bodyOf(onlyUnknown) };
    expect(planStaleIssue(next, report([], ["a"]), NOW)).toMatchObject({ kind: "update", comment: null });
    // An unknown source that was never listed is not added.
    expect(planStaleIssue(null, report([], ["z"]), NOW)).toEqual({ kind: "none" });
  });

  test("an open issue without a marker is treated as listing nothing", () => {
    expect(staleIdsFromBody("edited by hand")).toBeNull();
    expect(planStaleIssue({ number: 3, body: "edited by hand" }, report(["a"]), NOW))
      .toMatchObject({ kind: "update", comment: "Now stale: `a`." });
  });

  test("a failed comment leaves the transition unhandled, so the next run comments again", () => {
    // A fake GitHub holding one issue; `comment` can be made to fail.
    const issue: OpenIssue = { number: 7, body: staleIssueBody(stale(["a"]), [], NOW - HOUR) };
    const comments: string[] = [];
    let failComment = true;
    const client: StaleIssueClient = {
      create: () => { throw new Error("not expected"); },
      edit: (_n, body) => { issue.body = body; },
      comment: (_n, body) => {
        if (failComment) throw new Error("GitHub 502");
        comments.push(body);
      },
      close: () => { throw new Error("not expected"); },
    };
    const run = (): StaleIssueAction => planStaleIssue({ ...issue }, report(["a", "b"]), NOW);

    expect(() => applyStaleIssue(run(), client)).toThrow("GitHub 502");
    expect(staleIdsFromBody(issue.body)).toEqual(["a"]);

    failComment = false;
    expect(applyStaleIssue(run(), client)).toBe("updated #7 with a comment");
    expect(comments).toEqual(["Now stale: `b`."]);
    expect(staleIdsFromBody(issue.body)).toEqual(["a", "b"]);
    expect(applyStaleIssue(run(), client)).toBe("updated #7");
    expect(comments).toHaveLength(1);
  });
});

describe("dead-man heartbeat verdict", () => {
  const scheduled = new Set(["genshin-kqm-ginews", "hsr-kqm-hsrnews"]);
  const health = (sourceId: string, lastSuccessAt: string | null) => ({
    sourceId, game: "genshin", url: "https://example.test/", lastSuccessAt,
    lastConfirmedAt: null, contentChangedAt: null, eventCount: 1, parsedCount: 1, statesNoEvents: false,
  }) as SourceHealth;

  test("pings only while a scheduled source is current", () => {
    expect(publicationVerdict([health("genshin-kqm-ginews", at(2))], NOW, scheduled).current).toBe(true);
    expect(publicationVerdict([health("genshin-kqm-ginews", at(31))], NOW, scheduled).current).toBe(false);
  });

  test("a future date is not evidence of life; a really fresh source still is", () => {
    // Confirmation a week ahead, real content change four days ago: the build put the
    // future date into lastSuccessAt, which used to read as current.
    const ahead = {
      ...health("genshin-kqm-ginews", at(-7 * 24)),
      lastConfirmedAt: at(-7 * 24),
      contentChangedAt: at(96),
    } as SourceHealth;
    expect(publicationVerdict([ahead], NOW, scheduled)).toMatchObject({ current: false });
    expect(publicationVerdict([ahead], NOW, scheduled).message).toContain(at(96));
    expect(publicationVerdict([health("genshin-kqm-ginews", at(-1))], NOW, scheduled).current).toBe(false);
    expect(publicationVerdict([ahead, health("hsr-kqm-hsrnews", at(2))], NOW, scheduled).current).toBe(true);
  });

  test("a fresh manual review does not stand in for a stopped schedule", () => {
    const feed = [
      health("genshin-kqm-ginews", at(96)),
      health("hsr-kqm-hsrnews", at(96)),
      health("reviewed-genshin", at(1)),
    ];
    expect(publicationVerdict(feed, NOW, scheduled).current).toBe(false);
  });

  test("no data is not proof of life", () => {
    expect(publicationVerdict([health("genshin-kqm-ginews", null)], NOW, scheduled).current).toBe(false);
    expect(publicationVerdict([health("reviewed-genshin", at(1))], NOW, scheduled).current).toBe(false);
    expect(publicationVerdict([], NOW, scheduled).current).toBe(false);
  });
});

describe("the workflows that carry liveness", () => {
  const read = async (name: string) =>
    (await Bun.file(new URL(`../.github/workflows/${name}`, import.meta.url)).text()).replaceAll("\r\n", "\n");

  test("the ping runs after the Pages deploy, gated on the build's verdict, without checkout", async () => {
    const ci = await read("ci.yml");
    const build = ci.slice(ci.indexOf("\n  build:"), ci.indexOf("\n  pages:"));
    const pages = ci.slice(ci.indexOf("\n  pages:"));
    expect(build).toContain("publication_current: ${{ steps.liveness.outputs.current }}");
    expect(build).toContain("bun scripts/publication-liveness.ts");
    expect(pages).not.toContain("actions/checkout");
    expect(pages).not.toContain("setup-bun");
    const ping = pages.slice(pages.indexOf("Dead-man ping"));
    expect(pages.indexOf("Dead-man ping")).toBeGreaterThan(pages.indexOf("id: deploy_retry"));
    expect(ping).toContain("if: needs.build.outputs.publication_current == 'true'");
    expect(ping).toContain("continue-on-error: true");
    expect(ping).toContain("DEADMAN_PING_URL: ${{ secrets.DEADMAN_PING_URL }}");
  });

  test("the ping step skips cleanly without the secret", async () => {
    const ci = await read("ci.yml");
    const script = ci.slice(ci.indexOf("Dead-man ping")).split("run: |\n")[1]!
      .split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
    const result = Bun.spawnSync(["bash", "-e", "-c", script], {
      env: { ...process.env, DEADMAN_PING_URL: "" }, stdout: "pipe", stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("no heartbeat sent");
  });

  test("the stale-source issue runs after any completed cycle, only on main, and never fails the refresh", async () => {
    const refresh = await read("refresh.yml");
    expect(refresh).toContain("issues: write");
    const step = refresh.slice(refresh.indexOf("- name: Stale-source issue"), refresh.indexOf("Report source health"));
    // Not `outcome == 'success'`: a cycle where every source failed exits 1 and is
    // exactly the outage to report. `attempted` is written only by a completed cycle.
    expect(step).not.toContain("steps.refresh.outcome == 'success'");
    expect(step).toContain("always() && steps.refresh.outputs.attempted != ''");
    expect(step).toContain("github.ref == 'refs/heads/main'");
    expect(step).toContain("inputs.dry_run != true");
    expect(step).toContain("continue-on-error: true");
    expect(step).toContain("bun scripts/stale-source-issue.ts");
  });
});
