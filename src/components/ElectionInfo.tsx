"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Bases de la elección (del cartel oficial de AMEBA CITY). */
const RULES: { title: string; body: React.ReactNode }[] = [
  { title: "Censo electoral", body: "10 miembros con derecho a voto." },
  { title: "Candidaturas", body: "Los 10 miembros son candidatos." },
  {
    title: "Sistema de votación",
    body: (
      <>
        Por puntos <b>3 – 2 – 1</b>: 3 al candidato más votado, 2 al segundo y 1 al tercero.
      </>
    ),
  },
  {
    title: "Ganador",
    body: (
      <>
        El 1º en puntos será <b>Presidente</b> y el 2º, <b>Vicepresidente</b>.
      </>
    ),
  },
  {
    title: "Mandato",
    body: (
      <>
        <b>24 meses</b> (2 años). Reelección: se puede volver a presentar al acabar el mandato.
      </>
    ),
  },
  {
    title: "Golpe de estado",
    body: (
      <>
        Para llevarlo a cabo tiene que estar a favor la <b>mayoría unánime</b> del Discord.
      </>
    ),
  },
];

/**
 * Icono ⓘ discreto. Se abre al pasar el ratón (escritorio) o al tocarlo (móvil).
 * Se cierra al salir con el ratón, al tocar fuera o con Escape.
 */
export function ElectionInfo() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // abierto con clic/toque: no se cierra al quitar el ratón
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setPinned(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
    >
      <button
        type="button"
        aria-label="Bases de la elección"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const next = !(open && pinned);
          setOpen(next);
          setPinned(next);
        }}
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
          open ? "border-stamp text-stamp" : "border-rule text-ink-soft/70 hover:border-ink-soft hover:text-ink"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="7.2" r="1.6" fill="currentColor" />
          <path d="M12 11v7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Bases de la elección"
          className="paper animate-rise absolute top-full right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-sm border border-rule p-4 text-left [animation-duration:0.25s]"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stamp">Bases de la elección</p>
          <h2 className="mt-0.5 font-serif text-lg leading-tight font-bold">Presidencia de AMEBA CITY</h2>

          <dl className="mt-3 space-y-2.5">
            {RULES.map((r) => (
              <div key={r.title} className="border-l-2 border-gold pl-3">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink">{r.title}</dt>
                <dd className="text-[13px] leading-snug text-ink-soft">{r.body}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-sm bg-ink px-3 py-2.5 text-paper">
            <p className="font-sans text-sm font-black uppercase tracking-wide text-gold">¡Presenta tu candidatura!</p>
            <p className="mt-0.5 text-xs leading-snug text-paper/85">
              Prepara tu proyecto y define tus propuestas: el más votado preside y el segundo es su vicepresidente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
