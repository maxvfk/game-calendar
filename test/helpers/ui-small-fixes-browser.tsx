import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/client/App.tsx";
import { AccountDisclosure, accountCue } from "../../src/client/components/AccountDisclosure.tsx";
import { defaults } from "../../src/client/state/usePrefs.ts";
import { profileKeys } from "../../src/client/state/storage.ts";
import { useEventDetailHistory } from "../../src/client/state/useEventDetailHistory.ts";

for (const profile of ["guest", "account"]) {
  const keys = profileKeys(`local:polish-${profile}`);
  if (!localStorage.getItem(keys.prefs)) localStorage.setItem(keys.prefs, JSON.stringify({ ...defaults(),
    onboarded: true, regionConfirmed: true, view: "timeline", showUpcoming: true,
    knownGames: ["hsr", "genshin", "endfield"], gameOrder: ["hsr", "genshin", "endfield"], theme: "dark" }));
  if (!localStorage.getItem(keys.customEvents)) localStorage.setItem(keys.customEvents, JSON.stringify({
    "myevent:deleteme": { id: "myevent:deleteme", game: "genshin", title: "Delete me", type: "story", summary: null,
      startsAt: "2026-10-01T00:00:00.000Z", startPrecision: "exact", endsAt: "2026-12-01T00:00:00.000Z", endPrecision: "exact",
      at: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
  }));
}
function Fixture() {
  const [profile, setProfile] = useState("guest");
  Object.assign(window, { polishTest: {
    profile: (id: string) => setProfile(id),
    prefs: () => JSON.parse(localStorage.getItem(profileKeys(`local:polish-${profile}`).prefs)!),
  } });
  return <App key={profile} storageKeys={profileKeys(`local:polish-${profile}`)}
    accountControl={<AccountDisclosure cue={accountCue("guest", null)}>
      <button onClick={() => setProfile(profile === "guest" ? "account" : "guest")}>Switch profile</button>
    </AccountDisclosure>} />;
}
// The same history owner hook also allows otherwise unreachable rapid races
// and foreign-history interactions to be tested without poking App internals.
function HistoryFixture() {
  const { openId, openDetail, closeDetail } = useEventDetailHistory();
  Object.assign(window, { historyTest: { open: openDetail, close: closeDetail } });
  return <output>{openId ?? "closed"}</output>;
}
createRoot(document.getElementById("root")!).render(<StrictMode>
  {location.pathname.endsWith("/history") ? <HistoryFixture /> : <Fixture />}
</StrictMode>);
