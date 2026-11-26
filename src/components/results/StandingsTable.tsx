import type { Standing } from "@/lib/tally";

const MEDAL: Record<number, string> = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };

export function StandingsTable({ standings, blankNames = [] }: { standings: Standing[]; blankNames?: string[] }) {
  const valid = standings.length - blankNames.length;
  return (
    <section className="paper rounded-sm px-4 py-5 sm:px-6">
      <h3 className="border-b-2 border-ink pb-2 font-serif text-xl font-bold">Clasificación completa</h3>
      <p className="mt-2 text-xs text-ink-soft">
        Desempate: más votos de 3 puntos; si persiste, más votos de 2. Si aun así coinciden, comparten puesto.
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        {valid} {valid === 1 ? "papeleta válida" : "papeletas válidas"}
        {blankNames.length > 0 &&
          ` · ${blankNames.length} ${blankNames.length === 1 ? "voto en blanco" : "votos en blanco"} (ausentes: ${blankNames.join(", ")}) → +1 punto al más votado por cada uno`}
      </p>

      <ol className="mt-3 divide-y divide-rule">
        {standings.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-serif text-lg font-black tabular-nums"
              style={
                MEDAL[s.position]
                  ? { background: MEDAL[s.position], borderColor: "white", color: "white" }
                  : { borderColor: "var(--ink)" }
              }
            >
              {s.position}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 font-serif text-lg font-bold leading-tight">
                {s.name}
                {s.tied && (
                  <span className="rounded-sm border border-stamp px-1.5 py-px font-sans text-[10px] font-bold uppercase tracking-wider text-stamp">
                    Empate
                  </span>
                )}
              </p>
              <p className="mt-0.5 flex gap-2 text-xs text-ink-soft tabular-nums">
                <Breakdown pts={3} n={s.threes} />
                <Breakdown pts={2} n={s.twos} />
                <Breakdown pts={1} n={s.ones} />
                {s.bonus > 0 && (
                  <span
                    className="rounded-sm bg-gold/25 px-1.5 py-0.5"
                    title={`+${s.bonus} por votos en blanco de ausentes`}
                  >
                    <b className="text-ink">+{s.bonus}</b> {s.bonus === 1 ? "ausente" : "ausentes"}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="font-serif text-2xl leading-none font-black tabular-nums">{s.points}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-soft">puntos</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Breakdown({ pts, n }: { pts: number; n: number }) {
  return (
    <span className="rounded-sm bg-paper-edge px-1.5 py-0.5" title={`${n} votos de ${pts} puntos`}>
      <b className="text-ink">{n}</b>×{pts}pt
    </span>
  );
}
