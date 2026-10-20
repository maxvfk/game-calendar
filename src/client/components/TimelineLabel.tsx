import { useLayoutEffect, useRef, useState } from "react";
import type { EventType } from "../../shared/schema.ts";
import type { TimelineGroup } from "../state/lanes.ts";
import { fitTimelineContent, type ContentWidths } from "../state/timelineContent.ts";
import { TypeBadge } from "./TypeBadge.tsx";

const GAME_CLASS = "eyebrow shrink-0 truncate text-[0.5625rem]";

/** Fit the sticky payload to its visible intersection, not the event duration. */
export function TimelineLabel({ identity, deadline, unknown, dayOnly, type, game, hue, mode, available, disputed, urgency }: {
  identity: string; deadline: string; unknown: boolean; dayOnly: boolean;
  type: EventType; game: string; hue: string; mode: TimelineGroup;
  available: number; disputed: boolean; urgency: string;
}) {
  const measure = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<(ContentWidths & { indicators: number }) | null>(null);
  useLayoutEffect(() => {
    const el = measure.current;
    if (!el) return;
    const read = () => {
      const children = Array.from(el.children).map(child => child.getBoundingClientRect().width);
      const [game = 0, type = 0, identity = 0, deadline = 0, compactUnknown = 0, ellipsis = 0, indicators = 0] = children;
      const next = { game, type, identity, deadline, compactUnknown, ellipsis, indicators,
        gap: parseFloat(getComputedStyle(el).columnGap) || 0 };
      setWidths(old => old && Object.keys(next).every(key => old[key as keyof typeof next] === next[key as keyof typeof next]) ? old : next);
    };
    read();
    // Includes font loading, browser text scaling and custom game names.
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [game, identity, deadline, type, disputed]);

  const fit = widths === null ? null : fitTimelineContent(
    available - widths.indicators - widths.gap, mode, unknown, widths,
  );
  const indicators = (
    <span className="flex shrink-0 items-center gap-1.5">
      {disputed && <span className="text-soon">!</span>}
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: urgency }} />
    </span>
  );
  return (
    <>
      {/* Off-flow measurement uses exactly the visible styles. It cannot widen
          the board or become a second accessible copy of the event. */}
      <span aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 w-0 overflow-hidden">
      <span ref={measure} className="flex w-max items-center gap-1.5 whitespace-nowrap">
        <span className={GAME_CLASS}>{game}</span>
        <TypeBadge type={type} compact />
        <span>{identity}</span>
        <span>{deadline}</span>
        <span>?</span>
        <span>…</span>
        {indicators}
      </span>
      </span>
      <span aria-hidden className="sticky flex shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap" style={{ left: 8, width: available }} data-timeline-label>
        {fit !== null && <>
          {fit.game > 0 && <span className={GAME_CLASS} style={{ color: hue, maxWidth: fit.game }}>{game}</span>}
          {fit.type && <TypeBadge type={type} compact />}
          {fit.identity > 0 && <span className="shrink-0 truncate" style={{ maxWidth: fit.identity }}>{identity}</span>}
          {fit.deadline !== null && <span className={`shrink-0 text-[0.75rem] ${dayOnly ? "border-b border-dashed border-current" : ""}`} aria-label={unknown ? "End unknown" : undefined}>
            {fit.deadline === "compact" ? "?" : deadline}
          </span>}
        </>}
        {available > 0 && indicators}
      </span>
    </>
  );
}
