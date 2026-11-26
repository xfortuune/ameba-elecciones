"use client";

import { useActionState, useState, useTransition } from "react";
import {
  adminLoginAction,
  adminLogoutAction,
  regeneratePinsAction,
  resetElectionAction,
  type AdminLoginState,
} from "@/app/admin/actions";
import { markBlankAction, unmarkBlankAction } from "@/app/admin/actions";
import type { VoterStatus } from "@/lib/election";
import { Alert } from "../Alert";

/** Lista de votantes con la opción de marcar ausentes como voto en blanco. */
export function VoterAdminList({ voters }: { voters: VoterStatus[] }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      setError(null);
      try {
        const res = await fn();
        if (!res.ok) setError(res.message ?? "No se pudo completar la acción.");
      } catch {
        setError("No se pudo completar la acción. ¿Ha caducado la sesión de admin?");
      } finally {
        setConfirming(null);
      }
    });

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-rule">
        {voters.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className={`font-serif text-lg font-semibold ${v.blank ? "text-ink-soft" : ""}`}>{v.name}</span>

            {v.blank ? (
              <span className="flex items-center gap-2">
                <span className="rounded-sm border border-ink-soft px-2 py-0.5 text-xs font-bold text-ink-soft">
                  Ausente · voto en blanco
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => unmarkBlankAction(v.id))}
                  className="text-xs font-semibold underline underline-offset-2 disabled:opacity-50"
                >
                  Deshacer
                </button>
              </span>
            ) : v.hasVoted ? (
              <span className="rounded-sm bg-ink px-2 py-0.5 text-xs font-bold text-paper">✓ Ha votado</span>
            ) : confirming === v.id ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold">¿No ha venido?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => markBlankAction(v.id))}
                  className="rounded-sm bg-ink px-2 py-1 text-xs font-bold text-paper disabled:opacity-50"
                >
                  {pending ? "…" : "Sí, voto en blanco"}
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="text-xs underline underline-offset-2">
                  Cancelar
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <span className="text-xs font-semibold text-ink-soft">Pendiente</span>
                <button
                  type="button"
                  onClick={() => setConfirming(v.id)}
                  className="rounded-sm border-2 border-ink px-2 py-0.5 text-xs font-semibold"
                >
                  Marcar ausente
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminLogin() {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminLoginAction, {});
  return (
    <form action={action} className="paper mx-auto max-w-sm space-y-4 rounded-sm p-6">
      <h2 className="font-serif text-xl font-bold">Acceso de administrador</h2>
      <label className="block">
        <span className="text-sm font-semibold">Contraseña</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-sm border-2 border-ink bg-white px-3 py-2"
        />
      </label>
      {state.error && <Alert>{state.error}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper disabled:opacity-50"
      >
        {pending ? "Comprobando…" : "Entrar"}
      </button>
    </form>
  );
}

export function AdminControls() {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<"reset" | "pins" | null>(null);
  const [pins, setPins] = useState<{ name: string; pin: string }[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = (kind: "reset" | "pins") =>
    start(async () => {
      setMessage(null);
      try {
        if (kind === "reset") {
          await resetElectionAction();
          setMessage("Votación reseteada: se han borrado todos los votos.");
        } else {
          setPins(await regeneratePinsAction());
          setCopied(false);
        }
      } catch {
        setMessage("No se pudo completar la acción. ¿Ha caducado la sesión de admin?");
      } finally {
        setConfirming(null);
      }
    });

  const pinsText = pins?.map((p) => `${p.name}: ${p.pin}`).join("\n") ?? "";

  return (
    <section className="paper space-y-5 rounded-sm p-6">
      <h2 className="font-serif text-xl font-bold">Acciones</h2>
      {message && <Alert>{message}</Alert>}

      <div className="space-y-3">
        <ActionRow
          title="Regenerar PINs"
          description="Crea un PIN nuevo para cada persona. Los anteriores dejan de valer. Se muestran una sola vez."
          danger={false}
          confirming={confirming === "pins"}
          pending={pending}
          onAsk={() => setConfirming("pins")}
          onCancel={() => setConfirming(null)}
          onConfirm={() => run("pins")}
        />
        <ActionRow
          title="Resetear votación"
          description="Borra TODOS los votos y desbloquea a todo el mundo. No se puede deshacer."
          danger
          confirming={confirming === "reset"}
          pending={pending}
          onAsk={() => setConfirming("reset")}
          onCancel={() => setConfirming(null)}
          onConfirm={() => run("reset")}
        />
      </div>

      {pins && (
        <div className="rounded-sm border-2 border-stamp bg-white p-4">
          <p className="text-sm font-bold text-stamp">Apunta estos PINs ahora: no se volverán a mostrar.</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-base">
            {pins.map((p) => (
              <li key={p.name} className="flex justify-between border-b border-rule py-1">
                <span>{p.name}</span>
                <b>{p.pin}</b>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(pinsText);
              setCopied(true);
            }}
            className="mt-3 rounded-sm border-2 border-ink px-3 py-1.5 text-sm font-semibold"
          >
            {copied ? "¡Copiado!" : "Copiar lista"}
          </button>
        </div>
      )}

      <form action={adminLogoutAction}>
        <button type="submit" className="text-sm text-ink-soft underline underline-offset-2">
          Cerrar sesión de admin
        </button>
      </form>
    </section>
  );
}

function ActionRow(props: {
  title: string;
  description: string;
  danger: boolean;
  confirming: boolean;
  pending: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const btn = props.danger ? "bg-stamp text-white" : "bg-ink text-paper";
  return (
    <div className="rounded-sm border border-rule p-4">
      <p className="font-bold">{props.title}</p>
      <p className="mt-1 text-sm text-ink-soft">{props.description}</p>
      {props.confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">¿Seguro?</span>
          <button
            type="button"
            disabled={props.pending}
            onClick={props.onConfirm}
            className={`rounded-sm px-3 py-1.5 text-sm font-bold ${btn} disabled:opacity-50`}
          >
            {props.pending ? "Un momento…" : "Sí, hazlo"}
          </button>
          <button type="button" onClick={props.onCancel} className="rounded-sm border-2 border-ink px-3 py-1 text-sm">
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" onClick={props.onAsk} className={`mt-3 rounded-sm px-3 py-1.5 text-sm font-bold ${btn}`}>
          {props.title}
        </button>
      )}
    </div>
  );
}
