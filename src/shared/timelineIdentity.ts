import { z } from "zod";

/** Presentation copy, never an event fact or ID input. No markup/control text. */
export const TimelineTitle = z.string().min(1).max(200).refine(
  value => value === value.trim() && !/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value),
  "timelineTitle must be trimmed, single-line plain text",
);

export const TimelineLabelLanguage = z.enum(["en", "ru"]);
export type TimelineLabelLanguage = z.infer<typeof TimelineLabelLanguage>;

type Identity = {
  title: string;
  recognitionSubjects?: string[] | undefined;
  timelineTitle?: string | undefined;
  timelineTitleRu?: string | undefined;
  titleRu?: string | undefined;
  sourceId?: string | undefined;
};

/** M1 identity stays available to the review queue, even after label approval. */
export function originalTimelineIdentity(event: Identity): string {
  return event.recognitionSubjects?.length ? event.recognitionSubjects.join(" + ") : event.title;
}

/** The final feed is the approval boundary; custom events never inherit copy. */
export function timelineIdentity(event: Identity, language: TimelineLabelLanguage = "en"): string {
  if (event.sourceId === "you") return event.title;
  const localized = language === "ru" ? event.timelineTitleRu ?? event.titleRu : undefined;
  return localized ?? event.timelineTitle ?? originalTimelineIdentity(event);
}

/** English detail headings use approved copy or the canonical title. */
export function detailTitle(event: Identity, language: TimelineLabelLanguage = "en"): string {
  if (language === "ru") return timelineIdentity(event, language);
  return event.sourceId !== "you" && event.timelineTitle !== undefined ? event.timelineTitle : event.title;
}
