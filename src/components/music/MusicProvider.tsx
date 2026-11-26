"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** Canción de fondo: "Dont Call Me More" (xFortuune), desde el 0:09. */
const VIDEO_ID = "T5tqvSxexJk";
const START_SECONDS = 9;
/** Volumen de fondo (0–100): a media potencia para no robar protagonismo. */
const BACKGROUND_VOLUME = 50;
const STORAGE_KEY = "ameba-musica-silenciada";

// Tipos mínimos de la YouTube IFrame API
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  setVolume(volume: number): void;
  unMute(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getPlayerState(): number;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: number;
      height?: number;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<YTNamespace> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

type MusicState = { muted: boolean; playing: boolean; toggle: () => void };
const MusicContext = createContext<MusicState>({ muted: false, playing: false, toggle: () => {} });
export const useMusic = () => useContext(MusicContext);

/**
 * Reproductor de fondo en el layout raíz, así sigue sonando al cambiar de página.
 * Los navegadores bloquean el audio sin interacción: si al cargar no puede sonar,
 * arranca con el primer toque/clic/tecla en cualquier parte de la página.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initialMuted = readMuted();
    mutedRef.current = initialMuted;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage tras hidratar
    setMuted(initialMuted);

    // Primer gesto del usuario: desbloquea el audio si el navegador lo bloqueó.
    const unlock = () => {
      const p = playerRef.current;
      if (p && !mutedRef.current) {
        p.unMute();
        p.setVolume(BACKGROUND_VOLUME);
        p.playVideo();
      }
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => document.addEventListener(e, unlock, { capture: true }));

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const mount = document.createElement("div");
      hostRef.current.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
        videoId: VIDEO_ID,
        width: 200,
        height: 200,
        playerVars: {
          start: START_SECONDS,
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: ({ target }) => {
            target.setVolume(BACKGROUND_VOLUME);
            if (mutedRef.current) {
              target.mute();
              target.pauseVideo();
            } else {
              target.unMute();
              target.setVolume(BACKGROUND_VOLUME);
              target.playVideo();
            }
          },
          onStateChange: ({ data, target }) => {
            if (data === YT.PlayerState.PLAYING) {
              setPlaying(true);
              // Ya suena: los listeners de desbloqueo sobran.
              events.forEach((e) => document.removeEventListener(e, unlock, { capture: true }));
            } else {
              setPlaying(false);
            }
            // Bucle desde el 0:09
            if (data === YT.PlayerState.ENDED) {
              target.seekTo(START_SECONDS, true);
              if (!mutedRef.current) target.playVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      events.forEach((e) => document.removeEventListener(e, unlock, { capture: true }));
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
    const p = playerRef.current;
    if (!p) return;
    if (next) {
      p.mute();
      p.pauseVideo();
    } else {
      p.unMute();
      p.setVolume(BACKGROUND_VOLUME);
      p.playVideo();
    }
  }, []);

  return (
    <MusicContext.Provider value={{ muted, playing, toggle }}>
      {children}
      {/* Reproductor fuera de la vista: solo se usa su audio */}
      <div
        ref={hostRef}
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-[400px] -left-[400px] h-[200px] w-[200px] overflow-hidden opacity-0"
      />
    </MusicContext.Provider>
  );
}
