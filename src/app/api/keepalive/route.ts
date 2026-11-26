import { connection } from "next/server";
import { getElection } from "@/lib/server/election";

/**
 * Lo llama el cron diario de Vercel (vercel.json) para que el proyecto
 * gratuito de Supabase no se pause por inactividad (se pausa a los 7 días).
 * Si defines CRON_SECRET en Vercel, solo acepta las llamadas del propio cron.
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const status = await getElection().status();
  return Response.json(
    { ok: true, votedCount: status.votedCount, at: status.serverNow },
    { headers: { "Cache-Control": "no-store" } },
  );
}
