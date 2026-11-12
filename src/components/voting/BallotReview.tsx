"use client";

import type { VoterStatus } from "@/lib/election";
import { Alert } from "../Alert";
import { BallotHeader, InkCross, POINTS, type Picks } from "./BallotPaper";

type Props = {
  voter: VoterStatus;
  picks: Picks;
  names: Record<number, string>;
  error: string | null;
  submitting: boolean;
  onEdit: () => void;
  onConfirm: () => void;
};

export function BallotReview({ voter, picks, names, error, submitting, onEdit, onConfirm }: Props) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="font-serif text-2xl font-bold">Esta es tu papeleta</p>
        <p className="mt-1 font-semibold text-stamp">Una vez depositada, no podrás cambiarla.</p>
      </div>

      <article className="paper animate-rise relative overflow-hidden rounded-sm px-5 pt-5 pb-7 sm:px-8">
        <BallotHeader voterName={voter.name} />
        <ul className="mt-5 space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex items-center gap-4 border-b border-rule pb-3">
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-sm border-2 border-ink bg-white">
                <span className="font-serif text-xl leading-none font-bold">{p}</span>
                <span className="text-[8px] uppercase tracking-wider text-ink-soft">{p === 1 ? "punto" : "pts"}</span>
              </span>
              <span className="flex-1 font-serif text-2xl font-bold">{picks[p] ? names[picks[p]!] : "—"}</span>
              <span className="h-9 w-9 shrink-0 rounded-[2px] border-2 border-ink bg-white">
                <InkCross />
              </span>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute -right-3 bottom-3 rotate-[-12deg] rounded border-[3px] border-stamp px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-stamp opacity-80">
          Voto secreto
        </div>
      </article>

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 rounded-sm bg-stamp px-4 py-3.5 font-bold uppercase tracking-wider text-white shadow disabled:opacity-50"
        >
          {submitting ? "Depositando…" : "Depositar en la urna"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={submitting}
          className="rounded-sm border-2 border-ink px-4 py-3 font-semibold disabled:opacity-50"
        >
          Corregir
        </button>
      </div>
    </div>
  );
}
