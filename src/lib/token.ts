import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Tokens firmados con HMAC-SHA256: `payload.expiraciónMs.firma`. Sin dependencias. */

function sign(key: string, data: string): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createToken(key: string, payload: string, ttlMs: number, now = Date.now()): string {
  if (payload.includes(".")) throw new Error("payload no puede contener '.'");
  const data = `${payload}.${now + ttlMs}`;
  return `${data}.${sign(key, data)}`;
}

/** Devuelve el payload si la firma es válida y no ha caducado; si no, null. */
export function readToken(key: string, token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [payload, exp, mac] = parts;
  if (!safeEqual(mac, sign(key, `${payload}.${exp}`))) return null;
  if (!(Number(exp) > now)) return null;
  return payload;
}
