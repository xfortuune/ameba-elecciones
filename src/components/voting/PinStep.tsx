"use client";

import { useEffect, useRef, useState } from "react";
import { loginAction } from "@/app/actions";
import type { VoterStatus } from "@/lib/election";
import { Alert } from "../Alert";

type Props = {
  voter: VoterStatus;
  notice?: string | null;
  onBack: () => void;
  onSuccess: () => void;
  onAlreadyVoted: () => void;
};

export function PinStep({ voter, notice, onBack, onSuccess, onAlreadyVoted }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(notice ?? null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  async function submit(value: string) {
    if (value.length !== 4 || busy || locked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await loginAction(voter.id, value);
      if (res.ok) return onSuccess();
      setError(res.message);
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      if (res.code === "locked") setLocked(true);
      if (res.code === "already_voted") setTimeout(onAlreadyVoted, 1800);
    } catch {
      setError("Error de conexión. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="paper mx-auto max-w-sm rounded-sm p-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-soft">Identificación del votante</p>
      <h2 className="mt-2 font-serif text-2xl font-bold">Hola, {voter.name}</h2>
      <p className="mt-1 text-sm text-ink-soft">Introduce tu PIN personal de 4 dígitos.</p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit(pin);
        }}
      >
        <label className="relative mx-auto block w-fit cursor-text" onClick={() => inputRef.current?.focus()}>
          <span className="sr-only">PIN</span>
          <input
            ref={inputRef}
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(v);
              if (v.length === 4) submit(v);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{4}"
            maxLength={4}
            disabled={busy || locked}
            className="absolute inset-0 h-full w-full opacity-0"
            aria-label="PIN de 4 dígitos"
          />
          <span className={`flex gap-3 ${shake ? "animate-[shake_0.4s]" : ""}`} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`flex h-16 w-12 items-center justify-center rounded-sm border-2 font-serif text-3xl font-bold ${
                  i === pin.length && !locked ? "border-stamp" : "border-ink"
                } bg-white`}
              >
                {pin[i] ? "●" : ""}
              </span>
            ))}
          </span>
        </label>

        {error && (
          <div className="mt-5 text-left">
            <Alert>{error}</Alert>
          </div>
        )}

        <button
          type="submit"
          disabled={pin.length !== 4 || busy || locked}
          className="mt-6 w-full rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper disabled:opacity-40"
        >
          {busy ? "Comprobando…" : "Entrar a votar"}
        </button>
        <button type="button" onClick={onBack} className="mt-3 text-sm text-ink-soft underline underline-offset-2">
          No soy {voter.name}
        </button>
      </form>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </section>
  );
}
