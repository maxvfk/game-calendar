import type { EventType } from "../../shared/schema.ts";
import { categoryBadge, categoryShort } from "../state/eventCategories.ts";

/** A text cue on every event, including narrow timeline bars. */
export function TypeBadge({ type, compact = false }: { type: EventType; compact?: boolean }) {
  const label = categoryBadge(type);
  return (
    <span
      className="shrink-0 rounded-[3px] border border-hairline bg-ground/70 px-1 py-px text-[0.5625rem] font-medium normal-case tracking-normal text-muted"
      aria-label={`Type: ${label}`}
      title={label}
    >
      {compact ? categoryShort(type) : label}
    </span>
  );
}
