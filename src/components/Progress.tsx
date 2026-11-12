/** Barra de participación: "7/10 han votado". */
export function Progress({ voted, total }: { voted: number; total: number }) {
  const pct = Math.round((voted / total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold uppercase tracking-wider text-ink-soft">Participación</span>
        <span className="font-serif text-lg font-bold tabular-nums">
          {voted}/{total} <span className="text-sm font-normal text-ink-soft">han votado</span>
        </span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full border border-rule bg-paper-edge"
        role="progressbar"
        aria-valuenow={voted}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="h-full bg-stamp transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
