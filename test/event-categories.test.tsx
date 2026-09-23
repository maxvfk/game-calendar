import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TypeFilters } from "../src/client/components/TypeFilters.tsx";
import { TypeBadge } from "../src/client/components/TypeBadge.tsx";
import {
  allCategories,
  categoryFor,
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
