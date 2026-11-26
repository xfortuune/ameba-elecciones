"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Progreso en directo: consulta /api/estado cada pocos segundos y, si algo
 * cambia (votos, ausentes, apertura de la urna, horario, segunda vuelta),
 * refresca la página sin recargarla. Pausa mientras la pestaña está oculta.
 */
export function LiveRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let running = false;

    const tick = async () => {
      if (stopped || running) return;
      running = true;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/estado", { cache: "no-store" });
          if (res.ok) {
            const s = await res.json();
            const signature = JSON.stringify([
              s.votedCount,
              s.blankCount,
              s.voters?.map((v: { hasVoted: boolean; blank: boolean }) => `${+v.hasVoted}${+v.blank}`).join(""),
              s.votingOpen,
              s.opensAt,
              s.closesAt,
              s.revealedAt,
              s.runoff && [s.runoff.candidates?.length, s.runoff.votedIds?.length, s.runoff.complete],
            ]);
            if (last.current !== null && last.current !== signature) router.refresh();
            last.current = signature;
          }
        } catch {
          // Sin conexión: se reintenta en el siguiente ciclo.
        }
      }
      running = false;
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };

    tick();
    const onVisible = () => document.visibilityState === "visible" && (clearTimeout(timer), tick());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
