# Source coverage — simple scheme (audit + fixes)

**Status:** DESIGN. Direction chosen by the operator on 2026-10-28. Each step below is built
only when the operator starts it.
**Replaces:** the Source Recovery R1–R3 design in
[PR #113](https://github.com/maxvfk/game-calendar/pull/113), to be closed unmerged once this
document is accepted; its review findings are kept where they still apply.
**Rule that does not change:** a confidently wrong date is worse than a missing one (`AGENTS.md`).

## Why a different scheme

The data gaps found so far had two causes:

1. **A dated notice is already in our snapshot, but no event was made from it.** The Genshin
   audit of 2026-10-28 found Overflowing Favor, Starlight Voyage and the Phase II weapon wish
   all inside `snapshots/genshin-kqm-ginews.md`; the parser did not recognise their layout.
2. **The event is in no source we read.** Example: HSR 4.6 Lightward (#119).

Fixes #130–#143 (the 2026-10-28 recovery wave) all came from per-game coverage audits, and most
changed only `data/reviewed`. Outages happen too (ZZZ banners, #112), but they already turn the
refresh run red.

The R1–R3 design aimed at outages and at agents that repair code by themselves. Making that
safe needed token isolation for a tool-using agent, a branch policy for `main`, an incident
state machine and family coverage contracts. That is too much for a one-operator calendar, and
it would not have caught most of the gaps above.

## The scheme

| Part | What | AI |
| --- | --- | --- |
| 1 | List of unprocessed notices, updated by every refresh | None |
| 2 | Coverage audit per game, due when a new banner phase starts | An operator-started session |
| 3 | Fix rules and a date-evidence check for reviewed records | None |
| 4 | Liveness check of the refresh schedule | None |
| 5 | Model extraction for part 1, introduced in stages | Like Timeline labels: no tools |

### Part 1 — unprocessed notices

For sources that publish separate articles (KQM GINews and HSRNews, ZZZ and NTE Steam news,
the WuWa Kuro mirror), every item in the snapshot gets one status:

- **produced an event**: the merged feed has an event from this item;
- **ignored**: listed in a Git-reviewed file `data/coverage/ignored-notices.v1.json` with the
  source, item ID and a reason category (maintenance, shop, web event out of scope, and so on);
- **unprocessed**: the text contains a date, but neither of the above applies.

Date detection is deterministic: month-name and numeric dates, with or without time and offset.
Items present when the list is switched on are recorded once in a baseline, so only new items
need a decision. Each new unprocessed item needs one decision: ignore it or fix the data.

Table-like pages (Prydwen, wiki.gg, ntebuild, the ZZZ banner JSON) have no separate items;
part 2 covers them.

**Notification.** One pinned issue, "Coverage inbox". After each refresh a step rewrites its
body with the current list, and adds a comment only when a new item appears, so the operator
gets a GitHub notification. The issue is output only: the state lives in Git (ignore list,
baseline, audit log), never in issue text or comments. This step must not turn the refresh
run red.

**To verify first:** how an emitted event maps back to its item (source URL, or an item ID
kept by the parser).

### Part 2 — coverage audit

**When.** An audit for a game is due when either:

- a banner event of that game started after the game's last audit, at least one day ago (by
  then the phase notices are out, while deadlines are still ahead); or
- the game was last audited more than 21 days ago (in case the banner itself was missed).

A daily step computes this from the feed and the audit log and posts it as a comment in the
same issue. With seven games and phases about every three weeks, that is two or three audits a
week.

**How.** One game per session, started by the operator in Claude Code (local or web) or
ChatGPT Work, with the standard prompt `docs/coverage/AUDIT-PROMPT.md` (to be written, about
30 lines). The session:

1. reads the game's current events in the feed, its unprocessed and ignored notices and the
   official announcements for the current phase;
2. writes a short table: event, source link, quote with the date, status (present / missing /
   wrong);
3. fixes urgent gaps by the rules in part 3, in **one PR**;
4. appends one entry to `data/coverage/audit-log.v1.json` (game, date, phase, result, PR);
5. lists open product-scope questions (for example Miliastra, web events, cosmetics) for the
   operator instead of deciding them.

No separate research PR, backlog file or checkpoint protocol: a one-game session is short
enough to finish or redo.

### Part 3 — fix rules and date evidence

- **Urgent gaps go into `data/reviewed` first.** A parser is changed only when the same notice
  layout is missed a second time; the earlier reviewed record and the notice become its test
  fixture.
- All `AGENTS.md` data rules apply: stable IDs, `firstSeenAt`, no guessed year, time or end,
  no mixing of provenance.
- **Evidence on reviewed records.** Add an optional `evidence: { url, quote, checkedAt }` to
  `ReviewedEvent`. It becomes required for every row added or changed after the cut-over; rows
  present at the cut-over are listed once as legacy. CI parses the dates in `quote` with the
  same deterministic date reader as parts 1 and 5 and requires them to match `startsAt`,
  `endsAt` and `regionEnds` after time-zone conversion. A server-time quote ("04:00 server
  time") needs a reviewed per-game table of server offsets; without one the row stays at day
  precision. An unreadable quote fails CI; the fix is to extend the reader, not to bypass it.

### Part 4 — liveness

The refresh already fails on a newly broken source, and GitHub mails the failure. A refresh that
stops running sends nothing. Add a dead man's switch: refresh pings an external check after a
successful run, and the service mails the operator after more than 24 hours of silence (two
missed runs at `27 5,17 * * *`, allowing for multi-hour schedule delays). This also covers
GitHub disabling schedules after 60 days without repository activity. The service account is
the operator's; the ping URL is stored as a secret.

### Part 5 — model extraction for unprocessed notices

The parser stays the primary path. The model only handles items that part 1 lists as
unprocessed, using the same pattern as the Timeline labels:

- **Input**, built in the job from the snapshot with no network access: the notice text, the
  game's current events and a Git-reviewed scope policy (what counts as an event).
- **Call:** `claude -p --tools ""`, Sonnet, output constrained by a JSON schema, through the
  existing `scripts/timeline-label-agent/run-model.sh` (usage-limit and auth handling). For each
  notice the model returns either:
  - `event` with a title, type and the **verbatim quote** of each date line;
  - `ignore` with a reason;
  - `unsure`.
- **The model does not compute dates.** Code does all the checks:
  - every quote must occur verbatim in the notice text;
  - the date reader parses it and converts it to UTC;
  - a server-time quote without a reviewed offset table makes the item `unsure`;
  - an overlap with an existing event (same period, similar title) is not published but
    reported;
  - the result passes the normal schema validation and calendar sanity checks.
  - Anything that fails stays in the inbox for the operator.
- **Remaining risk:** the model can attach the wrong date from the same notice to an event (the
  Starlight Voyage quest cutoff on Oct 29 versus the event end on Nov 2). The quote check cannot
  see that, so the stages below measure it before anything is published automatically.

Stages:

1. **Probe** (read-only, like Timeline M3). Run on the notices behind fixes #130–#143 and compare
   with the reviewed records made by hand. This decides whether Sonnet is enough or Haiku is.
2. **Proposals.** Runs after refresh. Results go to the inbox issue as proposed reviewed rows,
   with evidence; the operator applies them by hand.
3. **Automatic recording**, only after the operator sees one to two weeks of correct proposals.
   Behind a kill switch (`vars.COVERAGE_EXTRACT_AUTO`), into a separate file, with its own
   `extractionMethod` value so the records can be told apart and reverted. Write job without
   the Claude secret, fast-forward push and CI dispatch, as in `record.sh`.

Usage: an empty inbox makes no call. A notice is roughly 1–3k tokens, so the expected load is
tens of thousands of tokens a week, comparable to Timeline labels; this is an estimate to
confirm in the probe. Run it on the evening refresh, away from the Timeline runs (Tue and Sat
04:23 UTC).

## Order

| Step | Scope | Done when |
| --- | --- | --- |
| C1 | Part 1: statuses, ignore list, baseline, inbox issue | Replayed on today's snapshots, it lists the gaps the 2026-10-28 audits found before #130–#143 |
| C2 | Part 3: `evidence` field, date reader, CI check, legacy list | Fixes #130–#143 rewritten as test cases pass; a wrong date in a quote fails |
| C3 | Part 2: audit prompt, audit log, due computation | One real audit run end to end for one game |
| C4 | Part 4: dead man's switch | A deliberately skipped ping produces mail |
| C5 | Part 5, stages 1–3, each a separate operator decision | Probe report compared with the reviewed records |

C1 to C4 involve no AI. The current recovery wave
(`SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE.md`) finishes under its own rules; this scheme
does not change it.

## Not doing

- R1 family coverage contracts and the incident state machine.
- R2/R3: tool-using agents in Actions, agent-written code, automatic draft PRs.
- Two-outcome (A/B) tracking per incident and the CP0–CP4 checkpoint protocol for audits.

Still valid from the #113 review: GitHub schedule delays of several hours, and that the
Actions cache holding source-health counters can be evicted (part 1 keeps its own state in
Git for that reason).
