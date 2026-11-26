import Link from "next/link";
import { ElectionInfo } from "./ElectionInfo";
import { MusicToggle } from "./music/MusicToggle";
import { Seal } from "./Seal";

/** Cabecera oficial: sello + título, como el encabezado de una papeleta. */
export function Masthead({ subtitle }: { subtitle?: string }) {
  return (
    <header className="w-full">
      <div className="h-2 w-full bg-stamp" />
      <div className="h-1 w-full bg-gold" />
      <div className="relative mx-auto flex max-w-2xl items-center gap-4 px-4 pt-6 pb-2">
        <Link href="/" className="shrink-0 text-stamp" aria-label="Inicio">
          <Seal size={72} />
        </Link>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <MusicToggle />
          <ElectionInfo />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pr-16 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.25em] text-ink-soft">AMEBA CITY</p>
          <h1 className="font-serif text-2xl leading-tight font-bold sm:text-3xl">
            Elecciones a Presidente del Grupo
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-2xl px-4 py-8 text-center text-xs text-ink-soft">
      <p>Voto secreto · Nadie puede ver a quién has votado · Junta Electoral de AMEBA CITY</p>
      <nav className="mt-2 flex justify-center gap-4 underline underline-offset-2">
        <Link href="/">Votar</Link>
        <Link href="/resultados">Resultados</Link>
      </nav>
      <p className="mt-4">
        Diseñado por Fortune + Bruno <span aria-hidden="true">🔥</span>{" "}
        <a
          href="https://www.instagram.com/nataliamari02/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          InfielesApps.com
        </a>
      </p>
    </footer>
  );
}
