"use client";

import type { VoterStatus } from "@/lib/election";

export type Points = 3 | 2 | 1;
export type Picks = Record<Points, number | null>;

export const POINTS: Points[] = [3, 2, 1];

/** Cabecera común de papeleta (también se usa en la revisión). */
export function BallotHeader({ voterName }: { voterName?: string }) {
  return (
    <div className="border-b-2 border-ink pb-4 text-center">
      <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-ink px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.3em]">
        Papeleta oficial
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-soft">AMEBA CITY · 2026</p>
      <h2 className="mt-1 font-serif text-[1.35rem] leading-tight font-bold uppercase sm:text-2xl">
        Elecciones a Presidente del Grupo
      </h2>
      <p className="mt-1 text-xs uppercase tracking-widest text-ink-soft">
        Circunscripción única · Servidor de Discord
      </p>
      {voterName && (
        <p className="mt-3 text-xs text-ink-soft">
          Votante: <span className="font-bold text-ink">{voterName}</span>
        </p>
      )}
    </div>
  );
}

/** La marca "a boli" dentro de un recuadro. */
export function InkCross() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full p-1 text-[#1b2a6b]" aria-hidden="true">
      <path d="M8 9 C 16 17, 24 25, 33 32" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M32 8 C 24 17, 17 24, 8 33" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

type Props = {
  voter: VoterStatus;
  candidates: VoterStatus[];
  picks: Picks;
  /** Recibe un actualizador para no perder marcas si se pulsan varias muy rápido. */
  onChange: (update: (prev: Picks) => Picks) => void;
  onCancel: () => void;
  onNext: () => void;
};

export function BallotPaper({ voter, candidates, picks, onChange, onCancel, onNext }: Props) {
  const complete = POINTS.every((p) => picks[p] !== null);

  /** Marcar un recuadro: cada puntuación solo puede ir a una persona y cada persona recibe una sola puntuación. */
  function toggle(candidateId: number, pts: Points) {
    onChange((prev) => {
      const next: Picks = { ...prev };
      if (next[pts] === candidateId) {
        next[pts] = null;
      } else {
        for (const p of POINTS) if (next[p] === candidateId) next[p] = null;
        next[pts] = candidateId;
      }
      return next;
    });
  }

  const nameOf = (id: number | null) => candidates.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-5">
      <article className="paper animate-rise rounded-sm px-4 pt-5 pb-6 sm:px-7">
        <BallotHeader voterName={voter.name} />

        <ol className="mt-4 space-y-1 text-[13px] leading-snug text-ink-soft">
          <li>
            <span className="font-bold text-ink">1.</span> Marque con una cruz <b className="text-ink">un recuadro de cada columna</b>: 3, 2 y 1 puntos.
          </li>
          <li>
            <span className="font-bold text-ink">2.</span> Cada puntuación debe ir a una persona distinta.
          </li>
          <li>
            <span className="font-bold text-ink">3.</span> Su nombre no figura en la papeleta: no puede votarse a sí mismo.
          </li>
        </ol>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-y-2 border-ink text-[11px] font-bold uppercase tracking-wider">
              <th className="py-2 pl-1 text-left">Candidato</th>
              {POINTS.map((p) => (
                <th key={p} className="w-14 py-2 text-center sm:w-16">
                  <span className="block font-serif text-lg leading-none">{p}</span>
                  <span className="text-[9px] text-ink-soft">{p === 1 ? "punto" : "puntos"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => (
              <tr key={c.id} className="border-b border-rule">
                <td className="py-2 pl-1">
                  <span className="mr-2 inline-block w-5 text-right font-serif text-sm text-ink-soft tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="font-serif text-lg font-semibold">{c.name}</span>
                </td>
                {POINTS.map((p) => {
                  const marked = picks[p] === c.id;
                  return (
                    <td key={p} className="py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(c.id, p)}
                        aria-pressed={marked}
                        aria-label={`${p} ${p === 1 ? "punto" : "puntos"} a ${c.name}`}
                        className={`mx-auto block h-11 w-11 rounded-[2px] border-2 border-ink bg-white transition-colors ${
                          marked ? "" : "hover:bg-paper-edge"
                        } ${picks[p] !== null && !marked ? "border-ink/30" : ""}`}
                      >
                        {marked && <InkCross />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {POINTS.map((p) => (
            <div key={p} className={`rounded-sm border px-1 py-2 ${picks[p] ? "border-ink bg-white" : "border-dashed border-rule"}`}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                {p === 1 ? "1 punto" : `${p} puntos`}
              </dt>
              <dd className="truncate font-serif font-bold">{nameOf(picks[p]) ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          disabled={!complete}
          onClick={onNext}
          className="flex-1 rounded-sm bg-stamp px-4 py-3.5 font-bold uppercase tracking-wider text-white shadow disabled:opacity-40"
        >
          {complete ? "Revisar mi papeleta" : `Te faltan ${POINTS.filter((p) => picks[p] === null).length} votos`}
        </button>
        <button type="button" onClick={onCancel} className="rounded-sm border-2 border-ink px-4 py-3 font-semibold">
          Salir sin votar
        </button>
      </div>
    </div>
  );
}
