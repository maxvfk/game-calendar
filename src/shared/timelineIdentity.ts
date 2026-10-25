import { z } from "zod";

/** Presentation copy, never an event fact or ID input. No markup/control text. */
export const TimelineTitle = z.string().min(1).max(200).refine(
  value => value === value.trim() && !/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value),
  "timelineTitle must be trimmed, single-line plain text",
);

type Identity = { title: string; recognitionSubjects?: string[] | undefined; timelineTitle?: string | undefined; sourceId?: string | undefined };

/** M1 identity stays available to the review queue, even after label approval. */
export function originalTimelineIdentity(event: Identity): string {
  return event.recognitionSubjects?.length ? event.recognitionSubjects.join(" + ") : event.title;
}

/** The final feed is the approval boundary; custom events never inherit copy. */
export function timelineIdentity(event: Identity): string {
  return event.sourceId !== "you" && event.timelineTitle !== undefined
    ? event.timelineTitle : originalTimelineIdentity(event);
}
