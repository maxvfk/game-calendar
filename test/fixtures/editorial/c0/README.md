# Frozen C0 review-regression inputs

Test-only; never a production fallback. No source was fetched for these files.
The original article content remains untrusted data.

`ginews.md`, `hsr-survey.md`, `hsr-1437-complete.md`, and `nte.json` retain
complete selected source items from this repository's independently acquired
`snapshots/*` at baseline main `e2cebbef490178cd615af859168be071104b7edd`.
Markdown slices include the original archive heading and trailing separator;
NTE retains each selected item's full contents/envelope, with JSON reserialization.
Sources are the attributed KQM GINews/HSRNews archives and publisher Steam news.
ZZZ uses the already frozen factual excerpts in
`../../zzz/steam-rss-excerpts-2026-10-27.xml`; that file's README documents omissions.
The original narrow `fixtures/hsr/kqm-hsrnews-4.6-lightward-2026-10-27.md`
remains a labeled excerpt for the existing Lightward parser tests. C0 now uses
the complete archive/1437 capture instead.

Independent inventory expectations in `expected.json` are explicit identities:

| Input | Notice IDs | Zero-output IDs | Emitted / confirmed |
| --- | --- | --- | --- |
| GINews | 21947, 21901, 21888 | 21947 | 3 / 2 |
| HSRNews | 1422, 1437 | 1422 | 9 / 9 |
| ZZZ | ten existing RSS guid IDs, explicitly listed in expected.json | six listed IDs | 43 / 24 |
| NTE | 1847920302233942, 1847286114027833, 1846651706693892, 1843481262688322, 1842846814455151 | 1847920302233942 | 15 / 8 |

These frozen expectations include each event's notice ID and final acceptance
or refusal reasons. Tests never regenerate them using discovery. They are
controlled examples, not permanent assertions about rolling source counts.
`final-winners.json` contains the 70 corresponding canonical winners from the
baseline-main builder replay at `2026-10-30T12:00:00.000Z`, read independently
from that feed, not supplied by the tested parser at runtime. Representative
real refusals include Genshin Void Star's Advent (URL + period), ZZZ Hobbling
Crow (URL + type), and NTE Surfing All Channels (URL). NTE also retains both
maintenance/standalone pairs behind the two documented superseded candidates.
`label-preferences.json` freezes the baseline policy solely for the builder's
public-byte golden; future live policy edits cannot change that test's inputs.

## Historical reproduction, separate from synthetic retention tests

Executed once during this correction with Bun 1.3.14: copy current `src/` to a
disposable directory, replace only the relevant parser using `git show`, and
invoke its exported parse function on the named frozen input with the clock above.
All other imports resolve against baseline-compatible current code. This is a
historical parser-function replay, not a complete historical build/deployment.

- HSR: parser from `9d112a6a1185fbe76e82ce495b1278df3bdc101d`
  (`ece355d^`, immediately before #119). Full archive/1437 emits five records:
  Apocalyptic Shadow, Pure Fiction, Interastral Peace Gala, Love/Ghosts/Robots,
  and Wishpower. Only two of four Lightward windows are emitted; both MoC
  windows remain present in the source body.
- Genshin: parser from `28cb6e735126cfb244abdd705257c07a37c89979`
  (`f97747e^`, immediately before #130). The isolated frozen Starlight article
  throws `KQM GINews no dated calendar notices`. A main-only event set is a
  synthetic retention example, not an old-parser success.

`historical-results.json` records actual outputs/errors, revision and input
hashes. The regression consumes those recorded results; it does not run old
parser revisions on every test. Separate synthetic zero/one-event tests exercise
retention only. Full HSR text contains 20 clock occurrences / 12 distinct clocks,
including mail eligibility, discounts and November 11 boundaries. C0 does not
classify those spans or assert that each must become a calendar event.
