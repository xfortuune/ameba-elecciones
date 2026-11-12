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
    });
    return election;
  }

  g.__amebaElection = createElection(
    createSupabaseStore(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY")),
  );
  return g.__amebaElection;
}
