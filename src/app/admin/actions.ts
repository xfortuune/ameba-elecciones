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
