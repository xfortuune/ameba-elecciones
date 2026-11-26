import { connection } from "next/server";
import { Suspense } from "react";
import { Banner } from "@/components/Banner";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Footer, Masthead } from "@/components/Masthead";
import { VotingFlow } from "@/components/voting/VotingFlow";
import { getElection } from "@/lib/server/election";

async function Board() {
  await connection();
  const status = await getElection().status();
  return (
    <>
      <LiveRefresh />
      <VotingFlow status={status} />
    </>
  );
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
 * Dos estandartes simétricos a la altura de la caja de nombres, cada uno
 * centrado en el hueco entre el borde de la pantalla y la caja.
 * La caja mide 42rem menos 1rem de margen por lado = 40rem.
 * Solo en pantallas anchas (lg+): en móvil no hay sitio a los lados.
 */
function SideBanners() {
  const gutter = "w-[calc((100%-40rem)/2)]";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-56 hidden justify-between lg:flex"
    >
      <div className={`${gutter} flex justify-center`}>
        <Banner className="animate-sway h-auto w-[min(72%,16rem)] drop-shadow-md" />
      </div>
      <div className={`${gutter} flex justify-center`}>
        <Banner className="animate-sway h-auto w-[min(72%,16rem)] drop-shadow-md [animation-direction:reverse]" />
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
