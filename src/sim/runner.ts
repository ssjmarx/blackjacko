/**
 * Headless simulation runner: N rounds of one scenario, streamed stats.
 * Cut card at floor(total × pen); a new round past it reshuffles (rounds always complete).
 * freshShoe rulesets reshuffle every round — off-the-top EV with no cut-card effect.
 */
import { mulberry32 } from '../core/rng.ts';
import { Shoe } from '../core/shoe.ts';
import { playRound } from '../core/resolver.ts';
import { SimPlayer, type SimPlayerConfig } from '../core/player.ts';
import type { Ruleset } from '../core/rules.ts';
import { Stats } from './stats.ts';

export interface ExpectedTarget {
  /** target EV as fraction of initial bet (e.g. -0.00573) */
  evPct?: number;
  variance?: number;
  /** for delta scenarios: expected change vs the sweep baseline */
  deltaPct?: number;
  tolerance: number;
  source: string;
  kind: 'absolute' | 'delta' | 'reference';
  /** reference checks: positive EV, or monotonic within an ordered group */
  soft?: 'positive' | 'monotonic';
}

export interface Scenario {
  id: string;
  name: string;
  group: 'anchors' | 'fresh' | 'sweep' | 'pen' | 'spread' | 'count';
  ruleset: Ruleset;
  player: Partial<SimPlayerConfig>;
  unitDollars: number;
  expected?: ExpectedTarget;
  note?: string;
}

export interface ScenarioResult {
  scenario: Scenario;
  stats: Stats;
  hands: number;
  seed: number;
  elapsedMs: number;
}

/** Safety: a single round can consume up to ~20 cards (deep splits). */
const MIN_CARDS_FOR_ROUND = 21;

/** Run one scenario for `hands` rounds at `seed`; elapsed time and Kelly rebuys ride along. */
export function runScenario(scenario: Scenario, hands: number, seed: number): ScenarioResult {
  const t0 = performance.now();
  const rng = mulberry32(seed);
  const shoe = new Shoe(scenario.ruleset, rng);
  const player = new SimPlayer(scenario.player);
  const stats = new Stats();
  let rebuys = 0;

  for (let i = 0; i < hands; i++) {
    if (scenario.ruleset.freshShoe) {
      shoe.shuffle();
      stats.shoes++;
    } else if (shoe.needsShuffle() || shoe.remaining() < MIN_CARDS_FOR_ROUND) {
      shoe.shuffle();
      stats.shoes++;
    }
    const tc = shoe.count.trueCount();
    const bet = player.betUnits(tc);
    const res = playRound({
      ruleset: scenario.ruleset,
      shoe,
      strategy: player,
      betUnits: bet,
      unitDollars: scenario.unitDollars,
    });
    stats.addRound(res.net, res.initialWager, res.totalAtRisk);
    player.bankroll += res.net;
    if (scenario.player.bet === 'kelly' && player.bankroll < 1) {
      player.bankroll = scenario.player.kellyBankroll ?? 1000; // rebuy: keep the sim alive
      rebuys++;
    }
  }

  const res: ScenarioResult = {
    scenario,
    stats,
    hands,
    seed,
    elapsedMs: performance.now() - t0,
  };
  (res as ScenarioResult & { rebuys: number }).rebuys = rebuys;
  return res;
}
