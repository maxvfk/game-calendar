import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
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


for (const mode of ["create", "migrate"] as const) test(`B1/P2-D ${mode}: portable paths and parent symlinks refuse without files; internal writes stay exclusive`, () => {
  const dir = mkdtempSync(join(tmpdir(), "notice-paths-"));
  const cli = resolve("scripts/notice-coverage-report.ts");
  try {
    const title = "Synthetic path-guard notice", content = "October 29, 2026";
    const notices = Object.entries(ARTICLE_SOURCE_GAMES).map(([sourceId, game]) => ({ sourceId, game, position: 0, noticeId: "path-test", sourceUrl: `https://example.org/${sourceId}`,
      title, content, contentHash: noticeContentHash(title, content), format: "markdown" as const, capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: null }));
    const evidenceFile = join(dir, "evidence.json"), legacyFile = join(dir, "legacy.json");
    writeFileSync(evidenceFile, JSON.stringify(buildEvidenceSidecar({ candidates: [], diagnostics: [], notices, articleAttributions: [] }, [])));
    writeFileSync(legacyFile, JSON.stringify({ schemaVersion: 1, purpose: "initial-notification-suppression-only", entries: notices.map(n => ({ sourceId: n.sourceId, noticeId: n.noticeId, sourceUrl: n.sourceUrl, contentHash: n.contentHash, format: n.format, position: 0 })) }));
    const args = (output: string) => mode === "create" ? [process.execPath, cli, "--sidecar", evidenceFile, "--create-baseline", output] :
      [process.execPath, cli, "--migrate-baseline", legacyFile, "--output", output];
    // Windows syntax is intentionally passed unchanged to Linux child processes.
    // Without a portable guard these are writable literal filenames here, so
    // failure cannot be falsely explained by a missing directory or drive.
    const prohibited = [
      String.raw`public\baseline.json`, String.raw`PuBlIc\baseline.json`,
      String.raw`C:\project\PUBLIC\baseline.json`, String.raw`\\server\share\Public\baseline.json`,
      String.raw`folder/PuBlIc\baseline.json`, "C:/project/PUBLIC/baseline.json",
      "public/baseline.json", join(dir, "public", "absolute.json"), "Public/uppercase.json",
    ];
    for (const output of prohibited) {
      const target = resolve(dir, output);
      mkdirSync(dirname(target), { recursive: true }); // An unguarded open would succeed.
      const result = Bun.spawnSync(args(output), { cwd: dir });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("Coverage state cannot be written under public/");
      expect(existsSync(target)).toBe(false);
    }
    // P2-D: real parent symlinks must not bypass the lexical guard.
    const realPublic = join(dir, "public"), alias = join(dir, "alias");
    mkdirSync(join(realPublic, "nested"), { recursive: true });
    symlinkSync(realPublic, alias, "dir");
    for (const [output, realOutput] of [["alias/symlink.json", join(realPublic, "symlink.json")],
      ["alias/nested/nested.json", join(realPublic, "nested", "nested.json")]]) {
      const result = Bun.spawnSync(args(output!), { cwd: dir });
      expect(result.exitCode).not.toBe(0); expect(result.stderr.toString()).toContain("Coverage state cannot be written under public/");
      expect(existsSync(realOutput!)).toBe(false);
    }
    const privateDir = join(dir, "private"); mkdirSync(privateDir);
    symlinkSync(privateDir, join(dir, "internal-alias"), "dir");
    for (const output of ["work/baseline.json", "publicity/baseline.json", "internal-alias/baseline.json"]) {
      const target = resolve(dir, output); mkdirSync(dirname(target), { recursive: true });
      const first = Bun.spawnSync(args(output), { cwd: dir });
      expect(first.exitCode).toBe(0);
      const bytes = readFileSync(target); expect(JSON.parse(bytes.toString()).entries).toHaveLength(5);
      expect(Bun.spawnSync(args(output), { cwd: dir }).exitCode).not.toBe(0);
      expect(readFileSync(target)).toEqual(bytes);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
