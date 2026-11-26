import { connection } from "next/server";
import { Suspense } from "react";
import { Banner } from "@/components/Banner";
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
      <SideBanners />
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

/**
 * Dos estandartes simétricos colgando a los lados del contenido.
 * Solo en pantallas anchas (lg+): en móvil no hay sitio a los lados.
 */
function SideBanners() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 hidden lg:block">
      <div className="relative mx-auto max-w-2xl">
        <div className="absolute top-8 right-full mr-6 w-28 xl:mr-12 xl:w-44">
          <Banner className="animate-sway h-auto w-full drop-shadow-md" />
        </div>
        <div className="absolute top-8 left-full ml-6 w-28 xl:ml-12 xl:w-44">
          <Banner className="animate-sway h-auto w-full drop-shadow-md [animation-direction:reverse]" />
        </div>
      </div>
    </div>
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
