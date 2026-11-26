"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Easter eggs: popups que salen a ciertos votantes justo después de meter
 * su PIN, antes de la papeleta. Para añadir uno nuevo, añade una entrada a
 * EASTER_EGGS con el nombre exacto del votante.
 */
type EggProps = { onClose: () => void };

export const EASTER_EGGS: Record<string, (props: EggProps) => ReactNode> = {
  Valentin: CotizaEgg,
  Luis: LuisEgg,
  Ach: AchEgg,
};

// ---------------------------------------------------------------------------
// Base común: fondo oscuro, tarjeta de papel, Escape o clic fuera para cerrar.
// ---------------------------------------------------------------------------
function EggModal({ onClose, labelledBy, children }: EggProps & { labelledBy: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="paper animate-pop relative w-full max-w-sm overflow-hidden rounded-sm px-6 pt-8 pb-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-soft">Aviso de la Junta Electoral</p>
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose, children }: EggProps & { children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClose}
      autoFocus
      className="mt-7 w-full rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Valentin: ¡COTIZA!
// ---------------------------------------------------------------------------
const JOB_APPS = [
  { name: "LinkedIn", href: "https://www.linkedin.com/jobs/", bg: "#0A66C2", label: "in", font: "text-3xl" },
  { name: "InfoJobs", href: "https://www.infojobs.net/", bg: "#167DB7", label: "infojobs", font: "text-[13px]" },
  { name: "Indeed", href: "https://es.indeed.com/", bg: "#2557A7", label: "indeed", font: "text-base" },
];

function CotizaEgg({ onClose }: EggProps) {
  return (
    <EggModal onClose={onClose} labelledBy="egg-title">
      <h2
        id="egg-title"
        className="animate-stamp mx-auto mt-8 mb-4 w-fit rounded border-[4px] border-stamp px-4 py-1.5 font-sans text-4xl font-black tracking-wider text-stamp sm:border-[5px] sm:px-5 sm:py-2 sm:text-5xl"
      >
        ¡COTIZA!
      </h2>
      <p className="mt-6 text-sm text-ink-soft">Valentin, antes de elegir presidente… ¿has echado algún currículum hoy?</p>
      <ul className="mt-5 flex justify-center gap-4">
        {JOB_APPS.map((app, i) => (
          <li key={app.name} className="animate-rise" style={{ animationDelay: `${0.35 + i * 0.15}s` }}>
            <a
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={app.name}
              className="flex flex-col items-center gap-1.5 transition active:scale-95"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-2xl font-sans font-extrabold text-white shadow-lg ${app.font}`}
                style={{ background: app.bg }}
              >
                {app.label}
              </span>
              <span className="text-xs font-semibold">{app.name}</span>
            </a>
          </li>
        ))}
      </ul>
      <CloseButton onClose={onClose}>Vale, vale… a votar</CloseButton>
    </EggModal>
  );
}

// ---------------------------------------------------------------------------
// Luis: ¿Aún le echas de menos?
// ---------------------------------------------------------------------------
function LuisEgg({ onClose }: EggProps) {
  return (
    <EggModal onClose={onClose} labelledBy="egg-title">
      {/* Polaroid con un corazón partido que late */}
      <div className="animate-rise mx-auto mt-6 w-44 rotate-[-4deg] bg-white p-2.5 pb-3 shadow-lg">
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#f7d7da] via-[#f3e3d3] to-[#e9dcf2]">
          <svg viewBox="0 0 64 60" className="h-20 w-20 animate-[heartbeat_1.4s_ease-in-out_infinite]" aria-hidden="true">
            <path d="M32,56 L8,32 A13,13 0 0,1 30,13 L32,15 L27,27 L35,33 L30,45 Z" fill="var(--stamp)" />
            <path d="M34,56 L36,46 L41,34 L33,28 L36,14 A13,13 0 0,1 58,32 Z" fill="var(--stamp)" opacity="0.85" />
          </svg>
        </div>
        <p className="mt-2 font-serif text-sm italic text-ink-soft">@xfedericusx ♡</p>
      </div>

      <h2 id="egg-title" className="mt-6 font-serif text-3xl leading-tight font-bold">
        ¿Aún le echas de menos?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Luis, antes de votar con la cabeza… dale un último vistazo con el corazón.
      </p>

      <a
        href="https://www.instagram.com/xfedericusx/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 font-bold text-white shadow transition active:scale-[0.98]"
        style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
        </svg>
        Ver su Instagram
      </a>
      <CloseButton onClose={onClose}>Ya lo he superado (mentira)</CloseButton>
      <style>{`@keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.12)}30%{transform:scale(1)}45%{transform:scale(1.08)}}`}</style>
    </EggModal>
  );
}

// ---------------------------------------------------------------------------
// Ach: Marruecos
// ---------------------------------------------------------------------------
function MoroccoFlag({ className = "" }: { className?: string }) {
  // Pentagrama verde sobre fondo rojo
  const r = 9;
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    return `${(30 + r * Math.cos(a)).toFixed(2)},${(20 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 60 40" className={className} aria-label="Bandera de Marruecos" role="img">
      <rect width="60" height="40" fill="#c1272d" />
      <polygon points={pts} fill="none" stroke="#006233" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function AchEgg({ onClose }: EggProps) {
  return (
    <EggModal onClose={onClose} labelledBy="egg-title">
      {/* Franja de zellige arriba */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2.5"
        style={{
          background:
            "repeating-linear-gradient(45deg,#006233 0 6px,#c9a227 6px 9px,#c1272d 9px 15px,#c9a227 15px 18px)",
        }}
      />

      <div className="mt-6 flex justify-center">
        <MoroccoFlag className="animate-[wave_2.6s_ease-in-out_infinite] h-20 w-30 origin-left rounded-[2px] shadow-md" />
      </div>

      <p className="mt-5 font-serif text-xl text-ink-soft" lang="ar" dir="rtl">
        مرحبا
      </p>
      <h2 id="egg-title" className="font-serif text-3xl leading-tight font-bold">
        ¡Marhaba, Ach!
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        La Junta Electoral te recibe como se merece: antes de votar, un tecito de menta bien servido desde arriba.
      </p>

      <div className="mt-5 flex items-center justify-center gap-3 text-4xl" aria-hidden="true">
        <span className="animate-rise [animation-delay:0.3s]">🫖</span>
        <span className="animate-rise [animation-delay:0.45s]">🍵</span>
        <span className="animate-rise [animation-delay:0.6s]">🌿</span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">Atay · Desde el Atlas hasta AMEBA CITY</p>

      <CloseButton onClose={onClose}>Yalla, a votar</CloseButton>
      <style>{`@keyframes wave{0%,100%{transform:skewY(0deg) scaleX(1)}50%{transform:skewY(-3deg) scaleX(.97)}}`}</style>
    </EggModal>
  );
}
