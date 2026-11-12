import { connection } from "next/server";
import { Suspense } from "react";
import { Footer, Masthead } from "@/components/Masthead";
import { VotingFlow } from "@/components/voting/VotingFlow";
import { getElection } from "@/lib/server/election";

async function Board() {
  await connection();
  const status = await getElection().status();
  return <VotingFlow voters={status.voters} />;
}

export default function Home() {
  return (
    <>
      <Masthead subtitle="Reparte 3, 2 y 1 puntos. Voto secreto e irrevocable." />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Suspense fallback={<BoardSkeleton />}>
          <Board />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando censo">
      <div className="h-10 animate-pulse rounded-sm bg-paper-edge" />
      <div className="paper grid grid-cols-2 gap-3 rounded-sm p-6">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-sm bg-paper-edge" />
        ))}
      </div>
    </div>
  );
}
