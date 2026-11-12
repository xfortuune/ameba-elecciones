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
      await db.exec("reset role");
    }
  });
});
