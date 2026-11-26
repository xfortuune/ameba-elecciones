import type { Ballot } from "../tally";
import type { PinFailure, VoteStore, VoterRecord } from "./types";

/** Implementación en memoria con la misma semántica que el SQL. Para tests. */
export function createMemoryStore(now: () => Date = () => new Date()): VoteStore {
  const voters = new Map<number, VoterRecord>();
  const voted = new Set<number>();
  const blank = new Set<number>();
  let ballots: Ballot[] = [];

  return {
    async getVoter(id) {
      const v = voters.get(id);
      return v ? { ...v } : null;
    },
    async getVotedIds() {
      return [...voted];
    },
    async getBlankIds() {
      return [...blank];
    },
    async castBlank(voterId) {
      if (voted.has(voterId)) return "already_voted";
      voted.add(voterId);
      blank.add(voterId);
      return "ok";
    },
    async undoBlank(voterId) {
      if (!blank.has(voterId)) return "not_blank";
      blank.delete(voterId);
      voted.delete(voterId);
      return "ok";
    },
    async registerPinFailure(id, max, lockMinutes): Promise<PinFailure> {
      const v = voters.get(id);
      if (!v) return { failedAttempts: 0, lockedUntil: null };
      if (v.lockedUntil && v.lockedUntil <= now()) {
        v.failedAttempts = 0;
        v.lockedUntil = null;
      }
      v.failedAttempts += 1;
      if (v.failedAttempts >= max) {
        v.failedAttempts = 0;
        v.lockedUntil = new Date(now().getTime() + lockMinutes * 60_000);
      }
      return { failedAttempts: v.failedAttempts, lockedUntil: v.lockedUntil };
    },
    async clearPinFailures(id) {
      const v = voters.get(id);
      if (v) {
        v.failedAttempts = 0;
        v.lockedUntil = null;
      }
    },
    async castVote(voterId, ballot) {
      if ([ballot.first, ballot.second, ballot.third].includes(voterId)) {
        throw new Error("SELF_VOTE");
      }
      if (voted.has(voterId)) return "already_voted";
      voted.add(voterId);
      ballots.push({ ...ballot });
      return "ok";
    },
    async getBallots() {
      return ballots.map((b) => ({ ...b }));
    },
    async resetElection() {
      voted.clear();
      blank.clear();
      ballots = [];
      for (const v of voters.values()) {
        v.failedAttempts = 0;
        v.lockedUntil = null;
      }
    },
    async upsertVoters(list) {
      for (const { id, name, pinHash } of list) {
        voters.set(id, { id, name, pinHash, failedAttempts: 0, lockedUntil: null });
      }
    },
  };
}
