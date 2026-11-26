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

  it("con 9 votos y 1 en blanco se publican los resultados y el ausente da 0 puntos", async () => {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    await election.regeneratePins();
    // Todos votan menos Luis (10); los votos de Luis del escenario no se emiten
    for (const { voter, ballot } of SCENARIO.filter((s) => s.voter !== 10)) {
      expect(await election.vote(voter, ballot)).toEqual({ ok: true });
    }
    expect((await election.results()).complete).toBe(false);

    expect(await election.markBlank(10)).toEqual({ ok: true });
    const res = await election.results();
    expect(res.complete).toBe(true);
    if (!res.complete) return;
    expect(res.status.blankCount).toBe(1);

    const expected = tally(PARTICIPANTS, SCENARIO.filter((s) => s.voter !== 10).map((s) => s.ballot));
    expect(res.standings).toEqual(expected);
    // Luis sigue siendo candidato: recibe los puntos que le dieron otros
    expect(res.standings.find((s) => s.name === "Luis")!.points).toBe(7);
    // El total repartido es 9 papeletas × 6 puntos
    expect(res.standings.reduce((sum, s) => sum + s.points, 0)).toBe(54);
  });

  it("los PINs generados son de 4 dígitos y distintos entre sí", async () => {
    const election = createElection(createMemoryStore(), { pinRounds: 4 });
    const pins = (await election.regeneratePins()).map((p) => p.pin);
    expect(pins).toHaveLength(10);
    expect(new Set(pins).size).toBe(10);
    expect(pins.every((p) => /^\d{4}$/.test(p))).toBe(true);
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
