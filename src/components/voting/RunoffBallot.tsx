"use client";

import { useState } from "react";
import type { VoterStatus } from "@/lib/election";
import { Alert } from "../Alert";
import { InkCross } from "./BallotPaper";
import { SignaturePad } from "./SignaturePad";
import { FORCED_SIGNATURES } from "./BallotReview";

type Props = {
  voter: VoterStatus;
  candidates: { id: number; name: string }[];
  error: string | null;
  submitting: boolean;
  gold?: boolean;
  onCancel: () => void;
  onConfirm: (candidateId: number) => void;
};

/** Papeleta de segunda vuelta: una sola marca entre los empatados + firma. */
export function RunoffBallot({ voter, candidates, error, submitting, gold, onCancel, onConfirm }: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const [signed, setSigned] = useState(false);

  return (
    <div className="space-y-5">
      <article className={`paper animate-rise rounded-sm px-5 pt-5 pb-6 sm:px-8 ${gold ? "ring-4 ring-gold bg-[linear-gradient(180deg,#f3dc8f_0%,var(--paper)_38%)]" : ""}`}>
        <div className="border-b-2 border-ink pb-4 text-center">
          <div className="mx-auto mb-3 w-fit rounded-full border border-ink px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.3em]">
            {gold ? "Edición creador ✦" : "Segunda vuelta"}
          </div>
          <h2 className="font-serif text-2xl font-bold uppercase">Papeleta de desempate</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Votante: <b className="text-ink">{voter.name}</b> · Marca <b className="text-ink">un solo</b> recuadro
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {candidates.map((c) => {
            const marked = choice === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setChoice(marked ? null : c.id)}
                  aria-pressed={marked}
                  className={`flex w-full items-center justify-between rounded-sm border-2 px-4 py-3 text-left transition ${
                    marked ? "border-ink bg-white" : "border-rule hover:border-ink"
                  }`}
                >
                  <span className="font-serif text-2xl font-bold">{c.name}</span>
                  <span className="block h-11 w-11 rounded-[2px] border-2 border-ink bg-white">
                    {marked && <InkCross />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {candidates.length === 0 && (
          <p className="mt-4 text-center text-sm text-ink-soft">No hay candidatos a los que puedas votar.</p>
        )}
      </article>

      {choice !== null && (
        <section className="paper rounded-sm px-5 py-4 sm:px-8">
          <SignaturePad onChange={setSigned} forcedText={FORCED_SIGNATURES[voter.name]} />
          <p className="mt-2 text-xs font-semibold text-stamp">Una vez depositado, no podrás cambiar tu voto.</p>
        </section>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          disabled={choice === null || !signed || submitting}
          onClick={() => choice !== null && onConfirm(choice)}
          className="flex-1 rounded-sm bg-stamp px-4 py-3.5 font-bold uppercase tracking-wider text-white shadow disabled:opacity-40"
        >
          {submitting ? "Depositando…" : choice === null ? "Elige a uno" : signed ? "Depositar en la urna" : "Firma para depositar"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-sm border-2 border-ink px-4 py-3 font-semibold">
          Salir sin votar
        </button>
      </div>
    </div>
  );
}
