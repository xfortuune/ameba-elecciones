"use client";

import { useMusic } from "./MusicProvider";

/** Botón 🔊/🔇 discreto, con el mismo estilo que el icono de información. */
export function MusicToggle() {
  const { muted, playing, toggle } = useMusic();
  const label = muted ? "Activar música" : "Silenciar música";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={muted}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
        playing && !muted
          ? "border-stamp text-stamp"
          : "border-rule text-ink-soft/70 hover:border-ink-soft hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M18 6.5a7.5 7.5 0 0 1 0 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={playing ? "animate-pulse" : ""}
            />
          </>
        )}
      </svg>
    </button>
  );
}
