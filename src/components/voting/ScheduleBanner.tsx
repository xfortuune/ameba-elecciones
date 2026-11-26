"use client";

import { useEffect, useState } from "react";
import type { ElectionStatus } from "@/lib/election";

const fmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function formatLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d} d ${pad(h)} h ${pad(m)} min` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Aviso de horario: cuenta atrás hasta la apertura, cierre próximo o votación cerrada. */
export function ScheduleBanner({ status }: { status: ElectionStatus }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const offset = Date.parse(status.serverNow) - Date.now();
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status.serverNow]);

  const { opensAt, closesAt, votingOpen, complete } = status;
  if (complete || (!opensAt && !closesAt)) return null;

  const notYet = !votingOpen && opensAt && (now === null || now < Date.parse(opensAt));

  if (notYet) {
    return (
      <div className="rounded-sm border-2 border-ink bg-white px-4 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-stamp">Colegio electoral cerrado</p>
        <p className="mt-1 text-sm text-ink-soft">La votación abre el {fmt.format(new Date(opensAt))}</p>
        <p className="mt-2 font-serif text-4xl font-black tabular-nums">
          {now === null ? "··:··:··" : formatLeft(Date.parse(opensAt) - now)}
        </p>
      </div>
    );
  }

  if (!votingOpen) {
    return (
      <div className="rounded-sm border-2 border-ink bg-white px-4 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-stamp">Votación cerrada</p>
        <p className="mt-1 text-sm text-ink-soft">
          El plazo terminó{closesAt ? ` el ${fmt.format(new Date(closesAt))}` : ""}. Ya no se admiten papeletas.
        </p>
      </div>
    );
  }

  if (closesAt) {
    return (
      <div className="rounded-sm border border-rule bg-white px-4 py-3 text-center text-sm">
        <span className="text-ink-soft">Las urnas cierran en </span>
        <b className="font-serif tabular-nums">{now === null ? "…" : formatLeft(Date.parse(closesAt) - now)}</b>
      </div>
    );
  }
  return null;
}
