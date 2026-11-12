"use client";

import { useActionState, useState, useTransition } from "react";
import {
  adminLoginAction,
  adminLogoutAction,
  regeneratePinsAction,
  resetElectionAction,
  type AdminLoginState,
} from "@/app/admin/actions";
import { Alert } from "../Alert";

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
