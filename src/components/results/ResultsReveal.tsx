"use client";

import { useEffect, useState } from "react";
import type { RunoffResult } from "@/lib/election";
import type { Standing } from "@/lib/tally";
import { Confetti } from "./Confetti";
import { Podium } from "./Podium";
import { StandingsTable } from "./StandingsTable";

/**
 * Revelado SINCRONIZADO: todo depende del tiempo transcurrido desde `revealedAt`
 * (hora del servidor), así todos los dispositivos ven lo mismo a la vez.
 * Línea de tiempo (ms desde revealedAt):
 *   < 0          → "La urna se abre en N…"
 *   0 – 2700     → cuenta atrás 3, 2, 1
 *   3100 / 4900 / 7500 → bronce, vicepresidente, presidente
 *   9300+        → clasificación completa
 */
const COUNT_STEP = 900;
const T_PODIUM = 3 * COUNT_STEP;
const T_REVEAL = [3100, 4900, 7500];
const T_FINAL = 9300;
/** Quien entre mucho después no recibe confeti. */
const CONFETTI_UNTIL = T_FINAL + 15_000;

type Props = {
  standings: Standing[];
  blankNames: string[];
  revealedAt: string;
  serverNow: string;
  runoff: RunoffResult | null;
};

export function ResultsReveal({ standings, blankNames, revealedAt, serverNow, runoff }: Props) {
  // t = ms transcurridos desde revealedAt según el reloj del servidor (null hasta montar).
  const [t, setT] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const offset = Date.parse(serverNow) - Date.now(); // desfase reloj servidor - cliente
    const start = Date.parse(revealedAt);
    const tick = () => setT(Date.now() + offset - start);
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [revealedAt, serverNow]);

  if (t === null) return <div className="paper h-72 animate-pulse rounded-sm" aria-busy="true" />;

  const elapsed = skipped ? Math.max(t, T_FINAL) : t;

  if (elapsed < 0) {
    return (
      <section className="paper animate-rise rounded-sm px-6 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-stamp">La Junta Electoral abre la urna</p>
        <h2 className="mt-2 font-serif text-3xl font-bold">Que nadie se mueva…</h2>
        <p className="mt-3 text-ink-soft">El escrutinio empieza a la vez para todos en</p>
        <p key={Math.ceil(-elapsed / 1000)} className="animate-pop mt-2 font-serif text-7xl font-black text-stamp">
          {Math.ceil(-elapsed / 1000)}
        </p>
      </section>
    );
  }

  if (elapsed < T_PODIUM) {
    const count = 3 - Math.floor(elapsed / COUNT_STEP);
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink-soft">Escrutando papeletas…</p>
        <p key={count} className="animate-pop mt-4 font-serif text-[9rem] leading-none font-black text-stamp">
          {count}
        </p>
      </section>
    );
  }

  const revealed = T_REVEAL.filter((at) => elapsed >= at).length;
  const final = elapsed >= T_FINAL;
  const winners = standings.filter((s) => s.position === 1);
  const vices = standings.filter((s) => s.position === 2);
  const runoffPending = runoff && !runoff.complete;

  return (
    <div className="space-y-8">
      {revealed >= 3 && t < CONFETTI_UNTIL && !runoffPending && <Confetti />}

      {runoff && (
        <section
          className={`rounded-sm border-2 px-4 py-3 text-center ${runoffPending ? "border-stamp bg-stamp-soft" : "border-ink bg-white"}`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-stamp">
            ⚖️ Segunda vuelta {runoffPending ? "en curso" : "terminada"}
          </p>
          {runoffPending ? (
            <p className="mt-1 text-sm">
              Desempate entre <b>{runoff.candidates.map((c) => c.name).join(" y ")}</b> · han votado{" "}
              <b>
                {runoff.votedCount}/{runoff.eligibleCount}
              </b>
              . Los votos se verán al terminar.
            </p>
          ) : (
            <p className="mt-1 font-serif text-lg">
              {runoff.candidates
                .slice()
                .sort((a, b) => b.votes - a.votes)
                .map((c) => `${c.name} ${c.votes}`)
                .join(" – ")}
            </p>
          )}
        </section>
      )}

      <section className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-stamp">Resultados oficiales</p>
        <h2 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
          {revealed < 3
            ? "Y el podio es…"
            : winners.length > 1
              ? `¡Empate en la presidencia!`
              : `${winners[0]?.name}, Presidente de AMEBA CITY`}
        </h2>
        {revealed >= 3 && winners.length === 1 && vices.length > 0 && (
          <p className="animate-rise mt-2 font-serif text-lg text-ink-soft">
            {vices.length === 1 ? (
              <>
                Vicepresidente: <b className="text-ink">{vices[0].name}</b>
              </>
            ) : (
              <>
                Empate en la vicepresidencia: <b className="text-ink">{vices.map((v) => v.name).join(" y ")}</b>
              </>
            )}
          </p>
        )}
      </section>

      <Podium standings={standings} revealed={revealed} />

      {!final && (
        <div className="text-center">
          <button type="button" onClick={() => setSkipped(true)} className="text-sm text-ink-soft underline underline-offset-2">
            Saltar animación
          </button>
        </div>
      )}

      {final && (
        <div className="animate-rise">
          <StandingsTable standings={standings} blankNames={blankNames} />
        </div>
      )}
    </div>
  );
}
