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
 * a healthy source look stale. A source never once confirmed is aged from the first
 * attempt of its failure streak (`failingSince` in the state), so a new source that
 * has only ever failed still reaches the alert after 48 hours. With neither — a
 * source added minutes ago, or a cache miss — the age is unknown: that never opens
 * the alert, and never closes it either. Unparseable dates are no record at all.
 */
import { STALE_AFTER_MS } from "../shared/feed.ts";
import type { SnapshotMeta, SnapshotState } from "./snapshots.ts";

export interface SourceConfirmation {
  sourceId: string;
  /** Newest valid confirmed fetch on record; null when there is none. */
  lastConfirmedAt: string | null;
  /** From the cached state: first attempt of the current failure streak, if valid. */
  failingSince: string | null;
  /** From the cached state; null when that state was not restored. */
  lastStatus: number | null;
  /** From the cached state; null when that state was not restored. */
  consecutiveFailures: number | null;
}

export interface UnconfirmedSource extends SourceConfirmation {
  /** Since the last confirmation or, for a source never confirmed, since its streak began. */
  ageMs: number;
}

export interface ConfirmationStore {
  readMeta(sourceId: string): Promise<SnapshotMeta | null>;
  readState(sourceId: string): Promise<SnapshotState>;
}

/** The newest of the parseable times; an empty or malformed value is ignored, never compared. */
function newest(...times: unknown[]): string | null {
  let best: string | null = null;
  for (const time of times) {
    if (typeof time !== "string" || Number.isNaN(Date.parse(time))) continue;
    if (best === null || Date.parse(time) > Date.parse(best)) best = time;
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
      failingSince: stateKnown ? newest(state.failingSince) : null,
      lastStatus: stateKnown ? state.lastStatus : null,
      consecutiveFailures: stateKnown ? state.consecutiveFailures : null,
    });
  }
  return confirmations;
}

/** Where a source's age is measured from, or null when it is unknown. */
function ageFrom(source: SourceConfirmation): string | null {
  return newest(source.lastConfirmedAt) ?? newest(source.failingSince);
}

/** Sources past `thresholdMs` without a confirmed fetch, by source id. Exactly at the threshold is still current. */
export function unconfirmedSources(
  sources: readonly SourceConfirmation[],
  now: number,
  thresholdMs: number = STALE_AFTER_MS,
): UnconfirmedSource[] {
  const stale: UnconfirmedSource[] = [];
  for (const source of sources) {
    const from = ageFrom(source);
    if (from === null) continue;
    const ageMs = now - Date.parse(from);
    if (ageMs > thresholdMs) stale.push({ ...source, ageMs });
  }
  return stale.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/** Sources with nothing to age them from: unknown, not over the threshold. */
export function unknownSources(sources: readonly SourceConfirmation[]): SourceConfirmation[] {
  return sources.filter((s) => ageFrom(s) === null).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/** One refresh's verdict over the scheduled sources it tracks. */
export interface LivenessReport {
  stale: readonly UnconfirmedSource[];
  unknown: readonly SourceConfirmation[];
  /** Every scheduled source id this run judged; a listed id outside it is no longer monitored. */
  tracked: readonly string[];
}

export function livenessReport(sources: readonly SourceConfirmation[], now: number): LivenessReport {
  return {
    stale: unconfirmedSources(sources, now),
    unknown: unknownSources(sources),
    tracked: sources.map((s) => s.sourceId),
  };
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
      `| \`${s.sourceId}\` | ${s.lastConfirmedAt ?? `never; failing since ${s.failingSince}`} | ${age(s.ageMs)} | ` +
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

function codes(ids: readonly string[]): string {
  return ids.map((id) => `\`${id}\``).join(", ");
}

/**
 * What to do with the single stale-source issue.
 *
 * Opening and closing notify the owner; a body edit does not. So the body is
 * refreshed silently every run (the ages move), and a comment is added only when
 * the listed set changes, which is the news worth an email. A listed source whose
 * age has become unknown stays listed: only a confirmation recovers it. A listed
 * source that left the schedule is reported as no longer monitored, not as
 * recovered, and a close claims only what was checked.
 */
export function planStaleIssue(open: OpenIssue | null, report: LivenessReport, now: number): StaleIssueAction {
  const { stale, unknown, tracked } = report;
  const before = open === null ? [] : (staleIdsFromBody(open.body) ?? []);
  const carried = unknown.filter((s) => before.includes(s.sourceId));
  const listed = [...stale, ...carried].map((s) => s.sourceId);

  const added = listed.filter((id) => !before.includes(id)).sort();
  const dropped = before.filter((id) => !listed.includes(id));
  const recovered = dropped.filter((id) => tracked.includes(id)).sort();
  const unmonitored = dropped.filter((id) => !tracked.includes(id)).sort();
  const changes = [
    ...(added.length > 0 ? [`Now stale: ${codes(added)}.`] : []),
    ...(recovered.length > 0 ? [`Recovered with a confirmed fetch: ${codes(recovered)}.`] : []),
    ...(unmonitored.length > 0 ? [`No longer monitored (left the schedule): ${codes(unmonitored)}.`] : []),
  ];

  if (listed.length === 0) {
    if (open === null) return { kind: "none" };
    const pending = unknown.map((s) => s.sourceId);
    return {
      kind: "close",
      number: open.number,
      comment: [
        `No monitored scheduled source is past 48 hours without a confirmed fetch as of ${new Date(now).toISOString()}.`,
        ...changes,
        ...(pending.length > 0 ? [`Not judged yet, age unknown: ${codes(pending)}.`] : []),
      ].join(" "),
    };
  }
  const body = staleIssueBody(stale, carried, now);
  if (open === null) return { kind: "open", body };
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
