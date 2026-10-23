/**
 * SimPlayer: the simulated advantage player. Play precedence (BJ): Fab 4 surrenders >
 * I18 deviations > unconditional LS overlay > WoO base chart; Sp21: count-in-hand chart + rescue (E4).
 * Betting flat / TC ramp / Kelly; insurance never or I18 #1 (floored TC >= +3); Sp21 insurance never.
 */
import type { Action, InsuranceView, PlayerView, Strategy } from './strategy/view.ts';
import { chartFor, lookupBasic, surrenderTableFor, upCol } from './strategy/basic.ts';
import { FAB_4, ILLUSTRIOUS_18, idxFor, insuranceByI18 } from './strategy/i18.ts';
import { sp21Decision, sp21RescueDecision } from './strategy/spanish21.ts';
import { cardValue } from './card.ts';

export type PlayMode = 'basic' | 'i18' | 'i18+fab4' | 'sp21';
export type BetMode = 'flat' | 'ramp' | 'kelly';
export type InsuranceMode = 'never' | 'index';

export interface RampStep {
  /** TC threshold (floored) at/above which the bet size applies */
  tc: number;
  units: number;
}

export interface SimPlayerConfig {
  play: PlayMode;
  insurance: InsuranceMode;
  bet: BetMode;
  baseUnits: number;
  ramp: RampStep[];
  kellyBankroll: number;
  kellyFraction: number;
  kellyMaxBet: number;
  /** estimated player edge gained per +1 TC (Hi-Lo ~0.005, Monkey ~0.004 est.) */
  tcValuePerUnit: number;
  /** off-the-top disadvantage the ramp must overcome (e.g. 0.005 for 6D S17) */
  baseHouseEdge: number;
  varianceEstimate: number;
}

export const DEFAULT_PLAYER: SimPlayerConfig = {
  play: 'basic',
  insurance: 'never',
  bet: 'flat',
  baseUnits: 1,
  ramp: [],
  kellyBankroll: 1000,
  kellyFraction: 0.5,
  kellyMaxBet: 12,
  tcValuePerUnit: 0.005,
  baseHouseEdge: 0.005,
  varianceEstimate: 1.3,
};

/** The Strategy implementation driving the sims: bet sizing, insurance, and per-line play decisions. */
export class SimPlayer implements Strategy {
  bankroll: number;
  private readonly cfg: SimPlayerConfig;

  constructor(cfg: Partial<SimPlayerConfig>) {
    this.cfg = { ...DEFAULT_PLAYER, ...cfg };
    this.bankroll = this.cfg.kellyBankroll;
  }

  /** Bet size for the next round, decided pre-deal from the current TC. */
  betUnits(tc: number | null): number {
    const cfg = this.cfg;
    if (cfg.bet === 'flat') return cfg.baseUnits;
    if (cfg.bet === 'ramp') {
      let units = cfg.baseUnits;
      for (const step of cfg.ramp) if (tc !== null && tc >= step.tc) units = step.units;
      return units;
    }
    // kelly
    const edge = tc === null ? -cfg.baseHouseEdge : tc * cfg.tcValuePerUnit - cfg.baseHouseEdge;
    if (edge <= 0) return cfg.baseUnits;
    const b = (this.bankroll * cfg.kellyFraction * edge) / cfg.varianceEstimate;
    return Math.max(1, Math.min(cfg.kellyMaxBet, Math.round(b)));
  }

  /** Insurance decision from the I18 #1 index (never on Spanish 21, E4). */
  insurance(v: InsuranceView): boolean {
    if (v.ruleset.spanish) return false; // E4: Sp21 insurance indices deferred
    return this.cfg.insurance === 'index' && insuranceByI18(v.tc);
  }

  /** The action for the active line: rescue → Sp21 → Fab 4 → I18 → LS overlay → base chart. */
  play(v: PlayerView): Action {
    // Doubled hands: Sp21 rescue decision (stand or rescue)
    if (v.doubled) {
      return v.ruleset.rescue ? sp21RescueDecision(v) : 'S';
    }

    if (v.ruleset.spanish) return sp21Decision(v);

    const s17 = v.ruleset.s17;
    const isPairHand =
      v.cardCount === 2 && cardValue(v.cards[0]!) === cardValue(v.cards[1]!);
    const pairValue = isPairHand ? cardValue(v.cards[0]!) : 0;
    // pairs play as their hard total unless split is on; 5s never split
    const treatAsHard = isPairHand && pairValue !== 5 && !v.canSplit ? true : !isPairHand;

    // --- Fab 4 count-dependent surrenders (govern their four hands entirely) ---
    if (
      (this.cfg.play === 'i18+fab4') &&
      v.canSurrender &&
      v.cardCount === 2 &&
      !v.soft &&
      !isPairHand
    ) {
      const fab = FAB_4.find((f) => f.total === v.total && f.up === v.up);
      if (fab) {
        if (v.tc !== null && v.tc >= idxFor(fab, s17)) return 'R';
        // below the Fab 4 index: do not surrender — fall to the chart action
        return this.chartAction(v, s17, isPairHand, pairValue, treatAsHard, true);
      }
    }

    // --- I18 deviations (2-card hard hands & 10-value pairs) ---
    if (this.cfg.play === 'i18' || this.cfg.play === 'i18+fab4') {
      if (v.cardCount === 2 && v.tc !== null) {
        for (const e of ILLUSTRIOUS_18) {
          if (e.kind === 'insurance') continue;
          if (e.kind === 'hard') {
            if (v.soft || v.total !== e.key || v.up !== e.up) continue;
            // pair hands play their own chart — except 5s (never split)
            if (isPairHand && pairValue !== 5) continue;
          } else {
            if (!isPairHand || pairValue !== e.key || v.up !== e.up) continue;
          }
          if (v.tc >= idxFor(e, s17)) {
            if (e.dev === 'S') return 'S';
            if (e.dev === 'D' && v.canDouble) return 'D';
            if (e.dev === 'P' && v.canSplit) return 'P';
            // illegal at this point (can't double / can't split): fall through
          } else if (e.below === 'H') {
            // negative-side entries: hit below the index even though basic stands
            // (12 v 4/5/6, 13 v 2/3), and 11 v A under H17 (basic doubles)
            return 'H';
          }
          break; // matched entry (below index or illegal deviation): chart handles it
        }
      }
    }

    // --- unconditional late-surrender overlay ---
    if (v.canSurrender && v.cardCount === 2 && !v.fromSplit) {
      const tbl = surrenderTableFor(s17);
      const pairKey = `${pairValue}|${v.up}`;
      const handKey = `${v.total}|${v.up}`;
      if ((isPairHand && tbl.pairs.has(pairKey)) || (!isPairHand && !v.soft && tbl.hands.has(handKey))) {
        return 'R';
      }
    }

    return this.chartAction(v, s17, isPairHand, pairValue, treatAsHard, false);
  }

  /** Base-chart lookup with legality fallbacks (resplit cap, canDouble, treatAsHard). */
  private chartAction(
    v: PlayerView,
    s17: boolean,
    isPairHand: boolean,
    pairValue: number,
    treatAsHard: boolean,
    fabBelow: boolean,
  ): Action {
    const chart = chartFor(v.ruleset.decks, s17, v.ruleset.das);
    void upCol;
    let a = lookupBasic(chart, {
      total: v.total,
      soft: v.soft,
      cardCount: v.cardCount,
      up: v.up,
      isPair: isPairHand && v.canSplit,
      pairValue,
    });
    if (a === 'P' && !v.canSplit) {
      // resplit cap reached: play the hard total (aces keep hitting)
      a = lookupBasic(chart, {
        total: v.total,
        soft: v.soft,
        cardCount: v.cardCount,
        up: v.up,
        isPair: false,
        pairValue,
      });
    }
    if (treatAsHard && a === 'P') {
      // e.g. 10,10 when split illegal: hard 20 -> S (handled by canSplit path above)
      a = 'S';
    }
    if (a === 'D' || a === 'Ds') {
      if (!v.canDouble) return a === 'D' ? 'H' : 'S';
      return 'D';
    }
    if (a === 'P') return 'P';
    void fabBelow;
    return a;
  }
}
