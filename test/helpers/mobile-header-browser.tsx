import { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/client/App.tsx";
import { AccountDisclosure, accountCue } from "../../src/client/components/AccountDisclosure.tsx";
import { defaults } from "../../src/client/state/usePrefs.ts";
import { profileKeys } from "../../src/client/state/storage.ts";
import { boardWindow, timelineMsAt, timelineX } from "../../src/client/components/Timeline.tsx";
import { clockFor } from "../../src/shared/time.ts";
import type { EventFeed } from "../../src/shared/feed.ts";
import type { SyncStatus } from "../../src/client/account/syncEngine.ts";

const keys = profileKeys("local:header-test");
const saved = { ...defaults(), onboarded: true, regionConfirmed: true, view: "timeline", showUpcoming: true,
  hiddenGames: ["zzz"], gameOrder: ["hsr", "genshin", "mygame:long"],
  knownGames: ["hsr", "genshin", "mygame:long", "zzz", "nte", "wuwa", "endfield", "czn"], theme: "dark" };
if (!localStorage.getItem(keys.prefs)) localStorage.setItem(keys.prefs, JSON.stringify(saved));
localStorage.setItem(keys.customGames, JSON.stringify({ "mygame:long": {
  id: "mygame:long", name: "A very long custom game name", hue: "#aabbcc", at: "2026-10-21T12:00:00Z" } }));
let feed: EventFeed;
const fetchOriginal = window.fetch.bind(window);
Object.defineProperty(window, "fetch", { value: async (...args: Parameters<typeof fetch>) => {
  const response = await fetchOriginal(...args);
  if (String(args[0]).includes("events.v1.json")) feed = await response.clone().json();
  return response;
} });
function Fixture() {
  const [account, setAccount] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [offline, setOffline] = useState(false);
  const [action, setAction] = useState("");
  const cue = accountCue(account ? "account" : "guest", status, offline);
  const actions = <nav aria-label="Account">
    <p>{account ? "test@example.test" : "Saved on this device"}</p>
    {account && <p role="status">{cue.label} · {status?.pending ?? 0} pending · Last sync {status?.lastSuccessfulSyncAt}</p>}
    <button onClick={() => setAction("sign-in")}>Continue with Google</button>
    {account && <><button onClick={() => setAction("retry")}>Retry sync</button>
      <button onClick={() => { setAccount(false); setStatus(null); }}>Sign out</button></>}
    <output>{action}</output>
  </nav>;
  Object.assign(window, { headerTest: {
    account: (status: SyncStatus | null, offline = false) => { setAccount(true); setStatus(status); setOffline(offline); },
    prefs: () => JSON.parse(localStorage.getItem(keys.prefs)!),
    saved,
    read: () => {
      const prefs = JSON.parse(localStorage.getItem(keys.prefs)!);
      const now = Date.now();
      const rows = feed.events.map(event => ({ event, clock: clockFor(event, prefs.region, now) }))
        .filter(r => !r.clock.ended && !prefs.hiddenGames.includes(r.event.game) &&
          prefs.visibleCategories.includes(["story", "rerun", "other"].includes(r.event.type) ? "event" : r.event.type) &&
          (!prefs.focusGame || r.event.game === prefs.focusGame) && (prefs.showUpcoming || !r.clock.upcoming));
      const { min } = boardWindow(rows.map(r => r.clock.startsMs), rows.map(r => r.clock.endsMs ?? r.clock.startsMs + 14 * 86400000), now);
      const pane = document.querySelector<HTMLElement>(".scroll-pane")!;
      return { ms: timelineMsAt(pane.scrollLeft + pane.clientWidth / 2, min, prefs.timelineDayWidth), min,
        left: pane.scrollLeft, limit: pane.scrollWidth - pane.clientWidth, width: pane.clientWidth, dayWidth: prefs.timelineDayWidth };
    },
    leftFor: (ms: number) => {
      const r = (window as any).headerTest.read();
      return timelineX(ms, r.min, r.dayWidth) - r.width / 2;
    },
  } });
  return <><div className="desktop-account mx-auto max-w-7xl px-4 py-2">{actions}</div>
    <App storageKeys={keys} accountControl={<AccountDisclosure cue={cue}>{actions}</AccountDisclosure>} /></>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
