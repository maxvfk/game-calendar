import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TypeFilters } from "../src/client/components/TypeFilters.tsx";
import { TypeBadge } from "../src/client/components/TypeBadge.tsx";
import {
  allCategories,
  categoryFor,
  categoryColor,
  EVENT_CATEGORIES,
  toggleCategory,
} from "../src/client/state/eventCategories.ts";
import { defaults, restorePrefsValue } from "../src/client/state/usePrefs.ts";
import { EventType } from "../src/shared/schema.ts";

test("every existing schema type is assigned to exactly one user category", () => {
  expect(EventType.options.map(categoryFor)).toEqual([
    "banner", "event", "event", "challenge", "login", "shop", "maintenance", "event",
  ]);
  expect(new Set(allCategories()).size).toBe(EVENT_CATEGORIES.length);
});

test("multiple categories can be selected without resetting completion preferences", () => {
  const selected = toggleCategory(toggleCategory([], "banner"), "challenge");
  expect(selected).toEqual(["banner", "challenge"]);
  const restored = restorePrefsValue({ visibleCategories: selected, showCompleted: false });
  expect(restored.visibleCategories).toEqual(selected);
  expect(restored.showCompleted).toBe(false);
  expect(toggleCategory(selected, "banner")).toEqual(["challenge"]);
});

test("older and malformed preferences keep all types visible; an empty choice persists", () => {
  expect(restorePrefsValue({}).visibleCategories).toEqual(allCategories());
  expect(restorePrefsValue({ visibleCategories: "banner" }).visibleCategories).toEqual(allCategories());
  expect(restorePrefsValue({ visibleCategories: ["shop", "shop", "unknown"] }).visibleCategories).toEqual(["shop"]);
  expect(restorePrefsValue({ visibleCategories: [] }).visibleCategories).toEqual([]);
  expect(defaults().visibleCategories).toEqual(allCategories());
});

test("filters expose six pressed choices and badges convey type in text", () => {
  const filters = renderToStaticMarkup(<TypeFilters selected={["banner", "shop"]} onChange={() => {}} />);
  expect(filters).toContain('role="group" aria-label="Event types"');
  expect([...filters.matchAll(/aria-pressed="true"/g)]).toHaveLength(2);
  for (const category of EVENT_CATEGORIES) expect(filters).toContain(category.label);
  expect(renderToStaticMarkup(<TypeBadge type="challenge" />)).toContain("Challenge");
  expect(renderToStaticMarkup(<TypeBadge type="shop" compact />)).toContain('aria-label="Type: Shop"');
});

test("stable category colours are independent of game, urgency and aliased event type", () => {
  expect(EventType.options.map(categoryColor)).toEqual([
    "var(--color-type-banner)", "var(--color-type-event)", "var(--color-type-event)",
    "var(--color-type-challenge)", "var(--color-type-login)", "var(--color-type-shop)",
    "var(--color-type-maintenance)", "var(--color-type-event)",
  ]);
  expect(new Set(EVENT_CATEGORIES.map(category => categoryColor(category.id === "event" ? "story" : category.id))).size).toBe(6);
});

test("colour is supplementary: full/compact badges keep category text and accessible labels", () => {
  for (const category of EVENT_CATEGORIES) for (const compact of [false, true]) {
    const type = category.id === "event" ? "story" : category.id;
    const html = renderToStaticMarkup(<TypeBadge type={type} compact={compact} />);
    expect(html).toContain(`data-event-category="${category.id}"`);
    expect(html).toContain(`color:${categoryColor(type)}`);
    expect(html).toContain(`aria-label="Type: ${category.badge}"`);
    expect(html).toContain(`>${compact ? category.short : category.badge}</span>`);
  }
  for (const type of ["story", "rerun", "other"] as const) {
    expect(renderToStaticMarkup(<TypeBadge type={type} compact />)).toContain('data-event-category="event"');
  }
});
