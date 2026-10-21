import { Window, type Element as HappyElement } from "happy-dom";
import { act } from "react";
import { mock } from "bun:test";
import assert from "node:assert/strict";
import type { ReactNode } from "react";
import type { ViewState } from "../../src/client/account/AuthRoot.tsx";
import type { SyncStatus } from "../../src/client/account/syncEngine.ts";

// Isolate mocked transport from the full suite. Exercise AuthRoot's real
// presentation/actions without real OAuth, a remote session, or sync writes.
const win = new Window({ url: "https://example.test/" });
Object.assign(globalThis, { window: win, document: win.document, localStorage: win.localStorage,
  navigator: win.navigator, location: win.location, history: win.history, Node: win.Node,
  IS_REACT_ACT_ENVIRONMENT: true });
const { bootstrapLocalProfile, profileKeys } = await import("../../src/client/state/storage.ts");
const guest = bootstrapLocalProfile();
let publish: (view: ViewState) => void;
let sessionChanged: () => void;
let emitSync: (status: SyncStatus) => void;
let retries = 0, signIns = 0, signOuts = 0, stopped = 0;
mock.module("../../src/client/account/bootstrap.ts", () => ({
  startAuthBootstrap: (options: { publish: typeof publish; sessionChanged: () => void }) => {
    publish = options.publish; sessionChanged = options.sessionChanged;
    publish({ kind: "guest", guest });
    return { onAuth: () => {}, retry: () => {}, stop: () => {} };
  },
  watchAuthReconnect: () => () => {},
}));
mock.module("../../src/client/account/syncEngine.ts", () => ({
  startProfileSync: (_profile: string, _owner: string, _active: () => boolean, notify: typeof emitSync) => {
    emitSync = notify;
    return { retry: () => { retries++; }, stop: () => { stopped++; } };
  },
}));
mock.module("@supabase/supabase-js", () => ({ createClient: () => ({
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithOAuth: async () => { signIns++; return { error: null }; },
    signOut: async () => { signOuts++; return { error: null }; },
  },
}) }));
let appMounts = 0;
const { useEffect } = await import("react");
mock.module("../../src/client/App.tsx", () => ({ App: ({ storageKeys, accountControl }: {
  storageKeys: ReturnType<typeof profileKeys>; accountControl: ReactNode;
}) => {
  useEffect(() => { appMounts++; }, []);
  return <main data-profile={storageKeys.prefs}>{accountControl}</main>;
} }));
const { AuthRoot } = await import("../../src/client/account/AuthRoot.tsx");
const { createRoot } = await import("react-dom/client");
const host = win.document.createElement("div"); win.document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
await act(async () => { root.render(<AuthRoot guest={guest} />); });
const trigger = () => host.querySelector(".account-trigger")!;
const click = async (el: HappyElement) => act(async () => { el.dispatchEvent(new win.MouseEvent("click", { bubbles: true })); });
const details = () => host.querySelector(".account-popover")!;
const button = (name: string) => [...details().querySelectorAll("button")].find(el => el.textContent === name)!;
assert.equal(trigger().getAttribute("aria-expanded"), "false");
assert.match(trigger().getAttribute("aria-label")!, /Guest/);
await click(trigger());
assert.match(details().textContent!, /Saved on this device/);
await click(button("Continue with Google"));
assert.equal(signIns, 1);
assert.equal(appMounts, 1, "account disclosure does not remount the calendar");

const profileId = "11111111-1111-4111-8111-111111111111";
const account: ViewState = { kind: "account", guest, profileId, ownerId: "owner", email: "account@example.test" };
await act(async () => { publish(account); });
await click(trigger());
for (const kind of ["synced", "syncing", "pending", "offline", "network", "auth", "schema", "error"] as const) {
  await act(async () => { emitSync({ kind, pending: kind === "synced" ? 0 : 4,
    lastSuccessfulSyncAt: "2026-10-21T12:00:00Z", message: "Readable explanation" }); });
  assert.match(details().textContent!, /account@example.test/);
  assert.match(details().textContent!, /Last sync/);
  if (kind !== "synced") assert.match(details().textContent!, /4 pending/);
  assert.equal(trigger().querySelector(".account-cue")!.getAttribute("data-tone"),
    kind === "synced" ? "synced" : kind === "syncing" ? "busy" : ["auth", "schema", "error"].includes(kind) ? "warning" : "waiting");
  if (kind === "auth") {
    await click(button("Continue with Google")); assert.equal(signIns, 2);
  } else assert.match(details().textContent!, /Readable explanation/);
  if (kind === "schema" || kind === "error") await click(button("Retry sync"));
}
assert.equal(retries, 2);
await act(async () => { emitSync({ kind: "synced", pending: 0, clockWarning: true }); });
assert.match(details().textContent!, /Check device clock/);
assert.match(trigger().getAttribute("aria-label")!, /clock/);
await act(async () => { publish({ ...account, offline: true }); emitSync({ kind: "synced", pending: 0 }); });
assert.equal(trigger().querySelector(".account-cue")!.getAttribute("data-tone"), "waiting");
assert.match(details().textContent!, /Network unavailable|Offline/);
await click(button("Sign out"));
assert.equal(signOuts, 1);
assert.match(trigger().getAttribute("aria-label")!, /Guest/);
assert.equal(host.querySelector("main")!.getAttribute("data-profile"), guest.keys.prefs);
assert(!host.textContent!.includes("account@example.test"), "sign-out hides account identity");
assert(stopped > 0, "sync controller stops on account exit");
await act(async () => { publish({ kind: "deferred", guest, email: "deferred@example.test", message: "Setup deferred" }); });
await click(trigger());
assert(button("Choose account data"));
assert.match(details().textContent!, /Local data remains on this device/);
assert.match(details().textContent!, /Setup deferred/);
await act(async () => { sessionChanged(); publish({ kind: "guest", guest, message: "Sign in again" }); });
assert(!host.textContent!.includes("deferred@example.test"));
assert.match(host.textContent!, /Sign in again/);
await act(async () => root.unmount());
await win.happyDOM.close();
console.log("Account disclosure mounted presentation/actions passed");
