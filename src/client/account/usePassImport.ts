import { useLayoutEffect, useRef, useState } from "react";
import { PROFILE_KEYS } from "../state/storage.ts";
import type { PassChoices, PassTransferPlan } from "./passTransfer.ts";

type Prompt = {
  revision: number;
  plan: PassTransferPlan;
  updated: boolean;
  busy: boolean;
  submit: (choices: PassChoices) => void;
  cancel: () => void;
};

export type PassImportRequest = {
  active: () => boolean;
  choose: (plan: PassTransferPlan, updated: boolean) => Promise<PassChoices | null>;
  finish: () => void;
};

export function usePassImport(profileId: string | undefined, sessionCurrent: () => boolean) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const current = useRef<AbortController | null>(null);
  const revision = useRef(0);
  useLayoutEffect(() => () => { current.current?.abort(); current.current = null; }, [profileId]);

  function begin(): PassImportRequest | undefined {
    if (!profileId) return;
    current.current?.abort();
    const request = new AbortController();
    current.current = request;
    setPrompt(null);
    const active = () => !request.signal.aborted && sessionCurrent() &&
      localStorage.getItem(PROFILE_KEYS.activeProfile) === profileId;
    const finish = () => {
      if (current.current !== request) return;
      current.current = null;
      request.abort();
      setPrompt(null);
    };
    return { active, finish, choose: (plan, updated) => new Promise(resolve => {
      if (!active()) { resolve(null); return; }
      const abort = () => resolve(null);
      request.signal.addEventListener("abort", abort, { once: true });
      const id = ++revision.current;
      setPrompt({ revision: id, plan, updated, busy: false, cancel: finish, submit: choices => {
        if (!active()) { finish(); return; }
        request.signal.removeEventListener("abort", abort);
        setPrompt(previous => previous?.revision === id ? { ...previous, busy: true } : previous);
        resolve(choices);
      } });
    }) };
  }
  return { prompt, begin };
}
