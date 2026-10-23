/**
 * Simulation smoke tests: statistical sanity + knowledge-rule invariants.
 * The full-textbook verification runs via the CLI battery (`npm run verify`).
 */
import { describe, it, expect } from 'vitest';
import { runScenario } from '../src/sim/runner.ts';
import { scenarioById } from '../src/sim/scenarios.ts';
import { blackjackRuleset } from '../src/core/rules.ts';
import { Shoe } from '../src/core/shoe.ts';
import { mulberry32 } from '../src/core/rng.ts';
import { playRound } from '../src/core/resolver.ts';
import { HILO } from './smoke-players.ts';

describe('knowledge-rule invariant', () => {
  it('every dealt card is exposed exactly once per round, across shuffles', async () => {
    const ruleset = blackjackRuleset({ decks: 6, pen: 0.5, surrender: true });
    const shoe = new Shoe(ruleset, mulberry32(9));
    const player = HILO();
    for (let i = 0; i < 3000; i++) {
      if (shoe.needsShuffle() || shoe.remaining() < 21) shoe.shuffle();
      await playRound({ ruleset, shoe, strategy: player, betUnits: player.betUnits(shoe.count.trueCount()), unitDollars: 25 });
      expect(shoe.count.cardsSeen()).toBe(shoe.dealtCount());
    }
  });
});

describe('simulation smoke', () => {
  it('fresh-shoe 6D S17 DAS LS RSA lands in textbook territory', async () => {
    const sc = scenarioById('anchor-6d-s17-das-ls-rsa-fresh');
    expect(sc).toBeDefined();
    const res = await runScenario(sc!, 800_000, 42);
    const ev = res.stats.evPctInitial();
    // WoO: -0.281% (cut card); fresh shoe should be at or slightly better
    expect(ev).toBeGreaterThan(-0.009);
    expect(ev).toBeLessThan(0.001);
    expect(Math.abs(res.stats.variance() - 1.303)).toBeLessThan(0.2);
  }, 60_000);

  it('Spanish 21 6D H17 lands within the 0.76% window (chart adjudicator)', async () => {
    const sc = scenarioById('anchor-sp21-6d-h17');
    const res = await runScenario(sc!, 500_000, 42);
    const ev = res.stats.evPctInitial();
    expect(ev).toBeGreaterThan(-0.013);
    expect(ev).toBeLessThan(-0.002);
  }, 60_000);

  it('single-deck Hi-Lo ramp engages and does not tank', async () => {
    const sc = scenarioById('count-1d-hilo-1-5');
    const res = await runScenario(sc!, 200_000, 42);
    expect(res.stats.avgInitialBet()).toBeGreaterThan(1.1);
    expect(res.stats.evPctInitial()).toBeGreaterThan(-0.03);
  }, 60_000);

  it('Sp21 Monkey-count ramp engages', async () => {
    const sc = scenarioById('count-sp21-monkey-1-12');
    const res = await runScenario(sc!, 200_000, 42);
    expect(res.stats.avgInitialBet()).toBeGreaterThan(1.02);
    expect(res.stats.evPctInitial()).toBeGreaterThan(-0.03);
  }, 60_000);
});
