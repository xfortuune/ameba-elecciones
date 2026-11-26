import "server-only";
import { createHash } from "node:crypto";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { createToken, readToken, safeEqual } from "../token";

const VOTER_COOKIE = "ameba_voter";
const ADMIN_COOKIE = "ameba_admin";
const VOTER_TTL_MS = 20 * 60_000; // 20 min para rellenar la papeleta
const ADMIN_TTL_MS = 8 * 60 * 60_000; // 8 h

/** Clave de firma: SESSION_SECRET o, si no existe, derivada de la service role key. */
function secret(): string {
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Falta SESSION_SECRET (o SUPABASE_SERVICE_ROLE_KEY).");
  return createHash("sha256").update(`ameba-session:${base}`).digest("hex");
}

function adminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("Falta la variable de entorno ADMIN_PASSWORD.");
  return pw;
}

/** Si cambias ADMIN_PASSWORD, las sesiones de admin anteriores dejan de valer. */
function adminKey(): string {
  return createHash("sha256").update(`${secret()}:admin:${adminPassword()}`).digest("hex");
}

const cookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
});

// ---------- Votante ----------

export async function startVoterSession(voterId: number) {
  (await cookies()).set(VOTER_COOKIE, createToken(secret(), `v${voterId}`, VOTER_TTL_MS), cookieOptions(VOTER_TTL_MS));
}

export async function getVoterSession(): Promise<number | null> {
  const token = (await cookies()).get(VOTER_COOKIE)?.value;
  await io(); // lo que sigue (Date.now) nunca entra en un prerender
  const payload = readToken(secret(), token);
  const id = payload?.startsWith("v") ? Number(payload.slice(1)) : NaN;
  return Number.isInteger(id) ? id : null;
}

export async function endVoterSession() {
  (await cookies()).delete(VOTER_COOKIE);
}

// ---------- Admin ----------

export function checkAdminPassword(input: unknown): boolean {
  return typeof input === "string" && input.length > 0 && safeEqual(input, adminPassword());
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, createToken(adminKey(), "admin", ADMIN_TTL_MS), cookieOptions(ADMIN_TTL_MS));
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  await io(); // lo que sigue (Date.now) nunca entra en un prerender
  return readToken(adminKey(), token) === "admin";
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
