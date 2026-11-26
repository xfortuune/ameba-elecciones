import { connection } from "next/server";
import { getElection } from "@/lib/server/election";

/**
 * Resultados. Hasta que voten los 10 responde 403 con el progreso y
 * NINGÚN dato de puntos, aunque se llame a la API directamente.
 */
export async function GET() {
  await connection();
  const res = await getElection().results();
  const headers = { "Cache-Control": "no-store" };

  if (!res.revealed) {
    return Response.json(
      {
        complete: res.complete,
        revealed: false,
        message: res.complete
          ? "Están todos los votos: falta que la Junta Electoral abra la urna."
          : "Los resultados se publican cuando hayan votado los 10.",
        votedCount: res.status.votedCount,
        total: res.status.total,
      },
      { status: 403, headers },
    );
  }
  return Response.json(
    { complete: true, revealed: true, revealedAt: res.status.revealedAt, standings: res.standings, runoff: res.runoff },
    { headers },
  );
}
