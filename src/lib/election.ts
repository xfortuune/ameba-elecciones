import { validateBallot } from "./ballot";
import { PARTICIPANTS, TOTAL_VOTERS, isParticipantId, participantName } from "./participants";
import { generateUniquePins, hashPin, isPinFormat, verifyPin } from "./pin";
import type { VoteStore } from "./store/types";
import { tally, type Standing } from "./tally";

export const MAX_PIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 10;

/** hasVoted = ha participado (votando o en blanco); blank = marcado ausente por el admin. */
export type VoterStatus = { id: number; name: string; hasVoted: boolean; blank: boolean };

export type ElectionStatus = {
  total: number;
  votedCount: number;
  blankCount: number;
  complete: boolean;
  voters: VoterStatus[];
};

export type LoginResult =
  | { ok: true; voterId: number; name: string }
  | {
      ok: false;
      code: "invalid" | "not_ready" | "already_voted" | "locked" | "wrong_pin";
      message: string;
      remaining?: number;
      lockedUntil?: string;
    };

export type VoteResult = { ok: true } | { ok: false; code: string; message: string };

export type ResultsResponse =
  | { complete: false; status: ElectionStatus }
  | { complete: true; status: ElectionStatus; standings: Standing[] };

function lockMessage(until: Date): string {
  const mins = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return `Demasiados intentos fallidos. Este nombre está bloqueado durante ${mins} min.`;
}

export function createElection(store: VoteStore, opts: { pinRounds?: number; now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  async function status(): Promise<ElectionStatus> {
    const [votedIds, blankIds] = await Promise.all([store.getVotedIds(), store.getBlankIds()]);
    const voted = new Set(votedIds);
    const blank = new Set(blankIds);
    const voters = PARTICIPANTS.map((p) => ({
      id: p.id,
      name: p.name,
      hasVoted: voted.has(p.id),
      blank: blank.has(p.id),
    }));
    const votedCount = voters.filter((v) => v.hasVoted).length;
    const blankCount = voters.filter((v) => v.blank).length;
    return { total: TOTAL_VOTERS, votedCount, blankCount, complete: votedCount === TOTAL_VOTERS, voters };
  }

  async function login(voterId: unknown, pin: unknown): Promise<LoginResult> {
    if (!isParticipantId(voterId)) {
      return { ok: false, code: "invalid", message: "Votante desconocido." };
    }
    const voter = await store.getVoter(voterId);
    if (!voter?.pinHash) {
      return { ok: false, code: "not_ready", message: "La votación aún no está preparada (faltan los PINs)." };
    }
    if ((await store.getVotedIds()).includes(voterId)) {
      const isBlank = (await store.getBlankIds()).includes(voterId);
      return {
        ok: false,
        code: "already_voted",
        message: isBlank
          ? `${voter.name} está marcado como ausente (voto en blanco). Habla con el administrador.`
          : `${voter.name} ya ha votado. La papeleta no se puede cambiar.`,
      };
    }
    if (voter.lockedUntil && voter.lockedUntil > now()) {
      return {
        ok: false,
        code: "locked",
        message: lockMessage(voter.lockedUntil),
        lockedUntil: voter.lockedUntil.toISOString(),
      };
    }

    const valid = isPinFormat(pin) && (await verifyPin(pin, voter.pinHash));
    if (!valid) {
      const f = await store.registerPinFailure(voterId, MAX_PIN_ATTEMPTS, LOCK_MINUTES);
      if (f.lockedUntil && f.lockedUntil > now()) {
        return {
          ok: false,
          code: "locked",
          message: lockMessage(f.lockedUntil),
          lockedUntil: f.lockedUntil.toISOString(),
        };
      }
      const remaining = MAX_PIN_ATTEMPTS - f.failedAttempts;
      return {
        ok: false,
        code: "wrong_pin",
        message: `PIN incorrecto. Te quedan ${remaining} ${remaining === 1 ? "intento" : "intentos"}.`,
        remaining,
      };
    }

    if (voter.failedAttempts > 0 || voter.lockedUntil) await store.clearPinFailures(voterId);
    return { ok: true, voterId, name: voter.name };
  }

  /** Se llama solo con un votante ya autenticado (sesión firmada). */
  async function vote(voterId: number, input: unknown): Promise<VoteResult> {
    if (!isParticipantId(voterId)) return { ok: false, code: "invalid", message: "Votante desconocido." };
    const check = validateBallot(voterId, input);
    if (!check.ok) return { ok: false, code: "invalid_ballot", message: check.error };

    const res = await store.castVote(voterId, check.ballot);
    if (res === "already_voted") {
      return { ok: false, code: "already_voted", message: "Ya has votado. La papeleta no se puede cambiar." };
    }
    return { ok: true };
  }

  /** Admin: un ausente cuenta como voto en blanco (participa, 0 puntos repartidos). */
  async function markBlank(voterId: unknown): Promise<VoteResult> {
    if (!isParticipantId(voterId)) return { ok: false, code: "invalid", message: "Votante desconocido." };
    const res = await store.castBlank(voterId);
    if (res === "already_voted") {
      return { ok: false, code: "already_voted", message: `${participantName(voterId)} ya había votado.` };
    }
    return { ok: true };
  }

  /** Admin: deshace un voto en blanco. Un voto real nunca se puede deshacer. */
  async function unmarkBlank(voterId: unknown): Promise<VoteResult> {
    if (!isParticipantId(voterId)) return { ok: false, code: "invalid", message: "Votante desconocido." };
    const res = await store.undoBlank(voterId);
    if (res === "not_blank") {
      return { ok: false, code: "not_blank", message: `${participantName(voterId)} no estaba marcado en blanco.` };
    }
    return { ok: true };
  }

  /** Nunca devuelve puntos ni papeletas hasta que hayan votado (o estén en blanco) los 10. */
  async function results(): Promise<ResultsResponse> {
    const s = await status();
    if (!s.complete) return { complete: false, status: s };
    const ballots = await store.getBallots();
    return { complete: true, status: s, standings: tally(PARTICIPANTS, ballots) };
  }

  /** Genera PINs nuevos para todos, guarda solo el hash y devuelve los PINs en claro una vez. */
  async function regeneratePins(): Promise<{ id: number; name: string; pin: string }[]> {
    const pins = generateUniquePins(PARTICIPANTS.length);
    const rows = await Promise.all(
      PARTICIPANTS.map(async (p, i) => ({
        id: p.id,
        name: p.name,
        pin: pins[i],
        pinHash: await hashPin(pins[i], opts.pinRounds),
      })),
    );
    await store.upsertVoters(rows.map(({ id, name, pinHash }) => ({ id, name, pinHash })));
    return rows.map(({ id, name, pin }) => ({ id, name, pin }));
  }

  return {
    status,
    login,
    vote,
    markBlank,
    unmarkBlank,
    results,
    regeneratePins,
    reset: () => store.resetElection(),
    nameOf: participantName,
  };
}

export type Election = ReturnType<typeof createElection>;
