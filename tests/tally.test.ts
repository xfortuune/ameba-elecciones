import { describe, expect, it } from "vitest";
import { PARTICIPANTS } from "@/lib/participants";
import { SCENARIO, EXPECTED } from "@/lib/simulation";
import { tally, type Ballot } from "@/lib/tally";

const P = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" },
  { id: 4, name: "D" },
];

const pick = (rows: ReturnType<typeof tally>) => rows.map((r) => [r.name, r.position, r.points, r.tied]);

describe("tally", () => {
  it("suma 3/2/1 puntos y desglosa", () => {
    const rows = tally(P, [{ first: 1, second: 2, third: 3 }]);
    expect(rows[0]).toMatchObject({ name: "A", points: 3, threes: 1, twos: 0, ones: 0, position: 1 });
    expect(rows[1]).toMatchObject({ name: "B", points: 2, twos: 1 });
    expect(rows[2]).toMatchObject({ name: "C", points: 1, ones: 1 });
    expect(rows[3]).toMatchObject({ name: "D", points: 0, position: 4 });
  });

  it("a igualdad de puntos gana quien tiene más votos de 3", () => {
    // A: 3+1 = 4 (un 3) ; B: 2+2 = 4 (ningún 3) ; C: 1 ; D: 3
    const ballots: Ballot[] = [
      { first: 1, second: 2, third: 3 },
      { first: 4, second: 2, third: 1 },
    ];
    const rows = tally(P, ballots);
    const a = rows.find((r) => r.name === "A")!;
    const b = rows.find((r) => r.name === "B")!;
    expect(a.points).toBe(b.points);
    expect(a.position).toBeLessThan(b.position);
    expect(a.tied).toBe(false);
  });

  it("si siguen empatados, gana quien tiene más votos de 2", () => {
    // A: 3+2+1+1 = 7 ; B: 3+2+2 = 7 → mismos 3s (1), B tiene más 2s
    const ballots: Ballot[] = [
      { first: 1, second: 2, third: 3 },
      { first: 2, second: 1, third: 3 },
      { first: 3, second: 2, third: 1 },
      { first: 4, second: 3, third: 1 },
    ];
    const rows = tally(P, ballots);
    const a = rows.find((r) => r.name === "A")!;
    const b = rows.find((r) => r.name === "B")!;
    expect([a.points, a.threes]).toEqual([b.points, b.threes]);
    expect(b.position).toBeLessThan(a.position);
  });

  it("empate total: comparten posición, se marca y el siguiente salta puesto", () => {
    const ballots: Ballot[] = [
      { first: 1, second: 3, third: 4 },
      { first: 2, second: 3, third: 4 },
    ];
    // C: 2+2 = 4 · A: 3 · B: 3 (A y B idénticos en todo) · D: 1+1 = 2
    expect(pick(tally(P, ballots))).toEqual([
      ["C", 1, 4, false],
      ["A", 2, 3, true],
      ["B", 2, 3, true],
      ["D", 4, 2, false],
    ]);
  });

  it("sin votos todos empatan en el 1º", () => {
    const rows = tally(P, []);
    expect(rows.every((r) => r.position === 1 && r.tied)).toBe(true);
  });

  it("escenario de simulación da la clasificación esperada", () => {
    const rows = tally(PARTICIPANTS, SCENARIO.map((s) => s.ballot));
    expect(rows.map(({ name, position, points, threes, twos, ones, tied }) => ({ name, position, points, threes, twos, ones, tied }))).toEqual(EXPECTED);
  });
});
