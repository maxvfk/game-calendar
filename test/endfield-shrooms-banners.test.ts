import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { Region, eventId } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

/**
 * Endfield banners of the Meeting You in the World o'Shrooms version (news 0740) and the
 * two Sanctuary of Ink banners (news 9560) that ran into it. The wiki Event page carries
 * no banners, so these rows are the only source for them.
 */

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
const find = (title: string) => {
  const found = reviewed.filter(e => e.title === title);
  expect(found).toHaveLength(1);
  return found[0]!;
};

test("dated banners close at 11:59 server time in each region", () => {
  for (const [title, subject, start, asia, west] of [
    ["Anvil, Backpack, Plus A Pot o'Honey", "Kay", "2026-11-25", "2026-12-23T03:59:00.000Z", "2026-12-23T16:59:00.000Z"],
    ["To Every Wish Adrift", "Gilberta", "2026-11-25", "2026-12-16T03:59:00.000Z", "2026-12-16T16:59:00.000Z"],
    ["Floaty Traveler Issue", "Delivery Guaranteed", "2026-11-25", "2026-12-16T03:59:00.000Z", "2026-12-16T16:59:00.000Z"],
  ] as const) {
    const e = find(title);
    expect(e).toMatchObject({ type: "banner", startsAt: `${start}T00:00:00.000Z`, startPrecision: "day",
      provenanceStatus: "official", recognitionSubjects: [subject],
      sourceUrl: "https://endfield.gryphline.com/en-us/news/0740" });
    expect(e.id).toBe(eventId(e.game, e.title, e.startsAt));
    for (const region of Region.options) assertExactBoundary(e, region, region === "asia" ? asia : west);
  }
});

test("The Hearth Fire Beckons the Starry Flow ended at the Nov 25 version maintenance", () => {
  const e = find("The Hearth Fire Beckons the Starry Flow");
  expect(e).toMatchObject({ endsAt: "2026-11-24T22:00:00.000Z", endPrecision: "exact", regionScoped: false,
    recognitionSubjects: ["Argent Flow"] });
  for (const region of Region.options) expect(clockFor(e, region, Date.parse("2026-11-24T22:00:01Z")).ended).toBe(true);
});

test("relative or undated ends stay unknown and never expire on their own", () => {
  // Moongleam and Casual Roamer end after a third Chartered banner that is not announced;
  // Precious Scarlet and Scarlet Claws end "before the next version update", not yet dated.
  for (const title of ["Moongleam Issue", "Casual Roamer Issue", "Precious Scarlet", "Scarlet Claws Issue"]) {
    const e = find(title);
    expect(e).toMatchObject({ endsAt: null, endPrecision: "unknown", regionScoped: false, regionEnds: null,
      provenanceStatus: "official" });
    for (const region of Region.options) expect(clockFor(e, region, Date.parse("2027-01-31T00:00:00Z")).ended).toBe(false);
  }
  expect(find("Precious Scarlet").startsAt).toBe("2026-12-16T00:00:00.000Z");
});
