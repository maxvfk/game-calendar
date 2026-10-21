import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Timeline, boardWindow, timelineMsAt, timelineX } from "../../src/client/components/Timeline.tsx";
import { GachaEvent } from "../../src/shared/schema.ts";
import { clockFor, DAY } from "../../src/shared/time.ts";
import type { TimelineGroup } from "../../src/client/state/lanes.ts";

// Deliberately different bounds per game/category. The previous smoke fixture
// always contained a 90-day-old row and therefore never changed the origin.
const now = Date.parse("2026-10-20T12:34:00Z");
const rows = [
  { id: "old", game: "genshin", type: "banner", start: -50, end: 80 },
  { id: "recent", game: "hsr", type: "challenge", start: -10, end: 30 },
  { id: "future", game: "hsr", type: "story", start: 5, end: 100 },
].map(({ id, game, type, start, end }) => {
  const event = GachaEvent.parse({
    id: `${game}:${id}:2026-10-01`, game, type, title: id, summary: null,
    startsAt: new Date(now + start * DAY).toISOString(), startPrecision: "exact",
    endsAt: new Date(now + end * DAY).toISOString(), endPrecision: "exact",
    regionScoped: false, regionEnds: null, sourceUrl: "https://example.test/event",
    sourceId: "test", status: "published", confidence: 1, extractionMethod: "parser", version: 1,
    firstSeenAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
  });
  return { event, clock: clockFor(event, "europe", now) };
});
type Props = {
  rows: typeof rows; now: number; dayWidth: number; group: TimelineGroup;
  showUpcoming: boolean; splitUpcoming: boolean;
};
declare global {
  interface Window {
    timelineTest: {
      patch: (patch: Partial<Props>) => void;
      rows: typeof rows;
      read: () => { ms: number; min: number; max: number; left: number; width: number; limit: number; dayWidth: number };
      inspect: (ms: number) => void;
      leftFor: (ms: number) => number;
      target: number;
    };
  }
}
function App() {
  const [props, setProps] = useState<Props>({ rows, now, dayWidth: 72, group: "game", showUpcoming: true, splitUpcoming: true });
  const plotted = props.rows.filter(r => props.showUpcoming || !r.clock.upcoming);
  const { min, max } = boardWindow(plotted.map(r => r.clock.startsMs), plotted.map(r => r.clock.endsMs!), props.now);
  const pane = () => document.querySelector<HTMLDivElement>(".scroll-pane")!;
  window.timelineTest = {
    patch: patch => setProps(p => ({ ...p, ...patch })), rows, target: now + 10 * DAY,
    read: () => {
      const el = pane();
      return { ms: timelineMsAt(el.scrollLeft + el.clientWidth / 2, min, props.dayWidth), min, max,
        left: el.scrollLeft, width: el.clientWidth, limit: el.scrollWidth - el.clientWidth, dayWidth: props.dayWidth };
    },
    inspect: ms => { const el = pane(); el.scrollLeft = timelineX(ms, min, props.dayWidth) - el.clientWidth / 2; },
    leftFor: ms => timelineX(ms, min, props.dayWidth) - pane().clientWidth / 2,
  };
  return <main style={{ margin: "16px auto", maxWidth: 1200 }}><Timeline {...props}
    onZoom={dayWidth => setProps(p => ({ ...p, dayWidth }))}
    onGroup={group => setProps(p => ({ ...p, group }))} onOpen={() => {}} isDone={() => false} /></main>;
}
createRoot(document.getElementById("root")!).render(<App />);
