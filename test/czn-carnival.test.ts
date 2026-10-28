import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parsePrydwenCzn } from "../src/ingest/parsers/prydwen-czn.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor, dayOnlyEnd } from "../src/shared/time.ts";
import { detailHtml } from "./helpers/verified-records.tsx";
const reviewed = materializeReviewedBatch(await Bun.file('data/reviewed/czn.json').json()).events;
const ids = ['czn:nightmare-carnival:2026-10-21','czn:nightmare-carnival-additional-aether:2026-10-21'];
const cards = reviewed.filter(e => ids.includes(e.id));

test('Carnival carries the free-attempt warning once; Aether retains its earlier independent date-only cutoff', () => {
  expect(cards.map(e => e.id)).toEqual(ids);
  const [parent, aether] = cards;
  expect(parent!.endsAt).toBe('2026-12-02T00:00:00.000Z');
  expect(aether!.endsAt).toBe('2026-11-11T00:00:00.000Z');
  expect(parent!.summary).toContain('unused free attempts expire');
  expect(parent!.summary).toContain('10 per qualifying login day for 7 days');
  expect(reviewed.filter(e => /70 free Normal Rescues/i.test(e.summary ?? ''))).toHaveLength(1);
  for (const e of cards) {
    expect(e).toMatchObject({ startPrecision:'day', startsAt:'2026-10-21T00:00:00.000Z', endPrecision:'day',
      regionScoped:false, regionEnds:null, extractionMethod:'manual', provenanceStatus:'official', sourceUrl:'https://czn.gg/10-21wed-update-notice/' });
    expect(dayOnlyEnd(e)).toBe(true);
    for (const region of Region.options) expect(detailHtml(e,region,Date.parse('2026-10-28T12:00:00Z'))).toContain('Time unconfirmed');
  }
  for (const region of Region.options) {
    expect(clockFor(aether!,region,Date.parse('2026-11-13T12:00:00Z')).ended).toBe(true);
    expect(clockFor(parent!,region,Date.parse('2026-11-13T12:00:00Z')).live).toBe(true);
    expect(clockFor(parent!,region,Date.parse('2026-12-04T12:00:00Z')).upcoming).toBe(false);
    expect(clockFor(parent!,region,Date.parse('2026-12-04T12:00:00Z')).ended).toBe(true);
  }
});

test('healthy banner-only source keeps the two reviewed reward windows once and other winners unchanged', async () => {
  const parsed=parsePrydwenCzn(await Bun.file('snapshots/czn-prydwen-banners.html').text(), {game:'czn',sourceId:'czn-prydwen-banners',sourceUrl:'https://www.prydwen.gg/chaos-zero-nightmare/banners',now:'2026-10-28T12:00:00.000Z'});
  expect(parsed.every(e=>e.type==='banner')).toBe(true);
  const before=mergeEvents([reviewed.filter(e=>!ids.includes(e.id)),parsed]);
  const after=mergeEvents([reviewed,parsed,cards]);
  expect(after.events.filter(e=>!ids.includes(e.id))).toEqual(before.events);
  expect(after.conflicts).toEqual(before.conflicts);
  for(const e of cards) expect(after.events.filter(m=>m.id===e.id)).toEqual([e]);
});
