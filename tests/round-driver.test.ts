/**
 * The round driver's law (spec E14): one Deal runs one full round through the
 * core's resolver — events in vocabulary order, the bankroll honest, the bar
 * gated behind the pump, Deal inert while busy — and the seeded shoe replays
 * card-for-card against the sim's own shoe.
 */
import { describe, it, expect, vi } from "vitest";
import { CommandBus } from "../src/ui/input/bus.ts";
import { RoundDriver, type DriverShoe, type RenderPort } from "../src/ui/round/driver.ts";
import { blackjackRuleset, type Ruleset } from "../src/core/rules.ts";
import { Shoe } from "../src/core/shoe.ts";
import { mulberry32 } from "../src/core/rng.ts";
import { SHOE_SALT } from "../src/config.ts";
import type { Action, PlayerView } from "../src/core/strategy/view.ts";

const ruleset: Ruleset = blackjackRuleset({ decks: 1 });

/** A shoe with a scripted queue — full determinism for every flow. */
class FakeShoe implements DriverShoe {
  private queue: number[];
  private dealtN = 0;
  needsShuffleFlag = false;
  count = {
    runningCount: () => 0,
    decksRemaining: () => 1,
    cardsSeen: () => 0,
    trueCount: () => 0,
    rawTrueCount: () => 0,
    expose: () => {},
    knownRemoval: () => {},
    recycle: () => {},
    reset: () => {},
  };

  constructor(cards: number[]) {
    this.queue = [...cards];
  }

  deal(): number {
    this.dealtN++;
    return this.queue.shift() ?? 0;
  }

  remaining(): number {
    return this.queue.length;
  }

  dealtCount(): number {
    return this.dealtN;
  }

  needsShuffle(): boolean {
    return this.needsShuffleFlag;
  }

  shuffle(): void {
    this.needsShuffleFlag = false;
  }

  discard(): void {}
}

/** A script-following strategy: pops one action per decision, and reports its prompts. */
class ScriptStrategy {
  private script: Action[];
  insuranceResponse = false;
  insurancePrompts = 0;
  onPrompt?: (mode: "play" | "insurance", view?: PlayerView) => void;

  constructor(script: Action[]) {
    this.script = [...script];
  }

  async play(view: PlayerView): Promise<Action> {
    this.onPrompt?.("play", view);
    return this.script.length > 1 ? (this.script.shift() as Action) : this.script[0];
  }

  async insurance(): Promise<boolean> {
    this.insurancePrompts++;
    this.onPrompt?.("insurance");
    return this.insuranceResponse;
  }
}

/** A recording port: every call logged, every promise instant. */
function fakePort() {
  const log: string[] = [];
  const settled: { line: number; outcome: string }[] = [];
  const bankroll: number[] = [];
  const port: RenderPort = {
    beginRound: () => log.push("begin"),
    dealCard: (dest, line, role) => {
      log.push(`card ${dest} ${role} L${line}`);
      return Promise.resolve();
    },
    revealHole: (card) => {
      log.push(`reveal ${card}`);
      return Promise.resolve();
    },
    createLine: () => {
      log.push("line");
      return Promise.resolve();
    },
    settleLine: (line, outcome) => {
      log.push(`settle L${line} ${outcome}`);
      settled.push({ line, outcome });
      return Promise.resolve();
    },
    endRound: () => {
      log.push("end");
      return Promise.resolve();
    },
    updateCounts: () => log.push("counts"),
    setBankroll: (units) => {
      log.push(`bankroll ${units}`);
      bankroll.push(units);
    },
    shuffleBeat: () => {
      log.push("shuffle");
      return Promise.resolve();
    },
    relayout: () => log.push("relayout"),
  };
  return { port, log, settled, bankroll };
}

/** A recording control bar. */
function fakeControls() {
  const modes: string[] = [];
  return {
    modes,
    setMode(mode: string): void {
      modes.push(mode);
    },
  };
}

/** Build the full headless table: bus, human, driver — script and shoe injected. */
function build(script: Action[], cards: number[], insuranceResponse = false) {
  const bus = new CommandBus();
  const port = fakePort();
  const controls = fakeControls();
  const spoken: string[] = [];
  const strategy = new ScriptStrategy(script);
  strategy.insuranceResponse = insuranceResponse;
  const driver = new RoundDriver({
    bus,
    strategy,
    port: port.port,
    controls,
    announce: (text) => spoken.push(text),
    ruleset,
    makeShoe: () => new FakeShoe(cards),
    bankroll: 200,
    betUnits: 1,
  });
  strategy.onPrompt = (mode, view) =>
    driver.promptGate(mode, view ? { double: view.canDouble, split: view.canSplit, surrender: view.canSurrender, rescue: view.canRescue } : undefined);
  return { bus, driver, port, controls, spoken, strategy };
}

/** Wait until the predicate holds (the pump and the resolver settle async). */
async function until(pred: () => boolean): Promise<void> {
  await vi.waitFor(() => {
    if (!pred()) throw new Error("not yet");
  });
}

const S = (rank: number): number => rank * 4; // a spade of the rank index

describe("the round driver (spec E14)", () => {
  it("a stood hand runs the full loop and the bankroll takes the loss", async () => {
    // player 5+10 = 15 stands; dealer 5+9 draws a 5 into 19 — loss
    const t = build(["S"], [S(4), S(4), S(9), S(8), S(4)]);
    t.bus.emit({ kind: "deal" });
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.port.log).toEqual([
      "begin",
      "card player initial L0",
      "counts",
      "card dealer up L0",
      "counts",
      "card player initial L0",
      "counts",
      "card dealer hole L0",
      "counts",
      "reveal 32",
      "counts",
      "card dealer hit L0",
      "counts",
      "settle L0 lose",
      "end",
      "bankroll 199",
    ]);
    expect(t.controls.modes[0]).toBe("busy");
    expect(t.controls.modes).toContain("play");
    expect(t.driver.balance).toBe(199);
  });

  it("a dealt blackjack pays 3 to 2 without a dealer draw", async () => {
    // player A+K = blackjack; the up card is a 5, the hole is safe
    const t = build(["S"], [S(0), S(4), S(12), S(5)]);
    t.bus.emit({ kind: "deal" });
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.port.log).toContain("settle L0 blackjack");
    expect(t.port.log).not.toContain("card dealer hit L0");
    expect(t.driver.balance).toBeCloseTo(201.5, 5);
  });

  it("an ace up opens the insurance prompt before the play decisions", async () => {
    // player 10, ace up, player 10 stands; hole ten = dealer blackjack
    const t = build(["S"], [S(9), S(0), S(9), S(9)]);
    t.bus.emit({ kind: "deal" });
    await until(() => t.strategy.insurancePrompts > 0);
    await until(() => t.controls.modes.includes("insurance"));
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.strategy.insurancePrompts).toBe(1);
  });

  it("Deal is inert while a round is in flight", async () => {
    const t = build(["S"], [S(4), S(4), S(9), S(8), S(4)]);
    t.bus.emit({ kind: "deal" });
    t.bus.emit({ kind: "deal" });
    t.bus.emit({ kind: "deal" });
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.port.log.filter((x) => x === "begin")).toHaveLength(1);
    expect(t.driver.balance).toBe(199);
  });

  it("a split creates the second line and settles both", async () => {
    // player 8+8 splits; each eight draws a ten (18) and stands; dealer 5+5 draws 9,5 into 19 — both lose
    const t = build(["P", "S", "S"], [S(7), S(4), S(7), S(4), S(9), S(9), S(4), S(4), S(4)]);
    t.bus.emit({ kind: "deal" });
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.port.log.filter((x) => x === "line")).toHaveLength(1);
    expect(t.port.log.filter((x) => x.startsWith("settle"))).toHaveLength(2);
    expect(t.driver.balance).toBe(198);
  });

  it("a hit deals its card onto the felt and the stood 19 wins", async () => {
    // player 5+9 = 14; hit a 5 into 19, stand; dealer 5+9 draws a 9 into 23 — bust, win
    const t = build(["H", "S"], [S(4), S(4), S(9), S(9), S(4), S(9), S(9)]);
    t.bus.emit({ kind: "deal" });
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.port.log.filter((x) => x === "card player hit L0")).toHaveLength(1);
    expect(t.port.log).toContain("settle L0 win");
    expect(t.driver.balance).toBe(201);
  });

  it("a double deals its card and pays double on the dealer bust", async () => {
    // player 5+5 = 10, doubled into 15; dealer 5+9 draws a 9 into 23 — bust, pays double
    const t = build(["D"], [S(4), S(4), S(4), S(9), S(4), S(9), S(9)]);
    t.bus.emit({ kind: "deal" });
    await until(() => t.controls.modes.at(-1) === "idle");
    expect(t.port.log.filter((x) => x === "card player double L0")).toHaveLength(1);
    expect(t.port.log).toContain("settle L0 win");
    expect(t.driver.balance).toBe(202);
  });

  it("the seeded shoe replays card-for-card against the sim's own shoe", () => {
    const a = new Shoe(ruleset, mulberry32(((1234 ^ SHOE_SALT) >>> 0) || 1));
    const b = new Shoe(ruleset, mulberry32(((1234 ^ SHOE_SALT) >>> 0) || 1));
    const da: number[] = [];
    const db: number[] = [];
    for (let i = 0; i < 20; i++) {
      da.push(a.deal());
      db.push(b.deal());
    }
    expect(da).toEqual(db);
  });
});