import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Footer, Masthead } from "@/components/Masthead";
import { Progress } from "@/components/Progress";
import { ResultsReveal } from "@/components/results/ResultsReveal";
import { getElection } from "@/lib/server/election";

export const metadata: Metadata = {
  title: "Resultados · Elecciones AMEBA CITY",
};

async function Results() {
  await connection();
  const res = await getElection().results();

  if (!res.complete) {
    const missing = res.status.voters.filter((v) => !v.hasVoted);
    return (
      <section className="paper space-y-6 rounded-sm p-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-stamp">Escrutinio pendiente</p>
          <h2 className="mt-1 font-serif text-2xl font-bold">La urna sigue cerrada</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Los resultados se publicarán en cuanto hayan votado los {res.status.total}.
          </p>
        </div>
        <Progress voted={res.status.votedCount} total={res.status.total} />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-soft">
            Faltan por votar ({missing.length})
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missing.map((v) => (
              <li key={v.id} className="rounded-full border-2 border-ink bg-white px-3 py-1 font-serif font-semibold">
                {v.name}
              </li>
            ))}
          </ul>
        </div>
        <Link href="/" className="block rounded-sm bg-stamp px-4 py-3 text-center font-bold uppercase tracking-wider text-white">
          Ir a votar
        </Link>
      </section>
    );
  }

  return <ResultsReveal standings={res.standings} />;
}

export default function ResultsPage() {
  return (
    <>
      <Masthead subtitle="Escrutinio oficial" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Suspense fallback={<div className="paper h-72 animate-pulse rounded-sm" aria-busy="true" />}>
          <Results />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
