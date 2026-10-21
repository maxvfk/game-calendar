import { expect, test } from "bun:test";
import { accountCue } from "../src/client/components/AccountDisclosure.tsx";
import type { SyncStatus } from "../src/client/account/syncEngine.ts";
import { renderToStaticMarkup } from "react-dom/server";
import { GameFocus } from "../src/client/components/GameFocus.tsx";

test("wrapped Focus reports zero/one enabled game without an inert chooser", () => {
  for (const games of [[], ["genshin"]]) {
    const html = renderToStaticMarkup(<GameFocus wrapped games={games} focus={null}
      counts={{}} total={0} next={null} onFocus={() => {}} onAdvance={() => {}} />);
    expect(html).toContain("Games / Focus");
    expect(html).toContain(games.length ? "Showing Genshin Impact" : "No games enabled");
    expect(html).not.toContain("<button");
  }
});

test("AuthRoot disclosure preserves its status, actions and sign-out profile isolation", async () => {
  const child = Bun.spawn([process.execPath, "run", "test/helpers/account-disclosure-dom.tsx"], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect({ code, err }).toEqual({ code: 0, err: "" });
  expect(out).toContain("Account disclosure mounted presentation/actions passed");
}, 15000);

test("account cue distinguishes true sync from a session, local saves and pending work", () => {
  expect(accountCue("guest", null).tone).toBe("guest");
  expect(accountCue("deferred", null).label).toContain("Choose account data");
  expect(accountCue("account", null).label).toBe("Sync starting");
  for (const kind of ["syncing", "pending", "offline", "network", "auth", "schema", "error"] as const) {
    const cue = accountCue("account", { kind, pending: 2 });
    expect(cue.tone).not.toBe("synced");
    expect(cue.label.length).toBeGreaterThan(5);
  }
  const synced: SyncStatus = { kind: "synced", pending: 0, lastSuccessfulSyncAt: "2026-10-21T12:00:00Z" };
  expect(accountCue("account", synced).tone).toBe("synced");
  expect(accountCue("account", { ...synced, pending: 2 }).label).toContain("2 changes pending");
  expect(accountCue("account", synced, true).tone).toBe("waiting");
  expect(accountCue("account", { ...synced, clockWarning: true }).label).toBe("Check device clock");
  expect(accountCue("account", synced, false, true).tone).toBe("warning");
  // No account state may leak a positive cue into a guest entry after sign-out.
  expect(accountCue("guest", synced).tone).toBe("guest");
});
