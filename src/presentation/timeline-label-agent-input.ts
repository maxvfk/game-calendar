import { z } from "zod";
import type { buildTimelineQueue } from "./timeline-labels.ts";

const text = z.string().min(1).max(750).refine(value => value.trim() === value, "must be trimmed");
const preferredExample = z.object({
  eventId: text,
  originalIdentity: text,
  approvedLabel: text,
  why: text,
}).strict();

/** Human-reviewed instructions: never inferred from ChatGPT Memory or a prior chat. */
export const TimelineLabelPreferences = z.object({
  schemaVersion: z.literal(1),
  preferencesVersion: z.literal("v1"),
  language: z.literal("en"),
  objective: text,
  decisionRules: z.object({
    label: text, keep_original: text, needs_research: text,
  }).strict(),
  editorialPreferences: z.array(text).min(1).max(30),
  operatorApprovedExamples: z.array(preferredExample).min(1).max(20),
  outputContract: z.array(text).min(1).max(20),
  /** Generic words a label may add beyond its event's own text; the accept guard
   * allows these and nothing else. Lowercase words only, so never a name or number. */
  labelVocabulary: z.array(z.string().regex(/^[a-z]{2,40}$/)).max(200).optional(),
}).strict();

export type TimelineLabelPreferences = z.infer<typeof TimelineLabelPreferences>;

/** Keep the existing top-level queue contract intact for the single-file agent input. */
export function bundleTimelineLabelAgentInput(
  queue: ReturnType<typeof buildTimelineQueue>,
  preferencesInput: unknown,
) {
  return { ...queue, editorialPreferences: TimelineLabelPreferences.parse(preferencesInput) };
}
