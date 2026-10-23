/**
 * HumanStrategy — the felt's Strategy: decisions resolve from the command
 * bus, and the control bar is told exactly which actions are legal before
 * each promise is awaited. Sync sims never touch this class.
 */
import type { Action, InsuranceView, PlayerView, Strategy } from "../../core/strategy/view.ts";
import type { CommandBus } from "./bus.ts";
import type { ControlsHandle } from "./controls.ts";

const PLAY_ACTIONS: Partial<Record<string, Action>> = {
  hit: "H",
  stand: "S",
  double: "D",
  split: "P",
  surrender: "R",
};

/** The human at the felt: bus commands in, core decisions out. */
export class HumanStrategy implements Strategy {
  private resolvePlay?: (a: Action) => void;
  private resolveInsurance?: (take: boolean) => void;
  private readonly off: () => void;

  /** Wire the strategy to the bus and the control bar. */
  constructor(
    bus: CommandBus,
    private readonly controls: ControlsHandle,
  ) {
    this.off = bus.on((c) => this.onCommand(c));
  }

  /** Await the player's insurance decision (only Y/N are enabled). */
  insurance(_view: InsuranceView): Promise<boolean> {
    this.controls.setMode("insurance");
    return new Promise((resolve) => {
      this.resolveInsurance = resolve;
    });
  }

  /** Await the player's action for the active line (legality drives the bar). */
  play(view: PlayerView): Promise<Action> {
    this.controls.setMode("play", { double: view.canDouble, split: view.canSplit, surrender: view.canSurrender });
    return new Promise((resolve) => {
      this.resolvePlay = resolve;
    });
  }

  /** Stop listening (teardown). */
  dispose(): void {
    this.off();
  }

  /** Route one bus command to a pending insurance or play promise. */
  private onCommand(c: { kind: string; take?: boolean }): void {
    if (this.resolveInsurance && c.kind === "insurance") {
      const resolve = this.resolveInsurance;
      this.resolveInsurance = undefined;
      resolve(c.take ?? false);
      return;
    }
    if (this.resolvePlay) {
      const action = PLAY_ACTIONS[c.kind];
      if (action) {
        const resolve = this.resolvePlay;
        this.resolvePlay = undefined;
        resolve(action);
      }
    }
  }
}