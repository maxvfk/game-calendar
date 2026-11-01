import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ARTICLE_SOURCE_GAMES, noticeContentHash } from "../src/editorial/article-evidence.ts";
import { buildEvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { emptyBaseline, emptyIgnores } from "../src/editorial/coverage-state.ts";

test("CLI replay is deterministic; baseline creation is explicit/exclusive; missing evidence is not evaluated", () => {
  const dir = mkdtempSync(join(tmpdir(), "notice-coverage-"));
  try {
    const evidenceFile = join(dir, "evidence.json"), eventsFile = join(dir, "events.json"), ignores = join(dir, "ignores.json"), baseline = join(dir, "baseline.json");
    const title = "Synthetic notice", content = "October 29, 2026";
    const notices = Object.entries(ARTICLE_SOURCE_GAMES).map(([sourceId, game]) => ({ sourceId, game, position: 0, noticeId: "synthetic", sourceUrl: `https://example.org/${sourceId}`,
      title, content, contentHash: noticeContentHash(title, content), format: "markdown" as const, capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: null }));
    const side = buildEvidenceSidecar({ candidates: [], diagnostics: [], notices, articleAttributions: [] }, []);
    writeFileSync(evidenceFile, JSON.stringify(side)); writeFileSync(eventsFile, "[]"); writeFileSync(ignores, JSON.stringify(emptyIgnores())); writeFileSync(baseline, JSON.stringify(emptyBaseline()));
    const args = [process.execPath, "scripts/notice-coverage-report.ts", "--sidecar", evidenceFile, "--events", eventsFile, "--ignores", ignores, "--baseline", baseline];
    const first = Bun.spawnSync(args), second = Bun.spawnSync(args);
    expect(first.exitCode).toBe(0); expect(second.exitCode).toBe(0); expect(second.stdout.toString()).toBe(first.stdout.toString());
    const before = readFileSync(baseline, "utf8"); expect(before).toBe(JSON.stringify(emptyBaseline()));
    const newBaseline = join(dir, "launch.json");
    const create = [...args, "--create-baseline", newBaseline];
    expect(Bun.spawnSync(create).exitCode).toBe(0);
    const created = readFileSync(newBaseline, "utf8"); expect(JSON.parse(created).entries).toHaveLength(5);
    expect(Bun.spawnSync(create).exitCode).not.toBe(0); expect(readFileSync(newBaseline, "utf8")).toBe(created);
    const legacy = join(dir, "legacy-positional.json"), migratedFile = join(dir, "migrated.json");
    const createdData = JSON.parse(created);
    writeFileSync(legacy, JSON.stringify({ ...createdData, entries: createdData.entries.map((e: object, i: number) => ({ ...e, position: i + 20 })) }));
    const migrate = [process.execPath, "scripts/notice-coverage-report.ts", "--migrate-baseline", legacy, "--output", migratedFile];
    expect(Bun.spawnSync(migrate).exitCode).toBe(0); expect(readFileSync(migratedFile, "utf8")).toBe(created);
    expect(Bun.spawnSync(migrate).exitCode).not.toBe(0);

    writeFileSync(evidenceFile, "corrupt JSON");
    const missing = Bun.spawnSync(args); expect(missing.exitCode).toBe(0);
    const report = JSON.parse(missing.stdout.toString());
    expect(report.diagnostics).toContain("invalid_notice_inventory"); expect(report.sources.every((s: { evaluation: string }) => s.evaluation === "not evaluated")).toBe(true);
    writeFileSync(ignores, '{"schemaVersion":2,"decisions":[]}');
    expect(Bun.spawnSync(args).exitCode).not.toBe(0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
