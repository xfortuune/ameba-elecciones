import type { Standing } from "@/lib/tally";

const TIERS = {
  1: { label: "Presidente", color: "var(--gold)", height: "h-40 sm:h-48", medal: "gold-shimmer", order: "order-2" },
  2: { label: "Vicepresidente", color: "var(--silver)", height: "h-28 sm:h-36", medal: "", order: "order-1" },
  3: { label: "Bronce", color: "var(--bronze)", height: "h-20 sm:h-28", medal: "", order: "order-3" },
} as const;

/** Orden de revelado: bronce (1º paso), vicepresidente (2º), presidente (3º). */
const REVEAL_STEP = { 3: 1, 2: 2, 1: 3 } as const;

export function Podium({ standings, revealed }: { standings: Standing[]; revealed: number }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {([1, 2, 3] as const).map((pos) => {
        const tier = TIERS[pos];
        const people = standings.filter((s) => s.position === pos);
        const visible = revealed >= REVEAL_STEP[pos];
        return (
          <div key={pos} className={`flex flex-col items-center ${tier.order}`}>
            <div className="mb-2 flex min-h-28 w-full flex-col items-center justify-end text-center">
              {visible ? (
                <div className="animate-pop flex flex-col items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white font-serif text-xl font-black text-white shadow-lg sm:h-14 sm:w-14 ${tier.medal}`}
                    style={tier.medal ? undefined : { background: tier.color }}
                  >
                    {pos}
                  </div>
                  {people.length === 0 ? (
                    <p className="mt-2 font-serif text-sm text-ink-soft italic">Desierto</p>
                  ) : (
                    people.map((p) => (
                      <p
                        key={p.id}
                        className={`mt-1.5 font-serif font-bold leading-tight break-words ${pos === 1 ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
                      >
                        {p.name}
                      </p>
                    ))
                  )}
                  {people[0] && (
                    <p className="text-xs font-semibold text-ink-soft tabular-nums">
                      {people[0].points} pts{people.length > 1 ? " · empate" : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-rule font-serif text-xl text-ink-soft sm:h-14 sm:w-14">
                  ?
                </div>
              )}
            </div>
            <div
              className={`relative w-full ${tier.height} rounded-t-sm border-2 border-b-0 border-ink/80 transition-colors duration-700`}
              style={{ background: visible ? tier.color : "var(--paper-edge)" }}
            >
              <span className="absolute inset-x-0 top-2 text-center font-serif text-3xl font-black text-white/90 drop-shadow sm:text-4xl">
                {pos}º
              </span>
              <span className="absolute inset-x-0 bottom-2 px-1 text-center text-[8.5px] font-bold uppercase tracking-[0.06em] text-white/90 sm:text-[10px] sm:tracking-[0.15em]">
                {tier.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
