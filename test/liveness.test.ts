import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyStaleIssue,
  collectConfirmations,
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
  sourceId, lastConfirmedAt, lastStatus: 200, consecutiveFailures: 0,
});
const stale = (ids: string[]) => unconfirmedSources(ids.map((id) => source(id, at(100))), NOW);
const unknown = (ids: string[]) => ids.map((id) => source(id, null));

describe("per-source liveness", () => {
  test("flags only confirmed sources past 48h; no record is unknown, not stale", () => {
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
      const [confirmation] = await collectConfirmations(new SnapshotStore(root), ["cache-miss"]);
      expect(confirmation).toEqual({
        sourceId: "cache-miss", lastConfirmedAt: at(3), lastStatus: null, consecutiveFailures: null,
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
        new SnapshotStore(root), ["state-newer", "meta-newer", "legacy-meta"],
      )).map((c) => [c.sourceId, c]));
      expect(byId["state-newer"]!.lastConfirmedAt).toBe(at(5));
      expect(byId["meta-newer"]!.lastConfirmedAt).toBe(at(4));
      expect(byId["meta-newer"]!.consecutiveFailures).toBe(7);
      // contentChangedAt is itself a confirmed fetch.
      expect(byId["legacy-meta"]!.lastConfirmedAt).toBe(at(6));
    });

    test("a source added minutes ago, with no meta and no cache, does not open the alert", async () => {
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["brand-new"]);
      expect(confirmations).toEqual([
        { sourceId: "brand-new", lastConfirmedAt: null, lastStatus: null, consecutiveFailures: null },
      ]);
      expect(planStaleIssue(
        null, unconfirmedSources(confirmations, NOW), unknownSources(confirmations), NOW,
      )).toEqual({ kind: "none" });
    });

    test("every source failing for days, with old confirmations, opens the issue", async () => {
      // The outage the issue exists for: the runner exits 1 on such a cycle, and
      // refresh.yml still runs this step because the cycle completed.
      for (const id of ["a", "b", "c"]) {
        await meta(id, at(60));
        await state(id, at(60), 5);
      }
      const confirmations = await collectConfirmations(new SnapshotStore(root), ["a", "b", "c"]);
      const action = planStaleIssue(null, unconfirmedSources(confirmations, NOW), unknownSources(confirmations), NOW);
      expect(action.kind).toBe("open");
      expect(staleIdsFromBody((action as { body: string }).body)).toEqual(["a", "b", "c"]);
      expect((action as { body: string }).body).toContain("| `a` | " + at(60) + " | 2 d 12 h | 503 | 5 |");
    });
  });
});

describe("the single stale-source issue", () => {
  test("nothing stale and no issue: nothing to do", () => {
    expect(planStaleIssue(null, [], [], NOW)).toEqual({ kind: "none" });
  });

  test("opens with a body that records which sources are stale", () => {
    const action = planStaleIssue(null, stale(["endfield-wikigg-echoes"]), [], NOW);
    expect(action.kind).toBe("open");
    const body = (action as { body: string }).body;
    expect(staleIdsFromBody(body)).toEqual(["endfield-wikigg-echoes"]);
    expect(body).toContain("| `endfield-wikigg-echoes` | " + at(100) + " | 4 d 4 h | 200 | 0 |");
  });

  test("an unchanged set updates the body silently; a changed set comments", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a", "b"]), [], NOW - HOUR) };
    expect(planStaleIssue(open, stale(["a", "b"]), [], NOW)).toMatchObject({ kind: "update", number: 7, comment: null });
    expect(planStaleIssue(open, stale(["b", "c"]), [], NOW)).toMatchObject({
      kind: "update", number: 7, comment: "Now stale: `c`. Recovered: `a`.",
    });
  });

  test("closes once every source recovers", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a"]), [], NOW) };
    expect(planStaleIssue(open, [], [], NOW)).toMatchObject({ kind: "close", number: 7 });
  });

  test("a listed source whose age became unknown is not declared recovered", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a", "b"]), [], NOW - HOUR) };
    const onlyUnknown = planStaleIssue(open, [], unknown(["a"]), NOW);
    expect(onlyUnknown).toMatchObject({ kind: "update", number: 7, comment: "Recovered: `b`." });
    expect(staleIdsFromBody((onlyUnknown as { body: string }).body)).toEqual(["a"]);
    expect((onlyUnknown as { body: string }).body).toContain("| `a` | no record in this run | unknown |");
    // Still listed, still unknown: silent; and nothing closes on unknown alone.
    const next = { number: 7, body: (onlyUnknown as { body: string }).body };
    expect(planStaleIssue(next, [], unknown(["a"]), NOW)).toMatchObject({ kind: "update", comment: null });
    // An unknown source that was never listed is not added.
    expect(planStaleIssue(null, [], unknown(["z"]), NOW)).toEqual({ kind: "none" });
  });

  test("an open issue without a marker is treated as listing nothing", () => {
    expect(staleIdsFromBody("edited by hand")).toBeNull();
    expect(planStaleIssue({ number: 3, body: "edited by hand" }, stale(["a"]), [], NOW))
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
    const run = (): StaleIssueAction => planStaleIssue({ ...issue }, stale(["a", "b"]), [], NOW);

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
