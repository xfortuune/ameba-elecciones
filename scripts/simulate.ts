/**
 * npm run simulate
 * Prueba de extremo a extremo contra TU Supabase: simula los 10 votos,
 * comprueba recuento y desempates y deja la BD limpia.
 * Ojo: cambia los PINs. Después ejecuta `npm run generate-pins`.
 */
import { createElection } from "../src/lib/election";
import { createSupabaseStore } from "../src/lib/store/supabase";
import { runSimulation } from "../src/lib/simulation";
import { loadSupabaseEnv } from "./_env";

async function main() {
  const { url, key } = loadSupabaseEnv();
  const election = createElection(createSupabaseStore(url, key));

  const status = await election.status();
  if (status.votedCount > 0 && !process.argv.includes("--force")) {
    console.error(
      `Ya hay ${status.votedCount} votos reales en la BD. La simulación los BORRARÍA.\n` +
        "Si de verdad quieres hacerlo: npm run simulate -- --force",
    );
    process.exit(1);
  }

  console.log("\nSimulando la votación completa contra Supabase…\n");
  const standings = await runSimulation(election, (m) => console.log("  " + m));

  console.log("\n  Clasificación simulada:");
  for (const s of standings) {
    console.log(
      `   ${String(s.position).padStart(2)}º ${s.name.padEnd(9)} ${String(s.points).padStart(2)} pts` +
        `  (3×${s.threes} 2×${s.twos} 1×${s.ones})${s.tied ? "  [empate]" : ""}`,
    );
  }
  console.log("\n✅ Todo correcto. Los PINs han cambiado: ejecuta ahora `npm run generate-pins`.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
