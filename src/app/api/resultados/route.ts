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

  if (!res.complete) {
    return Response.json(
      {
        complete: false,
        message: "Los resultados se publican cuando hayan votado los 10.",
        votedCount: res.status.votedCount,
        total: res.status.total,
      },
      { status: 403, headers },
    );
  }
  return Response.json({ complete: true, standings: res.standings }, { headers });
}
