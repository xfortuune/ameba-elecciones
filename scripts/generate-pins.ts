/**
 * npm run generate-pins
 * Genera un PIN aleatorio de 4 dígitos por persona, guarda SOLO el hash en
 * Supabase y muestra la lista nombre → PIN para repartirla por privado.
 * Si se vuelve a ejecutar, los PINs anteriores dejan de valer.
 */
import { createElection } from "../src/lib/election";
import { createSupabaseStore } from "../src/lib/store/supabase";
import { loadSupabaseEnv } from "./_env";

async function main() {
  const { url, key } = loadSupabaseEnv();
  const election = createElection(createSupabaseStore(url, key));

  const pins = await election.regeneratePins();
  const width = Math.max(...pins.map((p) => p.name.length));

  console.log("\n  AMEBA CITY · PINs de votación (repártelos por privado)\n");
  for (const p of pins) console.log(`  ${p.name.padEnd(width)}  →  ${p.pin}`);
  console.log("\n  En la base de datos solo se ha guardado el hash de cada PIN.");
  console.log("  Esta lista NO se puede recuperar: cópiala ahora.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
