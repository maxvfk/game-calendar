// Additive, CLI-free DeepSeek transport for timeline labels; Claude runner stays unchanged.
import { readFile } from "node:fs/promises";

const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-flash";
// The default production reasoning mode is max. Explicit overrides are used by the read-only probe.
export type ReasoningEffort = "none" | "low" | "high" | "max";
export function parseReasoningEffort(value: string | undefined): ReasoningEffort {
  const choice = value ?? "max";
  if (choice === "none" || choice === "low" || choice === "high" || choice === "max") return choice;
  throw new Error("Unsupported DeepSeek reasoning effort: " + choice);
}
type Identity = { eventId: string; fingerprint: string };
// The canonical queue holds rulesVersion once at the root, not on each event.
type AgentInput = { rulesVersion: string; events: Identity[]; [key: string]: unknown };
type Proposals = { schemaVersion: 1; decisions: Record<string, unknown>[] };

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

function agentInput(value: unknown): AgentInput {
  const input = object(value);
  if (typeof input.rulesVersion !== "string" || !input.rulesVersion) {
    throw new Error("Agent input has missing root rulesVersion");
  }
  if (!Array.isArray(input.events) || input.events.length > 100) {
    throw new Error("Agent input must contain at most 100 events");
  }
  for (const raw of input.events) {
    const event = object(raw);
    for (const field of ["eventId", "fingerprint"]) {
      if (typeof event[field] !== "string" || !(event[field] as string)) {
        throw new Error("Agent input has missing event identity fields");
      }
    }
  }
  return input as AgentInput;
}

/** Reuse Claude's exact editorial policy, changing only its StructuredOutput transport. */
export function apiSystemPrompt(claudePrompt: string, schema: unknown): string {
  const marker = "\n6. Return the answer only by calling the StructuredOutput tool";
  const at = claudePrompt.indexOf(marker);
  if (at < 0) throw new Error("Claude output instruction changed; review the API prompt mapping");
  return claudePrompt.slice(0, at) +
    "\n6. Return ONLY a JSON object, not Markdown, containing schemaVersion 1 and exactly one " +
    "decision per input event. Copy rulesVersion from the TOP-LEVEL input field " +
    "(it is not present on individual events). Do not use tools. " +
    "The output MUST conform to this JSON Schema:\n" +
    JSON.stringify(schema) +
    '\nFor no events return {"schemaVersion":1,"decisions":[]}.';
}

export function deepSeekRequest(
  rawInput: unknown, claudePrompt: string, schema: unknown, effort: ReasoningEffort = "max",
): Record<string, unknown> {
  const input = agentInput(rawInput);
  return {
    model: MODEL,
    thinking: { type: effort === "none" ? "disabled" : "enabled" },
    ...(effort === "none" ? {} : { reasoning_effort: effort }),
    response_format: { type: "json_object" },
    // Thinking tokens count toward max_tokens, not just the final JSON. Keep
    // bounded per-request budgets; never publish an incomplete JSON batch.
    max_tokens: effort === "none" ? 8192 : effort === "low" ? 24576 : effort === "high" ? 32768 : 65536,
    stream: false,
    messages: [
      { role: "system", content: apiSystemPrompt(claudePrompt, schema) },
      { role: "user", content: "Apply editorialPreferences from this JSON to its events and return JSON decisions:\n" + JSON.stringify(input) },
    ],
  };
}

export function deepSeekProposals(rawResponse: unknown, rawInput: unknown): Proposals {
  const input = agentInput(rawInput);
  const response = object(rawResponse);
  if (!Array.isArray(response.choices) || response.choices.length !== 1) {
    throw new Error("Unexpected DeepSeek choices");
  }
  const choice = object(response.choices[0]);
  if (choice.finish_reason !== "stop") throw new Error("DeepSeek did not finish normally");
  const content = object(choice.message).content;
  if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek returned empty JSON");
  let parsed: Record<string, unknown>;
  try { parsed = object(JSON.parse(content)); }
  catch { throw new Error("DeepSeek returned invalid JSON"); }
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.decisions) ||
      parsed.decisions.length !== input.events.length) {
    throw new Error("DeepSeek returned incomplete or mismatched decisions");
  }
  const decisions = parsed.decisions.map((raw, i) => {
    const decision = object(raw);
    const event = input.events[i]!;
    if (decision.eventId !== event.eventId || decision.fingerprint !== event.fingerprint ||
        decision.rulesVersion !== input.rulesVersion) {
      throw new Error("DeepSeek changed or reordered an event identity");
    }
    if (!["label", "keep_original", "needs_research"].includes(String(decision.decision))) {
      throw new Error("DeepSeek returned an unknown decision");
    }
    return decision;
  });
  return { schemaVersion: 1, decisions };
}

async function main(): Promise<void> {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error("Usage: run-deepseek.ts <agent-input.json> <proposals.json>");
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY GitHub Actions secret is missing");
  console.log("::add-mask::" + apiKey);
  const input: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const prompt = await readFile(new URL("./system-prompt.md", import.meta.url), "utf8");
  const schema: unknown = JSON.parse(await readFile(new URL("./decisions.schema.json", import.meta.url), "utf8"));
  const effort = parseReasoningEffort(process.env.DEEPSEEK_REASONING_EFFORT);
  const body = JSON.stringify(deepSeekRequest(input, prompt, schema, effort));
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
        body, signal: AbortSignal.timeout(effort === "max" ? 360_000 : 240_000),
      });
    } catch {
      if (attempt === 1) { await Bun.sleep(1500); continue; }
      throw new Error("DeepSeek network request failed after retry");
    }
    if (!response.ok) {
      // Never log provider error bodies, which may echo request content.
      if ((response.status === 429 || response.status >= 500) && attempt === 1) {
        await Bun.sleep(1500);
        continue;
      }
      throw new Error("DeepSeek API returned HTTP " + response.status);
    }
    let raw: unknown;
    try { raw = await response.json(); }
    catch { throw new Error("DeepSeek API returned non-JSON HTTP content"); }
    let proposals: Proposals;
    try { proposals = deepSeekProposals(raw, input); }
    catch (error) {
      // JSON Output can return whitespace or truncated content; retry once.
      if (attempt === 1) { await Bun.sleep(1500); continue; }
      throw error;
    }
    await Bun.write(outputPath, JSON.stringify(proposals, null, 2) + "\n");
    const usage = object(raw).usage;
    const measured = usage && typeof usage === "object" && !Array.isArray(usage)
      ? usage as Record<string, unknown> : {};
    const completionDetails = measured.completion_tokens_details;
    const details = completionDetails && typeof completionDetails === "object" &&
      !Array.isArray(completionDetails) ? completionDetails as Record<string, unknown> : {};
    const tokenCount = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
    const metrics = {
      model: MODEL, effort, decisions: proposals.decisions.length,
      durationMs: Date.now() - startedAt,
      promptTokens: tokenCount(measured.prompt_tokens),
      completionTokens: tokenCount(measured.completion_tokens),
      reasoningTokens: tokenCount(details.reasoning_tokens),
    };
    if (process.env.DEEPSEEK_METRICS_PATH) {
      await Bun.write(process.env.DEEPSEEK_METRICS_PATH, JSON.stringify(metrics, null, 2) + "\n");
    }
    console.log("DeepSeek metrics: " + JSON.stringify(metrics));
    if (usage && typeof usage === "object" && !Array.isArray(usage)) {
      const u = usage as Record<string, unknown>;
      console.log("DeepSeek " + MODEL + ": " + proposals.decisions.length +
        " decisions; input tokens=" + (u.prompt_tokens ?? "?") +
        ", output tokens=" + (u.completion_tokens ?? "?"));
    } else console.log("DeepSeek " + MODEL + ": " + proposals.decisions.length + " decisions");
    return;
  }
  throw new Error("DeepSeek produced no complete response");
}

if (import.meta.main) {
  main().catch(error => {
    console.error("::error::" + (error instanceof Error ? error.message : "Unknown DeepSeek error"));
    process.exitCode = 1;
  });
}
