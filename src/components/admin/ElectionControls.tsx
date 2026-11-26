"use client";

import { useState, useTransition } from "react";
import {
  cancelRunoffAction,
  closeRunoffAction,
  revealAction,
  setScheduleAction,
  startRunoffAction,
} from "@/app/admin/actions";
import type { ElectionStatus } from "@/lib/election";
import { Alert } from "../Alert";

type Result = { ok: boolean; message?: string };

/** Ejecuta una acción de admin mostrando estado y errores. */
function useAdminAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, okMessage?: string) =>
    start(async () => {
      setError(null);
      setDone(null);
      try {
        const res = await fn();
        if (res.ok) setDone(okMessage ?? null);
        else setError(res.message ?? "No se pudo completar la acción.");
      } catch {
        setError("No se pudo completar la acción. ¿Ha caducado la sesión de admin?");
      }
    });
  return { pending, error, done, run };
}

const btn = "rounded-sm px-4 py-2.5 text-sm font-bold disabled:opacity-50";

// ---------------------------------------------------------------------------
// Abrir la urna (revelado sincronizado). También se usa en /resultados.
// ---------------------------------------------------------------------------
export function RevealButton({ big = false }: { big?: boolean }) {
  const { pending, error, run } = useAdminAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-semibold">¿Abrir la urna para todos ahora?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(revealAction)}
            className={`${btn} bg-stamp text-white`}
          >
            {pending ? "Abriendo…" : "Sí, ¡abrir!"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={`${btn} border-2 border-ink`}>
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={
            big
              ? "w-full rounded-sm bg-stamp px-6 py-4 text-lg font-black uppercase tracking-[0.15em] text-white shadow-lg"
              : `${btn} bg-stamp text-white`
          }
        >
          🗳️ Abrir la urna para todos
        </button>
      )}
      <p className="text-center text-xs text-ink-soft">
        La cuenta atrás empieza a la vez en todos los dispositivos (en unos 8 segundos).
      </p>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de urna + segunda vuelta
// ---------------------------------------------------------------------------
export function UrnControls({
  status,
  proposal,
}: {
  status: ElectionStatus;
  proposal: { id: number; name: string }[] | null;
}) {
  const { pending, error, run } = useAdminAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const r = status.runoff;
  const missing = status.total - status.votedCount;

  return (
    <section className="paper space-y-4 rounded-sm p-6">
      <h2 className="font-serif text-xl font-bold">Urna y escrutinio</h2>

      {!status.complete && (
        <p className="text-sm text-ink-soft">
          Faltan <b className="text-ink">{missing}</b> por votar (o por marcar como ausentes). Cuando estén los 10 podrás
          abrir la urna.
        </p>
      )}
      {status.complete && !status.revealedAt && <RevealButton big />}
      {status.revealedAt && (
        <p className="text-sm">
          ✓ Urna abierta el{" "}
          <b>
            {new Date(status.revealedAt).toLocaleString("es-ES", {
              timeZone: "Europe/Madrid",
              dateStyle: "medium",
              timeStyle: "medium",
            })}
          </b>
          .
        </p>
      )}

      {/* Segunda vuelta */}
      {proposal && !r && (
        <div className="rounded-sm border-2 border-stamp bg-white p-4">
          <p className="font-bold text-stamp">⚖️ Empate entre {proposal.map((p) => p.name).join(" y ")}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Lanza una segunda vuelta: cada uno vota a uno de los empatados (los ausentes no votan).
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(startRunoffAction)}
            className={`${btn} mt-3 bg-ink text-paper`}
          >
            Lanzar segunda vuelta
          </button>
        </div>
      )}
      {r && (
        <div className="rounded-sm border border-rule bg-white p-4">
          <p className="font-bold">
            Segunda vuelta: {r.candidates.map((c) => c.name).join(" vs ")}
            {r.complete && <span className="ml-2 text-sm font-semibold text-ink-soft">· terminada</span>}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Han votado {r.votedIds.length} de {r.eligibleIds.length}.
            {!r.complete && (
              <>
                {" "}
                Faltan:{" "}
                {status.voters
                  .filter((v) => r.eligibleIds.includes(v.id) && !r.votedIds.includes(v.id))
                  .map((v) => v.name)
                  .join(", ")}
                .
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!r.complete && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(closeRunoffAction)}
                className={`${btn} bg-ink text-paper`}
              >
                Cerrar y contar ya
              </button>
            )}
            {confirmCancel ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirmCancel(false);
                    run(cancelRunoffAction);
                  }}
                  className={`${btn} bg-stamp text-white`}
                >
                  Sí, anular segunda vuelta
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className={`${btn} border-2 border-ink`}>
                  No
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} className={`${btn} border-2 border-ink`}>
                Anular segunda vuelta
              </button>
            )}
          </div>
        </div>
      )}
      {error && <Alert>{error}</Alert>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Horario de votación
// ---------------------------------------------------------------------------
/** ISO → valor de <input type="datetime-local"> en la hora local del navegador. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleForm({ opensAt, closesAt }: { opensAt: string | null; closesAt: string | null }) {
  const [open, setOpen] = useState(() => toLocalInput(opensAt));
  const [close, setClose] = useState(() => toLocalInput(closesAt));
  const { pending, error, done, run } = useAdminAction();
  const iso = (v: string) => (v ? new Date(v).toISOString() : null);

  return (
    <section className="paper space-y-4 rounded-sm p-6">
      <div>
        <h2 className="font-serif text-xl font-bold">Horario de votación</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Fuera de este horario nadie puede votar. Déjalo vacío para no poner límite. Hora de tu dispositivo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Abre</span>
          <input
            type="datetime-local"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="mt-1 w-full rounded-sm border-2 border-ink bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Cierra</span>
          <input
            type="datetime-local"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="mt-1 w-full rounded-sm border-2 border-ink bg-white px-3 py-2"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setScheduleAction(iso(open), iso(close)), "Horario guardado.")}
          className={`${btn} bg-ink text-paper`}
        >
          Guardar horario
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen("");
            setClose("");
            run(() => setScheduleAction(null, null), "Horario quitado: la votación está abierta.");
          }}
          className={`${btn} border-2 border-ink`}
        >
          Quitar horario
        </button>
      </div>
      {done && <p className="text-sm font-semibold text-ink">✓ {done}</p>}
      {error && <Alert>{error}</Alert>}
    </section>
  );
}
