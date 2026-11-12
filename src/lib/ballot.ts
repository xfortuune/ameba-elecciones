import { isParticipantId } from "./participants";
import type { Ballot } from "./tally";

export type BallotValidation = { ok: true; ballot: Ballot } | { ok: false; error: string };

/**
 * Valida una papeleta recibida del cliente (no confiamos en nada de lo que llega):
 * tres candidatos válidos, distintos entre sí y ninguno es el propio votante.
 * Los puntos 3/2/1 vienen fijados por la posición (first/second/third).
 */
export function validateBallot(voterId: number, input: unknown): BallotValidation {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Papeleta inválida." };
  }
  const { first, second, third } = input as Record<string, unknown>;
  const picks = [first, second, third];

  if (!picks.every(isParticipantId)) {
    return { ok: false, error: "Tienes que repartir los 3, 2 y 1 puntos entre candidatos válidos." };
  }
  const ids = picks as number[];
  if (new Set(ids).size !== 3) {
    return { ok: false, error: "Cada voto tiene que ir a una persona distinta." };
  }
  if (ids.includes(voterId)) {
    return { ok: false, error: "No puedes votarte a ti mismo." };
  }
  return { ok: true, ballot: { first: ids[0], second: ids[1], third: ids[2] } };
}
