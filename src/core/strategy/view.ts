/**
 * Strategy contract: the resolver asks a Strategy what to do; the resolver
 * owns legality (canDouble/canSplit/... flags) and clamps illegal picks with
 * standard fallbacks (D->H, Ds->S).
 */
import type { Ruleset } from '../rules.ts';

export type Action = 'H' | 'S' | 'D' | 'P' | 'R' | 'RESCUE';

export interface PlayerView {
  ruleset: Ruleset;
  /** player cards (card bytes) for the active line */
  cards: number[];
  total: number;
  soft: boolean;
  cardCount: number;
  doubled: boolean;
  fromSplit: boolean;
  /** the pair rank being played when fromSplit (face value), else 0 */
  splitOf: number;
  upcard: number;
  /** face value of dealer upcard: 2..9, 10, 11 (ace) */
  up: number;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  /** Spanish 21 double-down rescue available on this doubled hand */
  canRescue: boolean;
  /** floored true count at the moment the hand is being played, null if count off */
  tc: number | null;
  /** raw (unfloored) true count */
  rawTc: number | null;
  runningCount: number | null;
  decksRemaining: number | null;
}

export interface InsuranceView {
  ruleset: Ruleset;
  upcard: number;
  /** main bet in units */
  betUnits: number;
  tc: number | null;
  rawTc: number | null;
}

/** A value or a promise of it — the resolver awaits either, so sync sims and async humans share one interface. */
export type MaybePromise<T> = T | Promise<T>;

export interface Strategy {
  /** Called when dealer shows an ace, before peek. Return true to take insurance. */
  insurance(view: InsuranceView): MaybePromise<boolean>;
  /** Decide the action for the active line. */
  play(view: PlayerView): MaybePromise<Action>;
}
