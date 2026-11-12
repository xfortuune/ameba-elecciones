import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const ROUNDS = 10;

/** PIN aleatorio criptográficamente seguro de 4 dígitos (0000–9999). */
export function generatePin(): string {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

/** Genera PINs distintos entre sí para que nadie entre por error con el de otro. */
export function generateUniquePins(count: number): string[] {
  const pins = new Set<string>();
  while (pins.size < count) pins.add(generatePin());
  return [...pins];
}

export function isPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function hashPin(pin: string, rounds = ROUNDS): Promise<string> {
  return bcrypt.hash(pin, rounds);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
