import { describe, expect, it } from "vitest";
import { LOCK_MINUTES, MAX_PIN_ATTEMPTS, createElection } from "@/lib/election";
import { PARTICIPANTS } from "@/lib/participants";
import { SCENARIO, runSimulation } from "@/lib/simulation";
import { tally } from "@/lib/tally";
import { createMemoryStore } from "@/lib/store/memory";
import { createToken, readToken } from "@/lib/token";

describe("flujo completo (store en memoria)", () => {
  it("simula los 10 votos, valida todo y deja la BD limpia", async () => {
    const store = createMemoryStore();
    const election = createElection(store, { pinRounds: 4 });
    const log: string[] = [];

    await runSimulation(election, (m) => log.push(m));

    expect(log.at(-1)).toContain("BD limpia");
    expect(await store.getBallots()).toEqual([]);
    expect(await store.getVotedIds()).toEqual([]);
  });

  it("el bloqueo por PIN caduca a los 10 minutos", async () => {
    let now = new Date("2026-11-12T20:00:00Z");
    const clock = () => now;
    const election = createElection(createMemoryStore(clock), { pinRounds: 4, now: clock });
    const pins = await election.regeneratePins();
    const fortune = pins.find((p) => p.name === "Fortune")!;
    const wrong = fortune.pin === "0000" ? "1111" : "0000";

    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) await election.login(fortune.id, wrong);
    expect((await election.login(fortune.id, fortune.pin)).ok).toBe(false);

    now = new Date(now.getTime() + (LOCK_MINUTES - 1) * 60_000);
    expect(await election.login(fortune.id, fortune.pin)).toMatchObject({ ok: false, code: "locked" });

    now = new Date(now.getTime() + 2 * 60_000);
    expect(await election.login(fortune.id, fortune.pin)).toMatchObject({ ok: true });
  });

  it("los resultados no exponen datos hasta el final", async () => {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    await election.regeneratePins();
    await election.vote(1, { first: 2, second: 3, third: 4 });
    const res = await election.results();
    expect(res.complete).toBe(false);
    expect(JSON.stringify(res)).not.toMatch(/points|standings|threes/);
  });

  it("con 9 votos y 1 en blanco se publican los resultados y el ausente da +1 al más votado", async () => {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    await election.regeneratePins();
    // Todos votan menos Luis (10); los votos de Luis del escenario no se emiten
    for (const { voter, ballot } of SCENARIO.filter((s) => s.voter !== 10)) {
      expect(await election.vote(voter, ballot)).toEqual({ ok: true });
    }
    expect((await election.results()).complete).toBe(false);

    expect(await election.markBlank(10)).toEqual({ ok: true });
    expect((await election.results()).revealed).toBe(false);
    await election.reveal(0);
    const res = await election.results();
    expect(res.complete).toBe(true);
    if (!res.revealed) throw new Error("debería estar revelado");
    expect(res.status.blankCount).toBe(1);

    const expected = tally(PARTICIPANTS, SCENARIO.filter((s) => s.voter !== 10).map((s) => s.ballot), 1);
    expect(res.standings).toEqual(expected);
    // Luis sigue siendo candidato: recibe los puntos que le dieron otros
    expect(res.standings.find((s) => s.name === "Luis")!.points).toBe(7);
    // Kike es el más votado (15) y recibe el punto del ausente
    expect(res.standings[0]).toMatchObject({ name: "Kike", points: 16, bonus: 1, threes: 5 });
    // Total: 9 papeletas × 6 puntos + 1 punto del ausente
    expect(res.standings.reduce((sum, s) => sum + s.points, 0)).toBe(55);
  });

  it("los PINs generados son de 4 dígitos y distintos entre sí", async () => {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    const pins = (await election.regeneratePins()).map((p) => p.pin);
    expect(pins).toHaveLength(10);
    expect(new Set(pins).size).toBe(10);
    expect(pins.every((p) => /^\d{4}$/.test(p))).toBe(true);
  });
});

describe("segunda vuelta", () => {
  /** Fortune (1) y Adrian (2) empatan en todo en el 1º puesto. */
  async function tiedElection() {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    const pins = new Map((await election.regeneratePins()).map((p) => [p.id, p.pin]));
    expect(await election.vote(1, { first: 3, second: 4, third: 5 })).toEqual({ ok: true });
    expect(await election.vote(2, { first: 3, second: 4, third: 5 })).toEqual({ ok: true });
    for (const v of [3, 4, 5, 6, 7, 8, 9, 10]) {
      const third = v === 3 ? 4 : 3;
      const ballot = v % 2 === 0 ? { first: 1, second: 2, third } : { first: 2, second: 1, third };
      expect(await election.vote(v, ballot)).toEqual({ ok: true });
    }
    return { election, pins };
  }

  it("detecta el empate en el 1º y la segunda vuelta lo resuelve", async () => {
    const { election, pins } = await tiedElection();
    expect(await election.runoffProposal()).toBeNull(); // urna aún cerrada
    expect(await election.startRunoff()).toMatchObject({ ok: false });
    await election.reveal(0);

    const before = await election.results();
    if (!before.revealed) throw new Error("revelado");
    expect(before.standings.filter((s) => s.position === 1).map((s) => s.name).sort()).toEqual(["Adrian", "Fortune"]);
    expect((await election.runoffProposal())?.map((c) => c.name).sort()).toEqual(["Adrian", "Fortune"]);
    expect(await election.startRunoff()).toEqual({ ok: true });

    // Login en modo segunda vuelta
    expect(await election.login(5, pins.get(5))).toMatchObject({ ok: true, mode: "runoff" });

    // Validaciones
    expect(await election.runoffVote(1, 1)).toMatchObject({ ok: false }); // a sí mismo
    expect(await election.runoffVote(3, 4)).toMatchObject({ ok: false }); // no empatado
    expect(await election.runoffVote(1, 2)).toEqual({ ok: true });
    expect(await election.runoffVote(1, 2)).toMatchObject({ ok: false, code: "already_voted" });
    expect(await election.login(1, pins.get(1))).toMatchObject({ ok: false, code: "already_voted" });

    // Los votos parciales no se ven
    const partial = await election.results();
    if (!partial.revealed) throw new Error("revelado");
    expect(partial.runoff?.complete).toBe(false);
    expect(partial.runoff?.candidates.every((c) => c.votes === 0)).toBe(true);

    // Fortune 7 – Adrian 3
    expect(await election.runoffVote(2, 1)).toEqual({ ok: true });
    for (const v of [3, 4, 5, 6, 7]) expect(await election.runoffVote(v, 1)).toEqual({ ok: true });
    for (const v of [8, 9]) expect(await election.runoffVote(v, 2)).toEqual({ ok: true });
    expect((await election.results()).revealed && (await election.status()).runoff?.complete).toBe(false);
    expect(await election.runoffVote(10, 1)).toEqual({ ok: true });

    const after = await election.results();
    if (!after.revealed) throw new Error("revelado");
    expect(after.runoff?.complete).toBe(true);
    expect(after.standings.slice(0, 2)).toMatchObject([
      { name: "Fortune", position: 1, tied: false, runoffVotes: 7 },
      { name: "Adrian", position: 2, tied: false, runoffVotes: 3 },
    ]);
    // El resto de posiciones no cambia
    expect(after.standings.slice(2).map((s) => s.position)).toEqual(before.standings.slice(2).map((s) => s.position));
  });

  it("los ausentes no votan y el admin puede cerrarla antes", async () => {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    await election.regeneratePins();
    await election.markBlank(10);
    await election.vote(1, { first: 3, second: 4, third: 5 });
    await election.vote(2, { first: 3, second: 4, third: 5 });
    for (const v of [3, 4, 5, 6, 7, 8, 9]) {
      const third = v === 3 ? 4 : 3;
      // 7 votantes: 4 dan 3 pts a Fortune y 3 a Adrian → no hay empate en el 1º,
      // pero sí podemos forzar uno en el 2º con estos dos más adelante si hiciera falta
      await election.vote(v, v % 2 === 0 ? { first: 1, second: 2, third } : { first: 2, second: 1, third });
    }
    await election.reveal(0);
    const res = await election.results();
    if (!res.revealed) throw new Error("revelado");
    const proposal = await election.runoffProposal();
    if (!proposal) return; // sin empate no hay nada más que probar aquí
    await election.startRunoff();
    expect(await election.runoffVote(10, proposal[0].id)).toMatchObject({ ok: false, code: "not_eligible" });
    await election.runoffVote(3, proposal[0].id === 3 ? proposal[1].id : proposal[0].id);
    expect(await election.closeRunoff()).toEqual({ ok: true });
    expect((await election.status()).runoff?.complete).toBe(true);
    expect(await election.runoffVote(4, proposal[0].id)).toMatchObject({ ok: false, code: "no_runoff" });
  });
});

describe("tokens de sesión firmados", () => {
  it("acepta un token válido y rechaza manipulados o caducados", () => {
    const t = createToken("clave", "v3", 60_000, 1_000);
    expect(readToken("clave", t, 2_000)).toBe("v3");
    expect(readToken("otra-clave", t, 2_000)).toBeNull();
    expect(readToken("clave", t.replace("v3", "v4"), 2_000)).toBeNull();
    expect(readToken("clave", t, 70_000)).toBeNull();
    expect(readToken("clave", undefined)).toBeNull();
  });
});
