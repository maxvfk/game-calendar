import {
  allCategories,
  EVENT_CATEGORIES,
  toggleCategory,
  type EventCategory,
} from "../state/eventCategories.ts";

/** Multi-select, shared by the checklist and timeline. */
export function TypeFilters({
  selected,
  onChange,
}: {
  selected: readonly EventCategory[];
  onChange: (selected: EventCategory[]) => void;
}) {
  const all = selected.length === EVENT_CATEGORIES.length;
  return (
    <div className="border-b border-hairline px-4 py-2.5">
      <div className="scroll-x flex items-center gap-1.5 whitespace-nowrap pb-1" role="group" aria-label="Event types">
        <button
          type="button"
          aria-pressed={all}
          onClick={() => onChange(allCategories())}
          className={`rounded-full border px-2.5 py-1 text-xs ${all ? "border-ink text-ink" : "border-hairline text-muted"}`}
        >
          All types
        </button>
        {EVENT_CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={selected.includes(id)}
            onClick={() => onChange(toggleCategory(selected, id))}
            className={`rounded-full border px-2.5 py-1 text-xs ${selected.includes(id) ? "border-ink/60 bg-raised text-ink" : "border-hairline text-faint"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
