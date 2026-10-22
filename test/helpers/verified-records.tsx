import { expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EventDetail } from "../../src/client/components/EventDetail.tsx";
import { Timeline } from "../../src/client/components/Timeline.tsx";
import { GameMetaProvider } from "../../src/client/state/gameMeta.tsx";
import { metaFor } from "../../src/shared/games.ts";
import { clockFor, dayOnlyEnd, formatAbsolute } from "../../src/shared/time.ts";
import type { GachaEvent, Region } from "../../src/shared/schema.ts";

export function detailHtml(event: GachaEvent, region: Region, now: number, done = false) {
  return renderToStaticMarkup(<GameMetaProvider value={id => metaFor(id, {})}><EventDetail
    row={{ event, clock: clockFor(event, region, now) }} region={region} now={now}
    completed={done} ignored={false} status={done ? "done" : undefined} effort={undefined} note=""
    daily={false} detectedDaily={false} dailyDays={[]}
    onDaily={() => {}} onToggleDay={() => {}} onIgnore={() => {}} onStatus={() => {}}
    onEffort={() => {}} onNote={() => {}} onClose={() => {}} /></GameMetaProvider>);
}

export function assertExactBoundary(event: GachaEvent, region: Region, end: string) {
  const boundary = Date.parse(end);
  expect(dayOnlyEnd(event)).toBe(false);
  for (const delta of [-1, 0, 1]) {
    const now = boundary + delta;
    const row = { event, clock: clockFor(event, region, now) };
    expect(row.clock.endsMs).toBe(boundary);
    expect(row.clock.msRemaining).toBe(0 - delta);
    expect(row.clock.ended).toBe(delta >= 0);
    const detail = detailHtml(event, region, now);
    expect(detail).toContain(formatAbsolute(boundary, true));
    expect(detail).not.toContain("Time unconfirmed");
    const visible = [row].filter(r => !r.clock.ended);
    const timeline = renderToStaticMarkup(<GameMetaProvider value={id => metaFor(id, {})}>
      <Timeline rows={visible} now={now} dayWidth={72} group="ending" onGroup={() => {}}
        onZoom={() => {}} showUpcoming splitUpcoming onOpen={() => {}} isDone={() => false} />
    </GameMetaProvider>);
    expect(timeline.includes(event.title.replaceAll("'", "&#x27;"))).toBe(delta < 0);
  }
}
