"use server";

import { refresh } from "next/cache";
import { getElection } from "@/lib/server/election";
import { checkAdminPassword, endAdminSession, isAdmin, startAdminSession } from "@/lib/server/session";

export type AdminLoginState = { error?: string };

export async function adminLoginAction(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  if (!checkAdminPassword(formData.get("password"))) {
    await new Promise((r) => setTimeout(r, 800)); // frena los intentos a lo bruto
    return { error: "Contraseña incorrecta." };
  }
  await startAdminSession();
  refresh();
  return {};
}

export async function adminLogoutAction(): Promise<void> {
  await endAdminSession();
  refresh();
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("No autorizado.");
}

export async function resetElectionAction(): Promise<{ ok: true }> {
  await requireAdmin();
  await getElection().reset();
  refresh();
  return { ok: true };
}

/** Devuelve los PINs nuevos en claro UNA sola vez; en la BD solo queda el hash. */
export async function regeneratePinsAction(): Promise<{ name: string; pin: string }[]> {
  await requireAdmin();
  const pins = await getElection().regeneratePins();
  refresh();
  return pins.map(({ name, pin }) => ({ name, pin }));
}

/** Marca a un ausente como voto en blanco (+1 punto al más votado). */
export async function markBlankAction(voterId: number): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const res = await getElection().markBlank(voterId);
  refresh();
  return res.ok ? { ok: true } : { ok: false, message: res.message };
}

/** Deshace un voto en blanco. */
export async function unmarkBlankAction(voterId: number): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const res = await getElection().unmarkBlank(voterId);
  refresh();
  return res.ok ? { ok: true } : { ok: false, message: res.message };
}

type ActionResult = { ok: boolean; message?: string };
const toResult = (r: { ok: boolean; message?: string }): ActionResult =>
  r.ok ? { ok: true } : { ok: false, message: r.message };

/** Abre la urna para todos: el revelado arranca a la vez en todos los dispositivos. */
export async function revealAction(): Promise<ActionResult> {
  await requireAdmin();
  const res = await getElection().reveal();
  refresh();
  return toResult(res);
}

/** Horario de votación. Fechas en ISO (UTC) o null para quitar el límite. */
export async function setScheduleAction(opensAt: string | null, closesAt: string | null): Promise<ActionResult> {
  await requireAdmin();
  const res = await getElection().setSchedule(opensAt ? new Date(opensAt) : null, closesAt ? new Date(closesAt) : null);
  refresh();
  return toResult(res);
}

export async function startRunoffAction(): Promise<ActionResult> {
  await requireAdmin();
  const res = await getElection().startRunoff();
  refresh();
  return toResult(res);
}

export async function closeRunoffAction(): Promise<ActionResult> {
  await requireAdmin();
  const res = await getElection().closeRunoff();
  refresh();
  return toResult(res);
}

export async function cancelRunoffAction(): Promise<ActionResult> {
  await requireAdmin();
  const res = await getElection().cancelRunoff();
  refresh();
  return toResult(res);
}
