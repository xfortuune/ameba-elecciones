import type { Participant } from "./participants";

/** Una papeleta: a quién da 3, 2 y 1 puntos. No guarda quién la emitió. */
export type Ballot = { first: number; second: number; third: number };

export type Standing = {
  id: number;
  name: string;
  points: number;
  threes: number;
  twos: number;
  ones: number;
  /** Puntos extra por votos en blanco (cada ausente da +1 al más votado). */
  bonus: number;
  /** Posición (1 = primero). Los empatados comparten posición: 1, 2, 2, 4… */
  position: number;
  /** true si comparte posición con alguien. */
  tied: boolean;
  /** Votos recibidos en la segunda vuelta (solo los empatados que la disputaron). */
  runoffVotes?: number;
};

/**
 * Recuento y clasificación.
 * Orden: puntos totales → nº de votos de 3 → nº de votos de 2.
 * Si todo coincide, comparten posición y se marcan como empate.
 *
 * Votos en blanco (ausentes): cada uno da +1 punto a quien quede 1º con los
 * votos reales. Si varios comparten el 1º puesto, el punto va a cada uno.
 */
export function tally(
  participants: readonly Participant[],
  ballots: readonly Ballot[],
  blankVotes = 0,
): Standing[] {
  const rows = new Map<number, Standing>(
    participants.map((p) => [
      p.id,
      { id: p.id, name: p.name, points: 0, threes: 0, twos: 0, ones: 0, bonus: 0, position: 0, tied: false },
    ]),
  );

  for (const b of ballots) {
    const first = rows.get(b.first);
    const second = rows.get(b.second);
    const third = rows.get(b.third);
    if (first) { first.points += 3; first.threes += 1; }
    if (second) { second.points += 2; second.twos += 1; }
    if (third) { third.points += 1; third.ones += 1; }
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.threes - a.threes ||
      b.twos - a.twos ||
      a.name.localeCompare(b.name, "es"), // solo para un orden visual estable
  );

  const sameRank = (a: Standing, b: Standing) =>
    a.points === b.points && a.threes === b.threes && a.twos === b.twos;

  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    row.position = prev && sameRank(prev, row) ? prev.position : i + 1;
  });
  sorted.forEach((row, i) => {
    row.tied =
      (i > 0 && sameRank(sorted[i - 1], row)) ||
      (i < sorted.length - 1 && sameRank(sorted[i + 1], row));
  });

  // El más votado sigue siendo 1º tras sumar el bonus, así que el orden no cambia.
  if (blankVotes > 0) {
    for (const row of sorted) {
      if (row.position === 1) {
        row.bonus = blankVotes;
        row.points += blankVotes;
      }
    }
  }

  return sorted;
}
