import { expect, spyOn, test } from "bun:test";
import { Window, type HTMLInputElement as HappyInput } from "happy-dom";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { DailyPasses } from "../src/client/components/DailyPasses.tsx";
import { PassImportDialog } from "../src/client/components/PassDecisions.tsx";
import { SetupPrompt } from "../src/client/account/AuthRoot.tsx";
import { completeFirstLogin, pendingPlan, readAccountBinding } from "../src/client/account/firstLogin.ts";
import { cznRemote } from "../src/client/account/cznProtocol.ts";
import { supabase } from "../src/client/account/remote.ts";
import {
  extendPass, mergePulledPasses, passPrefix, readPasses, setPass, syncPasses,
} from "../src/client/account/passProtocol.ts";
import {
  PassChoicesRequired, PassPlanChanged, planPassTransfer, type PassChoices, type PassTransferPlan,
} from "../src/client/account/passTransfer.ts";
import { addDays, passDay, reducePass, unionPassOps, type PassOp } from "../src/shared/dailyPasses.ts";
import { emptySyncState, type SyncMutation } from "../src/shared/sync.ts";
import { profileKeys } from "../src/client/state/storage.ts";
import { defaults } from "../src/client/state/usePrefs.ts";
import type { Region, GameId } from "../src/shared/schema.ts";
import type { SyncStatus } from "../src/client/account/syncEngine.ts";

const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const guest = "local:dom-guest";
const games = ["genshin", "hsr", "zzz", "wuwa", "endfield", "nte", "czn"] as const;
const always = () => true;

async function dom(run: (screen: {
  win: Window;
  host: ReturnType<Window["document"]["createElement"]>;
  render: (node: ReactNode) => Promise<void>;
  button: (text: string) => ReturnType<Window["document"]["createElement"]>;
  click: (text: string) => Promise<void>;
}) => Promise<void>) {
  const win = new Window({ url: "https://example.test/" });
  const globals = { window: win, document: win.document, navigator: win.navigator,
    HTMLElement: win.HTMLElement, Event: win.Event, CustomEvent: win.CustomEvent,
    localStorage: win.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const saved = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const host = win.document.createElement("div");
  win.document.body.append(host);
  const root = createRoot(host as unknown as HTMLElement);
  const button = (text: string) => {
    const el = [...host.querySelectorAll("button")].find(node => node.textContent?.startsWith(text));
    if (!el) throw new Error(`Button missing: ${text}`);
    return el;
  };
  try {
    await run({ win, host, button, render: node => act(async () => root.render(node)),
      click: text => act(async () => button(text).click()) });
  } finally {
    await act(async () => root.unmount());
    await win.happyDOM.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("PASS-2 display uses the inclusive count and expires exactly at every shipped regional boundary", async () => {
  await dom(async ({ win, host, render, click, button }) => {
    const expiries = { asia: "2026-11-17T20:00:00.000Z", america: "2026-11-18T09:00:00.000Z",
      europe: "2026-11-18T03:00:00.000Z" };
    const region = "europe";
    const panel = (game: GameId, region: Region, now: number) => <DailyPasses profileId={guest} games={games}
      focus={game} region={region} now={now} online sync={null} active={always} store={win.localStorage} />;
    await render(panel("genshin", region, Date.parse(expiries.europe)));
    expect(host.textContent).toContain("Not configured");
    for (const game of games) for (const region of Object.keys(expiries) as Region[]) {
      const expiry = game === "czn" ? "2026-11-18T18:00:00.000Z" :
        game === "endfield" && region === "europe" ? expiries.america : expiries[region];
      const boundary = Date.parse(expiry);
      await act(async () => { setPass(win.localStorage, guest, game, region, "2026-11-17", boundary - 60_000); });
      await render(panel(game, region, boundary - 1));
      expect(host.textContent).toContain("Active · 1 game-day left");
      expect(host.querySelector("time")?.getAttribute("datetime")).toBe(expiry);
      await render(panel(game, region, boundary));
      expect(host.textContent).toContain("Expired · 0 game-days left");
    }
    await click("Manage daily passes");
    expect(button("Done managing").getAttribute("aria-expanded")).toBe("true");
    const selectors = host.querySelectorAll("select");
    expect(selectors[0]!.options.length).toBe(games.length);
    expect(selectors[1]!.options.length).toBe(3);
    expect(host.querySelector('ul[aria-label="Passes by region"]')?.children.length).toBe(3);
    await act(async () => {
      (selectors[0]!).dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(button("Manage daily passes").getAttribute("aria-expanded")).toBe("false");
    expect(win.document.activeElement).toBe(button("Manage daily passes"));
    await click("Manage daily passes");
    await click("Done managing");
    expect(button("Manage daily passes").getAttribute("aria-expanded")).toBe("false");
  });
});

test("PASS-2 +30 duplicate taps, Undo before and after ACK, and profile-scoped offline delivery", async () => {
  await dom(async ({ win, host, render, click }) => {
    const at = Date.now(), store = win.localStorage;
    let remote: PassOp[] = [];
    const panel = (id: string, online = false, sync: SyncStatus | null = null) => <DailyPasses key={id}
      profileId={id} games={games} focus="genshin" region="asia" now={at} online={online}
      sync={sync} active={always} store={store} />;
    await render(panel(profile));
    await click("Manage daily passes");
    await click("+30 days");
    await click("+30 days");
    expect(readPasses(store, profile).pending).toHaveLength(1);
    expect(host.textContent).toContain("30 game-days left");
    expect(host.textContent).toContain("Offline. Pass changes are saved");
    expect(host.textContent).not.toContain("acknowledged");
    await click("Undo adding 30 days");
    const before = readPasses(store, profile);
    expect(before.ops.filter(op => op.kind === "undo")).toHaveLength(1);
    expect(before.pending).toHaveLength(2);
    expect(host.textContent).toContain("Not configured");

    await render(panel(guest));
    expect(host.textContent).not.toContain("pending sync");
    expect(readPasses(store, profile)).toEqual(before);
    await render(panel(profile, true, { kind: "synced", pending: 0, heldPasses: "fetch failed", passHoldKind: "transient" }));
    expect(host.textContent).toContain("will retry");
    expect(host.textContent).not.toContain("acknowledged");
    await click("Manage daily passes");
    await click("+30 days");
    const last = readPasses(store, profile).ops.find(op => !before.ops.some(old => old.opId === op.opId))!;
    await act(async () => {
      await syncPasses(store, profile, always, {
        pull: async () => remote, push: async (_profile, ops) => {
          remote = unionPassOps(remote, ops);
          return ops.map(op => ({ opId: op.opId, outcome: "accepted" }));
        },
      }, true);
    });
    await render(panel(profile, true, { kind: "synced", pending: 0 }));
    expect(host.textContent).toContain("acknowledged by the server");
    expect(readPasses(store, profile).pending).toHaveLength(0);
    await click("Undo adding 30 days");
    expect(readPasses(store, profile).ops).toContainEqual(expect.objectContaining({ kind: "undo", targetOp: last.opId }));
    expect(host.textContent).toContain("1 pass change pending sync");
    expect(store.getItem(profileKeys(profile).daily)).toBeNull();
  });
});

test("PASS-2 cap warning allows saves, correction absorbs earlier Undo, and D3 offers include and dismiss", async () => {
  await dom(async ({ win, host, render, click }) => {
    const store = win.localStorage, at = Date.now(), today = passDay(at, "genshin", "asia");
    setPass(store, guest, "genshin", "asia", addDays(today, 169), at - 10_000);
    const hidden = extendPass(store, guest, "mygame:hidden", "asia", 30, at - 1000);
    await render(<DailyPasses profileId={guest} games={games} focus="genshin" region="asia"
      now={at} online sync={null} active={always} store={store} />);
    await click("Manage daily passes");
    expect(host.textContent).toContain("may exceed Welkin");
    await click("+30 days");
    expect(host.textContent).toContain("200 game-days left");
    expect(host.textContent).toContain("Undo adding 30 days");
    await click("Correct expiration");
    const form = host.querySelector("form")!;
    const method = form.querySelector("select")!;
    await act(async () => {
      method.value = "duration";
      method.dispatchEvent(new win.Event("change", { bubbles: true }));
    });
    expect(form.querySelector("input")?.value).toBe("200");
    expect(form.textContent).toContain("This correction may exceed Welkin");
    await click("Save correction");
    expect(host.textContent).not.toContain("Undo adding 30 days");
    const secondDevice = new Window({ url: "https://second.example.test/" });
    try {
      let include!: PassOp, dismiss!: PassOp;
      await act(async () => {
        include = extendPass(secondDevice.localStorage, guest, "genshin", "asia", 30, at - 3000);
        dismiss = extendPass(secondDevice.localStorage, guest, "genshin", "asia", 30, at - 2000);
        mergePulledPasses(store, guest, [include, dismiss]);
        win.dispatchEvent(Object.assign(new win.Event("account-sync-remote-change"), { detail: guest }));
      });
      expect(host.textContent).toContain("Resolve the conflicting extensions before correcting");
      await click("Include extension");
      await click("Dismiss extension");
      const local = readPasses(store, guest);
      const pass = reducePass(local.ops, "genshin", "asia");
      expect(pass.conflicts).toEqual([]);
      expect(pass.applied).toEqual([include.opId]);
      expect(pass.dismissed).toEqual([dismiss.opId]);
      expect(local.ops).toContainEqual(hidden);
      expect(host.textContent).not.toContain("mygame:hidden");
    } finally { await secondDevice.happyDOM.close(); }
  });
});

test("PASS-2 keeps persistent recovery visible and refuses writes on that account", async () => {
  await dom(async ({ win, host, render, click, button }) => {
    const store = win.localStorage, at = Date.now();
    const op = extendPass(store, profile, "genshin", "asia", 30, at);
    expect(() => mergePulledPasses(store, profile, [{ ...op, days: 31 } as PassOp])).toThrow("ID reused");
    await render(<DailyPasses profileId={profile} games={games} focus="genshin" region="asia"
      now={at} online sync={null} active={always} store={store} />);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("IDs conflict");
    await click("Manage daily passes");
    expect(button("+30 days").hasAttribute("disabled")).toBe(true);
    const key = `${passPrefix(profile)}op:broken`;
    await act(async () => {
      store.setItem(key, "unreadable");
      win.dispatchEvent(new win.StorageEvent("storage", { key }));
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("unreadable");
    expect(store.getItem(key)).toBe("unreadable");
    expect(readPasses(store, profile).pending).toEqual([op.opId]);
  });
});

test("PASS-2 first-login prompt requires explicit radio choices and clears stale selections", async () => {
  await dom(async ({ win, host, render, click, button }) => {
    const store = win.localStorage, at = Date.now();
    const source = extendPass(store, guest, "genshin", "asia", 30, at);
    extendPass(store, profile, "genshin", "asia", 60, at);
    const plan = planPassTransfer(readPasses(store, profile), { profileId: guest, ops: [source] });
    const calls: unknown[] = [];
    let canceled = false;
    await render(<SetupPrompt choice={{ profileId: profile, ownerId: "owner", email: "test@example.test",
      guest: { profileId: guest, keys: profileKeys(guest) }, resumable: false, cloud: emptySyncState(),
      local: { prefs: defaults(), daily: {}, progress: {}, ignored: {}, customEvents: {}, customGames: {} } }}
      onComplete={async (_mode, _settings, passes) => {
        calls.push(passes?.choices);
        if (!passes) throw new PassChoicesRequired(plan);
        if (calls.length === 2) throw new PassPlanChanged(plan);
      }} onCancel={() => { canceled = true; }} />);
    await click("Save local data");
    expect(button("Continue account setup").hasAttribute("disabled")).toBe(true);
    expect(host.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0);
    await act(async () => (host.querySelector('input[value="imported"]') as HappyInput).click());
    await click("Continue account setup");
    expect(calls).toEqual([undefined, { genshin: "imported" }]);
    expect(host.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0);
    expect(button("Continue account setup").hasAttribute("disabled")).toBe(true);
    await click("Cancel");
    expect(canceled).toBe(true);
    expect(readPasses(store, guest).ops).toEqual([source]);

    await render(<PassImportDialog plan={plan} updated={false} busy={false} submit={() => {}}
      cancel={() => { canceled = true; }} />);
    expect(host.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    expect(host.querySelector("dialog")?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(button("Import backup").hasAttribute("disabled")).toBe(true);
  });
});

for (const failure of ["migration plan storage", "CZN negotiation"] as const) {
  test(`PASS-2 first-login retry locks saved choices after ${failure} fails`, async () => {
    await dom(async ({ win, host, render, click }) => {
      const store = win.localStorage, at = Date.now() - 10_000, owner = "owner";
      const guestOp = extendPass(store, guest, "genshin", "asia", 30, at);
      const cloudOp = extendPass(store, profile, "genshin", "asia", 60, at);
      const cloud = emptySyncState();
      const local = { prefs: defaults(), daily: {}, progress: {}, ignored: {}, customEvents: {}, customGames: {} };
      const choice = { profileId: profile, ownerId: owner, email: "test@example.test",
        guest: { profileId: guest, keys: profileKeys(guest) }, resumable: false, cloud, local };
      let rejectIntent = true, rejectLegacy = true;
      const guardedStore = {
        get length() { return store.length; },
        key: (index: number) => store.key(index),
        getItem: (key: string) => store.getItem(key),
        setItem(key: string, value: string) {
          if (rejectIntent && key.startsWith(`${passPrefix(profile)}intent:`)) {
            rejectIntent = false;
            throw new Error("Could not save the pass receipt");
          }
          if (rejectLegacy && failure === "migration plan storage" && key.endsWith(":firstLoginPlan")) {
            rejectLegacy = false;
            throw new Error("Could not save the migration plan");
          }
          store.setItem(key, value);
        },
      };
      const query = { select: () => query, eq: () => query, order: () => query,
        range: async () => ({ data: [], error: null }) };
      const from = spyOn(supabase, "from").mockReturnValue(query as never);
      const rpc = spyOn(supabase, "rpc").mockImplementation(((_name: string, args: { p_mutations: SyncMutation[] }) =>
        Promise.resolve({ data: args.p_mutations.map(row => ({ mutationId: row.mutationId, outcome: "accepted" })),
          error: null })) as never);
      const negotiate = spyOn(cznRemote, "negotiate").mockImplementation(async () => {
        if (rejectLegacy && failure === "CZN negotiation") {
          rejectLegacy = false;
          throw new Error("CZN request failed");
        }
        return { protocol: 2, enabled: false, policy: null };
      });
      const transport = { pull: async () => [cloudOp], push: async () => [] };
      const submitted: { plan: PassTransferPlan; choices: PassChoices }[] = [];
      const finish = (passes?: { plan: PassTransferPlan; choices: PassChoices }) =>
        completeFirstLogin(guardedStore, profile, owner, guest, local, cloud, "merge", "cloud", always,
          { enabled: true, transport, ...passes });
      try {
        await render(<SetupPrompt choice={choice} onComplete={async (_mode, _settings, passes) => {
          if (passes) submitted.push(passes);
          await finish(passes);
        }} onCancel={() => { throw new Error("Unexpected cancellation"); }} />);
        await click("Save local data");
        await act(async () => (host.querySelector('input[value="imported"]') as HappyInput).click());
        await click("Continue account setup");
        expect(host.querySelector('[role="alert"]')?.textContent).toBe("Could not save the pass receipt");
        expect(readPasses(store, profile).imports).toEqual([]);
        expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(2);
        await click("Continue account setup");

        expect(host.textContent).toContain("Daily pass choices saved");
        expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(0);
        expect([...host.querySelectorAll("button")].map(button => button.textContent)).toEqual(["Continue account setup"]);
        expect(readAccountBinding(store, profile, owner)).toBe(false);
        expect(pendingPlan(store, profile, owner, guest) === null).toBe(failure === "migration plan storage");
        const committed = readPasses(store, profile);
        expect(committed.imports).toHaveLength(1);
        expect(reducePass(committed.ops, "genshin", "asia").lastDay)
          .toBe(reducePass([guestOp], "genshin", "asia").lastDay);

        await expect(finish({ plan: submitted[0]!.plan, choices: { genshin: "current" } }))
          .rejects.toMatchObject({ plan: { alreadyApplied: true } });
        await click("Continue account setup");
        expect(submitted.at(-1)).toEqual({ plan: submitted[0]!.plan, choices: {} });
        expect(readAccountBinding(store, profile, owner)).toBe(true);
        expect(readPasses(store, profile)).toEqual(committed);
        expect(readPasses(store, guest).ops).toEqual([guestOp]);
      } finally { from.mockRestore(); rpc.mockRestore(); negotiate.mockRestore(); }
    });
  });
}
