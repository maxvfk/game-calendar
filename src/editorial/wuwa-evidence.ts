import type { ParseContext } from "../ingest/adapters/types.ts";
import { wuwaEventSections } from "../ingest/parsers/wuwa-kuro-atom.ts";
import { boundExcerpts, Capture, normalizeEvidence, type Excerpt, type Extraction } from "./event-evidence.ts";

/** Conservative source-template check. Bad/active markup cannot turn into prose. */
function safeMarkup(content: string): boolean {
  const stack: string[] = [];
  const allowed = new Set(["p", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "a", "strong", "b", "em", "i", "br", "img"]);
  for (const token of content.matchAll(/<[^>]*>/g)) {
    const tag = /^<(\/?)([a-z][a-z0-9]*)\b[^>]*>$/i.exec(token[0]);
    if (!tag || !allowed.has(tag[2]!.toLowerCase())) return false;
    const name = tag[2]!.toLowerCase();
    if (["img", "br"].includes(name) || /\/\s*>$/.test(token[0])) continue;
    if (tag[1]) { if (stack.pop() !== name) return false; }
    else stack.push(name);
  }
  return stack.length === 0 && !content.replace(/<[^>]*>/g, "").includes("<");
}
const instruction = /\b(?:ignore|disregard|override|system|assistant|developer|prompt|instructions?|tool|api|secret|password|execute|output json)\b|\[INST\]|```/i;
const conditionalReward = (line: string) => /^\[Log in for \d+ days? in total\]:\s*.+/i.test(line);
const duration = /^(?:Duration\b|20\d{2}-|Version \d+\.\d+ [Uu]pdate)/i;
const boundary = /^\[[^\]]+\]|^(?:New |Convene Rules|Eligibility|Notes\b|Maintenance\b|For more details)/i;

/** Pure parallel extraction. ParseContext and source bytes are identical to the feed parse. */
export function extractWuwaEvidence(raw: string, ctx: ParseContext, capture: Capture): Extraction {
  capture = Capture.parse(capture);
  const result: Extraction = { candidates: [], diagnostics: [] };
  const sections = wuwaEventSections(raw, ctx, true);
  const canonical = wuwaEventSections(raw, ctx);
  const markup = new Map<string, boolean>();
  for (const section of sections) {
    const { event } = section;
    const diagnose = (code: string) => result.diagnostics.push({ code, sourceEventId: event.id, sourceUrl: event.sourceUrl, detail: "WuWa event-local extraction omitted uncertain or unbounded source text" });
    if (!canonical.some(s => s.event.id === event.id && s.event.title === event.title && s.event.type === event.type &&
      s.event.sourceUrl === event.sourceUrl && s.event.startsAt === event.startsAt && s.event.endsAt === event.endsAt &&
      JSON.stringify(s.event.regionEnds) === JSON.stringify(event.regionEnds))) {
      diagnose("source_candidate_mismatch"); continue;
    }
    const duplicates = sections.filter(s => s.event.id === event.id && s.event.sourceUrl === event.sourceUrl);
    if (section.repeatedHeading || duplicates.length !== 1) { diagnose("repeated_event_heading"); continue; }
    if (!markup.has(event.sourceUrl)) markup.set(event.sourceUrl, safeMarkup(section.content));
    if (!markup.get(event.sourceUrl)) { diagnose("unsafe_markup"); continue; }
    let lines = section.lines.map(normalizeEvidence);
    const unknownHeading = (line: string) => section.headings.map(normalizeEvidence).includes(line) && !["Duration", "Rewards"].includes(line);
    const firstDuration = lines.findIndex(line => /\(server time\)/i.test(line) && duration.test(line));
    const firstBoundary = lines.findIndex(line => (boundary.test(line) && !conditionalReward(line)) || unknownHeading(line));
    if (firstDuration < 0 || (firstBoundary >= 0 && firstBoundary < firstDuration)) { diagnose("ambiguous_section_boundary"); continue; }
    // Inspect only this section, never the rest of a maintenance/patch article.
    if (firstBoundary >= 0) lines = lines.slice(0, firstBoundary);
    // Never forward model-directed instructions, even inside an otherwise factual paragraph.
    if (lines.some(line => instruction.test(line))) { diagnose("external_instruction"); continue; }
    const facts: Excerpt[] = [];
    if (event.type === "banner") {
      const subject = /Featured Weapon Convene/i.test(section.heading) ? "Weapon" : "Resonator";
      for (const line of lines) {
        if (duration.test(line) || boundary.test(line)) break;
        if (new RegExp(`^During the event, 5-Star ${subject}: .+receive boosted drop rates[!.]$`).test(line)) facts.push({ kind: "featured", text: line });
      }
      if (facts.length > 1) { diagnose("ambiguous_featured"); continue; }
    } else {
      let endedIntro = false, rewards = false;
      for (const line of lines) {
        // Bracketed login reward conditions are facts, not a neighboring heading.
        const isConditionalReward = conditionalReward(line);
        if ((boundary.test(line) || unknownHeading(line)) && !isConditionalReward) break;
        if (duration.test(line)) { endedIntro = true; continue; }
        if (line === "Rewards") { rewards = true; endedIntro = true; continue; }
        if (endedIntro && !rewards) break;
        if (rewards) {
          if (isConditionalReward || /^(?:Astrite|Radiant Tide|Lustrous Tide|Forging Tide)\b.*\bx\d/i.test(line)) facts.push({ kind: "rewards", text: line });
          else break;
        } else if (/\b(?:tapping|complete|combat|battle|explor\w*|log in|challenges?|collect\w*|participate|exchange\w*|obtain|rewards?)\b/i.test(line)) {
          facts.push({ kind: /\b(?:reward|exchange|obtain)\w*\b/i.test(line) ? "rewards" : "activity", text: line });
        } else if (facts.length) {
          // A continuation with no known role may qualify the preceding fact. Omit the section.
          diagnose("unknown_continuation"); facts.length = 0; break;
        }
      }
    }
    const excerpts = boundExcerpts(facts, diagnose);
    if (!excerpts.length) { diagnose("no_useful_context"); continue; }
    result.candidates.push({ event, source: { sourceEventId: event.id, sourceId: ctx.sourceId, sourceUrl: event.sourceUrl, ...capture, excerpts } });
  }
  return result;
}
