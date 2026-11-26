/**
 * Ejecuta supabase/schema.sql en un Postgres real embebido (PGlite) y
 * pasa la simulación completa por las funciones SQL de verdad.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { createElection } from "@/lib/election";
import { runSimulation } from "@/lib/simulation";
import type { VoteStore } from "@/lib/store/types";

let db: PGlite;

function pgliteStore(pg: PGlite): VoteStore {
  return {
    async getVoter(id) {
      const { rows } = await pg.query<{ id: number; name: string; pin_hash: string | null; failed_attempts: number; locked_until: Date | null }>(
        "select * from voters where id = $1",
        [id],
      );
      const r = rows[0];
      return r
        ? { id: r.id, name: r.name, pinHash: r.pin_hash, failedAttempts: r.failed_attempts, lockedUntil: r.locked_until }
        : null;
    },
    async getVotedIds() {
      return (await pg.query<{ voter_id: number }>("select voter_id from participations")).rows.map((r) => r.voter_id);
    },
    async getBlankIds() {
      return (await pg.query<{ voter_id: number }>("select voter_id from participations where blank")).rows.map((r) => r.voter_id);
    },
    async castBlank(voter) {
      try {
        await pg.query("select cast_blank($1)", [voter]);
        return "ok";
      } catch (e) {
        if ((e as { code?: string }).code === "23505") return "already_voted";
        throw e;
      }
    },
    async undoBlank(voter) {
      const { rows } = await pg.query<{ undone: boolean }>("select undo_blank($1) as undone", [voter]);
      return rows[0].undone ? "ok" : "not_blank";
    },
    async getSettings() {
      const { rows } = await pg.query<{
        opens_at: Date | null;
        closes_at: Date | null;
        revealed_at: Date | null;
        runoff_candidates: number[] | null;
        runoff_closed: boolean;
      }>("select * from election_settings where id = 1");
      const r = rows[0];
      return {
        opensAt: r.opens_at,
        closesAt: r.closes_at,
        revealedAt: r.revealed_at,
        runoffCandidates: r.runoff_candidates,
        runoffClosed: r.runoff_closed,
      };
    },
    async updateSettings(patch) {
      const cols: Record<string, unknown> = {};
      if ("opensAt" in patch) cols.opens_at = patch.opensAt;
      if ("closesAt" in patch) cols.closes_at = patch.closesAt;
      if ("revealedAt" in patch) cols.revealed_at = patch.revealedAt;
      if ("runoffCandidates" in patch) cols.runoff_candidates = patch.runoffCandidates;
      if ("runoffClosed" in patch) cols.runoff_closed = patch.runoffClosed;
      const keys = Object.keys(cols);
      if (!keys.length) return;
      await pg.query(
        `update election_settings set ${keys.map((k, i) => `${k} = $${i + 1}`).join(", ")} where id = 1`,
        keys.map((k) => cols[k]),
      );
    },
    async getRunoffVotedIds() {
      return (await pg.query<{ voter_id: number }>("select voter_id from runoff_participations")).rows.map((r) => r.voter_id);
    },
    async castRunoffVote(voter, candidate) {
      try {
        await pg.query("select cast_runoff_vote($1, $2)", [voter, candidate]);
        return "ok";
      } catch (e) {
        if ((e as { code?: string }).code === "23505") return "already_voted";
        throw e;
      }
    },
    async getRunoffBallots() {
      return (await pg.query<{ candidate_id: number }>("select candidate_id from runoff_ballots")).rows.map((r) => r.candidate_id);
    },
    async resetRunoff() {
      await pg.query("select reset_runoff()");
    },
    async registerPinFailure(id, max, mins) {
      const { rows } = await pg.query<{ attempts: number; lock_until: Date | null }>(
        "select * from register_pin_failure($1, $2, $3)",
        [id, max, mins],
      );
      return { failedAttempts: rows[0]?.attempts ?? 0, lockedUntil: rows[0]?.lock_until ?? null };
    },
    async clearPinFailures(id) {
      await pg.query("update voters set failed_attempts = 0, locked_until = null where id = $1", [id]);
    },
    async castVote(voter, b) {
      try {
        await pg.query("select cast_vote($1, $2, $3, $4)", [voter, b.first, b.second, b.third]);
        return "ok";
      } catch (e) {
        if ((e as { code?: string }).code === "23505") return "already_voted";
        throw e;
      }
    },
    async getBallots() {
      const { rows } = await pg.query<{ first_id: number; second_id: number; third_id: number }>("select * from ballots");
      return rows.map((r) => ({ first: r.first_id, second: r.second_id, third: r.third_id }));
    },
    async resetElection() {
      await pg.query("select reset_election()");
    },
    async upsertVoters(list) {
      for (const v of list) {
        await pg.query(
          `insert into voters (id, name, pin_hash) values ($1, $2, $3)
           on conflict (id) do update set name = excluded.name, pin_hash = excluded.pin_hash,
             failed_attempts = 0, locked_until = null`,
          [v.id, v.name, v.pinHash],
        );
      }
    },
  };
}

beforeAll(async () => {
  db = new PGlite();
  // Roles que existen en Supabase
  await db.exec("create role anon; create role authenticated; create role service_role;");
  const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  await db.exec(schema);
  await db.exec(schema); // debe poder re-ejecutarse sin errores
});

describe("schema.sql en Postgres", () => {
  it("pasa la simulación completa con las funciones SQL reales", async () => {
    const election = createElection(pgliteStore(db), { pinRounds: 4 });
    await runSimulation(election);
    const counts = await db.query<{ b: number; p: number }>(
      "select (select count(*)::int from ballots) b, (select count(*)::int from participations) p",
    );
    expect(counts.rows[0]).toEqual({ b: 0, p: 0 });
  });

  it("la BD impide el autovoto, los repetidos y el doble voto aunque se salte la app", async () => {
    await db.query("select reset_election()");
    await expect(db.query("select cast_vote(1::smallint, 1::smallint, 2::smallint, 3::smallint)")).rejects.toThrow(/SELF_VOTE/);
    await expect(db.query("insert into ballots (first_id, second_id, third_id) values (2, 2, 3)")).rejects.toThrow(/ballots_distinct/);
    await db.query("select cast_vote(1::smallint, 2::smallint, 3::smallint, 4::smallint)");
    await expect(db.query("select cast_vote(1::smallint, 5::smallint, 6::smallint, 7::smallint)")).rejects.toMatchObject({ code: "23505" });
    // el intento fallido no deja una papeleta huérfana
    expect((await db.query<{ n: number }>("select count(*)::int n from ballots")).rows[0].n).toBe(1);
    await db.query("select reset_election()");
  });

  it("voto en blanco: participa sin papeleta, bloquea votar y se puede deshacer", async () => {
    const election = createElection(pgliteStore(db), { pinRounds: 4 });
    await election.reset();
    const pins = new Map((await election.regeneratePins()).map((p) => [p.id, p.pin]));

    // Luis (10) no se presenta: voto en blanco
    expect(await election.markBlank(10)).toEqual({ ok: true });
    expect(await election.markBlank(10)).toMatchObject({ ok: false, code: "already_voted" });
    expect(await election.login(10, pins.get(10))).toMatchObject({ ok: false, code: "already_voted" });
    expect(await election.vote(10, { first: 1, second: 2, third: 3 })).toMatchObject({ ok: false, code: "already_voted" });

    // Deshacer y volver a marcar
    expect(await election.unmarkBlank(10)).toEqual({ ok: true });
    expect(await election.unmarkBlank(10)).toMatchObject({ ok: false, code: "not_blank" });
    expect(await election.markBlank(10)).toEqual({ ok: true });

    // Un voto real nunca se deshace ni se convierte en blanco
    expect(await election.vote(1, { first: 10, second: 2, third: 3 })).toEqual({ ok: true });
    expect(await election.unmarkBlank(1)).toMatchObject({ ok: false, code: "not_blank" });
    expect(await election.markBlank(1)).toMatchObject({ ok: false, code: "already_voted" });

    const s = await election.status();
    expect([s.votedCount, s.blankCount]).toEqual([2, 1]);
    expect((await db.query<{ n: number }>("select count(*)::int n from ballots")).rows[0].n).toBe(1);
    await election.reset();
    expect((await election.status()).blankCount).toBe(0);
  });

  it("segunda vuelta en SQL: solo empatados, sin autovoto, un voto por persona", async () => {
    await db.query("select reset_election()");
    await db.query("update election_settings set runoff_candidates = '{1,2}', runoff_closed = false where id = 1");
    await expect(db.query("select cast_runoff_vote(1::smallint, 1::smallint)")).rejects.toThrow(/SELF_VOTE/);
    await expect(db.query("select cast_runoff_vote(3::smallint, 4::smallint)")).rejects.toThrow(/NOT_IN_RUNOFF/);
    await db.query("select cast_runoff_vote(3::smallint, 1::smallint)");
    await expect(db.query("select cast_runoff_vote(3::smallint, 2::smallint)")).rejects.toMatchObject({ code: "23505" });
    await db.query("update election_settings set runoff_closed = true where id = 1");
    await expect(db.query("select cast_runoff_vote(4::smallint, 1::smallint)")).rejects.toThrow(/NOT_IN_RUNOFF/);
    const { rows } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'runoff_ballots' order by ordinal_position",
    );
    expect(rows.map((r) => r.column_name)).toEqual(["id", "candidate_id"]);
    await db.query("select reset_election()");
    const s = await db.query<{ runoff_candidates: number[] | null; revealed_at: Date | null }>(
      "select runoff_candidates, revealed_at from election_settings",
    );
    expect(s.rows[0]).toEqual({ runoff_candidates: null, revealed_at: null });
  });

  it("las papeletas no tienen ninguna columna que identifique al votante", async () => {
    const { rows } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'ballots' order by ordinal_position",
    );
    expect(rows.map((r) => r.column_name)).toEqual(["id", "first_id", "second_id", "third_id"]);
  });

  it("anon y authenticated no pueden leer las tablas ni ejecutar funciones", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query("select * from voters")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from ballots")).rejects.toThrow(/permission denied/);
      await expect(db.query("select reset_election()")).rejects.toThrow(/permission denied/);
      await expect(db.query("select cast_blank(1::smallint)")).rejects.toThrow(/permission denied/);
      await expect(db.query("select undo_blank(1::smallint)")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from election_settings")).rejects.toThrow(/permission denied/);
      await expect(db.query("select cast_runoff_vote(1::smallint, 2::smallint)")).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
  });
});
