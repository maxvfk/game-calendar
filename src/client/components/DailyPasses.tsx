import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  addDays, dayDiff, DEFAULT_PASS_DAYS, isPassDay, MAX_PASS_DAY, passClockBasis, passDay, passKey,
  passView, reducePass, reducePasses, type PassOp, type PassState, type PassView,
} from "../../shared/dailyPasses.ts";
import { GAMES } from "../../shared/games.ts";
import { Region, type GameId } from "../../shared/schema.ts";
import { REGION_LABEL } from "../../shared/time.ts";
import { LOCAL_CHANGE, REMOTE_CHANGE } from "../account/localSync.ts";
import {
  assertPassWritable, createPassSet, extendPass, passErrorMessage, passPrefix, queuePassOps,
  readPasses, resolvePass, undoPass, type PassLocal, type PassStore,
} from "../account/passProtocol.ts";
import type { SyncStatus } from "../account/syncEngine.ts";

const control = "min-h-10 rounded-md border border-hairline px-2.5 py-1.5 text-sm disabled:opacity-50";
const input = `${control} w-full min-w-0 bg-ground`;
const TAP_WINDOW = 1000;
const WELKIN_CAP = 180;

function remaining(view: PassView): number {
  return view.status === "none" ? 0 : view.remainingDays;
}

function PassSummary({ pass, now }: { pass: Pick<PassState, "game" | "region" | "lastDay">; now: number }) {
  const view = passView(pass, now);
  if (view.status === "none") return <span className="text-faint">Not configured</span>;
  const expires = new Date(view.expiresAtMs).toISOString();
  const [date, time] = expires.split("T") as [string, string];
  const estimated = passClockBasis(pass.game, pass.region) === "regional-default";
  return <>
    <span>{view.status === "expired" ? "Expired · 0 game-days left" :
      `Active · ${view.remainingDays} game-${view.remainingDays === 1 ? "day" : "days"} left`}</span>
    <span className="block text-faint">
      {estimated ? "Estimated expiry " : "Expiry "}
      <time dateTime={expires}>{date} {time.slice(0, 5)} UTC</time>
    </span>
  </>;
}

function readLocal(store: PassStore, profileId: string) {
  try { return { local: readPasses(store, profileId), error: null }; }
  catch (error) { return { local: null, error: passErrorMessage(error) }; }
}

function deliveryMessage(local: PassLocal | null, online: boolean, sync: SyncStatus | null, guest: boolean) {
  const pending = local?.pending.length ?? 0;
  if (local?.recovery.length || local?.held || sync?.passHoldKind === "persistent") return null;
  if (guest) return pending ? "Saved on this device." : null;
  if (!online || sync?.kind === "offline") return pending ?
    "Offline. Pass changes are saved on this device and pending sync." : "Offline. Passes shown from this device.";
  if (sync?.kind === "network" || sync?.passHoldKind === "transient") return pending ?
    "Pass sync unavailable. Changes are saved on this device and will retry." : "Pass sync unavailable. Will retry.";
  if (sync?.kind === "auth") return "Sign in again to sync passes.";
  if (sync?.kind === "schema" || sync?.kind === "error") return "Pass sync is blocked by an account sync error.";
  if (pending) return `Saved on this device · ${pending} pass ${pending === 1 ? "change" : "changes"} pending sync.`;
  return local?.ops.length ? "Pass operations acknowledged by the server." : null;
}

/** An action can still be in the journal after a set absorbs it, or a later
 * extension makes its removal immaterial. Only offer an Undo with an effect. */
function canUndo(ops: readonly PassOp[], state: PassState, op: PassOp): boolean {
  if (state.undone.includes(op.opId)) return false;
  if (op.kind === "extend" && !state.applied.includes(op.opId)) return false;
  if (op.kind === "set" && state.winningSet !== op.opId) return false;
  const prior = reducePass(ops.filter(candidate => candidate.opId !== op.opId), state.game, state.region);
  return prior.lastDay !== state.lastDay || prior.conflicts.join() !== state.conflicts.join();
}

export function DailyPasses({ profileId, games, focus, region, now, online, sync, active, store = localStorage }: {
  profileId: string;
  games: readonly GameId[];
  focus: GameId | null;
  region: Region;
  now: number;
  online: boolean;
  sync: SyncStatus | null;
  active: () => boolean;
  store?: PassStore;
}) {
  const [snapshot, setSnapshot] = useState(() => readLocal(store, profileId));
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<{ game: GameId; region: Region } | null>(null);
  const [actions, setActions] = useState<{ op: PassOp; label: string }[]>([]);
  const tapAt = useRef(new Map<string, number>());
  const [error, setError] = useState<string | null>(null);
  const viewId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const refresh = () => setSnapshot(readLocal(store, profileId));
    const changed = (event: Event) => { if ((event as CustomEvent).detail === profileId) refresh(); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(passPrefix(profileId))) refresh();
    };
    refresh();
    window.addEventListener(LOCAL_CHANGE, changed);
    window.addEventListener(REMOTE_CHANGE, changed);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(LOCAL_CHANGE, changed);
      window.removeEventListener(REMOTE_CHANGE, changed);
      window.removeEventListener("storage", storage);
    };
  }, [profileId, store]);
  // A pass pull can retain a collision or new facts before a later RPC fails.
  useEffect(() => { setSnapshot(readLocal(store, profileId)); }, [profileId, store, sync]);

  const local = snapshot.local;
  const states = useMemo(() => reducePasses(local?.ops ?? []), [local]);
  const selectedGame = selection && games.includes(selection.game) ? selection.game : focus ?? games[0];
  const selectedRegion = selection?.region ?? region;
  const lane = selectedGame ? passKey(selectedGame, selectedRegion) : undefined;
  const state = selectedGame && lane ? states.get(lane) ?? reducePass([], selectedGame, selectedRegion) : null;
  const view = state ? passView(state, now) : null;
  const relevant = [...states.values()].filter(state => games.some(game => game === state.game));
  const hasConflicts = relevant.some(state => state.conflicts.length || state.concurrentSets.length || state.outOfRange.length);
  const summaryGames = focus ? [focus] : games.filter(game => states.get(passKey(game, region))?.lastDay);
  const persistent = snapshot.error ? "Pass storage cannot be read." :
    local?.recovery.length ? "Some pass data is unreadable. Export a backup for recovery." :
    local?.held ? "Pass operation IDs conflict. Export a backup for recovery." :
    sync?.passHoldKind === "persistent" ? sync.heldPasses : null;
  const status = deliveryMessage(local, online, sync, profileId.startsWith("local:"));

  function change(apply: (latest: PassLocal, state: PassState, at: number) => PassOp | undefined, label?: string) {
    if (!state) return;
    setError(null);
    try {
      if (!active()) throw new Error("The active profile changed. Reopen Daily passes to edit.");
      const latest = readPasses(store, profileId);
      assertPassWritable(latest);
      const fresh = reducePass(latest.ops, state.game, state.region);
      const op = apply(latest, fresh, Date.now());
      if (label && op) setActions(previous => [...previous, { op, label }]);
    } catch (cause) { setError(passErrorMessage(cause)); }
    finally { setSnapshot(readLocal(store, profileId)); }
  }

  if (!games.length) return null;
  return <section aria-label="Daily passes" className="border-b border-hairline px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
      <h2 className="eyebrow">Daily passes · {REGION_LABEL[region]}</h2>
      <button type="button" ref={buttonRef} aria-expanded={open} aria-controls={viewId}
        className="min-h-10 text-xs text-muted underline" onClick={() => {
          setError(null);
          if (!open) setSelection(null);
          setOpen(!open);
        }}>{open ? "Close daily passes" : "Manage daily passes"}</button>
    </div>
    {local && (summaryGames.length ? <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {summaryGames.map(game => <li key={game}>
        <span className="font-semibold">{GAMES[game].short} · </span>
        <PassSummary pass={states.get(passKey(game, region)) ?? { game, region, lastDay: null }} now={now} />
      </li>)}
    </ul> : <p className="text-xs text-faint">No passes configured in this region.</p>)}
    {persistent && <p role="alert" className="mt-2 text-xs text-soon">{persistent}
      {local?.pending.length ? ` ${local.pending.length} unsent pass ${local.pending.length === 1 ? "change is" : "changes are"} saved on this device.` : ""}
    </p>}
    <p role="status" className="text-xs text-faint empty:hidden">{status}</p>
    {hasConflicts && <p className="mt-2 text-xs text-soon">Pass changes need review.</p>}

    <div id={viewId} hidden={!open} onKeyDown={event => {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }}>
      {open && selectedGame && lane && state && view && <>
        <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="min-w-0 text-xs text-muted">Game
            <select value={selectedGame} className={input} onChange={event => {
              setSelection({ game: event.target.value as GameId, region: selectedRegion });
              setError(null);
            }}>{games.map(game => <option key={game} value={game}>{GAMES[game].name}</option>)}</select>
          </label>
          <label className="min-w-0 text-xs text-muted">Pass region
            <select value={selectedRegion} className={input} onChange={event => {
              setSelection({ game: selectedGame, region: Region.parse(event.target.value) });
              setError(null);
            }}>{Region.options.map(option => <option key={option} value={option}>{REGION_LABEL[option]}</option>)}</select>
          </label>
        </div>
        {local && <ul aria-label="Passes by region" className="mt-3 space-y-2 text-xs">
          {Region.options.map(option => {
            const pass = states.get(passKey(selectedGame, option)) ?? { game: selectedGame, region: option, lastDay: null };
            return <li key={option}>
              <span className="font-semibold">{REGION_LABEL[option]} · </span>
              <PassSummary pass={pass} now={now} />
              {"conflicts" in pass && (pass.conflicts.length > 0 || pass.concurrentSets.length > 0 || pass.outOfRange.length > 0) &&
                <span className="block text-soon">Needs review</span>}
            </li>;
          })}
        </ul>}
        {view.status !== "none" && <p className="mt-3 text-xs text-faint">Last active game-day · {view.lastDay}</p>}
        <p className="mt-1 text-xs text-faint">Game-days remaining include today while the pass is active.</p>
        {selectedGame === "genshin" && remaining(view) + DEFAULT_PASS_DAYS > WELKIN_CAP &&
          <p className="mt-2 text-xs text-soon">Adding 30 days may exceed Welkin’s in-game limit of {WELKIN_CAP} remaining days.</p>}
        <button type="button" disabled={!!persistent || !local} className={`${control} mt-3`}
          onClick={() => {
            const at = performance.now();
            if (at - (tapAt.current.get(lane) ?? -Infinity) < TAP_WINDOW) return;
            tapAt.current.set(lane, at);
            change((_, fresh, now) => extendPass(store, profileId, fresh.game, fresh.region, DEFAULT_PASS_DAYS, now), "adding 30 days");
          }}>+30 days</button>
        {local && state.conflicts.map(id => {
          const extension = local.ops.find(op => op.opId === id);
          if (extension?.kind !== "extend") return null;
          return <div key={id} className="mt-3 rounded-lg border border-hairline p-2 text-xs">
            <p>Conflicting +{extension.days}-day extension from {extension.actionDay}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["include", "exclude"] as const).map(resolution =>
                <button key={resolution} type="button" className={control} disabled={!!persistent} onClick={() =>
                  change((_, fresh, at) => {
                    if (!fresh.conflicts.includes(id)) throw new Error("This conflict changed. Review the updated pass.");
                    return resolvePass(store, profileId, id, resolution, at);
                  }, resolution === "include" ? "including the extension" : "dismissing the extension")}>
                  {resolution === "include" ? "Include extension" : "Dismiss extension"}
                </button>)}
            </div>
          </div>;
        })}
        {state.concurrentSets.length > 0 && <p className="mt-2 text-xs text-soon">Concurrent correction found. Review the displayed date and save the correct value.</p>}
        {state.outOfRange.length > 0 && <p className="mt-2 text-xs text-soon">An extension exceeds the supported calendar. Set the correct date to resolve it.</p>}
        {state.conflicts.length > 0 && <p className="mt-2 text-xs text-faint">Resolve the conflicting extensions before correcting this pass.</p>}
        <PassCorrection key={lane} game={selectedGame} view={view} disabled={!!persistent || !local || !!state.conflicts.length}
          save={getDay => change((latest, fresh, at) => {
            if (fresh.conflicts.length) throw new Error("Resolve the conflicting extensions before correcting this pass.");
            const op = createPassSet(latest.ops, fresh.game, fresh.region, getDay(passDay(at, fresh.game, fresh.region)), at);
            if (reducePass([...latest.ops, op], fresh.game, fresh.region).winningSet !== op.opId) {
              throw new Error("The correction could not take effect. Check the device clock.");
            }
            queuePassOps(store, profileId, [op]);
            return op;
          }, "correcting the pass")} />
        {local && actions.filter(({ op }) => op.game === selectedGame && op.region === selectedRegion &&
          canUndo(local.ops, state, op)).reverse().map(({ op, label }) =>
          <button key={op.opId} type="button" disabled={!!persistent} className="mt-2 block min-h-10 text-left text-xs underline"
            onClick={() => change((latest, fresh, at) => {
              if (!canUndo(latest.ops, fresh, op)) throw new Error("This action no longer changes the pass.");
              return undoPass(store, profileId, op.opId, at);
            })}>Undo {label} · <time dateTime={op.createdAt}>{op.createdAt.slice(11, 19)} UTC</time></button>)}
        {error && <p role="alert" className="mt-2 text-xs text-soon">{error}</p>}
      </>}
    </div>
  </section>;
}

function PassCorrection({ game, view, disabled, save }: {
  game: GameId;
  view: PassView;
  disabled: boolean;
  save: (getDay: (today: string) => string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(false);
  const [value, setValue] = useState("");
  const id = useId();
  const count = duration ? Number(value) : isPassDay(value) ? dayDiff(view.today, value) + 1 : 0;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    save(today => {
      if (!duration) return value;
      if (!Number.isSafeInteger(count) || count < 1) throw new Error("Enter a whole number of remaining game-days.");
      return addDays(today, count - 1);
    });
  }
  return <div className="mt-1">
    <button type="button" className="min-h-10 text-xs underline" aria-controls={id}
      aria-expanded={open} onClick={() => {
        if (!open) { setDuration(false); setValue(view.status === "none" ? "" : view.lastDay); }
        setOpen(!open);
      }}>Correct expiration</button>
    <form id={id} hidden={!open} onSubmit={submit} className="rounded-lg border border-hairline p-2">
      <fieldset disabled={disabled} className="grid gap-2">
        <label className="text-xs text-muted">Correction method
          <select className={input} value={duration ? "duration" : "date"} onChange={event => {
            const useDuration = event.target.value === "duration";
            setDuration(useDuration);
            setValue(useDuration ? (remaining(view) || "").toString() : view.status === "none" ? "" : view.lastDay);
          }}>
            <option value="date">Last active game-day</option>
            <option value="duration">Remaining game-days</option>
          </select>
        </label>
        <label className="text-xs text-muted">{duration ? "Game-days left, including today" : "Last active game-day (expires at the next reset)"}
          <input className={input} required type={duration ? "number" : "date"} value={value}
            {...(duration ? { min: 1, step: 1 } : { min: "0001-01-01", max: MAX_PASS_DAY })}
            onChange={event => setValue(event.target.value)} />
        </label>
        {game === "genshin" && count > WELKIN_CAP &&
          <p className="text-xs text-soon">This correction may exceed Welkin’s in-game limit of {WELKIN_CAP} remaining days.</p>}
        <button type="submit" className={control}>Save correction</button>
      </fieldset>
    </form>
  </div>;
}
