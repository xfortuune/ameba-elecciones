"use client";

import { useEffect } from "react";

/** Easter egg para Valentin: aparece al meter su PIN. */
const JOB_APPS = [
  { name: "LinkedIn", href: "https://www.linkedin.com/jobs/", bg: "#0A66C2", label: "in", font: "text-3xl" },
  { name: "InfoJobs", href: "https://www.infojobs.net/", bg: "#167DB7", label: "infojobs", font: "text-[13px]" },
  { name: "Indeed", href: "https://es.indeed.com/", bg: "#2557A7", label: "indeed", font: "text-base" },
];

export function CotizaPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cotiza-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="paper animate-pop relative w-full max-w-sm rounded-sm px-6 pt-8 pb-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-soft">Aviso de la Junta Electoral</p>

        <h2
          id="cotiza-title"
          className="animate-stamp mx-auto mt-8 mb-4 w-fit rounded border-[4px] border-stamp px-4 py-1.5 font-sans text-4xl sm:border-[5px] sm:px-5 sm:py-2 sm:text-5xl font-black tracking-wider text-stamp"
        >
          ¡COTIZA!
        </h2>

        <p className="mt-6 text-sm text-ink-soft">
          Valentin, antes de elegir presidente… ¿has echado algún currículum hoy?
        </p>

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

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-7 w-full rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper"
        >
          Vale, vale… a votar
        </button>
      </div>
    </div>
  );
}
