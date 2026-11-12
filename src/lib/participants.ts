/** Los 10 miembros de AMEBA CITY. Todos votan y todos son candidatos. */
export const PARTICIPANTS = [
  { id: 1, name: "Fortune" },
  { id: 2, name: "Adrian" },
  { id: 3, name: "Ach" },
  { id: 4, name: "Kike" },
  { id: 5, name: "Fernando" },
  { id: 6, name: "Bruno" },
  { id: 7, name: "Valentin" },
  { id: 8, name: "Alvarico" },
  { id: 9, name: "Fugonazo" },
  { id: 10, name: "Luis" },
] as const;

export type Participant = { id: number; name: string };

export const TOTAL_VOTERS = PARTICIPANTS.length;

export function participantName(id: number): string {
  return PARTICIPANTS.find((p) => p.id === id)?.name ?? `#${id}`;
}

export function isParticipantId(id: unknown): id is number {
  return typeof id === "number" && PARTICIPANTS.some((p) => p.id === id);
}
