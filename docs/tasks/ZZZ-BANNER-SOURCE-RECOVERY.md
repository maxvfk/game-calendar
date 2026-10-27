# ZZZ B1 — Recover unattended channel/banner coverage

**Priority: P0 continuation, next after ZZZ E1 Steam events-only. State: IMPLEMENTED via verified secondary RSS (#112).**

## Goal

Complete the remaining Zenless Zone Zero source recovery: unattended discovery of each newly announced **limited Agent and W-Engine channel/banner** with its announced dates and region-local accuracy. The official reviewed rows from #105 are safe interim coverage, **not automation**. Keep this task ahead of Timeline v2/E2b summaries. E1's completed events-only adapter must not be reverted or repeatedly reworked to satisfy this gate.

## Evidence baseline

- Full Gate A for official ZZZ raw desktop/mobile HTML was BLOCKED in #107: identical 8,184-byte Nuxt shell on the actual Actions runner for both news index and detail pages. No viable article discovery/payload in that transport. Robots 404 was **not** a refusal. Do not rerun the same failed URLs absent new reason to believe content changed.
- Steam Community RSS and documented news API are usable for events; at #107 only version updates were present. The 3.3 publisher Steam post did **not** publish current Phase I channel notice, both rerun banners, or exact banner/trial dates. Do not manufacture deadlines from update window, patch halves, old versions or known banner patterns.
- Official Phase I notice (readable through external discovery but **not** through the actual Actions HTML transport) is `https://zenless.hoyoverse.com/en-us/news/166926`. All four Phase I banners were manually reviewed in #105 with per-region deadlines. Preserve them.

## Gate A — focused source and permission research

1. Starting from current `main`, read `AGENTS.md`, #105/#107, relevant source coverage and source access code. Inventory **candidate stable discovery plus dated detail surfaces**, first **official publisher-distributed channels** (e.g., supported HoYoLAB public article rendering/RSS if accessible; separately hosted publisher notices) and then credible well-maintained **secondary** banner listings only if permitted. Do not assume that a search engine or interactive browser rendering works unattended.
2. Check official identity/ownership, robots and terms before each surface, then on the **actual GitHub Actions runner** use the declared UA and request intervals. Probe a small bounded sample of index + notices + current phase, record HTTP MIME/redirects, structure, article URL discovery, and hash metadata. Avoid undocumented internal APIs, challenges/captcha/Cloudflare bypass, browser UA masquerading or blanket robot exemptions. Existing #107 evidence remains authoritative until genuinely new evidence changes it.
3. Require dynamic discovery (no fixed numeric news IDs) and a consistent ability to distinguish **four simultaneous channels** with actual announced phase periods, current featured Agent/W-Engine names and legitimate region-specific boundaries. Validate at least two phase/version examples if possible. Explicitly distinguish independent author/publisher confirmation from copied summaries.
4. If a **secondary** publisher-independent website is selected, label provenance honestly and preserve superior official reviewed records; report its terms, accuracy against #105 and the operational risk of missing/late updates. No upgrade of secondary assertions to `official`. If no source is viable, end with an evidence-backed BLOCKED verdict and a concrete, sustainable reviewed-update/alert procedure; do not claim automatic banner recovery.
5. Publish short research findings and propose the smallest viable exact source family/implementation contract; avoid repeating broad game coverage research.

## Gate B — only if Gate A proves a usable source

1. Implement one bounded scheduled source adapter on current main (or a separately authorized follow-up if the source requires a materially different architecture). Existing scheduler and source-health/zero/LKG protections, stable event IDs, reviewed precedence, regional deadlines and separate four-banner identities are mandatory.
2. Prove parser regressions against actual legal captures for Phase I/II, multiple banner records per article, status/precision, contradictions, duplicate merge and fail-closed outage. Preserve #105 records and all other games. No speculative recurrence; trial rows need their own evidence.
3. Require at least one nonempty **actual Actions runner** refresh and post-merge CI/Pages evidence before calling unattended channel coverage restored. Describe which banner types, regions and future discovery are truly supported.

## Acceptance / delivery

- Scope and outcome clearly separated: official vs secondary, Gate A evidence vs implementation, events-only vs channels, real refresh vs fixture-only, temporary review vs long-term automation.
- For code changes run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`; update `docs/IMPLEMENTATION-STATUS.md` and create a bounded PR/merge when justified.
- Record **Next concrete step** if blocked. Do not silently declare the entire ZZZ recovery complete.

**Out of scope:** Timeline M4/editorial v2/cutover, Event Context E2b–E4, unrelated games, Account/Sync, speculative Shiyu/Deadly recurring clocks, breaking publisher access controls.


## B1 result — 2026-10-27

Gate A PASS: actual Actions captures establish native Zenless.gg Updates RSS
as a dynamically discovered, dated, secondary source. Gate B implemented in
[PR #112](https://github.com/maxvfk/game-calendar/pull/112); research, permission
boundary, rejected candidates and raw-response hashes:
`docs/research/zzz-banner-source-recovery-b1.md`.

Real unattended refresh 40512622186: 20 channel records from five I/II notices,
20 final banner winners (8 unchanged reviewed + 12 new historical automatic),
78 ZZZ / 241 total. All 229 previous winners and all 30 reviewed records/IDs
preserved; machine-readable full-feed proof and production capture are under
`docs/evidence/zzz-b1-*`. Actual source data has no 3.3 II notice; future phase
inference and trial synthesis remain prohibited. Secondary provenance is never
upgraded to official. Existing scheduler/guards apply; temporary PR workflows removed.

Next concrete step is observation of the next actually published phase through
the normal scheduler plus official/in-game verification. No automatic transition
to summaries/Timeline/Account is authorized. STOP after B1.
