/**
 * Los 10 miembros de AMEBA CITY. Todos votan y todos son candidatos.
 * El ORDEN del array es el orden en que aparecen en pantalla.
 * Los "id" no se pueden cambiar: los usan la BD, los PINs y los votos.
 */
export const PARTICIPANTS = [
  { id: 1, name: "Fortune" },
  { id: 2, name: "Adrian" },
  { id: 3, name: "Ach" },
  { id: 4, name: "Kike" },
  { id: 6, name: "Bruno" },
  { id: 7, name: "Valentin" },
  { id: 8, name: "Alvarico" },
  { id: 10, name: "Luis" },
  { id: 9, name: "Fugonazo" },
  { id: 5, name: "Fernando" },
] as const;

export type Participant = { id: number; name: string };

export const TOTAL_VOTERS = PARTICIPANTS.length;

export function participantName(id: number): string {
  return PARTICIPANTS.find((p) => p.id === id)?.name ?? `#${id}`;
}

export function isParticipantId(id: unknown): id is number {
  return typeof id === "number" && PARTICIPANTS.some((p) => p.id === id);
}
