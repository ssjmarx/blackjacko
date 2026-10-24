/**
 * The round driver — the felt's state machine (spec E14): one shoe from the
 * session seed, a fixed-unit bet, and the core's async resolver wired to the
 * human's bus strategy. Pure orchestration; the port and controls inject.
 */
import type { LineOutcome, RoundEvent } from "../../core/resolver.ts";
import { playRound } from "../../core/resolver.ts";
import type { Ruleset } from "../../core/rules.ts";
import type { Shoe } from "../../core/shoe.ts";
import type { Strategy } from "../../core/strategy/view.ts";
import { phraseFor } from "../announcements.ts";
import type { ControlMode, ControlLegality } from "../input/controls.ts";

/** The shoe surface the driver needs — the real Shoe satisfies it structurally. */
export interface DriverShoe {
  deal(): number;
  remaining(): number;
  dealtCount(): number;
  needsShuffle(): boolean;
  shuffle(): void;
  readonly count: { runningCount(): number; decksRemaining(): number };
}

/** The renderer's side of the driver: every call may await its animations. */
export interface RenderPort {
  /** A round begins: clear the table's old sprites, show the bet marker. */
  beginRound(): void;
  /** Deal one card into its choreographed spot; hole cards arrive face down. */
  dealCard(dest: "player" | "dealer", line: number, role: "initial" | "hit" | "double" | "up" | "hole", card: number | undefined): Promise<void>;
  /** The hole flips: identity arrives only now. */
  revealHole(card: number): Promise<void>;
  /** A split: the band re-solves, cards resize and re-place. */
  createLine(): Promise<void>;
  /** A line settles: the flash. */
  settleLine(line: number, outcome: LineOutcome): Promise<void>;
  /** The round's cards sweep to the discard tray. */
  endRound(): Promise<void>;
  /** Counts and shoe state after the latest event — the HUD never recounts. */
  updateCounts(rc: number, decksRemaining: number, dealt: number): void;
  /** The bankroll readout, live at the chip column's floor. */
  setBankroll(units: number): void;
  /** The shuffle beat: the stack rebuilds, the HUD resets. */
  shuffleBeat(): Promise<void>;
  /** Re-place every live sprite from a fresh solve (resize, split). */
  relayout(): void;
}

/** The driver's controls surface — the real bar, or a fake in tests. */
export interface DriverControls {
  setMode(mode: ControlMode, legal?: ControlLegality): void;
}

/** Injected speech + captions (domshell's announcer). */
export type Announce = (text: string) => void;

/**
 * Build the driver: bus, strategy, port, controls — and the felt comes alive.
 * The strategy's prompt hook gates the bar behind the pump, so buttons light
 * only after the cards land.
 */
/** The felt's state machine: Deal in, one full round through the core, bankroll out. */
export class RoundDriver {
  private shoe: DriverShoe;
  private bankroll: number;
  private state: "idle" | "busy" = "idle";
  private hands = 1;
  private queue: { e: RoundEvent; dealt: number }[] = [];
  private draining = false;
  private idleResolvers: (() => void)[] = [];

  constructor(
    private readonly deps: {
      bus: { on(h: (c: { kind: string; take?: boolean }) => void): () => void };
      strategy: Strategy;
      port: RenderPort;
      controls: DriverControls;
      announce: Announce;
      ruleset: Ruleset;
      makeShoe: () => DriverShoe;
      bankroll: number;
      betUnits: number;
    },
  ) {
    this.shoe = deps.makeShoe();
    this.bankroll = deps.bankroll;
    deps.bus.on((c) => {
      if (c.kind === "deal" && this.state === "idle") void this.startRound();
    });
  }

  /** The bankroll right now (units). */
  get balance(): number {
    return this.bankroll;
  }

  /** The active hand count — the renderer re-solves the band from it. */
  get activeHands(): number {
    return this.hands;
  }

  /** Re-place every live sprite from a fresh solve. */
  relayout(): void {
    this.deps.port.relayout();
  }

  /** The strategy's prompt gate: light the bar only once the pump has landed. */
  promptGate(mode: ControlMode, legal?: ControlLegality): void {
    void this.pumpIdle().then(() => this.deps.controls.setMode(mode, legal));
  }

  /** One full round: shuffle beat if due, deal, play, settle — bankroll lands. */
  private async startRound(): Promise<void> {
    this.state = "busy";
    this.deps.controls.setMode("busy");
    this.hands = 1;
    if (this.shoe.needsShuffle()) {
      await this.deps.port.shuffleBeat();
      this.shoe.shuffle();
      this.deps.port.updateCounts(this.shoe.count.runningCount(), this.shoe.count.decksRemaining(), 0);
    }
    this.deps.port.beginRound();
    this.announceEvent({ kind: "round-start" });
    const result = await playRound({
      ruleset: this.deps.ruleset,
      // the driver's contract is structural; the env's concrete type is wider
      shoe: this.shoe as unknown as Shoe,
      strategy: this.deps.strategy,
      betUnits: this.deps.betUnits,
      unitDollars: 1,
      events: (e) => {
        this.queue.push({ e, dealt: this.shoe.dealtCount() });
        void this.drain();
      },
    });
    await this.pumpIdle();
    this.bankroll += result.net;
    this.deps.port.setBankroll(this.bankroll);
    this.state = "idle";
    this.deps.controls.setMode("idle");
  }

  /** The event sink: every event phrases itself, paces, and updates the counts. */
  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;
        await this.apply(item.e, item.dealt);
      }
    } finally {
      this.draining = false;
      const rs = this.idleResolvers;
      this.idleResolvers = [];
      for (const r of rs) r();
    }
  }

  /** Resolves once the pump has applied every queued event. */
  private pumpIdle(): Promise<void> {
    if (!this.draining && this.queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  /** Apply one event: phrase it, animate it, keep the counts honest. */
  private async apply(e: RoundEvent, dealt: number): Promise<void> {
    this.announceEvent(e);
    switch (e.kind) {
      case "round-start":
        break;
      case "card":
        await this.deps.port.dealCard(e.to, e.line, e.role, e.card);
        this.deps.port.updateCounts(this.shoe.count.runningCount(), this.shoe.count.decksRemaining(), dealt);
        break;
      case "hole-revealed":
        await this.deps.port.revealHole(e.card);
        this.deps.port.updateCounts(this.shoe.count.runningCount(), this.shoe.count.decksRemaining(), dealt);
        break;
      case "decision":
        break;
      case "line-created":
        this.hands = Math.max(this.hands, e.line + 1);
        await this.deps.port.createLine();
        break;
      case "line-settled":
        await this.deps.port.settleLine(e.line, e.outcome);
        break;
      case "round-end":
        await this.deps.port.endRound();
        break;
    }
  }

  /** Phrase one event through the a11y map — speech and captions, one string. */
  private announceEvent(e: RoundEvent): void {
    this.deps.announce(phraseFor(e));
  }
}