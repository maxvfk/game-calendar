import { expect, test } from "bun:test";
import { DATE_LIMITS, readDateSpans } from "../src/editorial/date-spans.ts";

test("month names, explicit years, ordinals and several separate ranges retain original offsets", () => {
  const raw = "🧭 Oct. 19, 2026 – November 2nd, 2026; deadline October 29, 2026. 12 November 2026";
  const read = readDateSpans(raw);
  expect(read.spans.map(s => [s.quote, s.value.date, s.role])).toEqual([
    ["Oct. 19, 2026", "2026-10-19", "start"], ["November 2nd, 2026", "2026-11-02", "end"],
    ["October 29, 2026", "2026-10-29", "single"], ["12 November 2026", "2026-11-12", "single"],
  ]);
  expect(read.diagnostics).toEqual([]);
  for (const s of read.spans) { expect(raw.slice(s.start, s.end)).toBe(s.quote); expect(s.value.instant).toBeNull(); expect(s.value.precision).toBe("day"); }
});
test("numeric dates are locale independent, with explicit offsets and seconds", () => {
  const r = readDateSpans("2026/10/19 10:00 (UTC+8) ~ 2026-11-02T03:59:30+01:00; 10/29/2026; 29.10.2026; 10/11/2026; 10/29/26");
  expect(r.spans.map(s => s.value.instant)).toEqual(["2026-10-19T02:00:00.000Z", "2026-11-02T02:59:30.000Z", null, null, null, null]);
  expect(r.spans[1]!.value.precision).toBe("second");
  expect(r.spans[2]!.value.date).toBe("2026-10-29");
  expect(r.spans[3]!.value.date).toBe("2026-10-29");
  expect(r.spans[4]!.uncertainty).toContain("ambiguous_numeric_order");
  expect(r.spans[5]!.uncertainty).toContain("ambiguous_short_year");
});
test("no inferred year, shared range year, timezone or server offset", () => {
  const r = readDateSpans("October 19 – November 2, 2026; 2026/10/29 04:00 (server time); 2026/10/30 10:00; 2026-11-01 10:00 (CST)");
  expect(r.spans[0]!.value.date).toBeNull();
  expect(r.spans[0]!.uncertainty).toEqual(["missing_year"]);
  expect(r.spans.slice(2).map(s => s.uncertainty)).toEqual([["unsupported_timezone"], ["missing_offset"], ["unsupported_timezone"]]);
  expect(r.spans.every(s => s.value.instant === null)).toBe(true);
});
test("invalid calendar days, clocks and offsets never normalize into valid instants", () => {
  const r = readDateSpans("2026-02-30 10:00 UTC; 2026-10-29 25:00 UTC; 2026-10-29 10:00 UTC+15; 2026-10-29 10:00 UTC+14:30; 2026-10-29 10:00 UTC-0:30");
  expect(r.spans.map(s => s.uncertainty)).toEqual([["invalid_date"], ["invalid_clock"], ["invalid_offset"], ["invalid_offset"], []]);
  expect(r.spans[4]!.value.instant).toBe("2026-10-29T10:30:00.000Z");
});
test("markup/entity decoding preserves verbatim source positions and does not read attributes or URLs", () => {
  for (const format of ["html", "markdown", "bbcode"] as const) {
    const raw = '🧭 <t title="2026-01-01 >">2026/10/29&nbsp;04:00 (UTC+8)</t> [b]November 2, 2026[/b] ![image](https://example.org/2026/01/02.png)';
    const r = readDateSpans(raw, format);
    expect(r.spans.map(s => s.value.date)).toEqual(["2026-10-29", "2026-11-02"]);
    expect(r.spans[0]!.quote).toBe("2026/10/29&nbsp;04:00 (UTC+8)");
    for (const s of r.spans) expect(raw.slice(s.start, s.end)).toBe(s.quote);
  }
});
test("source content is inert and malformed/unsupported dates remain visible", () => {
  const r = readDateSpans('<script>throw new Error("2026-01-01")</script><p>2026-11-02</p><t bad="unterminated>2026-10-29', "html");
  expect(r.spans.map(s => s.value.date)).toEqual(["2026-11-02"]);
  expect(r.diagnostics).toEqual(["active_content_omitted", "malformed_markup"]);
  expect(readDateSpans("after maintenance, tomorrow at 04:00").diagnostics).toEqual(["no_recognized_dates", "unresolved_date_expression"]);
});
test("explicit regional labels are retained without deriving offsets", () => {
  const r = readDateSpans("Asia: 2026-11-02 04:00 UTC+8\nEurope: 2026-11-02 04:00 UTC+1\nAmerica: 2026-11-02 04:00 UTC-5");
  expect(r.spans.map(s => s.region)).toEqual(["asia", "europe", "america"]);
});
test("work and output ceilings fail visibly, never certify a truncated notice", () => {
  expect(readDateSpans("x".repeat(DATE_LIMITS.inputUnits + 1))).toMatchObject({ complete: false, spans: [], diagnostics: ["input_limit"] });
  const r = readDateSpans("November 2, 2026; ".repeat(DATE_LIMITS.spans + 1));
  expect(r.complete).toBe(false); expect(r.spans).toHaveLength(256); expect(r.diagnostics).toContain("span_limit");
  expect(readDateSpans("undated notice")).toMatchObject({ spans: [], diagnostics: ["no_recognized_dates"] });
});
