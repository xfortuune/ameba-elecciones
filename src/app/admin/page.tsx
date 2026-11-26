import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminControls, AdminLogin, VoterAdminList } from "@/components/admin/AdminClient";
import { Masthead } from "@/components/Masthead";
import { Progress } from "@/components/Progress";
import { getElection } from "@/lib/server/election";
import { isAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Admin · Elecciones AMEBA CITY" };

async function AdminGate() {
  if (!(await isAdmin())) return <AdminLogin />;

  const status = await getElection().status();
  return (
    <div className="space-y-6">
      <section className="paper space-y-5 rounded-sm p-6">
        <h2 className="font-serif text-xl font-bold">Estado de la votación</h2>
        <Progress voted={status.votedCount} total={status.total} />
        <VoterAdminList voters={status.voters} />
        <p className="text-xs text-ink-soft">
          <b>Ausentes:</b> si alguien no se presenta, márcalo como <i>voto en blanco</i>. Cuenta como que ya ha
          participado (no podrá entrar a votar) y su voto da <b>+1 punto al más votado</b>. Sigue pudiendo recibir
          puntos de los demás. Se puede deshacer mientras no haya votado.
        </p>
        <p className="text-xs text-ink-soft">
          Por diseño, ni siquiera el administrador puede ver a quién ha votado cada persona: las papeletas se
          guardan sin vincular al votante.
        </p>
      </section>
      <AdminControls />
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <Masthead subtitle="Panel de la Junta Electoral" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Suspense fallback={<div className="paper h-60 animate-pulse rounded-sm" aria-busy="true" />}>
          <AdminGate />
        </Suspense>
      </main>
    </>
  );
}
