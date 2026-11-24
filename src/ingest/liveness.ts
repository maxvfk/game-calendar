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
 * The confirmation time is the newest of the committed `.meta.json` (its
 * `lastConfirmedAt`, which moves with every confirmed cycle, and its
 * `contentChangedAt`, itself a confirmed fetch) and the gitignored `.state.json`,
 * which comes back only from the Actions cache. A cache miss therefore cannot make
 * a healthy source look stale. With no record at all — a source added minutes ago —
 * the age is unknown: that never opens the alert, and never closes it either.
 */
import { STALE_AFTER_MS } from "../shared/feed.ts";
import type { SnapshotMeta, SnapshotState } from "./snapshots.ts";

export interface SourceConfirmation {
  sourceId: string;
  /** Newest confirmed fetch on record; null when there is no record at all. */
  lastConfirmedAt: string | null;
  /** From the cached state; null when that state was not restored. */
  lastStatus: number | null;
  /** From the cached state; null when that state was not restored. */
  consecutiveFailures: number | null;
}

export interface UnconfirmedSource extends SourceConfirmation {
  lastConfirmedAt: string;
  ageMs: number;
}

export interface ConfirmationStore {
  readMeta(sourceId: string): Promise<SnapshotMeta | null>;
  readState(sourceId: string): Promise<SnapshotState>;
}

function newest(...times: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const time of times) {
    if (time != null && (best === null || Date.parse(time) > Date.parse(best))) best = time;
  }
  return best;
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
      lastConfirmedAt: newest(meta?.lastConfirmedAt, meta?.contentChangedAt, state.lastConfirmedAt),
      lastStatus: stateKnown ? state.lastStatus : null,
      consecutiveFailures: stateKnown ? state.consecutiveFailures : null,
    });
  }
  return confirmations;
}

/** Sources confirmed, but not within `thresholdMs`, by source id. Exactly at the threshold is still current. */
export function unconfirmedSources(
  sources: readonly SourceConfirmation[],
  now: number,
  thresholdMs: number = STALE_AFTER_MS,
): UnconfirmedSource[] {
  const stale: UnconfirmedSource[] = [];
  for (const source of sources) {
    if (source.lastConfirmedAt === null) continue;
    const ageMs = now - Date.parse(source.lastConfirmedAt);
    if (ageMs > thresholdMs) stale.push({ ...source, lastConfirmedAt: source.lastConfirmedAt, ageMs });
  }
  return stale.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/** Sources with no confirmation on record: their age is unknown, not over the threshold. */
export function unknownSources(sources: readonly SourceConfirmation[]): SourceConfirmation[] {
  return sources.filter((s) => s.lastConfirmedAt === null).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/** The issue is found by this label and by its author, never by title alone. */
export const STALE_ISSUE_LABEL = "liveness-stale-sources";
export const STALE_ISSUE_TITLE = "Stale sources: no confirmed fetch for over 48 hours";

const MARKER = /<!-- stale-sources: ([^>]*) -->/;

function age(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

export function staleIssueBody(
  stale: readonly UnconfirmedSource[],
  carried: readonly SourceConfirmation[],
  now: number,
): string {
  const ids = [...stale, ...carried].map((s) => s.sourceId).sort();
  const rows = [
    ...stale.map((s) =>
      `| \`${s.sourceId}\` | ${s.lastConfirmedAt} | ${age(s.ageMs)} | ` +
        `${s.lastStatus ?? "unknown"} | ${s.consecutiveFailures ?? "unknown"} |`),
    ...carried.map((s) => `| \`${s.sourceId}\` | no record in this run | unknown | unknown | unknown |`),
  ];
  return [
    `<!-- stale-sources: ${ids.join(",")} -->`,
    "These scheduled sources have not had a confirmed fetch (HTTP 200 or 304) for over 48 hours.",
    "The refresh workflow updates this issue on every run and closes it when every source recovers.",
    "",
    "| Source | Last confirmed | Age | Last status | Failures in a row |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    `Checked at ${new Date(now).toISOString()}. "unknown" means the refresh bookkeeping cache was not restored,`,
    "or the source has no record at all; a source with unknown age stays listed until it is confirmed.",
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
 * the listed set changes, which is the news worth an email. A listed source whose
 * age has become unknown stays listed: only a confirmation recovers it.
 */
export function planStaleIssue(
  open: OpenIssue | null,
  stale: readonly UnconfirmedSource[],
  unknown: readonly SourceConfirmation[],
  now: number,
): StaleIssueAction {
  const before = open === null ? [] : (staleIdsFromBody(open.body) ?? []);
  const carried = unknown.filter((s) => before.includes(s.sourceId));
  const listed = [...stale, ...carried].map((s) => s.sourceId);

  if (listed.length === 0) {
    return open === null
      ? { kind: "none" }
      : {
        kind: "close",
        number: open.number,
        comment: `Every scheduled source has a confirmed fetch within 48 hours as of ${new Date(now).toISOString()}.`,
      };
  }
  const body = staleIssueBody(stale, carried, now);
  if (open === null) return { kind: "open", body };

  const added = listed.filter((id) => !before.includes(id)).sort();
  const recovered = before.filter((id) => !listed.includes(id)).sort();
  const changes = [
    ...(added.length > 0 ? [`Now stale: ${added.map((id) => `\`${id}\``).join(", ")}.`] : []),
    ...(recovered.length > 0 ? [`Recovered: ${recovered.map((id) => `\`${id}\``).join(", ")}.`] : []),
  ];
  return { kind: "update", number: open.number, body, comment: changes.length > 0 ? changes.join(" ") : null };
}

export interface StaleIssueClient {
  /** Creates the labelled issue; returns its URL. */
  create(title: string, body: string): string;
  edit(number: number, body: string): void;
  comment(number: number, body: string): void;
  close(number: number, comment: string): void;
}

/**
 * Carry out a plan. On an update the comment goes out *before* the body edit: the
 * body's marker is what records a transition as handled, so it may move only once
 * the notification has been sent. If the comment fails, the next run still sees the
 * old marker and comments again; if the edit fails after it, the next run repeats
 * the comment, which is the safe side of the trade.
 */
export function applyStaleIssue(action: StaleIssueAction, client: StaleIssueClient): string {
  switch (action.kind) {
    case "none":
      return "no stale sources and no open issue";
    case "open":
      return `opened ${client.create(STALE_ISSUE_TITLE, action.body)}`;
    case "update":
      if (action.comment !== null) client.comment(action.number, action.comment);
      client.edit(action.number, action.body);
      return `updated #${action.number}${action.comment === null ? "" : " with a comment"}`;
    case "close":
      client.close(action.number, action.comment);
      return `closed #${action.number}`;
  }
}
