"use server";

import type { LoginResult, VoteResult } from "@/lib/election";
import { getElection } from "@/lib/server/election";
import { endVoterSession, getVoterSession, startVoterSession } from "@/lib/server/session";

/** Paso 1: comprobar el PIN. Si es correcto, abre una sesión firmada de 20 min. */
export async function loginAction(voterId: unknown, pin: unknown): Promise<LoginResult> {
  const result = await getElection().login(voterId, pin);
  if (result.ok) await startVoterSession(result.voterId);
  return result;
}

/** Paso 2: depositar la papeleta. El votante sale de la cookie firmada, nunca del cliente. */
export async function submitVoteAction(ballot: unknown): Promise<VoteResult> {
  const voterId = await getVoterSession();
  if (voterId === null) {
    return { ok: false, code: "no_session", message: "Tu sesión ha caducado. Vuelve a meter tu PIN." };
  }
  const result = await getElection().vote(voterId, ballot);
  if (result.ok || result.code === "already_voted") await endVoterSession();
  return result;
}

export async function cancelVoterSessionAction(): Promise<void> {
  await endVoterSession();
}
