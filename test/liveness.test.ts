import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectConfirmations,
  planStaleIssue,
  staleIdsFromBody,
  staleIssueBody,
  unconfirmedSources,
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

describe("per-source liveness", () => {
  test("flags only sources past 48h or never confirmed", () => {
    const stale = unconfirmedSources([
      source("b-old", at(240)),
      source("a-fresh", at(2)),
      source("c-edge", new Date(NOW - STALE_AFTER_MS).toISOString()),
      source("d-never", null),
      source("e-just-past", new Date(NOW - STALE_AFTER_MS - 1).toISOString()),
    ], NOW);
    expect(stale.map((s) => s.sourceId)).toEqual(["b-old", "d-never", "e-just-past"]);
    expect(stale[0]!.ageMs).toBe(240 * HOUR);
    expect(stale[1]!.ageMs).toBeNull();
  });

  describe("confirmations from the snapshot store", () => {
    let root: string;
    beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "liveness-")); });
    afterEach(async () => { await rm(root, { recursive: true, force: true }); });

    const meta = (sourceId: string, lastConfirmedAt: string | null) => Bun.write(
      join(root, `${sourceId}.meta.json`),
      JSON.stringify({
        sourceId, url: "https://example.test/", contentHash: "x", bytes: 1, etag: null,
        lastModified: null, contentChangedAt: at(500), lastConfirmedAt, eventCount: 1,
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

    test("takes the newer of meta and state, and the streak from state", async () => {
      await meta("state-newer", at(100));
      await state("state-newer", at(5), 0);
      await meta("meta-newer", at(4));
      await state("meta-newer", at(80), 7);
      await state("no-meta", null, 9);
      const byId = Object.fromEntries((await collectConfirmations(
        new SnapshotStore(root), ["state-newer", "meta-newer", "no-meta"],
      )).map((c) => [c.sourceId, c]));
      expect(byId["state-newer"]!.lastConfirmedAt).toBe(at(5));
      expect(byId["meta-newer"]!.lastConfirmedAt).toBe(at(4));
      expect(byId["meta-newer"]!.consecutiveFailures).toBe(7);
      expect(byId["no-meta"]).toEqual({
        sourceId: "no-meta", lastConfirmedAt: null, lastStatus: 503, consecutiveFailures: 9,
      });
    });
  });
});

describe("the single stale-source issue", () => {
  const stale = (ids: string[]) => unconfirmedSources(ids.map((id) => source(id, at(100))), NOW);

  test("nothing stale and no issue: nothing to do", () => {
    expect(planStaleIssue(null, [], NOW)).toEqual({ kind: "none" });
  });

  test("opens with a body that records which sources are stale", () => {
    const action = planStaleIssue(null, stale(["endfield-wikigg-echoes"]), NOW);
    expect(action.kind).toBe("open");
    const body = (action as { body: string }).body;
    expect(staleIdsFromBody(body)).toEqual(["endfield-wikigg-echoes"]);
    expect(body).toContain("| `endfield-wikigg-echoes` | " + at(100) + " | 4 d 4 h | 200 | 0 |");
  });

  test("an unchanged set updates the body silently; a changed set comments", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a", "b"]), NOW - HOUR) };
    expect(planStaleIssue(open, stale(["a", "b"]), NOW)).toMatchObject({ kind: "update", number: 7, comment: null });
    expect(planStaleIssue(open, stale(["b", "c"]), NOW)).toMatchObject({
      kind: "update", number: 7, comment: "Now stale: `c`. Recovered: `a`.",
    });
  });

  test("closes once every source recovers", () => {
    const open = { number: 7, body: staleIssueBody(stale(["a"]), NOW) };
    expect(planStaleIssue(open, [], NOW)).toMatchObject({ kind: "close", number: 7 });
  });

  test("an open issue without a marker is treated as listing nothing", () => {
    expect(staleIdsFromBody("edited by hand")).toBeNull();
    expect(planStaleIssue({ number: 3, body: "edited by hand" }, stale(["a"]), NOW))
      .toMatchObject({ kind: "update", comment: "Now stale: `a`." });
  });
});

describe("dead-man heartbeat verdict", () => {
  const health = (lastSuccessAt: string | null) => ({
    sourceId: "s", game: "genshin", url: "https://example.test/", lastSuccessAt,
    lastConfirmedAt: null, contentChangedAt: null, eventCount: 1, parsedCount: 1, statesNoEvents: false,
  }) as SourceHealth;

  test("pings only while publication is current", () => {
    expect(publicationVerdict([health(at(2))], NOW).current).toBe(true);
    expect(publicationVerdict([health(at(31))], NOW).current).toBe(false);
  });

  test("no data is not proof of life", () => {
    expect(publicationVerdict([health(null)], NOW).current).toBe(false);
    expect(publicationVerdict([], NOW).current).toBe(false);
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

  test("the stale-source issue never fails the refresh and runs before the health gate", async () => {
    const refresh = await read("refresh.yml");
    expect(refresh).toContain("issues: write");
    const step = refresh.slice(refresh.indexOf("Stale-source issue"), refresh.indexOf("Report source health"));
    expect(step).toContain("continue-on-error: true");
    expect(step).toContain("steps.refresh.outcome == 'success'");
    expect(step).toContain("inputs.dry_run != true");
    expect(step).toContain("bun scripts/stale-source-issue.ts");
  });
});
