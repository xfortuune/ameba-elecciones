import { createClient } from "@supabase/supabase-js";
import type { Ballot } from "../tally";
import type { VoteStore } from "./types";

/**
 * Store sobre Supabase. Usa la service role key, así que SOLO puede
 * instanciarse en el servidor o en scripts locales.
 */
export function createSupabaseStore(url: string, serviceRoleKey: string): VoteStore {
  const db = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });

  const fail = (what: string, error: { message: string }): never => {
    throw new Error(`Supabase (${what}): ${error.message}`);
  };

  return {
    async getVoter(id) {
      const { data, error } = await db
        .from("voters")
        .select("id, name, pin_hash, failed_attempts, locked_until")
        .eq("id", id)
        .maybeSingle();
      if (error) fail("getVoter", error);
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        pinHash: data.pin_hash,
        failedAttempts: data.failed_attempts,
        lockedUntil: data.locked_until ? new Date(data.locked_until) : null,
      };
    },

    async getVotedIds() {
      const { data, error } = await db.from("participations").select("voter_id");
      if (error) fail("getVotedIds", error);
      return (data ?? []).map((r) => r.voter_id as number);
    },

    async getBlankIds() {
      const { data, error } = await db.from("participations").select("voter_id").eq("blank", true);
      if (error) fail("getBlankIds", error);
      return (data ?? []).map((r) => r.voter_id as number);
    },

    async castBlank(voterId) {
      const { error } = await db.rpc("cast_blank", { p_voter: voterId });
      if (error) {
        if (error.code === "23505") return "already_voted";
        fail("castBlank", error);
      }
      return "ok";
    },

    async undoBlank(voterId) {
      const { data, error } = await db.rpc("undo_blank", { p_voter: voterId });
      if (error) fail("undoBlank", error);
      return data === true ? "ok" : "not_blank";
    },

    async registerPinFailure(id, max, lockMinutes) {
      const { data, error } = await db.rpc("register_pin_failure", {
        p_voter: id,
        p_max: max,
        p_lock_minutes: lockMinutes,
      });
      if (error) fail("registerPinFailure", error);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        failedAttempts: row?.attempts ?? 0,
        lockedUntil: row?.lock_until ? new Date(row.lock_until) : null,
      };
    },

    async clearPinFailures(id) {
      const { error } = await db
        .from("voters")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("id", id);
      if (error) fail("clearPinFailures", error);
    },

    async castVote(voterId, ballot) {
      const { error } = await db.rpc("cast_vote", {
        p_voter: voterId,
        p_first: ballot.first,
        p_second: ballot.second,
        p_third: ballot.third,
      });
      if (error) {
        if (error.code === "23505") return "already_voted"; // UNIQUE: ya había votado
        fail("castVote", error);
      }
      return "ok";
    },

    async getSettings() {
      const { data, error } = await db
        .from("election_settings")
        .select("opens_at, closes_at, revealed_at, runoff_candidates, runoff_closed")
        .eq("id", 1)
        .maybeSingle();
      if (error) fail("getSettings", error);
      const d = (data ?? {}) as Record<string, unknown>;
      const date = (v: unknown) => (typeof v === "string" ? new Date(v) : null);
      return {
        opensAt: date(d.opens_at),
        closesAt: date(d.closes_at),
        revealedAt: date(d.revealed_at),
        runoffCandidates: Array.isArray(d.runoff_candidates) ? (d.runoff_candidates as number[]) : null,
        runoffClosed: d.runoff_closed === true,
      };
    },

    async updateSettings(patch) {
      const row: Record<string, unknown> = { id: 1 };
      const iso = (v: Date | null) => (v ? v.toISOString() : null);
      if ("opensAt" in patch) row.opens_at = iso(patch.opensAt ?? null);
      if ("closesAt" in patch) row.closes_at = iso(patch.closesAt ?? null);
      if ("revealedAt" in patch) row.revealed_at = iso(patch.revealedAt ?? null);
      if ("runoffCandidates" in patch) row.runoff_candidates = patch.runoffCandidates ?? null;
      if ("runoffClosed" in patch) row.runoff_closed = patch.runoffClosed ?? false;
      const { error } = await db.from("election_settings").upsert(row, { onConflict: "id" });
      if (error) fail("updateSettings", error);
    },

    async getRunoffVotedIds() {
      const { data, error } = await db.from("runoff_participations").select("voter_id");
      if (error) fail("getRunoffVotedIds", error);
      return (data ?? []).map((r) => r.voter_id as number);
    },

    async castRunoffVote(voterId, candidateId) {
      const { error } = await db.rpc("cast_runoff_vote", { p_voter: voterId, p_candidate: candidateId });
      if (error) {
        if (error.code === "23505") return "already_voted";
        fail("castRunoffVote", error);
      }
      return "ok";
    },

    async getRunoffBallots() {
      const { data, error } = await db.from("runoff_ballots").select("candidate_id");
      if (error) fail("getRunoffBallots", error);
      return (data ?? []).map((r) => r.candidate_id as number);
    },

    async resetRunoff() {
      const { error } = await db.rpc("reset_runoff");
      if (error) fail("resetRunoff", error);
    },

    async getBallots(): Promise<Ballot[]> {
      const { data, error } = await db.from("ballots").select("first_id, second_id, third_id");
      if (error) fail("getBallots", error);
      return (data ?? []).map((r) => ({ first: r.first_id, second: r.second_id, third: r.third_id }));
    },

    async resetElection() {
      const { error } = await db.rpc("reset_election");
      if (error) fail("resetElection", error);
    },

    async upsertVoters(list) {
      const { error } = await db.from("voters").upsert(
        list.map((v) => ({
          id: v.id,
          name: v.name,
          pin_hash: v.pinHash,
          failed_attempts: 0,
          locked_until: null,
        })),
        { onConflict: "id" },
      );
      if (error) fail("upsertVoters", error);
    },
  };
}
