import type { EventType } from "../../shared/schema.ts";
import { categoryBadge, categoryColor, categoryFor, categoryShort } from "../state/eventCategories.ts";

/** A visual type cue. Timeline may omit it when its full accessible name carries type. */
export function TypeBadge({ type, compact = false }: { type: EventType; compact?: boolean }) {
  const label = categoryBadge(type);
  const color = categoryColor(type);
  return (
    <span
      className="shrink-0 rounded-[3px] border px-1 py-px text-[0.5625rem] font-medium normal-case tracking-normal"
      data-event-category={categoryFor(type)}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 14%, var(--color-ground))`,
      }}
      aria-label={`Type: ${label}`}
      title={label}
    >
      {compact ? categoryShort(type) : label}
    </span>
  );
}
