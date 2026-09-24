/**
 * Build the static event feed from cached snapshots, falling back to fixtures.
 *
 * Offline: this reads files on disk, never the network. Fetching is
 * `scripts/refresh-sources.ts`'s job; this stage only parses what that left in
 * the snapshot cache. On a clean checkout — and in the container build — no
 * snapshot exists and the checked-in fixture is used instead, so the build
 * stays reproducible and a wiki being down never breaks it.
 *
 *   bun run build:feed
 */
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import { sourceHealth } from "../src/ingest/health.ts";
import { mergeEvents, type MergeResult } from "../src/ingest/merge.ts";
import {
  loadReviewedBatches,
  REVIEWED_SOURCE_URL,
} from "../src/ingest/reviewed.ts";
import { SnapshotStore, freshnessAt } from "../src/ingest/snapshots.ts";
import { fixtureCaptureAt } from "../src/ingest/fixtures.ts";
import { greatRiftWeeklyRewards, missingLightwardPhase, recurringEndgame } from "../src/ingest/recurring-endgame.ts";
import { ECHOES_EVENT_SOURCE_ID, ECHOES_SOURCE_ID, echoesSeasonUrl, selectEchoesSeason } from "../src/ingest/echoes-season.ts";
import { EventFeed, SCHEMA_VERSION, type SourceHealth } from "../src/shared/feed.ts";
import { Region, type GachaEvent, type GameId } from "../src/shared/schema.ts";

const OUT = "public/data/events.v1.json";
const snapshots = new SnapshotStore(process.env["SNAPSHOT_DIR"] ?? "snapshots");

/**
 * Newest fixture for one *source*, not one game.
 *
 * A game can have several sources, and fixtures are named `<site>-events-<date>`
 * against adapter ids of `<game>-<site>-events`. Globbing by game alone hands
 * one site's page to another site's parser.
 */
async function latestFixture(adapterId: string, game: GameId) {
  const site = adapterId.replace(`${game}-`, "").replace(/-events$/, "");
  const contentKind = ADAPTERS.find((adapter) => adapter.id === adapterId)?.contentKind ?? "html";
  const pattern = `fixtures/${game}/${site}-*.${contentKind === "markdown" ? "md" : contentKind}`;
  const files = [...new Bun.Glob(pattern).scanSync(".")].sort();
  const file = files.at(-1);
  if (file === undefined) {
    return null;
  }
  return { file, html: await Bun.file(file).text() };
}

/**
 * The document to parse for one source: the live snapshot when the refresh
 * runner has cached one, otherwise the newest checked-in fixture.
 *
 * `at` is what the UI's staleness badge reads, so it must never claim to be
 * fresher than the bytes actually are — a fixture reports its capture date.
 */
async function documentFor(adapterId: string, game: GameId) {
  const cached = await snapshots.read(adapterId);
  if (cached !== null) {
    const rawConfirmed = cached.meta.lastConfirmedAt ?? cached.state.lastConfirmedAt;
    const contentChangedAt = cached.meta.contentChangedAt;
    const lastConfirmedAt =
      rawConfirmed !== null &&
      contentChangedAt !== null &&
      Date.parse(rawConfirmed) >= Date.parse(contentChangedAt)
        ? rawConfirmed
        : (contentChangedAt ?? rawConfirmed);
    return {
      file: snapshots.bodyPath(adapterId, cached.meta.contentKind),
      html: cached.html,
      url: cached.meta.url,
      at: freshnessAt(cached),
      lastConfirmedAt,
      contentChangedAt,
    };
  }
  const fixture = await latestFixture(adapterId, game);
  if (fixture === null) return null;
  const { file, html } = fixture;
  const date = fixtureCaptureAt(file);
  return {
    file,
    html,
    url: ADAPTERS.find(adapter => adapter.id === adapterId)?.url,
    at: date,
    lastConfirmedAt: null,
    contentChangedAt: date,
  };
}

const now = new Date().toISOString();
const byGame = new Map<GameId, Array<{ priority: number; events: GachaEvent[] }>>();
const sources: SourceHealth[] = [];

for (const configured of ADAPTERS) {
  let adapter = configured;
  let expectedSeason: GachaEvent | null = null;
  if (adapter.id === ECHOES_SOURCE_ID) {
    const eventPage = byGame.get("endfield")?.flatMap(g => g.events)
      .filter(e => e.sourceId === ECHOES_EVENT_SOURCE_ID) ?? [];
    expectedSeason = selectEchoesSeason(eventPage, now);
    if (expectedSeason === null) {
      console.warn("  ! review reminder: no active/upcoming Echoes season on the Event page; cycle source skipped");
      continue;
    }
    adapter = { ...adapter, url: echoesSeasonUrl(expectedSeason) };
  }
  const document = await documentFor(
    adapter.id,
    adapter.game,
  );
  if (document === null) {
    sources.push({
      sourceId: adapter.id,
      game: adapter.game,
      url: adapter.url,
      lastSuccessAt: null,
      lastConfirmedAt: null,
      contentChangedAt: null,
      eventCount: 0,
      parsedCount: null,
      statesNoEvents: false,
    });
    console.warn(`  ${adapter.id.padEnd(24)} unavailable  (no independently captured snapshot yet)`);
    continue;
  }
  if (adapter.id === ECHOES_SOURCE_ID && document.url !== adapter.url) {
    console.warn(`  ! review reminder: Echoes season page snapshot is stale for ${expectedSeason?.title}; no cycle rows published`);
    sources.push({ sourceId: adapter.id, game: adapter.game, url: adapter.url,
      lastSuccessAt: null, lastConfirmedAt: null, contentChangedAt: null,
      eventCount: 0, parsedCount: null, statesNoEvents: false });
    continue;
  }
  const { file, html, at, lastConfirmedAt, contentChangedAt } = document;
  let events: GachaEvent[];
  try {
    events = adapter.parse(html, {
      now,
      sourceUrl: document.url ?? adapter.url,
      sourceId: adapter.id,
      game: adapter.game,
    });
  } catch (error) {
    if (adapter.id !== ECHOES_SOURCE_ID) throw error;
    console.warn(`  ! review reminder: Echoes cycle page did not parse; no cycle rows published: ${String(error)}`);
    sources.push({ sourceId: adapter.id, game: adapter.game, url: adapter.url,
      lastSuccessAt: null, lastConfirmedAt: null, contentChangedAt: null,
      eventCount: 0, parsedCount: null, statesNoEvents: false });
    continue;
  }
  if (expectedSeason !== null && events.some(event => event.startsAt.slice(0, 10) < expectedSeason.startsAt.slice(0, 10) ||
    Region.options.some(region => !event.regionEnds?.[region] || !expectedSeason.regionEnds?.[region] ||
      event.regionEnds[region] > expectedSeason.regionEnds[region]))) {
    console.warn(`  ! review reminder: Echoes cycles exceed sourced ${expectedSeason.title} window; no cycle rows published`);
    sources.push({ sourceId: adapter.id, game: adapter.game, url: adapter.url,
      lastSuccessAt: null, lastConfirmedAt: null, contentChangedAt: null,
      eventCount: 0, parsedCount: null, statesNoEvents: false });
    continue;
  }

  // Which of the three empties this is, decided in a module a test can reach
  // rather than here — see `src/ingest/health.ts` for why that matters.
  const health = sourceHealth(adapter, html, at, events.length, {
    lastConfirmedAt,
    contentChangedAt,
  });
  const { parsedCount } = health;

  const groups = byGame.get(adapter.game) ?? [];
  groups.push({ priority: adapter.priority, events });
  byGame.set(adapter.game, groups);

  sources.push(health);

  // A source that came back with nothing says which nothing it was, because a
  // bare "0 events" reads as a fault and two of the three are not one.
  const note = health.statesNoEvents
    ? "  (the page states it currently lists none)"
    : events.length === 0 && parsedCount !== null && parsedCount > 0
      ? `  (all ${parsedCount} have ended — stale page)`
      : "";
  console.log(
    `  ${adapter.id.padEnd(24)} ${String(events.length).padStart(3)} events  ← ${file}${note}`,
  );
}

// Reviewed records are the explicit fallback for sources that cannot be
// reached from the runner. They do not bypass validation: each file is parsed
// into the exact same GachaEvent schema before it can join an automatic group.
const reviewed = await loadReviewedBatches("data/reviewed", {
  includeLeaks: process.env["INCLUDE_LEAKS"] === "true",
});
for (const batch of reviewed) {
  const groups = byGame.get(batch.game) ?? [];
  groups.push({ priority: 100, events: batch.events });
  byGame.set(batch.game, groups);

  sources.push({
    sourceId: `reviewed-${batch.game}`,
    game: batch.game,
    url: REVIEWED_SOURCE_URL,
    lastSuccessAt: batch.reviewedAt,
    lastConfirmedAt: batch.reviewedAt,
    contentChangedAt: batch.reviewedAt,
    eventCount: batch.events.length,
    parsedCount: batch.parsedCount,
    statesNoEvents: batch.statesNoEvents,
  });
  const hidden = batch.parsedCount - batch.events.length;
  console.log(
    `  ${`reviewed-${batch.game}`.padEnd(24)} ${String(batch.events.length).padStart(3)} events  ← ${batch.file}${hidden > 0 ? `  (${hidden} leak record${hidden === 1 ? "" : "s"} hidden)` : ""}`,
  );
}

// Checked-in, bounded reset rules add deadlines without claiming a network
// source was refreshed. Official/reviewed records for a matching ID win on
// confidence, while a changed rule requires an explicit effective date.
const sourcedEvents = [...byGame.values()].flatMap(groups => groups.flatMap(group => group.events));
const expectedHsr = missingLightwardPhase(now, sourcedEvents);
if (expectedHsr !== null) console.warn(`  ! review reminder: ${expectedHsr}`);
const greatRiftPhases = sourcedEvents.filter(event => event.sourceId === "reviewed-czn" && event.title.startsWith("The Great Rift:"));
for (const event of [...recurringEndgame(now, undefined, sourcedEvents), ...greatRiftPhases.flatMap(phase => greatRiftWeeklyRewards(phase, now))]) {
  const groups = byGame.get(event.game) ?? [];
  groups.push({ priority: 10, events: [event] });
  byGame.set(event.game, groups);
}

const events: GachaEvent[] = [];
const reviewConflicts: MergeResult["conflicts"] = [];
let conflictCount = 0;
for (const [, groups] of byGame) {
  const sorted = groups
    .sort((a, b) => b.priority - a.priority)
    .map((g) => g.events);
  const merged = mergeEvents(sorted);
  events.push(...merged.events);
  conflictCount += merged.conflicts.length;
  reviewConflicts.push(...merged.conflicts);
  for (const c of merged.conflicts) {
    console.warn(
      `  ! conflict: "${c.kept.title}" ${c.field}${c.region ? ` (${c.region})` : ""} differs by ${c.deltaHours}h between sources`,
    );
  }
}

events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));

const feed = EventFeed.parse({
  schemaVersion: SCHEMA_VERSION,
  generatedAt: now,
  events,
  sources,
  dateConflicts: reviewConflicts.map((c) => ({
    eventId: c.kept.id,
    field: c.field,
    ...(c.region === undefined ? {} : { region: c.region }),
    keptUrl: c.kept.sourceUrl,
    otherUrl: c.rejected.sourceUrl,
  })),
});

await Bun.write(OUT, `${JSON.stringify(feed, null, 2)}\n`);
// Durable review evidence, alongside the feed. Preferred reviewed records
// remain visible; conflicting incoming dates are never silently adopted.
await Bun.write("public/data/review.v1.json", `${JSON.stringify({
  schemaVersion: 1, generatedAt: now, conflicts: reviewConflicts,
}, null, 2)}\n`);
console.log(
  `\n${OUT}: ${events.length} events across ${byGame.size} games, ${conflictCount} conflicts`,
);
