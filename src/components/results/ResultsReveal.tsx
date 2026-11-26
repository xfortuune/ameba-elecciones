"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Standing } from "@/lib/tally";
import { Confetti } from "./Confetti";
import { Podium } from "./Podium";
import { StandingsTable } from "./StandingsTable";

/**
 * Fases: urna cerrada → cuenta atrás → bronce → plata → oro → clasificación.
 * revealed = cuántos escalones del podio se ven (0..3).
 */
type Phase = "closed" | "countdown" | "podium" | "final";

/** La clave depende del resultado: tras una votación de prueba + reset, el revelado real vuelve a verse. */
const storageKey = (standings: Standing[]) =>
  "ameba-resultados-vistos:" + standings.map((s) => `${s.id}-${s.threes}-${s.twos}-${s.ones}`).join(",");

const noopSubscribe = () => () => {};
function readSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function ResultsReveal({ standings, blankNames }: { standings: Standing[]; blankNames: string[] }) {
  const [rawPhase, setPhase] = useState<Phase>("closed");
  const [count, setCount] = useState(3);
  const [rawRevealed, setRevealed] = useState(0);

  // Si ya lo viste en este dispositivo, vas directo al final (en SSR siempre false).
  const key = storageKey(standings);
  const seen = useSyncExternalStore(noopSubscribe, () => readSeen(key), () => false);
  const phase: Phase = seen && rawPhase === "closed" ? "final" : rawPhase;
  const revealed = phase === "final" ? 3 : rawRevealed;

  useEffect(() => {
    if (phase === "countdown") {
      const t = setTimeout(() => (count > 1 ? setCount((c) => c - 1) : setPhase("podium")), 900);
      return () => clearTimeout(t);
    }
    if (phase === "podium") {
      if (revealed >= 3) {
        const t = setTimeout(() => setPhase("final"), 1800);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 400 : revealed === 2 ? 2600 : 1800);
      return () => clearTimeout(t);
    }
    if (phase === "final") {
      try {
        localStorage.setItem(key, "1");
      } catch {}
    }
  }, [phase, count, revealed, key]);

  function skip() {
    setRevealed(3);
    setPhase("final");
  }

  if (phase === "closed") {
    return (
      <section className="paper animate-rise rounded-sm px-6 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-stamp">Votación cerrada</p>
        <h2 className="mt-2 font-serif text-3xl font-bold">Los 10 votos están en la urna</h2>
        <p className="mx-auto mt-3 max-w-sm text-ink-soft">
          Ha llegado el momento. La Junta Electoral va a proceder al escrutinio.
        </p>
        <button
          type="button"
          onClick={() => setPhase("countdown")}
          className="mt-8 rounded-sm bg-stamp px-8 py-4 text-lg font-black uppercase tracking-[0.15em] text-white shadow-lg transition active:scale-95"
        >
          Abrir la urna
        </button>
        <div>
          <button type="button" onClick={skip} className="mt-4 text-sm text-ink-soft underline underline-offset-2">
            Ver resultados sin suspense
          </button>
        </div>
      </section>
    );
  }

  if (phase === "countdown") {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink-soft">Escrutando papeletas…</p>
        <p key={count} className="animate-pop mt-4 font-serif text-[9rem] leading-none font-black text-stamp">
          {count}
        </p>
      </section>
    );
  }

  const winners = standings.filter((s) => s.position === 1);
  const vices = standings.filter((s) => s.position === 2);

  return (
    <div className="space-y-8">
      {revealed >= 3 && <Confetti />}
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

      {phase === "podium" && (
        <div className="text-center">
          <button type="button" onClick={skip} className="text-sm text-ink-soft underline underline-offset-2">
            Saltar animación
          </button>
        </div>
      )}

      {phase === "final" && (
        <div className="animate-rise">
          <StandingsTable standings={standings} blankNames={blankNames} />
        </div>
      )}
    </div>
  );
}
