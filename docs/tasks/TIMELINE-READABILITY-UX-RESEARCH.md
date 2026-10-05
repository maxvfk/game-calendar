# Timeline Readability / Recognition UX Research

Status: planned  
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

None yet.

---

# Working findings

This section may contain provisional findings from the current research step.

They are not project decisions until copied into **Accepted decisions** after review.

None yet.

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
