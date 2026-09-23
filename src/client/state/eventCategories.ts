import type { EventType } from "../../shared/schema.ts";

export const EVENT_CATEGORIES = [
  { id: "banner", label: "Banners", badge: "Banner", short: "Bn" },
  { id: "event", label: "Events", badge: "Event", short: "Ev" },
  { id: "challenge", label: "Endgame / challenge", badge: "Challenge", short: "Ch" },
  { id: "login", label: "Login / rewards", badge: "Login", short: "Lg" },
  { id: "shop", label: "Shop / exchange", badge: "Shop", short: "Sh" },
  { id: "maintenance", label: "Maintenance", badge: "Maintenance", short: "Mt" },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]["id"];

/** Existing feed types stay unchanged; related event types share one filter. */
export function categoryFor(type: EventType): EventCategory {
  if (type === "story" || type === "rerun" || type === "other") return "event";
  return type;
}

export function categoryBadge(type: EventType): string {
  return EVENT_CATEGORIES.find((category) => category.id === categoryFor(type))!.badge;
}

export function categoryShort(type: EventType): string {
  return EVENT_CATEGORIES.find((category) => category.id === categoryFor(type))!.short;
}

/** A fresh reader sees everything; an empty selection is a deliberate choice. */
export function allCategories(): EventCategory[] {
  return EVENT_CATEGORIES.map((category) => category.id);
}

export function restoreCategories(incoming: unknown): EventCategory[] {
  if (!Array.isArray(incoming)) return allCategories();
  return allCategories().filter((id) => incoming.includes(id));
}

export function toggleCategory(
  selected: readonly EventCategory[],
  category: EventCategory,
): EventCategory[] {
  return selected.includes(category)
    ? selected.filter((id) => id !== category)
    : EVENT_CATEGORIES.map(({ id }) => id).filter((id) => selected.includes(id) || id === category);
}
