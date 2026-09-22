# Independently captured secondary sources

GitHub Actions [run 35698796964](https://github.com/maxvfk/game-calendar/actions/runs/35698796964)
captured both pages on 2026-09-22. HTTP 200, robots 200 and permission true for
both. Raw bytes and SHA-256/run/commit evidence are in `fixtures/` and
`fixtures/evidence/`. Prydwen's 10-second crawl delay was respected.

## NTEBuild Beyond the Rails

Only BtR Event items in the page's public JSON-LD ItemList are extracted.
The real capture has three cycles: Sep 10–24, Sep 24–Oct 8 and Sunset Circle
Oct 8–22. It does **not** contain the old Aug 27 cycle in this ItemList; no
missing cycle is reconstructed. All boundaries stay day precision. Records
are secondary/estimated (confidence 0.7), regardless of organizer metadata.

The Sep 10 cycle is overridden by reviewed **Whisper Circle** with official
exact boundaries `2026-09-09T21:00:00Z`–`2026-09-23T20:59:00Z` and
[NTE Global provenance](https://x.com/NTE_GL/status/2097565675191468435).
These were confirmed in the user's source handoff; the post URL is linked as
the English official Whisper Circle notice by [NTE Life](https://ntelife.kr/en).
The date text is also reproduced on the NTE_GL [public mirror](https://www.sotwe.com/NTE_GL?lang=en).
Direct X retrieval returned 403 in this environment; it is not an automatic
X parser. The exact override is manual/reviewed, not promoted from NTEBuild.

For this dedicated source and reviewed NTE only, matching BtR start days
identify the same rotation even when one title is still "Rotation (Sep 10)".
This preserves the reviewed title, ID and official provenance. Other sources
and other modes keep their existing merge behavior.
