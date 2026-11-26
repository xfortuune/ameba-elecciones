import type { Ballot } from "../tally";

export type VoterRecord = {
  id: number;
  name: string;
  pinHash: string | null;
  failedAttempts: number;
  lockedUntil: Date | null;
};

export type PinFailure = { failedAttempts: number; lockedUntil: Date | null };

/** Acceso a datos. Hay una implementación para Supabase y otra en memoria (tests). */
export interface VoteStore {
  getVoter(id: number): Promise<VoterRecord | null>;
  /** Todos los que han participado: votando o marcados como voto en blanco. */
  getVotedIds(): Promise<number[]>;
  /** Solo los marcados como ausentes (voto en blanco). */
  getBlankIds(): Promise<number[]>;
  /** Marca a un ausente como voto en blanco: participa sin papeleta (el recuento le da +1 al más votado). */
  castBlank(voterId: number): Promise<"ok" | "already_voted">;
  /** Deshace un voto en blanco (nunca un voto real). */
  undoBlank(voterId: number): Promise<"ok" | "not_blank">;
  /** Suma un fallo de PIN de forma atómica; bloquea al llegar a `max`. */
  registerPinFailure(id: number, max: number, lockMinutes: number): Promise<PinFailure>;
  clearPinFailures(id: number): Promise<void>;
  /** Guarda participación + papeleta de forma atómica. */
  castVote(voterId: number, ballot: Ballot): Promise<"ok" | "already_voted">;
  getBallots(): Promise<Ballot[]>;
  resetElection(): Promise<void>;
  /** Crea/actualiza los votantes con su hash de PIN y les quita bloqueos. */
  upsertVoters(voters: { id: number; name: string; pinHash: string }[]): Promise<void>;
}
