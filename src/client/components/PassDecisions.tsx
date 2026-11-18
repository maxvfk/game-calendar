import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { reducePasses, type PassOp } from "../../shared/dailyPasses.ts";
import { GAMES } from "../../shared/games.ts";
import { GameId } from "../../shared/schema.ts";
import { REGION_LABEL } from "../../shared/time.ts";
import type { PassChoices, PassTransferPlan } from "../account/passTransfer.ts";

export function PassDecisions({ plan, login, busy, submit, cancel }: {
  plan: PassTransferPlan;
  login?: boolean;
  busy: boolean;
  submit: (choices: PassChoices) => void;
  cancel: () => void;
}) {
  const [choices, setChoices] = useState<PassChoices>({});
  const id = useId();
  const current = useMemo(() => reducePasses(JSON.parse(plan.targetOps) as PassOp[]), [plan.targetOps]);
  const imported = useMemo(() => reducePasses(plan.source.ops), [plan.source.ops]);
  const complete = plan.choicesRequired.every(game => choices[game] === "current" || choices[game] === "imported");
  const values = (states: typeof current, game: string) => [...states.values()]
    .filter(pass => pass.game === game)
    .map(pass => `${REGION_LABEL[pass.region]} · ${pass.lastDay ? `last active day ${pass.lastDay}` : "no pass"}`)
    .join(" / ");

  return <form onSubmit={event => {
    event.preventDefault();
    if (!busy && complete) submit(choices);
  }}>
    <p className="mt-2 text-sm text-faint">Choose which value to use for each game. Regions found only in the current profile are kept.</p>
    {plan.choicesRequired.map((game) => {
      const known = GameId.safeParse(game);
      return <fieldset key={game} disabled={busy} className="mt-4 rounded-lg border border-hairline px-3 pb-2">
        <legend className="break-words px-1 text-sm font-semibold">{known.success ? GAMES[known.data].name : game}</legend>
        {([
          ["current", login ? "Keep the cloud value" : "Keep the current value", values(current, game)],
          ["imported", login ? "Use this device's value" : "Use the imported value", values(imported, game)],
        ] as const).map(([choice, label, summary]) =>
          <label key={choice} className="flex items-start gap-2 py-2 text-sm">
            <input type="radio" name={`${id}-${game}`} value={choice} required
              className="mt-1" checked={choices[game] === choice}
              onChange={() => setChoices(previous => ({ ...previous, [game]: choice }))} />
            <span>{label}<span className="block text-xs text-faint">{summary}</span></span>
          </label>)}
      </fieldset>;
    })}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="rounded-md border border-hairline px-3 py-2 text-sm disabled:opacity-50"
        disabled={busy || !complete}>
        {login ? "Continue account setup" : "Import backup"}
      </button>
      <button type="button" className="px-3 py-2 text-sm underline" disabled={login && busy} onClick={cancel}>Cancel</button>
    </div>
  </form>;
}

export function PassImportDialog({ plan, updated, busy, submit, cancel }: {
  plan: PassTransferPlan;
  updated: boolean;
  busy: boolean;
  submit: (choices: PassChoices) => void;
  cancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useLayoutEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => { node?.close(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={heading}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-hairline bg-surface p-5 text-ink backdrop:bg-black/50"
    onCancel={event => { event.preventDefault(); cancel(); }}>
    <h2 id={heading} className="font-display text-lg font-semibold">Choose daily pass values</h2>
    {updated && <p role="alert" className="mt-2 text-sm text-soon">Daily passes changed. Review the updated values and choose again.</p>}
    <PassDecisions plan={plan} busy={busy} submit={submit} cancel={cancel} />
    {busy && <p className="mt-3 text-sm" role="status">Checking the current profile…</p>}
  </dialog>;
}
