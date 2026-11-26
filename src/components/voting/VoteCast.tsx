"use client";

import Link from "next/link";
import type { VoterStatus } from "@/lib/election";

/** Animación de la papeleta entrando en la urna + confirmación. */
export function VoteCast({ voter, runoff = false }: { voter: VoterStatus; runoff?: boolean }) {
  return (
    <section className="flex flex-col items-center py-4 text-center">
      <div className="relative h-56 w-56" aria-hidden="true">
        {/* papeleta */}
        <div className="animate-into-urn absolute top-0 left-1/2 z-0 -ml-10 h-24 w-20 rounded-sm border border-rule bg-paper shadow">
          <div className="mx-2 mt-3 h-1 bg-ink/60" />
          <div className="mx-2 mt-2 h-1 bg-ink/30" />
          <div className="mx-2 mt-2 h-1 bg-ink/30" />
          <div className="mx-auto mt-3 h-5 w-5 rounded-[2px] border-2 border-ink" />
        </div>
        {/* urna */}
        <div className="absolute bottom-0 left-1/2 z-10 -ml-24 h-32 w-48 rounded-sm border-2 border-ink/70 bg-white/40 backdrop-blur-[1px]">
          <div className="absolute -top-2 left-0 h-3 w-full rounded-sm border-2 border-ink/70 bg-paper-edge">
            <div className="mx-auto mt-0.5 h-1 w-24 bg-ink" />
          </div>
          <div className="flex h-full items-end justify-center pb-3 text-[10px] font-black uppercase tracking-[0.3em] text-stamp">
            Urna
          </div>
        </div>
      </div>

      <div className="animate-stamp mt-6 rounded border-4 border-stamp px-5 py-2 text-xl font-black uppercase tracking-[0.2em] text-stamp [animation-delay:1.2s]">
        Votó
      </div>
      <h2 className="mt-6 font-serif text-2xl font-bold">¡Gracias, {voter.name}!</h2>
      <p className="mt-2 max-w-sm text-ink-soft">
        {runoff
          ? "Tu voto de desempate ya está en la urna. Es secreto y no se puede modificar. El resultado se verá en cuanto vote todo el mundo."
          : "Tu papeleta ya está en la urna. Es secreta y no se puede modificar. Los resultados se publicarán cuando hayan votado los 10."}
      </p>
      <Link
        href="/resultados"
        className="mt-6 rounded-sm bg-ink px-6 py-3 font-bold uppercase tracking-wider text-paper"
      >
        Ver el recuento
      </Link>
    </section>
  );
}
