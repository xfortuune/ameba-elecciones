"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-stamp">Incidencia en la mesa electoral</p>
      <h1 className="mt-2 font-serif text-2xl font-bold">Algo ha fallado</h1>
      <p className="mt-2 text-sm text-ink-soft">
        No hemos podido conectar con la urna. Vuelve a intentarlo en unos segundos.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-soft">Ref: {error.digest}</p>}
      <button onClick={reset} className="mt-6 rounded-sm bg-ink px-5 py-3 font-bold text-paper">
        Reintentar
      </button>
    </main>
  );
}
