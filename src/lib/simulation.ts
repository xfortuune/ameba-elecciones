import { MAX_PIN_ATTEMPTS, type Election } from "./election";
import { PARTICIPANTS } from "./participants";
import type { Ballot } from "./tally";

/**
 * Escenario de prueba con los 10 votos, pensado para ejercitar todos los desempates.
 * IDs: 1 Fortune, 2 Adrian, 3 Ach, 4 Kike, 5 Fernando, 6 Bruno, 7 Valentin, 8 Alvarico, 9 Fugonazo, 10 Luis
 */
export const SCENARIO: { voter: number; ballot: Ballot }[] = [
  { voter: 1, ballot: { first: 4, second: 6, third: 3 } },
  { voter: 2, ballot: { first: 4, second: 3, third: 5 } },
  { voter: 3, ballot: { first: 4, second: 6, third: 2 } },
  { voter: 4, ballot: { first: 6, second: 3, third: 7 } },
  { voter: 5, ballot: { first: 4, second: 3, third: 2 } },
  { voter: 6, ballot: { first: 4, second: 10, third: 7 } },
  { voter: 7, ballot: { first: 6, second: 10, third: 8 } },
  { voter: 8, ballot: { first: 3, second: 2, third: 5 } },
  { voter: 9, ballot: { first: 10, second: 5, third: 8 } },
  { voter: 10, ballot: { first: 2, second: 7, third: 9 } },
];

/**
 * Resultado esperado (calculado a mano):
 * - Kike 15 → 1º
 * - Bruno 10 y Ach 10 empatan a puntos → Bruno gana por votos de 3 (2 vs 1)
 * - Luis 7 y Adrian 7 empatan a puntos y a votos de 3 → Luis gana por votos de 2 (2 vs 1)
 * - Fernando 4 y Valentin 4 empatan en todo → comparten el 6º puesto
 */
export const EXPECTED = [
  { name: "Kike", position: 1, points: 15, threes: 5, twos: 0, ones: 0, tied: false },
  { name: "Bruno", position: 2, points: 10, threes: 2, twos: 2, ones: 0, tied: false },
  { name: "Ach", position: 3, points: 10, threes: 1, twos: 3, ones: 1, tied: false },
  { name: "Luis", position: 4, points: 7, threes: 1, twos: 2, ones: 0, tied: false },
  { name: "Adrian", position: 5, points: 7, threes: 1, twos: 1, ones: 2, tied: false },
  { name: "Fernando", position: 6, points: 4, threes: 0, twos: 1, ones: 2, tied: true },
  { name: "Valentin", position: 6, points: 4, threes: 0, twos: 1, ones: 2, tied: true },
  { name: "Alvarico", position: 8, points: 2, threes: 0, twos: 0, ones: 2, tied: false },
  { name: "Fugonazo", position: 9, points: 1, threes: 0, twos: 0, ones: 1, tied: false },
  { name: "Fortune", position: 10, points: 0, threes: 0, twos: 0, ones: 0, tied: false },
];

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`❌ ${msg}`);
}

/**
 * Ejecuta el flujo completo contra cualquier store (memoria o Supabase):
 * PINs, límite de intentos, votos inválidos, doble voto, resultados ocultos
 * hasta el 10º voto y recuento final con desempates.
 * Deja la BD limpia al terminar (votos borrados).
 */
export async function runSimulation(election: Election, log: (msg: string) => void = () => {}) {
  try {
    await election.reset();
    const pins = new Map((await election.regeneratePins()).map((p) => [p.id, p.pin]));
    assert(pins.size === PARTICIPANTS.length, "Debe haber un PIN por participante");
    log("✓ PINs generados (solo se guarda el hash)");

    // --- Límite de intentos de PIN ---
    const target = 1;
    const wrongPin = pins.get(target) === "0000" ? "1111" : "0000";
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
      const r = await election.login(target, wrongPin);
      assert(!r.ok && r.code === "wrong_pin", `Intento fallido ${i} debe dar wrong_pin`);
      assert(r.remaining === MAX_PIN_ATTEMPTS - i, `Deben quedar ${MAX_PIN_ATTEMPTS - i} intentos`);
    }
    const locked = await election.login(target, wrongPin);
    assert(!locked.ok && locked.code === "locked", "El 5º fallo debe bloquear el nombre");
    const lockedEvenWithRightPin = await election.login(target, pins.get(target));
    assert(!lockedEvenWithRightPin.ok && lockedEvenWithRightPin.code === "locked", "Bloqueado incluso con el PIN correcto");
    await election.reset(); // el reset del admin desbloquea
    log(`✓ ${MAX_PIN_ATTEMPTS} fallos de PIN → bloqueo; el reset lo desbloquea`);

    const bad = await election.login(2, "12a4");
    assert(!bad.ok, "Un PIN con formato inválido no entra");

    // --- Horario de votación ---
    const t = Date.now();
    await election.setSchedule(new Date(t + 3_600_000), null);
    const early = await election.login(2, pins.get(2));
    assert(!early.ok && early.code === "not_open", "Antes de la apertura no se puede entrar");
    await election.setSchedule(new Date(t - 7_200_000), new Date(t - 3_600_000));
    const late = await election.login(2, pins.get(2));
    assert(!late.ok && late.code === "closed", "Después del cierre no se puede entrar");
    await election.setSchedule(null, null);
    log("✓ Horario de votación respetado (antes de abrir y después de cerrar)");

    // --- Votos inválidos ---
    const v = 2;
    const invalids: [string, unknown][] = [
      ["autovoto", { first: v, second: 3, third: 4 }],
      ["repetido", { first: 3, second: 3, third: 4 }],
      ["incompleto", { first: 3, second: 4 }],
      ["candidato inexistente", { first: 3, second: 4, third: 99 }],
      ["tipos raros", { first: "3", second: 4, third: 5 }],
      ["basura", null],
    ];
    for (const [label, ballot] of invalids) {
      const r = await election.vote(v, ballot);
      assert(!r.ok, `Papeleta inválida (${label}) debe rechazarse`);
    }
    assert((await election.status()).votedCount === 0, "Ninguna papeleta inválida debe contar");
    log("✓ Papeletas inválidas rechazadas (autovoto, repetidos, incompletas, inexistentes)");

    // --- Los 10 votos ---
    for (const [i, { voter, ballot }] of SCENARIO.entries()) {
      const login = await election.login(voter, pins.get(voter));
      assert(login.ok, `Login de ${voter} con su PIN debe funcionar`);

      const before = await election.results();
      assert(!before.complete && !("standings" in before), "No hay resultados antes del 10º voto");

      const r = await election.vote(voter, ballot);
      assert(r.ok, `El voto de ${voter} debe aceptarse`);

      const again = await election.vote(voter, { first: ballot.third, second: ballot.second, third: ballot.first });
      assert(!again.ok && again.code === "already_voted", `El voto repetido de ${voter} debe rechazarse`);

      const relogin = await election.login(voter, pins.get(voter));
      assert(!relogin.ok && relogin.code === "already_voted", `${voter} no puede volver a entrar`);

      const status = await election.status();
      assert(status.votedCount === i + 1, `Progreso debe ser ${i + 1}/10`);
    }
    log("✓ 10 votos emitidos; dobles votos y re-entradas bloqueados; resultados ocultos hasta el final");

    // --- La urna sigue cerrada hasta que el admin la abre ---
    const closed = await election.results();
    assert(closed.complete && !closed.revealed && !("standings" in closed), "Sin abrir la urna no hay resultados");
    assert((await election.reveal(0)).ok, "El admin abre la urna");
    assert(!(await election.reveal(0)).ok, "La urna no se abre dos veces");
    log("✓ Resultados ocultos hasta que el admin abre la urna");

    // --- Recuento ---
    const res = await election.results();
    assert(res.complete && res.revealed, "Con 10 votos y la urna abierta, hay resultados");
    const got = res.standings.map(({ name, position, points, threes, twos, ones, tied }) => ({
      name, position, points, threes, twos, ones, tied,
    }));
    assert(JSON.stringify(got) === JSON.stringify(EXPECTED), `Recuento inesperado:\n${JSON.stringify(got, null, 2)}`);
    log("✓ Recuento correcto, incluidos los 3 tipos de desempate");

    return res.standings;
  } finally {
    await election.reset();
    log("✓ BD limpia: votos borrados");
  }
}
