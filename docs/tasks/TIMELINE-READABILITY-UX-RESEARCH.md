# Timeline Readability / Recognition UX Research

Status: complete — Steps 1–5 accepted; Candidate A′ ready for implementation  
Scope: UX research / product design only  
Implementation: out of scope until this task is completed and reviewed

## Purpose

This task investigates how to make the main Game Calendar Timeline easier to read, faster to understand, and better at answering the product's primary question:

> What ends first, and what do I need to finish?

A second, closely related problem has become clear during normal use:

> A reader must also be able to quickly recognize what each calendar row actually refers to in the game.

Technically correct source or marketing titles are not always good recognition cues. This becomes especially visible when the game and calendar are used in different languages, or when official banner/event names do not match the terms players actually use to identify the activity.

The goal is **not** to add every proposed improvement independently.

The goal is to determine:

> What is the smallest coherent set of Timeline changes that produces the largest improvement in readability and recognition without making the Timeline visually overloaded?

This task ends with an implementation-ready UX specification.

It does **not** implement the design.

---

# Source of truth

Always begin from the **CURRENT `main`** of:

`maxvfk/game-calendar`

Use this priority:

1. current `main`;
2. `AGENTS.md`;
3. `docs/IMPLEMENTATION-STATUS.md`;
4. this task file;
5. `docs/IMPROVEMENT-BACKLOG.md`;
6. `docs/PRD.md`;
7. current Timeline/UI implementation;
8. relevant git history when rationale cannot be recovered from current docs/code.

Do not continue from an old feature branch.

If this task contradicts the current implementation because the product has changed since the task was written, document the discrepancy before proceeding.

Do not repeat general source-coverage research.

---

# Relevant current backlog items

The following backlog items are the primary input to this task.

They must be evaluated together as one UX problem rather than assumed to be four separate features.

## A. Bias the Timeline viewport toward future events

Current observation:

The daily Timeline tends to put today near the center of the visible range.

This spends a large fraction of the initial viewport on past dates, even though the product is primarily used to understand upcoming deadlines.

Current direction:

- move today closer to the left side of the initial viewport;
- retain some recent-past context;
- tune phone and desktop independently if necessary;
- use roughly the first 15–25% of the viewport only as an initial hypothesis, not a fixed requirement;
- events beginning before the visible range must remain understandable.

---

## B. Show event deadlines directly on Timeline bars

Current observation:

Recognizing the event is only half the task.

The user often still has to inspect another part of the UI or open details to determine when the event ends.

Current direction:

Prefer end-oriented compact information such as:

```text
→ Oct 21
```

Where space allows, a fuller interval may be considered:

```text
Sep 30 → Oct 21
```

Constraints:

- exact and day precision must remain distinguishable;
- never imply an unsupported clock time;
- narrow bars must degrade gracefully;
- mobile density is a primary constraint.

---

## C. Group event types inside game-sorted Timeline views

Current observation:

Even when Timeline rows are organized by game, banners, events, endgame, login campaigns and other activities may still appear as one visually undifferentiated group.

Current direction:

- investigate lightweight grouping/separation by type inside game-oriented Timeline views;
- do not automatically apply the same structure to chronological/deadline-oriented views;
- do not add a separate grouping toggle unless research shows it is necessary;
- NTEBuild category lanes may be used as a UX reference, but must not be copied mechanically.

Important hypothesis to test:

> Explicit type grouping may become unnecessary if recognition labels, visible deadlines and viewport positioning solve enough of the scanning problem on their own.

---

## D. Recognition-oriented event labels

Current observation:

Official banner/campaign names are often poor compact recognition cues.

For character banners, players generally identify the banner by its featured character rather than by its marketing title.

Current direction:

- character banner compact label → featured character name;
- several genuine headline characters → several names if the layout supports them;
- official title remains available as secondary information;
- weapon / Light Cone / W-Engine / equivalent banners should use an appropriate featured-item label rather than character semantics;
- do not heuristically guess names from arbitrary marketing text;
- recognition metadata must be supported by structured or reviewed evidence.

Compatibility requirement:

Do not change existing event IDs, dates, provenance or completion state merely to improve presentation labels.

---

# Related but separate feature tasks

These areas are related to the same recognition-first product principle, but are **outside this research scope**.

## Event artwork

Artwork may later improve event recognition, particularly in event details.

This Timeline design must not depend on artwork availability.

Do not design:

- image ingestion;
- asset hosting;
- hotlinking policy;
- licensing policy;
- image cache behavior;
- offline artwork support.

Artwork may be mentioned only as a future compatibility consideration.

---

## Event detail redesign

A recognition-first Event Detail hierarchy is a separate larger milestone.

Do not redesign the entire detail sheet here.

Timeline decisions should merely avoid blocking a later detail redesign.

---

## General ingestion expansion

Do not perform another general source audit.

If the selected UX requires additional structured data such as a featured subject, identify the smallest required data contract and leave source population as a separate implementation/data task.

---

# Working method

This task is intentionally divided into sequential steps.

**Complete only one step at a time.**

After each step:

1. stop;
2. present the findings;
3. identify unresolved questions;
4. wait for project-level review before continuing.

Do not automatically proceed to the next step.

The coordinating Game Calendar chat decides whether:

- the step is accepted;
- conclusions need revision;
- the next step should begin.

This is important because later steps depend on product decisions made in earlier ones.

---

# Step 1 — Current-state diagnosis

## Goal

Understand the actual current Timeline before proposing changes.

Do not design a solution yet.

## Read first

At minimum inspect:

- `AGENTS.md`;
- `docs/IMPLEMENTATION-STATUS.md`;
- `docs/IMPROVEMENT-BACKLOG.md`;
- relevant Timeline portions of `docs/PRD.md`;
- `src/client/components/Timeline.tsx`;
- `src/client/state/lanes.ts`;
- `src/client/state/sort.ts`;
- relevant preference/state code;
- any helper modules directly controlling Timeline layout, zoom, filtering or labels.

Inspect additional files only when required to understand actual current behavior.

## Determine

Document the current behavior of:

- initial Timeline positioning;
- today/current-day marker;
- game-oriented grouping;
- deadline-oriented grouping;
- row/lane construction;
- ordering inside lanes;
- bar labels;
- game identity presentation;
- exact versus day precision;
- running versus upcoming styling;
- `endsAt: null`;
- long events;
- very short events;
- clipped events beginning before the viewport;
- mobile behavior;
- desktop behavior;
- timeline zoom levels;
- how narrow bars currently degrade;
- interaction with event-type filters.

## Required output

Produce a concise **Current-State Diagnosis** containing:

### Confirmed problems

Only issues actually supported by current code/UI/backlog.

### Existing strengths to preserve

Identify behavior that already works and should not be accidentally redesigned.

### Interaction between the four backlog proposals

Explain which problems overlap and which are genuinely independent.

### Key constraints

Especially:

- mobile density;
- event IDs;
- data precision;
- responsive behavior;
- current preference semantics;
- existing game/deadline view distinction.

### Questions to carry into Step 2

Do not answer speculative UX questions yet unless the current implementation already settles them.

## Stop condition

Stop after diagnosis.

Do not:

- propose the final UI;
- conduct reference research;
- write code;
- modify repository files.

---

# Step 2 — Focused UX reference research

Begin only after Step 1 is reviewed and accepted.

## Goal

Find a small number of external patterns that help solve specific problems identified in Step 1.

This is not a general survey of calendar products.

## Candidate references

Include NTEBuild because it motivated part of the current recognition discussion.

Add only a few additional references if they materially help, for example:

- another game/event calendar;
- Gantt/timeline software with dense horizontal bars;
- scheduling UI where identity and deadline are both important.

Prefer quality and relevance over quantity.

## For each reference answer

- What exact problem does this pattern solve?
- What is useful for Game Calendar?
- What does not fit Game Calendar?
- Would adopting it increase vertical or horizontal density?
- Does it work on phone?
- Does it depend on imagery or data Game Calendar does not have?

## Research topics

Focus specifically on:

### Identity

How does a user recognize a row quickly?

### Deadline visibility

How is the important end boundary communicated without requiring details?

### Hierarchy/grouping

How are related rows visually grouped without producing excessive section chrome?

### Initial viewport

How do timeline products allocate visible space between history and future?

### Narrow bars

What remains visible when a bar cannot fit its full content?

## Required output

Produce **Reference Findings** organized by reusable UX principles, not by website.

End with a short list:

- patterns worth testing in Step 3;
- patterns explicitly rejected;
- assumptions that still require testing.

## Stop condition

Stop after reference findings.

Do not yet produce the final design.

---

# Step 3 — Candidate Timeline designs

Begin only after Steps 1–2 are reviewed.

## Goal

Create **2–3 coherent Timeline variants**.

Do not propose a menu of independent switches.

Each candidate must answer the whole readability problem as one information system.

## Each candidate must define

### Information hierarchy on a bar

For example:

1. recognition identity;
2. deadline;
3. secondary context.

Do not assume that this example is correct.

### Game identity

Explain when/how the game label remains visible.

### Event identity

Explain whether the primary label is:

- event title;
- featured subject;
- event type;
- some combination.

### Deadline presentation

Specify when and how the end date appears.

### Grouping

Specify whether type grouping exists.

If it does:

- visual form;
- hierarchy;
- how much extra height it costs.

If it does not:

- explain what replaces its scanning benefit.

### Viewport initialization

Specify the proposed future/past balance separately for:

- phone;
- desktop.

### Narrow-bar degradation

Define priority order.

For example:

```text
full identity + deadline
→ identity only
→ abbreviated identity
→ visual bar only + tooltip/details
```

Do not use this exact hierarchy unless justified.

### Running/upcoming distinction

Ensure the design works with existing semantics.

### Precision

Explain exact/day/unknown-end rendering.

## Compare candidates

For every candidate assess:

- scan speed;
- recognition;
- deadline visibility;
- mobile density;
- desktop readability;
- vertical growth;
- visual overload risk;
- implementation complexity;
- additional data requirements;
- compatibility with future artwork/detail work.

## Required output

Produce a comparison and a **provisional recommendation**.

Also answer explicitly:

> Does explicit event-type grouping still provide enough additional value to justify its cost?

## Stop condition

Stop before implementation specification.

The coordinating chat must approve which candidate proceeds to Step 4.

---

# Step 4 — Stress-test the selected direction

Begin only after one candidate is selected.

## Goal

Try to break the proposed design before it becomes an implementation spec.

Do not defend the selected option by default.

Look for scenarios where it fails.

## Required scenarios

Evaluate at minimum:

### Device/layout

- phone portrait;
- desktop;
- dense multi-game configuration.

### View mode

- game-oriented view;
- deadline/chronological view.

### Event lifecycle

- currently running;
- upcoming;
- already started before the visible viewport.

### Event length

- multi-week event;
- normal event;
- one-day/very short event;
- bar narrower than its preferred label.

### Date certainty

- exact end;
- day-precision end;
- `endsAt: null`.

### Identity

- character banner with short character name;
- long character name;
- two headline characters;
- non-character banner;
- weapon/Light Cone/W-Engine equivalent;
- recurring endgame phase;
- normal event with no featured subject.

### Density

- several banners from one game;
- several categories from one game;
- overlapping dates;
- seven enabled operational games.

### Interaction

- zooming;
- horizontal scrolling;
- changing group mode;
- filtering event types.

## Questions to answer

- What breaks first?
- What information becomes unreadable first?
- Does grouping create excessive height?
- Does deadline text duplicate the date axis without enough benefit?
- Does the future-biased viewport harm active-event context?
- Are featured-subject labels reliable enough to be primary?
- Which rules differ between phone and desktop?
- Is a simpler candidate now preferable?

## Required output

Produce:

### Stress-test findings

### Required changes to the selected candidate

### Rejected aspects

### Final recommended direction

## Stop condition

Stop for review.

Do not write implementation code.

---

# Step 5 — Implementation-ready UX specification

Begin only after Step 4 is reviewed.

## Goal

Turn the accepted design into a specification that a fresh implementation Work can execute without repeating UX research.

## Required specification sections

### 1. Product goal

One short explanation of what the change improves.

### 2. Information hierarchy

Define what a Timeline bar communicates, in priority order.

### 3. Label rules

Define:

- preferred identity label;
- fallback label;
- featured-subject behavior;
- several subjects;
- non-character banners;
- generic events;
- unknown metadata.

### 4. Deadline rules

Define:

- exact end;
- day-precision end;
- unknown end;
- available-width thresholds conceptually;
- whether start date is ever shown.

Avoid specifying arbitrary pixel constants unless current implementation makes them necessary.

### 5. Grouping rules

Specify exactly:

- which Timeline modes group by type;
- whether separators/headings are present;
- category order;
- behavior when only one category exists;
- behavior under event-type filters.

If grouping was rejected, explicitly record that decision.

### 6. Viewport initialization

Define phone and desktop behavior.

Include:

- today position;
- retained past context;
- interaction with viewport width;
- whether user scrolling/zooming changes any initialization rule.

### 7. Bar clipping and degradation

Define content priority as width decreases.

### 8. Running/upcoming behavior

Preserve or deliberately modify current distinction.

### 9. Responsive rules

Separate:

- phone;
- desktop;
- any meaningful intermediate behavior.

### 10. Accessibility

At minimum consider:

- information must not rely only on hue;
- labels/tooltips/details;
- touch targets where changed;
- screen-reader meaning if additional text is introduced.

### 11. Data requirements

State whether the design can use the current event schema.

If not, define the **minimal** additional semantic field(s).

Do not design full ingestion here.

For each additional field state:

- meaning;
- optionality;
- fallback;
- why it cannot safely be derived in presentation code.

### 12. Compatibility constraints

Must preserve:

- event IDs;
- completion/progress state;
- provenance;
- date precision;
- existing local preferences unless migration is explicitly justified.

### 13. Acceptance criteria

Make them observable and implementation-testable.

### 14. Smoke-test matrix

Include the scenarios that should be manually checked after implementation.

### 15. Suggested implementation decomposition

Recommend small logical commits or milestones.

Do not implement them.

---

# Final implementation-ready UX specification — Candidate A′

This section is the accepted output of Step 5.

Implementation must start from the then-current `main` and must not repeat the broad UX research unless current code materially contradicts this specification.

## 1. Product goal

Make the Timeline answer two questions faster, without increasing row height or adding a second heavy hierarchy:

1. **What activity is this?**
2. **When does it end / is its end known?**

The selected design is **Candidate A′ — Sticky semantic bars**.

Its core rule is:

> recognition identity and truthful end state belong to the bar's readable sticky content, not only to the bar's physical start/end edges.

## 2. Information hierarchy

### `By game`

The lane heading already provides game identity.

Preferred bar content, when space permits:

1. event type cue;
2. recognition identity;
3. end state/deadline;
4. existing conflict/urgency/lifecycle cues.

Game text should not be repeated inside every normal `By game` bar.

### `Ending soonest`

There is no per-game lane heading, so each bar must preserve:

1. game identity;
2. recognition identity;
3. end state/deadline when width permits;
4. type cue when width permits;
5. existing conflict/urgency/lifecycle cues.

For known deadlines, ordering already carries deadline meaning. On narrow bars, preserve **game + event identity** before repeating a known end date.

For unknown deadlines, the fact that the end is unknown remains semantically important and must survive longer than a known-deadline token.

## 3. Recognition label rules

Add one optional semantic event field:

```ts
recognitionSubjects?: string[]
```

Meaning:

- ordered list of the genuine featured subject(s) that players use to recognize the event;
- character banner → featured character name(s);
- weapon / Light Cone / W-Engine / equivalent banner → featured item name(s);
- genuine co-headliners may contain more than one ordered subject;
- the field is optional for every event class.

Presentation:

- when `recognitionSubjects` is present and non-empty, join subjects with ` + ` for the compact recognition label;
- otherwise fall back to the existing official `title`;
- the official title remains canonical source/detail information and must not be discarded;
- never heuristically extract recognition subjects from arbitrary marketing titles in presentation code.

The field is additive. Existing feeds, cached feeds and custom events without it remain valid.

Adding it must not change:

- event IDs;
- completion keys;
- dates;
- provenance;
- conflict state.

## 4. Deadline rules

Deadline content is part of the same sticky readable region as identity.

### Known exact end

Compact bar form:

```text
→ Oct 21
```

Do not show exact clock time by default inside Timeline bars.

The full exact timestamp remains available through existing detail/source surfaces and accessible semantics where appropriate.

### Day-precision end

Use the same compact date text, but add a **visible non-colour precision cue** to the deadline token, such as a dashed underline/border treatment.

Accessible semantics must explicitly say:

```text
end date only
```

Do not fabricate a time.

### Unknown end

Preferred text when space permits:

```text
end unknown
```

Compact fallback:

```text
?
```

The compact form must have accessible text:

```text
End unknown
```

Never display a synthetic estimated date merely to fill the bar.

### Cross-year dates

Include the year when omitting it could make the deadline ambiguous across a year boundary.

### Start date

Do not add a start→end range to normal bar content in this milestone. The date axis and physical bar start already carry start-position information; bar text should prioritize identity and end state.

## 5. Grouping rules

Do **not** add event-type grouping/category bands in this milestone.

Preserve:

- one lane per game in `By game`;
- the existing deadline queue semantics in `Ending soonest`;
- existing event-type filtering.

Do not:

- reorder rows by event type;
- add category sub-headings;
- add a grouping toggle;
- add category bands to `Ending soonest`.

Dense `By game` cases should be observed during implementation smoke. Type grouping may be reconsidered later only if real post-implementation evidence shows that Candidate A′ remains insufficient.

## 6. Viewport initialization

Use the **actual current moment** `x(now)`, not local-day start, as the navigation anchor.

Target initial position:

- phone / below `lg`: current moment at about **20%** of the visible width from the left;
- desktop / `lg` and above: current moment at about **25%** from the left.

These are responsive behavior targets, not persisted preferences.

Apply future-biased positioning only when:

- the Timeline is initially opened/mounted;
- the user explicitly activates **Jump to today**.

Do **not** automatically re-bias because of:

- game filters;
- event-type filters;
- `By game` / `Ending soonest` changes;
- upcoming visibility changes;
- source/feed refresh;
- ordinary re-render;
- clock ticks.

If the board range changes so that the existing scroll offset is no longer valid, normal browser/scroller clamping is acceptable; do not reinterpret that as a request to jump to today.

Zoom must continue to preserve the moment currently being inspected rather than returning to the future-biased anchor.

## 7. Bar clipping and progressive disclosure

Keep bars one line high and preserve the current practical `MIN_BAR`.

Use measured available space rather than one global hard-coded content payload.

### `By game` — known end

Preferred degradation:

```text
[type] identity · deadline
→ identity · deadline
→ identity
→ truncated identity
→ bare bar
```

The type badge is the first semantic element allowed to disappear visually.

A known deadline may disappear before identity on a narrow bar because the date axis and event position still provide temporal context.

### `By game` — unknown end

Preferred degradation:

```text
[type] identity · end unknown
→ identity · end unknown
→ truncated identity · ?
→ ?
```

Unknown-end state survives longer than a normal known-deadline token because the timeline cannot infer it from position.

### `Ending soonest` — known end

Preferred degradation:

```text
game · [type] identity · deadline
→ game · identity · deadline
→ game · identity
→ game · truncated identity
→ compact/truncated game
```

Known deadline disappears before game + event identity.

### `Ending soonest` — unknown end

Preserve game + identity + unknown-end semantics for as long as space permits.

Compact `?` may replace `end unknown`, but its accessible meaning must remain explicit.

### Absolute minimum width

Visual identity is prioritized but not guaranteed at the physical minimum bar width.

When text cannot fit, accessible semantics must still expose the complete event meaning.

Do not reduce `MIN_BAR` merely to fit more information.

## 8. Running / upcoming / completion / conflict behavior

Preserve existing behavior unless a change is explicitly required by the sticky semantic content implementation:

- running versus upcoming visual distinction;
- dashed/future start treatment;
- current start markers;
- clipped-start honesty;
- completion dimming;
- urgency indicator;
- conflict indicator;
- exact/day start precision;
- exact/day/unknown end precision.

Candidate A′ must not collapse these states into the recognition/deadline label.

## 9. Responsive rules

The same semantic model applies on phone and desktop.

Differences should come from:

- viewport anchor target;
- measured available bar width;
- progressive disclosure.

Do not introduce a phone-only alternative architecture.

Specifically do not add:

- persistent identity rail;
- extra category rows;
- second text row inside bars;
- always-on clock text;
- image thumbnails as a dependency.

## 10. Accessibility

Do not rely on:

- hue alone;
- hover alone;
- the physical bar edge alone;
- a visual `?` without an accessible label.

Every Timeline event must retain a complete accessible name/description containing, as applicable:

- game;
- event type;
- recognition identity, or title fallback;
- end date or **End unknown**;
- **end date only** when end precision is day-only;
- upcoming/not-started state;
- disputed/conflict state.

If the visual `TypeBadge` is removed at a narrow width, **event type must remain in accessible semantics**. This intentionally supersedes the current `TypeBadge` assumption that the visual badge is present on every narrow Timeline bar; implementation comments/tests must be updated accordingly.

Visual truncation must not truncate the accessible name.

Touch target behavior must not regress.

## 11. Data requirements

The selected design requires one optional additive semantic field:

```ts
recognitionSubjects?: string[]
```

Schema expectations:

- optional;
- when present, contains at least one non-empty subject string;
- order is meaningful;
- no inferred values in presentation code;
- title remains required and is always the fallback.

This is the only new event semantic required by this UX design.

Population of recognition metadata is a separate reviewed data task and must follow existing source/provenance rules.

Do not block deadline/viewport implementation on complete metadata coverage.

## 12. Compatibility constraints

Implementation must preserve:

- current stable event IDs and `eventId()` semantics;
- progress/completion keys;
- local profile data;
- export/import compatibility;
- sync compatibility;
- old cached feeds;
- custom events;
- events without `recognitionSubjects`;
- source/provenance/conflict semantics;
- existing date-precision invariants;
- existing Timeline zoom preference.

No preference migration is required for the future-biased viewport position because the position is navigation behavior, not a stored user preference.

## 13. Acceptance criteria

Implementation is acceptable only if all of the following hold.

### Viewport / navigation

- initial Timeline opening anchors the actual current moment near 20% from the left on phone;
- initial desktop opening anchors it near 25%;
- **Jump to today** applies the same responsive anchor;
- filter changes do not unexpectedly jump back to today;
- switching Timeline group mode does not unexpectedly jump back to today;
- showing/hiding upcoming events does not unexpectedly jump back to today;
- feed refresh/re-render does not unexpectedly jump back to today;
- zoom preserves the inspected moment as it does today.

### Sticky semantics

- a multi-week running event whose physical end is off-screen can still expose its readable deadline/end state in the sticky content when width permits;
- sticky content never escapes its own bar;
- bars remain one line high;
- `MIN_BAR` is not reduced.

### Recognition

- an event with `recognitionSubjects` uses those subjects as its compact identity;
- genuine multiple subjects retain their declared order;
- an event without recognition metadata falls back to `title`;
- no UI heuristic guesses recognition subjects;
- recognition metadata changes do not change event IDs or completion state.

### Deadline / precision

- exact known ends can show a compact end date;
- day-only ends have a visible non-colour precision cue and accessible **end date only** semantics;
- unknown ends expose **end unknown** or compact `?`;
- `?` is accessible as **End unknown**;
- no unknown end receives a fabricated date;
- cross-year deadlines are unambiguous;
- exact clock time is not always-on bar content.

### Degradation

- `By game` prioritizes recognition identity over a known deadline at narrow widths;
- unknown-end state survives longer than a known deadline token;
- `Ending soonest` prioritizes game + identity over repeating a known deadline;
- visual `TypeBadge` may disappear first when necessary;
- hidden visual type information remains available to assistive technology;
- absolute-minimum bars remain usable/tappable even when visible text cannot fit.

### Structure / grouping

- no event-type category bands are added;
- `By game` remains one lane per game;
- `Ending soonest` remains a deadline-oriented queue;
- event-type filters keep their existing meaning;
- no new grouping preference/toggle is introduced.

### Existing states

- upcoming styling/semantics remain understandable;
- completion dimming remains intact;
- conflict indication remains intact;
- start-precision cues remain intact;
- urgency indication remains intact;
- clipped long-running events remain honest about their hidden start.

### Compatibility

- old feed objects without `recognitionSubjects` validate and render;
- custom events continue to render;
- existing stored preferences load without migration;
- export/import remains compatible;
- account sync data is unaffected;
- current event IDs remain byte-for-byte stable.

## 14. Manual smoke-test matrix

At minimum test:

### Phone portrait

- open Timeline at default zoom;
- verify ~20% current-moment anchor;
- long running event with end far off-screen;
- short event near `MIN_BAR`;
- exact end;
- day-only end;
- unknown end;
- one recognition subject;
- two recognition subjects;
- title fallback;
- non-character/item recognition subject;
- `By game`;
- `Ending soonest`;
- game filter change without re-jump;
- event-type filter change without re-jump;
- group-mode change without re-jump;
- show/hide upcoming without re-jump;
- zoom in/out preserving inspected moment;
- explicit **Jump to today** restoring the responsive anchor.

### Desktop

- initial ~25% current-moment anchor;
- wide bars showing identity + deadline;
- long off-screen-end bar with sticky semantic content;
- progressive disclosure while changing zoom;
- both Timeline modes;
- filter/refresh stability.

### Dense data

- all seven operational games enabled;
- multiple banners in one game;
- several event categories in one game;
- overlapping dates;
- no category-band vertical explosion.

### Data / provenance states

- region-resolved deadline;
- exact end;
- day-only end;
- unknown end;
- disputed/conflicting date;
- upcoming event;
- completed event.

### Backward compatibility

- cached/legacy feed object without recognition metadata;
- custom event;
- existing preference state;
- existing completion state.

## 15. Suggested implementation decomposition

Use a fresh short-lived branch from the then-current `main`.

Recommended logical sequence:

1. **Semantic data contract**
   - add optional `recognitionSubjects`;
   - schema/validation/tests;
   - prove old feeds/custom events remain compatible;
   - do not populate broad recognition metadata heuristically.

2. **Sticky semantic bar rendering**
   - recognition/title fallback;
   - deadline exact/day/unknown presentation;
   - mode-specific measured-fit degradation;
   - accessible full semantics;
   - update `TypeBadge` assumptions/tests where the badge may disappear visually.

3. **Viewport/navigation behavior**
   - anchor `x(now)` at responsive 20%/25%;
   - initial mount + explicit Jump only;
   - preserve current position across filters/group/upcoming/refresh;
   - preserve zoom anchor behavior.

4. **Integrated verification**
   - `bun install --frozen-lockfile`;
   - `bun run typecheck`;
   - `bun test`;
   - `bun run build`;
   - targeted automated tests for schema, degradation helpers and scroll behavior where practical;
   - manual phone + desktop smoke using the matrix above.

5. **Separate reviewed metadata-population task**
   - populate recognition subjects only from reliable structured/reviewed evidence;
   - preserve source/provenance rules;
   - do not combine broad source research with the UI implementation unless a concrete missing field requires it.


# Decision log

This section is updated only after coordinating review.

Intermediate agent opinions are **not** automatically decisions.

Use entries in this form:

```text
YYYY-MM-DD — Step N
Decision:
Reason:
Rejected alternative(s):
Implication for next step:
```

## Accepted decisions

### 2026-10-06 — Step 1

**Decision:** Accept the current-state diagnosis as the baseline for focused UX reference research.

**Confirmed baseline:**

- the initial Timeline viewport currently centers today rather than biasing the visible range toward future deadlines;
- Timeline bars do not directly show their deadline;
- compact event identity is title-driven and the current event data contract has no structured featured-subject/featured-item field for recognition-first labels;
- game-oriented lanes keep each game's events together but do not add a second visual hierarchy by event type;
- proposal A (future-biased viewport) is mostly orthogonal to the label/grouping problem;
- proposals B (deadline on bars) and D (recognition-oriented labels) compete for the same limited bar width, especially at the current narrow/mobile sizes;
- proposal C (type grouping) overlaps with D by improving scanability, but addresses relationships between rows rather than identity inside a row;
- recognition-first labels cannot be populated safely by heuristic parsing of arbitrary marketing titles; if adopted, they require structured/reviewed semantic metadata or a reliable fallback to the current title.

**Existing strengths to preserve:**

- sticky date axis, lane labels and bar content behavior;
- the exact/day/unknown precision model;
- the distinct meanings of `By game` and `Ending soonest`;
- handling of long events, upcoming events, DST/local-calendar day geometry and zoom context;
- minimum practical bar/touch sizing;
- centralized event-type filtering rather than view-specific filter semantics.

**Rejected alternative(s):** None yet. Step 1 was diagnostic and intentionally made no final UX choice.

**Implication for next step:** Step 2 should research compact identity/deadline hierarchy, narrow-bar degradation, lightweight grouping and future-biased viewport patterns. It must not assume that all four backlog proposals survive to implementation.


### 2026-10-06 — Step 2

**Decision:** Accept the focused UX reference research and carry its reusable principles into candidate design work.

**References examined:** NTEBuild, vis-timeline, Bryntum Scheduler, FullCalendar and Frappe Gantt. These are references for specific interaction/information patterns, not templates to copy wholesale.

**Patterns worth testing in Step 3:**

- bias the initial viewport toward future time while keeping some recent-past context visible;
- prefer structured recognition identity over marketing-title-first presentation when trustworthy semantic metadata exists;
- make bar content width-aware rather than forcing the same text payload into every event width;
- keep deadline communication compact and end-oriented when shown directly on a bar;
- treat event-type grouping as a lightweight candidate only in `By game`, not as a mandatory second hierarchy across every Timeline mode.

**Patterns explicitly rejected:**

- deep/nested group hierarchies that substantially increase Timeline height;
- `+more`-style hiding of rows as the primary solution to density;
- deadline labels positioned above/below bars in ways that create a second visual track or extra row height;
- hover/popup/detail-only deadline communication as the primary answer to the product's core deadline question.

**Reason:** The useful references converge on progressive disclosure inside the available bar width and on preserving the timeline itself as the main reading surface. None provides evidence that adding a heavy category hierarchy would outperform better identity/deadline presentation for this product.

**Rejected alternative(s):** No complete candidate design has been rejected yet. Step 2 rejects only reference patterns that conflict with mobile density, direct deadline visibility or the existing Timeline model.

**Implication for next step:** Step 3 should construct 2–3 coherent variants that combine future-biased initialization, recognition identity and width-aware deadline presentation in different ways, with type grouping treated as a hypothesis to justify rather than a required feature.


### 2026-10-06 — Step 3

**Decision:** Select Candidate A — **Compact semantic bars** — as the direction to stress-test in Step 4.

**Candidate summary:**

- keep the existing Timeline structure rather than adding a persistent identity rail or mandatory category sub-hierarchy;
- bias the initial viewport toward future time while retaining recent-past context;
- use recognition-first identity when reliable structured/reviewed metadata exists, with the current official title as fallback;
- add compact end-oriented deadline information directly inside bars when width permits;
- make bar contents degrade progressively with available width;
- keep `By game` and `Ending soonest` semantically distinct;
- do **not** add explicit event-type grouping in the first candidate direction.

**Why Candidate A is preferred:**

- it offers the best balance of recognition, deadline visibility and phone density;
- it preserves the current Timeline model and therefore has lower implementation and regression risk;
- Candidate B — **Persistent identity rail** — protects identity/deadline information on very narrow bars, but spends persistent horizontal space and adds substantial layout complexity, especially on phone;
- Candidate C — **Lightweight category bands** — provides the strongest explicit classification in `By game`, but multiplies vertical height/scroll distance across games and risks solving a problem that improved bar identity may already solve.

**Important non-decisions:** Selecting Candidate A does **not** yet lock the following details:

- the exact phone/desktop viewport percentages (the Step 3 proposal of roughly 15% past on phone and 20% on desktop remains a test target);
- the precise width thresholds or degradation order between identity and deadline;
- whether exact clock time should ever appear directly on the bar;
- the final visual treatment for `endsAt: null` (including the proposed `end ?` / open-ended edge treatment);
- whether type grouping can be rejected permanently rather than merely omitted initially;
- the exact minimal recognition metadata contract and its real coverage across current events.

**Rejected alternative(s) for Step 4:** Candidate B and Candidate C are not the primary directions to stress-test. They remain fallback/reference alternatives if Candidate A fails under dense or narrow scenarios.

**Implication for next step:** Step 4 must actively try to break Candidate A. In particular, test whether identity and deadline can coexist at real phone widths, whether deadline disappearance undermines the product's core question, whether `Ending soonest` remains readable, whether future bias preserves enough active-event context, whether recognition metadata coverage is sufficient, and whether dense same-game lanes reveal a real need for lightweight type grouping.


### 2026-10-06 — Step 4

**Decision:** Accept the stress-test findings and replace Candidate A with the refined **Candidate A′ — Sticky semantic bars** as the final direction to specify in Step 5.

**Major failure found:**

- at the current default scale of roughly `72px/day`, a 360–390 CSS px phone viewport shows only about five days;
- with the earlier 15% past-bias proposal, only about 4.3–4.6 future days remain visible;
- many normal game events run for 2–6 weeks, so their physical right edge and therefore a deadline label attached only to that edge would usually remain off-screen;
- therefore the product cannot claim improved deadline visibility if deadline information is only rendered at the event's physical end.

**Required changes to Candidate A:**

- deadline information must belong to the bar's **sticky readable content**, not only to the physical end edge;
- the initial view should anchor around the **current moment**, roughly 20% from the left, rather than using a fixed day-start/15% rule;
- initialization should happen when opening/jumping to today, but ordinary filter changes or refreshes must not repeatedly re-bias the reader's viewport;
- bar degradation must be **mode-specific**, not one universal identity/deadline rule for every Timeline mode;
- unknown end must be explicit in the readable content; an edge treatment alone is insufficient;
- exact/day/unknown precision must remain visible in the chosen deadline wording;
- exact clock time should not be always-on bar content; it must earn its width cost under a narrower rule in Step 5.

**Mode-specific conclusion:**

- in `Ending soonest`, the ordering already carries deadline meaning, so at very narrow widths preserve textual **game + event identity** ahead of repeating a known deadline;
- keep the existing type badge semantics;
- do not add category bands or reorder the deadline queue by type.

**Recognition metadata conclusion:**

Recognition metadata should be optional and semantic rather than presentation-derived. It must be able to represent:

- one featured subject;
- genuine co-headliners;
- item/weapon/Light Cone/W-Engine equivalents;
- title fallback when no reliable recognition metadata exists.

The UI must never heuristically invent a featured subject from arbitrary marketing text.

**Rejected aspects:**

- deadline text fixed only to the event's physical right edge;
- the earlier fixed 15% / day-start initial anchor;
- unknown-end communication that relies only on a frayed/open-ended bar edge;
- always-on exact clock time inside bars;
- one universal degradation hierarchy for all Timeline modes;
- Candidate B or Candidate C as default architecture;
- category bands in `Ending soonest`.

**Grouping conclusion:** Candidate C does not return as the default. Its vertical cost remains high, and in deadline-oriented mode it conflicts with the meaning of the queue. Dense `By game` cases may still be observed during implementation smoke, but Step 4 found no evidence strong enough to justify adding explicit type grouping to the selected design.

**Implication for next step:** Step 5 should specify Candidate A′ precisely: sticky identity/deadline composition, mode-specific degradation, current-moment viewport initialization, exact/day/unknown deadline wording, optional recognition metadata contract, responsive rules and acceptance/smoke criteria.


### 2026-10-06 — Step 5

**Decision:** Accept the implementation-ready specification for **Candidate A′ — Sticky semantic bars**, with one review correction: because the visual `TypeBadge` may disappear first on narrow bars, event type must remain in the accessible name/sr-only semantics and the old “badge on every narrow bar” implementation assumption must be updated.

**Final direction:**

- recognition identity + truthful end state live in sticky readable bar content;
- optional `recognitionSubjects?: string[]` provides semantic recognition labels with title fallback;
- no heuristic subject extraction;
- deadline semantics distinguish exact, day-only and unknown without fabricated certainty;
- no always-on clock text;
- no event-type grouping/category bands;
- `By game` and `Ending soonest` use different narrow-width priorities;
- initial current-moment anchor is ~20% on phone and ~25% on desktop;
- only initial opening and explicit **Jump to today** re-anchor;
- filters, group changes, upcoming changes, refreshes and ordinary rerenders preserve the reader's position;
- accessibility retains full game/type/identity/end/lifecycle/conflict meaning despite visual truncation.

**Rejected alternative(s):** Candidate B, Candidate C, physical-end-only deadline labels, mandatory category grouping, persistent identity rail, always-on exact clock time and heuristic recognition parsing remain rejected for this milestone.

**Implication for next step:** UX research is complete. The next project decision is implementation planning from the then-current `main`, using the specification above as the source of truth. Do not begin implementation automatically from this research task.

---

# Working findings

Research complete. No provisional findings remain.

Any new UX concern discovered during implementation smoke should be recorded as a concrete implementation finding rather than silently reopening Steps 1–5.

---

# Repository update policy during research

The primary task is research/design, not implementation.

Do not modify runtime code.

Do not create a feature branch merely to perform research.

After a step is reviewed, the coordinating chat may request a small documentation-only update to this task file to preserve accepted decisions.

Do not rewrite accepted decisions silently.

---

# Out of scope

Do not:

- implement Timeline changes;
- redesign Event Detail;
- implement artwork;
- add image sources;
- perform broad data/source research;
- expand supported games;
- change event IDs;
- redesign Account Sync;
- begin Account Sync follow-up work;
- perform the independent Astra audit;
- bundle unrelated backlog fixes;
- refactor correct Timeline code for cleanliness alone.

---

# Completion criteria

This research task is complete only when:

- Steps 1–5 have been reviewed sequentially;
- one coherent Timeline direction has been selected;
- unnecessary backlog ideas have been explicitly rejected or deferred;
- responsive and degradation behavior is specified;
- required data semantics are understood;
- implementation acceptance criteria exist;
- no unresolved product decision remains that would force an implementation agent to redesign the feature while coding.

The next action after completion is a **separate bounded implementation Work created from the then-current `main`**.


---

# Deferred implementation follow-up

Implementation is intentionally postponed until the active Account/User S6 work is complete or explicitly cleared by the coordinating project chat.

The accepted UX direction is split into two bounded milestones:

1. `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`
   - optional semantic `recognitionSubjects` contract;
   - validation/backward compatibility;
   - no Timeline UI changes.

2. `docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md`
   - Candidate A′ sticky semantic Timeline;
   - requires merged M1;
   - no Account/User database changes.

Do not start either milestone automatically when reading this research task. Re-check CURRENT `main`, S6 status and coordinating-chat authorization first.
