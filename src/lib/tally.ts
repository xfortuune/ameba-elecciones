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
  /** Posición (1 = primero). Los empatados comparten posición: 1, 2, 2, 4… */
  position: number;
  /** true si comparte posición con alguien. */
  tied: boolean;
};

/**
 * Recuento y clasificación.
 * Orden: puntos totales → nº de votos de 3 → nº de votos de 2.
 * Si todo coincide, comparten posición y se marcan como empate.
 */
export function tally(participants: readonly Participant[], ballots: readonly Ballot[]): Standing[] {
  const rows = new Map<number, Standing>(
    participants.map((p) => [
      p.id,
      { id: p.id, name: p.name, points: 0, threes: 0, twos: 0, ones: 0, position: 0, tied: false },
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

  return sorted;
}
