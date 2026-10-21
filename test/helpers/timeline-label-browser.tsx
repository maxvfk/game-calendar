import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Timeline, boardWindow, timelineX } from "../../src/client/components/Timeline.tsx";
import { GachaEvent } from "../../src/shared/schema.ts";
import { clockFor, DAY } from "../../src/shared/time.ts";
import { GameMetaProvider } from "../../src/client/state/gameMeta.tsx";
import { metaFor } from "../../src/shared/games.ts";
import { asDisplayEvent, CustomEvent, CustomGame, type DisplayEvent } from "../../src/shared/custom.ts";
import type { TimelineGroup } from "../../src/client/state/lanes.ts";

const now = Date.parse("2026-10-20T12:34:00Z");
const custom = CustomGame.parse({ id: "mygame:long-name", name: "A very long custom game name", hue: "#60a5fa", at: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" });
const games = { [custom.id]: custom };
const resolve = (id: string) => metaFor(id, games);
const events: DisplayEvent[] = [
  { title: "An extraordinarily long official event title with a recognizable beginning", game: "genshin", type: "other" },
  { title: "Si", game: "endfield", type: "banner" },
  { title: "Official character banner", recognitionSubjects: ["Vesna"], game: "hsr", type: "banner" },
  { title: "Official weapon banner", recognitionSubjects: ["Weapon Alpha", "Weapon Beta"], game: "zzz", type: "banner" },
  { title: "A day-only challenge without an invented clock time", game: "wuwa", type: "challenge", endPrecision: "day" },
  { title: "An ongoing campaign with an unannounced ending", game: "nte", type: "login", endsAt: null, endPrecision: "unknown" },
  { title: "Conflict in published dates with a long title", game: "czn", type: "shop" },
  { title: "Future event extends the board for offscreen-tail checks", game: "hsr", type: "story", startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-20T00:00:00Z" },
].map((input, i) => GachaEvent.parse({
  id: `${input.game}:label-${i}:2026-09-01`, summary: null,
  startsAt: "2026-09-01T00:00:00Z", startPrecision: "exact",
  endsAt: "2026-10-26T12:34:00Z", endPrecision: "exact",
  regionScoped: false, regionEnds: null, sourceUrl: "https://example.test/event",
  sourceId: "test", status: "published", confidence: 1, extractionMethod: "parser", version: 1,
  firstSeenAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", ...input,
}));
events.push(asDisplayEvent(CustomEvent.parse({
  id: "myevent:longname", game: custom.id, title: "My custom event deserves a useful title fragment",
  type: "maintenance", startsAt: "2026-09-01T00:00:00Z", startPrecision: "exact",
  endsAt: "2026-10-26T12:34:00Z", endPrecision: "exact", summary: null, repeat: null,
  at: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
})));
const rows = events.map(event => ({ event, clock: clockFor(event, "europe", now),
  ...(event.game === "czn" ? { conflicts: [{ eventId: event.id, field: "endsAt" as const, keptUrl: "https://example.test/a", otherUrl: "https://example.test/b" }] } : {}),
}));
type Settings = { group: TimelineGroup; dayWidth: number };
declare global { interface Window { labelTest: { patch: (p: Partial<Settings>) => void; offset: (days: number) => void } } }
function App() {
  const [settings, setSettings] = useState<Settings>({ group: "ending", dayWidth: 72 });
  window.labelTest = {
    patch: p => setSettings(s => ({ ...s, ...p })),
    offset: days => {
      const min = boardWindow(rows.map(r => r.clock.startsMs), rows.map(r => r.clock.endsMs ?? now), now).min;
      document.querySelector(".scroll-pane")!.scrollLeft = timelineX(now + days * DAY, min, settings.dayWidth);
    },
  };
  return <main style={{ margin: "16px auto", maxWidth: 1200 }}>
    <h1>Timeline label regression fixture</h1>
    <GameMetaProvider value={resolve}><Timeline {...settings} rows={rows} now={now}
      onGroup={group => setSettings(s => ({ ...s, group }))} onZoom={dayWidth => setSettings(s => ({ ...s, dayWidth }))}
      showUpcoming splitUpcoming onOpen={() => {}} isDone={() => false} /></GameMetaProvider>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
