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
 * a healthy source look stale. A source never once confirmed is aged from the
 * earliest of two state records: the first cycle it was on the schedule
 * (`firstSeenAt`, written even when robots forbids every request) and the first
 * attempt of its failure streak (`failingSince`). So a new source that only ever
 * fails, or is never asked, still reaches the alert after 48 hours. With none of
 * these — a source added minutes ago, or a cache miss — the age is unknown, which
 * never opens the alert. Unparseable dates, and dates later than the check itself,
 * are no record at all: a timestamp from the future must not outvote a real one.
 *
 * Recovery has its own, stricter test: only a valid confirmation within 48 hours
 * takes a listed source off the issue. A young failure streak after a cache miss
 * is not stale, but it is not a recovery either.
 */
import { STALE_AFTER_MS } from "../shared/feed.ts";
import type { SnapshotMeta, SnapshotState } from "./snapshots.ts";

export interface SourceConfirmation {
  sourceId: string;
  /** Newest valid confirmed fetch on record; null when there is none. */
  lastConfirmedAt: string | null;
  /** From the cached state: first attempt of the current failure streak, if valid. */
  failingSince: string | null;
  /** From the cached state: first cycle with this source on the schedule, if valid. */
  firstSeenAt: string | null;
  /**
   * Whether the refresh state read for this run records any request. False when the
   * source was never asked (robots, say) and equally when the cache was not restored;
   * the state alone cannot tell those apart, so neither is claimed.
   */
  requestOnRecord: boolean;
  /** Last HTTP status; null with a request on record means the attempt got no response. */
  lastStatus: number | null;
  /** Current failure streak; null when no request is on record. */
  consecutiveFailures: number | null;
}

export interface UnconfirmedSource extends SourceConfirmation {
  /** Since the last confirmation or, for a source never confirmed, since it was first on record. */
  ageMs: number;
}

export interface ConfirmationStore {
  readMeta(sourceId: string): Promise<SnapshotMeta | null>;
  readState(sourceId: string): Promise<SnapshotState>;
}

function valid(time: unknown): time is string {
  return typeof time === "string" && !Number.isNaN(Date.parse(time));
}

/** The newest of the parseable times; an empty or malformed value is ignored, never compared. */
function newest(...times: unknown[]): string | null {
  let best: string | null = null;
  for (const time of times) {
    if (valid(time) && (best === null || Date.parse(time) > Date.parse(best))) best = time;
  }
  return best;
}

/** The oldest of the parseable times, on the same terms. */
function oldest(...times: unknown[]): string | null {
  let best: string | null = null;
  for (const time of times) {
    if (valid(time) && (best === null || Date.parse(time) < Date.parse(best))) best = time;
  }
  return best;
}

/** The time itself when it parses and is not later than `now`; otherwise nothing. */
function notAfter(time: unknown, now: number): string | null {
  return valid(time) && Date.parse(time) <= now ? time : null;
}

/** Reads every source's records as of `now`; anything dated after `now` is discarded first. */
export async function collectConfirmations(
  store: ConfirmationStore,
  sourceIds: readonly string[],
  now: number,
): Promise<SourceConfirmation[]> {
  const confirmations: SourceConfirmation[] = [];
  for (const sourceId of sourceIds) {
    const meta = await store.readMeta(sourceId);
    const state = await store.readState(sourceId);
    // `readState` returns an empty record on a cache miss; a run that never
    // checked says nothing about the failure streak.
    const stateKnown = state.lastCheckedAt !== null;
    const firstSeenAt = notAfter(state.firstSeenAt, now);
    confirmations.push({
      sourceId,
      lastConfirmedAt: newest(
        notAfter(meta?.lastConfirmedAt, now),
        notAfter(meta?.contentChangedAt, now),
        notAfter(state.lastConfirmedAt, now),
      ),
      failingSince: notAfter(state.failingSince, now),
      firstSeenAt,
      requestOnRecord: stateKnown,
      lastStatus: stateKnown ? state.lastStatus : null,
      consecutiveFailures: stateKnown ? state.consecutiveFailures : null,
    });
  }
  return confirmations;
}

/** Where a source's age is measured from, or null when it is unknown. */
function ageFrom(source: SourceConfirmation): string | null {
  return newest(source.lastConfirmedAt) ?? oldest(source.failingSince, source.firstSeenAt);
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

/** Sources with a valid confirmed fetch within `thresholdMs`: the only ones that count as recovered. */
export function confirmedSources(
  sources: readonly SourceConfirmation[],
  now: number,
  thresholdMs: number = STALE_AFTER_MS,
): SourceConfirmation[] {
  return sources
    .filter((s) => {
      if (s.lastConfirmedAt === null) return false;
      const ageMs = now - Date.parse(s.lastConfirmedAt);
      return ageMs >= 0 && ageMs <= thresholdMs;
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/** One refresh's verdict over the scheduled sources it tracks. */
export interface LivenessReport {
  /** Every scheduled source this run judged; a listed id outside it is no longer monitored. */
  sources: readonly SourceConfirmation[];
  stale: readonly UnconfirmedSource[];
  /** Ids confirmed within 48 hours. */
  confirmed: readonly string[];
}

export function livenessReport(sources: readonly SourceConfirmation[], now: number): LivenessReport {
  return {
    sources: [...sources].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    stale: unconfirmedSources(sources, now),
    confirmed: confirmedSources(sources, now).map((s) => s.sourceId),
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

/** The "Last confirmed" cell. */
function lastConfirmedCell(s: SourceConfirmation): string {
  if (s.lastConfirmedAt !== null) return s.lastConfirmedAt;
  const since = [
    ...(s.firstSeenAt !== null && s.firstSeenAt !== s.failingSince ? [`on the schedule since ${s.firstSeenAt}`] : []),
    ...(s.failingSince !== null ? [`failing since ${s.failingSince}`] : []),
  ];
  return since.length > 0 ? `never; ${since.join(", ")}` : "no record in this run";
}

const NO_REQUEST = "no request on record";

function row(s: SourceConfirmation, ageText: string): string {
  const status = !s.requestOnRecord ? NO_REQUEST : (s.lastStatus ?? "no HTTP response");
  const failures = !s.requestOnRecord ? NO_REQUEST : (s.consecutiveFailures ?? NO_REQUEST);
  return `| \`${s.sourceId}\` | ${lastConfirmedCell(s)} | ${ageText} | ${status} | ${failures} |`;
}

export function staleIssueBody(
  stale: readonly UnconfirmedSource[],
  carried: readonly SourceConfirmation[],
  now: number,
): string {
  const ids = [...stale, ...carried].map((s) => s.sourceId).sort();
  const rows = [
    ...stale.map((s) => row(s, age(s.ageMs))),
    ...carried.map((s) => row(s, "not confirmed since")),
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
    `Checked at ${new Date(now).toISOString()}.`,
    `"${NO_REQUEST}": the refresh state read for this run holds no request for the source, either because`,
    "it has never been asked (for example, robots forbids it) or because the bookkeeping cache was not restored;",
    "a last-confirmed date in the same row comes from the committed snapshot metadata.",
    `"no HTTP response": the last attempt failed before any response (for example, a network error or timeout).`,
    "A listed source stays listed until a fetch is confirmed, even when its age can no longer be measured.",
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
 * the listed set changes, which is the news worth an email. A listed source stays
 * listed until a valid confirmation within 48 hours, whatever else its age does:
 * unknown after a cache miss, or a young failure streak restarted by one. A listed
 * source that left the schedule is reported as no longer monitored, not as
 * recovered, and a close claims only what was checked.
 */
export function planStaleIssue(open: OpenIssue | null, report: LivenessReport, now: number): StaleIssueAction {
  const { sources, stale, confirmed } = report;
  const tracked = sources.map((s) => s.sourceId);
  const staleIds = stale.map((s) => s.sourceId);
  const before = open === null ? [] : (staleIdsFromBody(open.body) ?? []);
  const carried = sources.filter((s) =>
    before.includes(s.sourceId) && !staleIds.includes(s.sourceId) && !confirmed.includes(s.sourceId)
  );
  const listed = [...staleIds, ...carried.map((s) => s.sourceId)];

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
    const pending = tracked.filter((id) => !confirmed.includes(id));
    return {
      kind: "close",
      number: open.number,
      comment: [
        `No monitored scheduled source is past 48 hours without a confirmed fetch as of ${new Date(now).toISOString()}.`,
        ...changes,
        ...(pending.length > 0 ? [`Not confirmed yet, under 48 hours or age unknown: ${codes(pending)}.`] : []),
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
