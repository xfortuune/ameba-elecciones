"use client";

import type { VoterStatus } from "@/lib/election";

export function NamePicker({
  voters,
  onPick,
  locked = false,
}: {
  voters: VoterStatus[];
  onPick: (v: VoterStatus) => void;
  locked?: boolean;
}) {
  return (
    <section className="paper rounded-sm p-5 sm:p-6">
      <h2 className="font-serif text-xl font-bold">¿Quién eres?</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Elige tu nombre en el censo. Después te pediremos tu PIN personal.
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-3">
        {voters.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              disabled={v.hasVoted || locked}
              onClick={() => onPick(v)}
              className={
                v.hasVoted || locked
                  ? "flex h-full min-h-16 w-full cursor-not-allowed flex-col items-start justify-center rounded-sm border border-dashed border-rule bg-paper-edge/50 px-4 py-3 text-left text-ink-soft/60"
                  : "flex h-full min-h-16 w-full flex-col items-start justify-center rounded-sm border-2 border-ink bg-paper px-4 py-3 text-left shadow-[3px_3px_0_var(--ink)] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none hover:bg-white"
              }
            >
              <span className={`font-serif text-lg font-bold ${v.hasVoted ? "line-through decoration-1" : ""}`}>
                {v.name}
              </span>
              {v.hasVoted && (
                <span className="text-xs font-semibold text-ink-soft">
                  {v.blank ? "Ausente · voto en blanco" : "✓ Ya ha votado"}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
