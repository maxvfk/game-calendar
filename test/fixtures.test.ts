import { expect, test } from "bun:test";
import { fixtureCaptureAt } from "../src/ingest/fixtures.ts";

test("captured Markdown and XML fixtures carry their date into source health", () => {
  for (const path of [
    "fixtures/genshin/kqm-ginews-2026-09-23.md",
    "fixtures/hsr/kqm-hsrnews-2026-09-23.md",
    "fixtures/wuwa/kuro-mirror-2026-09-23.xml",
  ]) {
    expect(fixtureCaptureAt(path)).toBe("2026-09-23T00:00:00.000Z");
  }
  expect(fixtureCaptureAt("fixtures/nte/steamnews-official-2026-09-22.json"))
    .toBe("2026-09-22T00:00:00.000Z");
  expect(fixtureCaptureAt("fixtures/czn/prydwen-banners-2026-09-22.html"))
    .toBe("2026-09-22T00:00:00.000Z");
  expect(fixtureCaptureAt("fixtures/wuwa/kuro-mirror.xml")).toBeNull();
});
