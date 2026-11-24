/**
 * Continuous per-source liveness: which scheduled sources have gone longer than
 * `STALE_AFTER_MS` without a confirmed fetch, and what the single operator issue
 * should say about them.
 *
 * `newlyBroken` in the refresh runner fires once, on the transition, and only for
 * sources that are *failing*. A source can also go quiet without failing: the
 * Endfield Echoes lane stopped being asked at all on 2026-11-14, because its
 * season selector found nothing to ask about, and no run ever turned red. This
 * module judges the outcome instead — when did the source last answer — and keeps
 * saying so for as long as it is true.
 *
 * The confirmation time is the newer of two records. The committed `.meta.json`
 * carries `lastConfirmedAt` and moves with every confirmed cycle; the gitignored
 * `.state.json` comes back only from the Actions cache. Reading both means a cache
 * miss can never make a healthy source look stale: a miss is unknown, not stale.
 */
import { STALE_AFTER_MS } from "../shared/feed.ts";
import type { SnapshotMeta, SnapshotState } from "./snapshots.ts";

export interface SourceConfirmation {
  sourceId: string;
  /** Newest of the committed metadata and the cached state; null when never confirmed. */
  lastConfirmedAt: string | null;
  /** From the cached state; null when that state was not restored. */
  lastStatus: number | null;
  /** From the cached state; null when that state was not restored. */
  consecutiveFailures: number | null;
}

export interface UnconfirmedSource extends SourceConfirmation {
  /** Null when the source has never been confirmed. */
  ageMs: number | null;
}

export interface ConfirmationStore {
  readMeta(sourceId: string): Promise<SnapshotMeta | null>;
  readState(sourceId: string): Promise<SnapshotState>;
}

function newer(a: string | null | undefined, b: string | null | undefined): string | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export async function collectConfirmations(
  store: ConfirmationStore,
  sourceIds: readonly string[],
): Promise<SourceConfirmation[]> {
  const confirmations: SourceConfirmation[] = [];
  for (const sourceId of sourceIds) {
    const meta = await store.readMeta(sourceId);
    const state = await store.readState(sourceId);
    // `readState` returns an empty record on a cache miss; a run that never
    // checked says nothing about the failure streak.
    const stateKnown = state.lastCheckedAt !== null;
    confirmations.push({
      sourceId,
      lastConfirmedAt: newer(meta?.lastConfirmedAt, state.lastConfirmedAt),
      lastStatus: stateKnown ? state.lastStatus : null,
      consecutiveFailures: stateKnown ? state.consecutiveFailures : null,
    });
  }
  return confirmations;
}

/** Sources not confirmed within `thresholdMs`, by source id. Exactly at the threshold is still current. */
export function unconfirmedSources(
  sources: readonly SourceConfirmation[],
  now: number,
  thresholdMs: number = STALE_AFTER_MS,
): UnconfirmedSource[] {
  return sources
    .map((source) => ({
      ...source,
      ageMs: source.lastConfirmedAt === null ? null : now - Date.parse(source.lastConfirmedAt),
    }))
    .filter((source) => source.ageMs === null || source.ageMs > thresholdMs)
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

export const STALE_ISSUE_TITLE = "Stale sources: no confirmed fetch for over 48 hours";

const MARKER = /<!-- stale-sources: ([^>]*) -->/;

function age(ms: number | null): string {
  if (ms === null) return "never confirmed";
  const hours = Math.floor(ms / 3_600_000);
  return hours >= 48 ? `${Math.floor(hours / 24)} d ${hours % 24} h` : `${hours} h`;
}

export function staleIssueBody(stale: readonly UnconfirmedSource[], now: number): string {
  const rows = stale.map((s) =>
    `| \`${s.sourceId}\` | ${s.lastConfirmedAt ?? "never"} | ${age(s.ageMs)} | ` +
      `${s.lastStatus ?? "unknown"} | ${s.consecutiveFailures ?? "unknown"} |`);
  return [
    `<!-- stale-sources: ${stale.map((s) => s.sourceId).join(",")} -->`,
    "These scheduled sources have not had a confirmed fetch (HTTP 200 or 304) for over 48 hours.",
    "The refresh workflow updates this issue on every run and closes it when every source recovers.",
    "",
    "| Source | Last confirmed | Age | Last status | Failures in a row |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    `Checked at ${new Date(now).toISOString()}. "unknown" means the refresh bookkeeping cache was not restored.`,
    "",
  ].join("\n");
}

/** Source ids recorded in an issue body, or null when the body carries no marker. */
export function staleIdsFromBody(body: string): string[] | null {
  const match = MARKER.exec(body);
  if (match === null) return null;
  return match[1]!.split(",").filter((id) => id !== "");
}

export interface OpenIssue {
  number: number;
  body: string;
}

export type StaleIssueAction =
  | { kind: "none" }
  | { kind: "open"; body: string }
  | { kind: "update"; number: number; body: string; comment: string | null }
  | { kind: "close"; number: number; comment: string };

/**
 * What to do with the single stale-source issue.
 *
 * Opening and closing notify the owner; a body edit does not. So the body is
 * refreshed silently every run (the ages move), and a comment is added only when
 * the set of stale sources changes, which is the news worth an email.
 */
export function planStaleIssue(
  open: OpenIssue | null,
  stale: readonly UnconfirmedSource[],
  now: number,
): StaleIssueAction {
  if (stale.length === 0) {
    return open === null
      ? { kind: "none" }
      : {
        kind: "close",
        number: open.number,
        comment: `Every scheduled source has a confirmed fetch within 48 hours as of ${new Date(now).toISOString()}.`,
      };
  }
  const body = staleIssueBody(stale, now);
  if (open === null) return { kind: "open", body };

  const before = staleIdsFromBody(open.body) ?? [];
  const after = stale.map((s) => s.sourceId);
  const added = after.filter((id) => !before.includes(id));
  const recovered = before.filter((id) => !after.includes(id));
  const changes = [
    ...(added.length > 0 ? [`Now stale: ${added.map((id) => `\`${id}\``).join(", ")}.`] : []),
    ...(recovered.length > 0 ? [`Recovered: ${recovered.map((id) => `\`${id}\``).join(", ")}.`] : []),
  ];
  return { kind: "update", number: open.number, body, comment: changes.length > 0 ? changes.join(" ") : null };
}
