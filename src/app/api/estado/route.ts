import { connection } from "next/server";
import { getElection } from "@/lib/server/election";

/** Progreso público: cuántos han votado y quiénes. Nunca incluye votos. */
export async function GET() {
  await connection();
  const status = await getElection().status();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
