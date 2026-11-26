import { validateBallot } from "./ballot";
import { PARTICIPANTS, TOTAL_VOTERS, isParticipantId, participantName } from "./participants";
import { generateUniquePins, hashPin, isPinFormat, verifyPin } from "./pin";
import type { ElectionSettings, VoteStore } from "./store/types";
import { tally, type Standing } from "./tally";

export const MAX_PIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 10;
/** Margen para que todos los dispositivos reciban la orden antes de que arranque el revelado. */
export const REVEAL_LEAD_MS = 8_000;

/** hasVoted = ha participado (votando o en blanco); blank = marcado ausente por el admin. */
export type VoterStatus = { id: number; name: string; hasVoted: boolean; blank: boolean };

export type RunoffStatus = {
  candidates: { id: number; name: string }[];
  /** Pueden votar todos menos los ausentes de la primera vuelta. */
  eligibleIds: number[];
  votedIds: number[];
  closed: boolean;
  complete: boolean;
};

export type ElectionStatus = {
  total: number;
  votedCount: number;
  blankCount: number;
  complete: boolean;
  voters: VoterStatus[];
  opensAt: string | null;
  closesAt: string | null;
  /** Dentro del horario de votación (sin horario = siempre abierta). */
  votingOpen: boolean;
  /** Momento en que arranca el revelado sincronizado (null = urna cerrada). */
  revealedAt: string | null;
  serverNow: string;
  /** Segunda vuelta activa o terminada (null = no hay). */
  runoff: RunoffStatus | null;
};

export type LoginResult =
  | { ok: true; voterId: number; name: string; mode: "main" | "runoff" }
  | {
      ok: false;
      code: "invalid" | "not_ready" | "already_voted" | "locked" | "wrong_pin" | "not_open" | "closed";
      message: string;
      remaining?: number;
      lockedUntil?: string;
    };

export type VoteResult = { ok: true } | { ok: false; code: string; message: string };

export type RunoffResult = {
  candidates: { id: number; name: string; votes: number }[];
  complete: boolean;
  votedCount: number;
  eligibleCount: number;
};

export type ResultsResponse =
  | { complete: false; revealed: false; status: ElectionStatus }
  | { complete: true; revealed: false; status: ElectionStatus }
  | { complete: true; revealed: true; status: ElectionStatus; standings: Standing[]; runoff: RunoffResult | null };

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
export const formatSpanishDate = (d: Date | string) => DATE_FMT.format(new Date(d));

function lockMessage(until: Date): string {
  const mins = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return `Demasiados intentos fallidos. Este nombre está bloqueado durante ${mins} min.`;
}

/** Empatados que deciden una segunda vuelta: 1º puesto; si no, 2º (vicepresidencia). */
export function runoffGroup(standings: Standing[]): Standing[] | null {
  const first = standings.filter((s) => s.position === 1);
  if (first.length > 1) return first;
  const second = standings.filter((s) => s.position === 2);
  if (second.length > 1) return second;
  return null;
}

/** Reordena a los empatados según los votos de la segunda vuelta. */
export function applyRunoff(standings: Standing[], votes: Map<number, number>): Standing[] {
  const ids = new Set(votes.keys());
  const firstIdx = standings.findIndex((s) => ids.has(s.id));
  if (firstIdx < 0) return standings;
  const start = standings[firstIdx].position;
  const group = standings
    .filter((s) => ids.has(s.id))
    .map((s) => ({ ...s, runoffVotes: votes.get(s.id) ?? 0 }))
    .sort((a, b) => b.runoffVotes - a.runoffVotes || a.name.localeCompare(b.name, "es"));
  group.forEach((row, i) => {
    const prev = group[i - 1];
    row.position = prev && prev.runoffVotes === row.runoffVotes ? prev.position : start + i;
  });
  group.forEach((row, i) => {
    row.tied =
      (i > 0 && group[i - 1].runoffVotes === row.runoffVotes) ||
      (i < group.length - 1 && group[i + 1].runoffVotes === row.runoffVotes);
  });
  const rest = standings.filter((s) => !ids.has(s.id));
  return [...rest.slice(0, firstIdx), ...group, ...rest.slice(firstIdx)];
}

export function createElection(store: VoteStore, opts: { pinRounds?: number; now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  const isOpen = (s: ElectionSettings, t = now()) =>
    (!s.opensAt || t >= s.opensAt) && (!s.closesAt || t < s.closesAt);

  async function status(): Promise<ElectionStatus> {
    const [votedIds, blankIds, settings] = await Promise.all([
      store.getVotedIds(),
      store.getBlankIds(),
      store.getSettings(),
    ]);
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

    let runoff: RunoffStatus | null = null;
    if (settings.runoffCandidates?.length) {
      const runoffVoted = await store.getRunoffVotedIds();
      const eligibleIds = voters.filter((v) => !v.blank).map((v) => v.id);
      const allVoted = eligibleIds.every((id) => runoffVoted.includes(id));
      runoff = {
        candidates: settings.runoffCandidates.map((id) => ({ id, name: participantName(id) })),
        eligibleIds,
        votedIds: runoffVoted,
        closed: settings.runoffClosed,
        complete: settings.runoffClosed || allVoted,
      };
    }

    return {
      total: TOTAL_VOTERS,
      votedCount,
      blankCount,
      complete: votedCount === TOTAL_VOTERS,
      voters,
      opensAt: settings.opensAt?.toISOString() ?? null,
      closesAt: settings.closesAt?.toISOString() ?? null,
      votingOpen: isOpen(settings),
      revealedAt: settings.revealedAt?.toISOString() ?? null,
      serverNow: now().toISOString(),
      runoff,
    };
  }

  /** Comprueba el PIN (con límite de intentos). Devuelve un error o null si es correcto. */
  async function checkPin(voterId: number, pin: unknown): Promise<LoginResult | null> {
    const voter = await store.getVoter(voterId);
    if (!voter?.pinHash) {
      return { ok: false, code: "not_ready", message: "La votación aún no está preparada (faltan los PINs)." };
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
        return { ok: false, code: "locked", message: lockMessage(f.lockedUntil), lockedUntil: f.lockedUntil.toISOString() };
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
    return null;
  }

  async function login(voterId: unknown, pin: unknown): Promise<LoginResult> {
    if (!isParticipantId(voterId)) {
      return { ok: false, code: "invalid", message: "Votante desconocido." };
    }
    const name = participantName(voterId);
    const s = await status();
    const me = s.voters.find((v) => v.id === voterId)!;

    // Segunda vuelta en curso
    if (s.runoff && !s.runoff.complete) {
      if (!s.runoff.eligibleIds.includes(voterId)) {
        return { ok: false, code: "already_voted", message: `${name} estuvo ausente y no vota en la segunda vuelta.` };
      }
      if (s.runoff.votedIds.includes(voterId)) {
        return { ok: false, code: "already_voted", message: `${name} ya ha votado en la segunda vuelta.` };
      }
      const err = await checkPin(voterId, pin);
      return err ?? { ok: true, voterId, name, mode: "runoff" };
    }

    if (me.hasVoted) {
      return {
        ok: false,
        code: "already_voted",
        message: me.blank
          ? `${name} está marcado como ausente (voto en blanco). Habla con el administrador.`
          : `${name} ya ha votado. La papeleta no se puede cambiar.`,
      };
    }
    if (!s.votingOpen) {
      if (s.opensAt && now() < new Date(s.opensAt)) {
        return { ok: false, code: "not_open", message: `La votación abre el ${formatSpanishDate(s.opensAt)}.` };
      }
      return { ok: false, code: "closed", message: "La votación ya está cerrada." };
    }
    const err = await checkPin(voterId, pin);
    return err ?? { ok: true, voterId, name, mode: "main" };
  }

  /** Se llama solo con un votante ya autenticado (sesión firmada). */
  async function vote(voterId: number, input: unknown): Promise<VoteResult> {
    if (!isParticipantId(voterId)) return { ok: false, code: "invalid", message: "Votante desconocido." };
    if (!isOpen(await store.getSettings())) {
      return { ok: false, code: "closed", message: "La votación no está abierta ahora mismo." };
    }
    const check = validateBallot(voterId, input);
    if (!check.ok) return { ok: false, code: "invalid_ballot", message: check.error };

    const res = await store.castVote(voterId, check.ballot);
    if (res === "already_voted") {
      return { ok: false, code: "already_voted", message: "Ya has votado. La papeleta no se puede cambiar." };
    }
    return { ok: true };
  }

  /** Voto de segunda vuelta: un único candidato de entre los empatados. */
  async function runoffVote(voterId: number, candidateId: unknown): Promise<VoteResult> {
    if (!isParticipantId(voterId)) return { ok: false, code: "invalid", message: "Votante desconocido." };
    const s = await status();
    const r = s.runoff;
    if (!r || r.complete) return { ok: false, code: "no_runoff", message: "No hay ninguna segunda vuelta abierta." };
    if (!r.eligibleIds.includes(voterId)) {
      return { ok: false, code: "not_eligible", message: "No puedes votar en esta segunda vuelta." };
    }
    if (!isParticipantId(candidateId) || !r.candidates.some((c) => c.id === candidateId)) {
      return { ok: false, code: "invalid_ballot", message: "Tienes que elegir a uno de los empatados." };
    }
    if (candidateId === voterId) return { ok: false, code: "invalid_ballot", message: "No puedes votarte a ti mismo." };
    const res = await store.castRunoffVote(voterId, candidateId);
    if (res === "already_voted") {
      return { ok: false, code: "already_voted", message: "Ya has votado en la segunda vuelta." };
    }
    return { ok: true };
  }

  /** Admin: un ausente cuenta como voto en blanco (participa; da +1 al más votado en el recuento). */
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
    if ((await store.getSettings()).revealedAt) {
      return { ok: false, code: "revealed", message: "La urna ya está abierta: no se pueden cambiar los ausentes." };
    }
    const res = await store.undoBlank(voterId);
    if (res === "not_blank") {
      return { ok: false, code: "not_blank", message: `${participantName(voterId)} no estaba marcado en blanco.` };
    }
    return { ok: true };
  }

  async function firstRoundStandings(s: ElectionStatus): Promise<Standing[]> {
    return tally(PARTICIPANTS, await store.getBallots(), s.blankCount);
  }

  /**
   * Resultados. Nunca devuelve puntos hasta que hayan votado (o estén en blanco)
   * los 10 Y el admin haya abierto la urna.
   */
  async function results(): Promise<ResultsResponse> {
    const s = await status();
    if (!s.complete) return { complete: false, revealed: false, status: s };
    if (!s.revealedAt) return { complete: true, revealed: false, status: s };

    let standings = await firstRoundStandings(s);
    let runoff: RunoffResult | null = null;
    if (s.runoff) {
      const ballots = await store.getRunoffBallots();
      const votes = new Map(s.runoff.candidates.map((c) => [c.id, 0]));
      for (const id of ballots) if (votes.has(id)) votes.set(id, votes.get(id)! + 1);
      runoff = {
        candidates: s.runoff.candidates.map((c) => ({ ...c, votes: votes.get(c.id) ?? 0 })),
        complete: s.runoff.complete,
        votedCount: s.runoff.votedIds.length,
        eligibleCount: s.runoff.eligibleIds.length,
      };
      // Los votos de la segunda vuelta no se muestran hasta que termine.
      if (s.runoff.complete) standings = applyRunoff(standings, votes);
      else runoff.candidates = runoff.candidates.map((c) => ({ ...c, votes: 0 }));
    }
    return { complete: true, revealed: true, status: s, standings, runoff };
  }

  // ------------------------------ Admin ------------------------------

  /** Abre la urna para todos: el revelado arranca a la vez dentro de `leadMs`. */
  async function reveal(leadMs = REVEAL_LEAD_MS): Promise<VoteResult> {
    const s = await status();
    if (!s.complete) return { ok: false, code: "incomplete", message: "Aún faltan votos (o marcar ausentes)." };
    if (s.revealedAt) return { ok: false, code: "revealed", message: "La urna ya está abierta." };
    await store.updateSettings({ revealedAt: new Date(now().getTime() + leadMs) });
    return { ok: true };
  }

  async function setSchedule(opensAt: Date | null, closesAt: Date | null): Promise<VoteResult> {
    if (opensAt && isNaN(opensAt.getTime())) return { ok: false, code: "invalid", message: "Fecha de apertura no válida." };
    if (closesAt && isNaN(closesAt.getTime())) return { ok: false, code: "invalid", message: "Fecha de cierre no válida." };
    if (opensAt && closesAt && closesAt <= opensAt) {
      return { ok: false, code: "invalid", message: "El cierre tiene que ser posterior a la apertura." };
    }
    await store.updateSettings({ opensAt, closesAt });
    return { ok: true };
  }

  /** Empatados que irían a segunda vuelta (solo con la urna abierta). */
  async function runoffProposal(): Promise<{ id: number; name: string }[] | null> {
    const s = await status();
    if (!s.complete || !s.revealedAt || s.runoff) return null;
    const group = runoffGroup(await firstRoundStandings(s));
    return group?.map((g) => ({ id: g.id, name: g.name })) ?? null;
  }

  async function startRunoff(): Promise<VoteResult> {
    const proposal = await runoffProposal();
    if (!proposal) return { ok: false, code: "no_tie", message: "No hay ningún empate que desempatar." };
    await store.resetRunoff();
    await store.updateSettings({ runoffCandidates: proposal.map((p) => p.id), runoffClosed: false });
    return { ok: true };
  }

  async function closeRunoff(): Promise<VoteResult> {
    const s = await status();
    if (!s.runoff) return { ok: false, code: "no_runoff", message: "No hay segunda vuelta." };
    await store.updateSettings({ runoffClosed: true });
    return { ok: true };
  }

  async function cancelRunoff(): Promise<VoteResult> {
    await store.resetRunoff();
    await store.updateSettings({ runoffCandidates: null, runoffClosed: false });
    return { ok: true };
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
    runoffVote,
    markBlank,
    unmarkBlank,
    results,
    reveal,
    setSchedule,
    runoffProposal,
    startRunoff,
    closeRunoff,
    cancelRunoff,
    regeneratePins,
    reset: () => store.resetElection(),
    nameOf: participantName,
  };
}

export type Election = ReturnType<typeof createElection>;
