import "server-only";
import { createElection, type Election } from "../election";
import { createMemoryStore } from "../store/memory";
import { createSupabaseStore } from "../store/supabase";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Revisa el README.`);
  return value;
}

const g = globalThis as unknown as { __amebaElection?: Election };

/** Instancia única de la votación, conectada a Supabase con la service role key. */
export function getElection(): Election {
  if (g.__amebaElection) return g.__amebaElection;

  // Solo para probar en local sin Supabase. Nunca se activa en producción.
  if (process.env.NODE_ENV !== "production" && process.env.USE_MEMORY_STORE === "1") {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    g.__amebaElection = election;
    election.regeneratePins().then(async (pins) => {
      console.log("\n[USE_MEMORY_STORE] BD en memoria. PINs de prueba:");
      for (const p of pins) console.log(`  ${p.name}: ${p.pin}`);
      if (process.env.MEMORY_STORE_SEED === "1") {
        const { SCENARIO } = await import("../simulation");
        for (const { voter, ballot } of SCENARIO) await election.vote(voter, ballot);
        console.log("[USE_MEMORY_STORE] Precargados los 10 votos de prueba.");
      }
      if (process.env.MEMORY_STORE_SEED === "empate") {
        // Fortune (1) y Adrian (2) empatan en todo en el 1º → permite probar la segunda vuelta
        await election.vote(1, { first: 3, second: 4, third: 5 });
        await election.vote(2, { first: 3, second: 4, third: 5 });
        for (const v of [3, 4, 5, 6, 7, 8, 9, 10]) {
          const third = v === 3 ? 4 : 3;
          await election.vote(v, v % 2 === 0 ? { first: 1, second: 2, third } : { first: 2, second: 1, third });
        }
        console.log("[USE_MEMORY_STORE] Precargados 10 votos con empate en el 1º puesto.");
      }
    });
    return election;
  }

  g.__amebaElection = createElection(
    createSupabaseStore(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY")),
  );
  return g.__amebaElection;
}
