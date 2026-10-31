import { describe, expect, test } from "bun:test";
import { apiSystemPrompt, deepSeekProposals, deepSeekRequest } from "../scripts/timeline-label-agent/run-deepseek.ts";
import { buildTimelineQueue } from "../src/presentation/timeline-labels.ts";
import { bundleTimelineLabelAgentInput } from "../src/presentation/timeline-label-agent-input.ts";
import { GachaEvent } from "../src/shared/schema.ts";
import { EventFeed } from "../src/shared/feed.ts";

const prompt = await Bun.file("scripts/timeline-label-agent/system-prompt.md").text();
const schema = await Bun.file("scripts/timeline-label-agent/decisions.schema.json").json();
const id = { eventId: "hsr:test:2026-10-31", fingerprint: "sha256:" + "a".repeat(64) };
const input = { rulesVersion: "v1", editorialPreferences: { namingRule: "Use existing facts only" }, events: [id] };
const decision = { ...id, rulesVersion: input.rulesVersion, decision: "keep_original" };
const response = (content: string, finish_reason = "stop") =>
  ({ choices: [{ finish_reason, message: { content } }] });

describe("DeepSeek timeline-label provider (offline)", () => {
  test("maps Claude output instruction without modifying Claude's prompt", () => {
    const neutral = apiSystemPrompt(prompt, schema);
    expect(prompt).toContain("StructuredOutput tool");
    expect(neutral).not.toContain("StructuredOutput tool");
    expect(neutral).toContain("untrusted data");
    expect(neutral).toContain("Never invent characters, rewards, dates or certainty");
    expect(neutral).toContain('"schemaVersion"');
    expect(neutral).toContain('"decisions"');
    expect(neutral).toContain("TOP-LEVEL input field");
  });
  test("uses non-thinking JSON output, the same input, and no tools", () => {
    const req = deepSeekRequest(input, prompt, schema);
    expect(req.model).toBe("deepseek-flash");
    expect(req.thinking).toEqual({ type: "disabled" });
    expect(req.response_format).toEqual({ type: "json_object" });
    expect(req).not.toHaveProperty("tools");
    const messages = req.messages as Array<{ content: string }>;
    expect(messages[1]!.content).toContain(id.fingerprint);
    expect(messages[1]!.content).toContain("Use existing facts only");
  });
  test("accepts a complete or empty batch", () => {
    expect(deepSeekProposals(response(JSON.stringify({ schemaVersion: 1, decisions: [decision] })), input))
      .toEqual({ schemaVersion: 1, decisions: [decision] });
    expect(deepSeekProposals(response('{"schemaVersion":1,"decisions":[]}'), { rulesVersion: "v1", events: [] }))
      .toEqual({ schemaVersion: 1, decisions: [] });
  });
  test("accepts the real buildTimelineQueue/bundled agent-input shape", async () => {
    const at = "2026-10-31T00:00:00.000Z";
    const event = GachaEvent.parse({
      id: id.eventId, game: "hsr", title: "Example Event", type: "other", summary: null,
      startsAt: at, startPrecision: "exact", endsAt: "2026-11-30T00:00:00.000Z",
      endPrecision: "exact", regionScoped: false, regionEnds: null,
      sourceUrl: "https://example.test/event", sourceId: "test", status: "published",
      confidence: 1, extractionMethod: "parser", provenanceStatus: "official",
      version: 1, firstSeenAt: at, updatedAt: at,
    });
    const feed = EventFeed.parse({ schemaVersion: 1, generatedAt: at, events: [event], sources: [] });
    const queue = buildTimelineQueue(feed, { schemaVersion: 1, decisions: [] }, at);
    const preferences = await Bun.file("data/presentation/timeline-label-preferences.v1.json").json();
    const actual = bundleTimelineLabelAgentInput(queue, preferences);
    expect(actual.events).toHaveLength(1);
    expect(actual.events[0]).not.toHaveProperty("rulesVersion");
    expect(actual.rulesVersion).toBeTruthy();
    const outgoing = deepSeekRequest(actual, prompt, schema);
    expect(outgoing.model).toBe("deepseek-flash");
    const actualDecision = { eventId: actual.events[0]!.eventId,
      fingerprint: actual.events[0]!.fingerprint, rulesVersion: actual.rulesVersion,
      decision: "keep_original" };
    expect(deepSeekProposals(response(JSON.stringify({
      schemaVersion: 1, decisions: [actualDecision],
    })), actual).decisions).toEqual([actualDecision]);
  });
  test("rejects missing, changed, or invented decisions", () => {
    for (const bad of [
      { schemaVersion: 1, decisions: [] },
      { schemaVersion: 1, decisions: [{ ...decision, eventId: "wrong" }] },
      { schemaVersion: 1, decisions: [{ ...decision, fingerprint: "sha256:" + "b".repeat(64) }] },
      { schemaVersion: 1, decisions: [{ ...decision, rulesVersion: "another" }] },
      { schemaVersion: 1, decisions: [{ ...decision, decision: "invented" }] },
      { schemaVersion: 2, decisions: [decision] },
    ]) expect(() => deepSeekProposals(response(JSON.stringify(bad)), input)).toThrow();
  });
  test("rejects truncated, whitespace, malformed, and unfinished responses", () => {
    const valid = JSON.stringify({ schemaVersion: 1, decisions: [decision] });
    for (const bad of [response("   "), response("{"), response(valid, "length"), { choices: [] }]) {
      expect(() => deepSeekProposals(bad, input)).toThrow();
    }
  });
  test("rejects invalid input before issuing a request", () => {
    expect(() => deepSeekRequest({ ...input, events: [{ ...id, eventId: "" }] }, prompt, schema)).toThrow();
    expect(() => deepSeekRequest({ ...input, events: "wrong" }, prompt, schema)).toThrow();
    expect(() => deepSeekRequest({ events: [id] }, prompt, schema)).toThrow("root rulesVersion");
  });
});

const scheduled = await Bun.file(".github/workflows/timeline-labels.yml").text();
const probe = await Bun.file(".github/workflows/timeline-labels-probe.yml").text();

describe("GitHub Actions provider isolation", () => {
  test("DeepSeek defaults and preserved Claude options in both workflows", () => {
    for (const wf of [scheduled, probe]) {
      expect(wf).toContain("options: [deepseek-flash, sonnet, opus]");
      expect(wf).toContain("default: deepseek-flash");
      expect(wf).toContain("run: bash scripts/timeline-label-agent/run-model.sh");
      expect(wf).toContain("run: bun scripts/timeline-label-agent/run-deepseek.ts");
      expect(wf.match(/secrets\.CLAUDE_CODE_OAUTH_TOKEN/g)?.length).toBe(1);
      expect(wf.match(/secrets\.DEEPSEEK_API_KEY/g)?.length).toBe(1);
      expect(wf).toContain("env.MODEL != 'deepseek-flash'");
      expect(wf).toContain("env.MODEL == 'deepseek-flash'");
    }
    expect(scheduled).toContain("vars.TIMELINE_LABEL_MODEL || 'deepseek-flash'");
  });
  test("the write job has neither provider credential", () => {
    const record = scheduled.split("\n  record:\n")[1]!;
    expect(record).not.toContain("secrets.");
    expect(record).not.toContain("DEEPSEEK_API_KEY");
    expect(record).not.toContain("CLAUDE_CODE_OAUTH_TOKEN");
    expect(probe).toContain("permissions:\n  contents: read");
    expect(probe).not.toContain("contents: write");
  });
});
