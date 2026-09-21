import { z } from "zod";
import { TRACKED_GAMES } from "../shared/project.ts";
import {
  EventType,
  GachaEvent,
  Precision,
  ProvenanceStatus,
  Region,
  eventId,
  type GameId,
} from "../shared/schema.ts";

export const REVIEWED_SOURCE_URL =
  "https://github.com/maxvfk/game-calendar/tree/main/data/reviewed";

const ReviewedEvent = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  titleRu: z.string().min(1).max(200).optional(),
  type: EventType,
  summary: z.string().max(500).nullable(),
  startsAt: z.string().datetime(),
  startPrecision: Precision,
  endsAt: z.string().datetime().nullable(),
  endPrecision: Precision,
  regionScoped: z.boolean(),
  regionEnds: z.record(Region, z.string().datetime()).nullable(),
  sourceUrl: z.string().url(),
  provenanceStatus: ProvenanceStatus,
  confidence: z.number().min(0).max(1),
});

export const ReviewedBatch = z
  .object({
    schemaVersion: z.literal(1),
    game: z.enum(TRACKED_GAMES),
    reviewedAt: z.string().datetime(),
    reviewedBy: z.string().min(1).max(100),
    statesNoEvents: z.boolean().default(false),
    events: z.array(ReviewedEvent),
  })
  .superRefine((batch, ctx) => {
    if (batch.statesNoEvents && batch.events.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "statesNoEvents can only be true for an empty reviewed batch",
        path: ["statesNoEvents"],
      });
    }

    const ids = new Set<string>();
    batch.events.forEach((event, index) => {
      const id = event.id ?? eventId(batch.game, event.title, event.startsAt);
      if (!id.startsWith(`${batch.game}:`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `event id must start with ${batch.game}:`,
          path: ["events", index, "id"],
        });
      }
      if (ids.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate event id: ${id}`,
          path: ["events", index, "id"],
        });
      }
      ids.add(id);
    });
  });

export type ReviewedBatch = z.infer<typeof ReviewedBatch>;

export interface MaterializedReviewedBatch {
  game: GameId;
  reviewedAt: string;
  reviewedBy: string;
  statesNoEvents: boolean;
  /** Number of schema-valid rows, including leaks hidden from the public feed. */
  parsedCount: number;
  events: GachaEvent[];
}

/**
 * Validate and normalize a human/AI-reviewed file into the public event model.
 * Leak records may be retained in git for review, but are opt-in at publish time.
 */
export function materializeReviewedBatch(
  input: unknown,
  options: { includeLeaks?: boolean } = {},
): MaterializedReviewedBatch {
  const batch = ReviewedBatch.parse(input);
  const sourceId = `reviewed-${batch.game}`;
  const includeLeaks = options.includeLeaks === true;

  const events = batch.events
    .filter((event) => includeLeaks || event.provenanceStatus !== "leak")
    .map((event) =>
      GachaEvent.parse({
        id: event.id ?? eventId(batch.game, event.title, event.startsAt),
        game: batch.game,
        title: event.title,
        ...(event.titleRu === undefined ? {} : { titleRu: event.titleRu }),
        type: event.type,
        summary: event.summary,
        startsAt: event.startsAt,
        startPrecision: event.startPrecision,
        endsAt: event.endsAt,
        endPrecision: event.endPrecision,
        regionScoped: event.regionScoped,
        regionEnds: event.regionEnds,
        sourceUrl: event.sourceUrl,
        sourceId,
        status: "published",
        confidence: event.confidence,
        extractionMethod: "manual",
        provenanceStatus: event.provenanceStatus,
        version: 1,
        firstSeenAt: batch.reviewedAt,
        updatedAt: batch.reviewedAt,
      }),
    );

  return {
    game: batch.game,
    reviewedAt: batch.reviewedAt,
    reviewedBy: batch.reviewedBy,
    statesNoEvents: batch.statesNoEvents,
    parsedCount: batch.events.length,
    events,
  };
}

export async function loadReviewedBatches(
  directory = "data/reviewed",
  options: { includeLeaks?: boolean } = {},
): Promise<Array<MaterializedReviewedBatch & { file: string }>> {
  const files = [...new Bun.Glob("*.json").scanSync(directory)].sort();
  const batches: Array<MaterializedReviewedBatch & { file: string }> = [];
  const seenGames = new Map<GameId, string>();

  for (const relative of files) {
    const file = `${directory}/${relative}`;
    const input: unknown = await Bun.file(file).json();
    const batch = materializeReviewedBatch(input, options);
    const previous = seenGames.get(batch.game);
    if (previous !== undefined) {
      throw new Error(
        `reviewed game ${batch.game} appears in both ${previous} and ${file}`,
      );
    }
    seenGames.set(batch.game, file);
    batches.push({ file, ...batch });
  }

  return batches;
}
