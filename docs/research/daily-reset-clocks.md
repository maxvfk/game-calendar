# Daily reset clock audit

Checked 2026-10-22; baseline main `e05fa8b64262b35607a6296171604f6eb79fedea`.
Research only; runtime, stored marks and Sync unchanged.

| Step | Game | Outcome | Report |
| --- | --- | --- | --- |
| 1 | Endfield | Confirmed correct: Asia 20:00Z previous date, western 09:00Z | [endfield](daily-reset-clocks/endfield.md) |
| 2 | NTE | Conflicting core clock/DST; four servers but no SEA selector | [nte](daily-reset-clocks/nte.md) |
| 3 | CZN | Confirmed error: published 18:00Z; code varies by Region | [czn](daily-reset-clocks/czn.md) |
| 4 | Genshin | Confirmed correct: 04:00 on fixed +8/+1/−5 | [genshin](daily-reset-clocks/genshin.md) |
| 5 | HSR | Confirmed correct by converging sources; primary-access limits recorded | [hsr](daily-reset-clocks/hsr.md) |
| 6 | WuWa | Supported correct; regional secondary evidence, old-guide conflicts | [wuwa](daily-reset-clocks/wuwa.md) |
| 7 | ZZZ | Supported correct; secondary region/DST evidence, source typos rejected | [zzz](daily-reset-clocks/zzz.md) |

Progress: **7/7 research stages**. NTE core clock remains unresolved. Synthesis and final checks next.
