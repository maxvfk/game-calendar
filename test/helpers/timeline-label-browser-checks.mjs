// Browser-native regression driver: same-origin iframe viewports, production
// components/CSS, no external browser package and no production app hooks.
const frame = document.querySelector("#fixture"), status = document.querySelector("#status");
// Two tasks let React commit and ResizeObserver/rAF measurement run. Avoid
// waiting on the iframe's own rAF: browsers may throttle offscreen frames.
const settle = () => new Promise(resolve => setTimeout(resolve, 60));
const load = async (name, width) => {
  frame.width = width;
  await new Promise(resolve => { frame.onload = resolve; frame.src = `${name}.html?run=${++loads}`; });
  for (let n = 0; n < 100 && !frame.contentWindow[name === "labels" ? "labelTest" : "timelineTest"]; n++) await new Promise(resolve => setTimeout(resolve, 20));
  await settle();
  return frame.contentWindow;
};
let loads = 0, checks = 0, truncated = 0, dates = 0, tails = 0, navigation = 0;
const navigationOnly = new URL(location.href).searchParams.has("navigationOnly");
const check = (value, detail) => { if (!value) throw new Error(detail); checks++; };
document.querySelector("#preview").onclick = async () => {
  await load("labels", Number(document.querySelector("#width").value));
  status.textContent = "Synthetic approved long/short labels; canonical titles remain in accessible names/tooltips.";
};
document.querySelector("#run").onclick = async () => {
  document.querySelector("#run").disabled = true;
  checks = truncated = dates = tails = navigation = 0;
  try {
    for (const width of navigationOnly ? [] : [320, 390, 1440]) {
      const w = await load("labels", width), doc = w.document;
      status.textContent = `Running real CSS label matrix at ${width}px…`;
      for (const theme of ["dark", "light"]) for (const text of [100, 200]) {
        doc.documentElement.dataset.theme = theme; doc.documentElement.style.fontSize = `${text}%`;
        for (const group of ["game", "ending"]) for (const dayWidth of [6, 32, 72, 108]) {
          status.textContent = `Running CSS matrix ${width}px / ${theme} / ${text}% / ${group} / ${dayWidth}px/day; ${checks} checks`;
          w.labelTest.patch({ group, dayWidth }); await settle();
          for (const offset of [0, 5.6, 6]) {
            w.labelTest.offset(offset); await settle();
            const before = { checks, truncated, dates, tails };
            for (let attempt = 0; ; attempt++) {
            try {
            const pane = doc.querySelector(".scroll-pane").getBoundingClientRect();
            for (const bar of doc.querySelectorAll("[data-timeline-event]")) {
              const label = bar.querySelector("[data-timeline-label]"), rect = label.getBoundingClientRect(), bounds = bar.getBoundingClientRect();
              const parts = [...label.children], metrics = [...bar.querySelector("[inert] > span").children].map(el => el.getBoundingClientRect().width);
              const [game, badge, identity, date, compact, minimum, indicators] = metrics;
              const gap = parseFloat(w.getComputedStyle(label).columnGap), room = Math.max(0, rect.width - indicators - gap);
              const id = parts.find(el => el.classList.contains("truncate") && !el.classList.contains("eyebrow"));
              const identityWidth = id?.getBoundingClientRect().width ?? 0;
              const hasBadge = !!label.querySelector("[data-event-category]"), hasGame = !!label.querySelector(".eyebrow");
              const accessible = bar.getAttribute("aria-label"), unknown = accessible.includes("End unknown");
              const hasDate = parts.some(el => el.textContent.startsWith("→"));
              const context = `${width}/${theme}/${text}/${group}/${dayWidth}/${offset}/${bar.dataset.timelineEvent}`;
              const unknownReserve = unknown && badge + compact + gap <= room ? compact + gap : 0;
              const budget = room - badge - unknownReserve - gap, useful = Math.min(identity, minimum);
              check(hasBadge === (badge <= room), `badge priority ${context}`);
              if (badge <= room && budget >= useful + .1) check(identityWidth > 0, `needlessly hidden identity ${context}`);
              if (identityWidth > 0) {
                check(identityWidth >= useful - .1, `meaningless prefix ${context}`);
                check(w.getComputedStyle(id).textOverflow === "ellipsis", `ellipsis ${context}`);
                if (identityWidth < identity - 1) truncated++;
              }
              if (group === "ending" && room >= game + badge + useful + 2 * gap + unknownReserve + .1) check(hasGame, `game lost ${context}`);
              check(!parts.some((el, i) => i && el.getBoundingClientRect().left < parts[i - 1].getBoundingClientRect().right - .1), `overlap ${context}`);
              const overflow = Math.max(0, ...parts.map(el => el.getBoundingClientRect().right - rect.right));
              check(overflow < .1 || rect.width < indicators + .1 && !hasBadge && !identityWidth && !hasGame, `overflow ${context}`);
              check(rect.width < .1 || rect.left >= Math.max(bounds.left + 8, pane.left + 8) - 1 && rect.right <= Math.min(bounds.right - 8, pane.right - 8) + 1, `containment ${context}`);
              check(bar.title.startsWith(accessible), `tooltip mismatch ${context}`);
              check(accessible.includes("Type:") && accessible.includes("Urgency:"), `semantics ${context}`);
              if (bar.dataset.timelineEvent.includes("label-0")) check(accessible.includes("A reviewed long identity") && accessible.includes("An extraordinarily long official event title"), `long copy/canonical ${context}`);
              if (bar.dataset.timelineEvent.includes("label-1")) check(accessible.includes("Si") && accessible.includes("Official short character identity banner"), `short copy/canonical ${context}`);
              if (bar.dataset.timelineEvent.includes("label-2")) check(accessible.includes("Vesna") && accessible.includes("Official character banner"), `M1 fallback ${context}`);
              if (bar.dataset.timelineEvent.includes("label-3")) check(accessible.includes("Weapon Alpha + Weapon Beta"), `ordered subjects ${context}`);
              if (bar.dataset.timelineEvent.includes("label-4")) {
                check(accessible.includes("end date only"), `precision ${context}`);
                if (hasDate) check(label.querySelector(".border-dashed"), `day cue ${context}`);
              }
              if (unknown) check(!hasDate, `invented date ${context}`);
              if (hasDate) dates++; if (rect.width < badge) tails++;
              const full = (group === "ending" ? game + gap : 0) + badge + identity + date + 2 * gap;
              if (room >= full + .1) check(hasDate || unknown, `full deadline ${context}`);
            }
            break;
            } catch (error) {
              if (attempt === 10) throw error;
              // Native scroll events and ResizeObserver may be throttled in an
              // iframe. Assert the settled layout rather than transient paint.
              ({ checks, truncated, dates, tails } = before);
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            }
          }
        }
      }
    }
    for (const width of [320, 390, 1440]) {
      status.textContent = `Running M2 navigation preservation at ${width}px…`;
      let w;
      const reset = async () => { w = await load("navigation", width); };
      const patch = async p => { w.timelineTest.patch(p); await settle(); };
      const preserve = async (action, context) => {
        const before = w.timelineTest.read(); await action(); const after = w.timelineTest.read();
        const expected = Math.max(0, Math.min(after.limit, w.timelineTest.leftFor(before.ms)));
        check(Math.abs(after.left - expected) <= 1, `M2 ${width} ${context}: ${JSON.stringify({before,after,expected})}`); navigation++;
      };
      await reset();
      const first = w.timelineTest.read(), today = w.timelineTest.leftFor(Date.parse("2026-10-20T12:34Z")) + first.width / 2;
      check(Math.abs((today - first.left) / first.width - (width >= 1024 ? .25 : .20)) < .01, `M2 initial anchor ${width}`); navigation++;
      for (const group of ["game", "ending"]) for (const dayWidth of [32, 72, 108]) {
        await reset(); await patch({ group, dayWidth });
        w.timelineTest.inspect(w.timelineTest.target); await settle();
        await preserve(() => patch({ rows: w.timelineTest.rows.filter(r => r.event.game === "hsr") }), "game filter");
        await preserve(() => patch({ rows: w.timelineTest.rows }), "restore game");
        await preserve(() => patch({ rows: w.timelineTest.rows.filter(r => r.event.type !== "banner") }), "category filter");
        await preserve(() => patch({ showUpcoming: false }), "Upcoming off");
        await preserve(() => patch({ showUpcoming: true }), "Upcoming on");
        await preserve(() => patch({ group: group === "game" ? "ending" : "game", splitUpcoming: false }), "mode/split");
        await preserve(() => patch({ rows: [...w.timelineTest.rows] }), "feed replacement");
        await preserve(() => patch({ now: Date.parse("2026-12-22T12:34Z") }), "clock bounds");
        await preserve(() => patch({ now: Date.parse("2026-12-22T12:34:01Z") }), "clock tick");
        await preserve(() => patch({}), "rerender");
        await preserve(async () => { await patch({ rows: [] }); await patch({ rows: w.timelineTest.rows }); }, "empty/restore");
        await preserve(async () => { w.document.querySelector('[aria-label="Show a longer stretch of time"]').click(); await settle(); }, "zoom centre");
        const pane = w.document.querySelector(".scroll-pane"); pane.scrollLeft = pane.scrollWidth; await settle();
        await preserve(() => patch({ rows: w.timelineTest.rows.filter(r => r.event.game === "hsr"), showUpcoming: false }), "shortened max clamp");
        await preserve(() => patch({ showUpcoming: true }), "expand after clamp");
      }
      await reset(); w.timelineTest.inspect(w.timelineTest.target); await settle();
      [...w.document.querySelectorAll("button")].find(b => b.textContent === "Jump to today").click();
      // Native smooth scrolling may take longer in a throttled iframe. Wait
      // for the actual target, retaining a finite failure deadline.
      for (let n = 0; n < 25 && Math.abs(w.timelineTest.read().left - first.left) > 1; n++) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      check(Math.abs(w.timelineTest.read().left - first.left) <= 1,
        `M2 explicit Jump ${width}: expected ${first.left}, actual ${w.timelineTest.read().left}`); navigation++;
    }
    if (!navigationOnly) check(truncated > 0 && dates > 0 && tails > 0, "matrix must exercise every fit stage");
    const result = { scope: navigationOnly ? "navigation" : "labels + navigation",
      checks, navigation, truncated, fullDates: dates, tinyTails: tails,
      widths: [320, 390, 1440], modes: ["game", "ending"],
      themes: navigationOnly ? [] : ["dark", "light"], text: navigationOnly ? [] : [100, 200],
      dayWidths: navigationOnly ? [32, 72, 108] : [6, 32, 72, 108] };
    await load("labels", 320);
    status.textContent = `PASS\n${JSON.stringify(result, null, 2)}`;
  } catch (e) { status.textContent = `FAIL: ${e.stack || e}\n${JSON.stringify({checks, navigation, truncated, fullDates: dates, tinyTails: tails})}`; }
  finally { document.querySelector("#run").disabled = false; }
};
