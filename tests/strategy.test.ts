import { describe, it, expect } from 'vitest';
import { SimPlayer } from '../src/core/player.ts';
import { makeView } from './helpers.ts';
import { makeCard, A, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, J, Q, K, SPADES, HEARTS, DIAMONDS, CLUBS } from '../src/core/card.ts';
import { blackjackRuleset, spanish21Ruleset } from '../src/core/rules.ts';
import type { Ruleset } from '../src/core/rules.ts';

const c = (r: number, s: number): number => makeCard(r, s);

const BASIC = new SimPlayer({ play: 'basic', insurance: 'never', bet: 'flat', baseUnits: 1 });
const I18 = new SimPlayer({ play: 'i18', insurance: 'index', bet: 'flat', baseUnits: 1 });
const I18F = new SimPlayer({ play: 'i18+fab4', insurance: 'index', bet: 'flat', baseUnits: 1 });
const LS_RULES = blackjackRuleset({ surrender: true });

function playerPlay(p: SimPlayer, cards: number[], up: number, over: { tc?: number; ruleset?: Ruleset; canSplit?: boolean; canSurrender?: boolean; canDouble?: boolean } = {}) {
  return p.play(
    makeView({
      cards,
      up,
      tc: over.tc ?? 0,
      ruleset: over.ruleset ?? blackjackRuleset(),
      canSplit: over.canSplit,
      canSurrender: over.canSurrender,
      canDouble: over.canDouble,
    }),
  );
}

describe('basic strategy chart spots (WoO 4-8 deck)', () => {
  it('hard rows', () => {
    expect(playerPlay(BASIC, [c(SIX, SPADES), c(THREE, HEARTS)], 3)).toBe('D'); // 9 v 3
    expect(playerPlay(BASIC, [c(SIX, SPADES), c(THREE, HEARTS)], 7)).toBe('H'); // 9 v 7
    expect(playerPlay(BASIC, [c(EIGHT, SPADES), c(FOUR, HEARTS)], 4)).toBe('S'); // hard 12 v 4
    expect(playerPlay(BASIC, [c(SEVEN, SPADES), c(FIVE, HEARTS)], 2)).toBe('H');
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(SIX, HEARTS)], 10)).toBe('H');
    expect(playerPlay(BASIC, [c(SEVEN, SPADES), c(TEN, HEARTS)], 6)).toBe('S');
  });

  it('11 v A: S17 hits, H17 doubles', () => {
    expect(playerPlay(BASIC, [c(SIX, SPADES), c(FIVE, HEARTS)], 11)).toBe('H');
    const h17 = new SimPlayer({ play: 'basic', insurance: 'never', bet: 'flat', baseUnits: 1 });
    expect(playerPlay(h17, [c(SIX, SPADES), c(FIVE, HEARTS)], 11, { ruleset: blackjackRuleset({ s17: false }) })).toBe('D');
  });

  it('soft 18 v 2: S17 stands, H17 doubles; soft 19 v 6: H17 doubles', () => {
    expect(playerPlay(BASIC, [c(A, SPADES), c(SEVEN, HEARTS)], 2)).toBe('S');
    expect(playerPlay(BASIC, [c(A, SPADES), c(SEVEN, HEARTS)], 9)).toBe('H');
    expect(playerPlay(BASIC, [c(A, SPADES), c(SEVEN, HEARTS)], 6)).toBe('D');
    const h17Rules = blackjackRuleset({ s17: false });
    expect(playerPlay(BASIC, [c(A, SPADES), c(SEVEN, HEARTS)], 2, { ruleset: h17Rules })).toBe('D');
    expect(playerPlay(BASIC, [c(A, SPADES), c(EIGHT, HEARTS)], 6, { ruleset: h17Rules })).toBe('D');
  });

  it('pairs: 4,4 v 6 splits with DAS, hits without', () => {
    expect(playerPlay(BASIC, [c(FOUR, SPADES), c(FOUR, HEARTS)], 6, { canSplit: true })).toBe('P');
    expect(playerPlay(BASIC, [c(FOUR, SPADES), c(FOUR, HEARTS)], 6, { canSplit: true, ruleset: blackjackRuleset({ das: false }) })).toBe('H');
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(TEN, HEARTS)], 6, { canSplit: true })).toBe('S');
    expect(playerPlay(BASIC, [c(A, SPADES), c(A, HEARTS)], 6, { canSplit: true })).toBe('P');
    expect(playerPlay(BASIC, [c(FIVE, SPADES), c(FIVE, HEARTS)], 6, { canSplit: true })).toBe('D');
  });

  it('unconditional late-surrender overlay', () => {
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(SIX, HEARTS)], 10, { ruleset: LS_RULES, canSurrender: true })).toBe('R');
    expect(playerPlay(BASIC, [c(NINE, SPADES), c(SIX, HEARTS)], 10, { ruleset: LS_RULES, canSurrender: true })).toBe('R');
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(SIX, HEARTS)], 11, { ruleset: LS_RULES, canSurrender: true })).toBe('R'); // 16 v A
    expect(playerPlay(BASIC, [c(SIX, SPADES), c(EIGHT, HEARTS)], 10, { ruleset: LS_RULES, canSurrender: true })).not.toBe('R'); // 14 v 10
    // h17 additions
    const h17ls = blackjackRuleset({ s17: false, surrender: true });
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(SEVEN, HEARTS)], 11, { ruleset: h17ls, canSurrender: true })).toBe('R'); // hard 17 v A
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(FIVE, HEARTS)], 11, { ruleset: h17ls, canSurrender: true })).toBe('R'); // 15 v A
    expect(playerPlay(BASIC, [c(TEN, SPADES), c(SEVEN, HEARTS)], 11, { ruleset: LS_RULES, canSurrender: true })).not.toBe('R'); // S17: no 17 v A surrender
  });
});

describe('illustrious 18', () => {
  it('16 v 10: stand at TC 0, hit below', () => {
    expect(playerPlay(I18, [c(TEN, SPADES), c(SIX, HEARTS)], 10, { tc: 0 })).toBe('S');
    expect(playerPlay(I18, [c(TEN, SPADES), c(SIX, HEARTS)], 10, { tc: -1 })).toBe('H');
  });

  it('15 v 10: stand at TC +4', () => {
    expect(playerPlay(I18, [c(NINE, SPADES), c(SIX, HEARTS)], 10, { tc: 4 })).toBe('S');
    expect(playerPlay(I18, [c(NINE, SPADES), c(SIX, HEARTS)], 10, { tc: 3 })).toBe('H');
  });

  it('12 v 2 / 12 v 3 / 12 v 4 / 13 v 2 stands flip at their indices', () => {
    expect(playerPlay(I18, [c(TEN, SPADES), c(TWO, HEARTS)], 2, { tc: 3 })).toBe('S');
    expect(playerPlay(I18, [c(TEN, SPADES), c(TWO, HEARTS)], 2, { tc: 2 })).toBe('H');
    expect(playerPlay(I18, [c(TEN, SPADES), c(THREE, HEARTS)], 3, { tc: 2 })).toBe('S');
    expect(playerPlay(I18, [c(EIGHT, SPADES), c(FOUR, HEARTS)], 4, { tc: 0 })).toBe('S');
    expect(playerPlay(I18, [c(EIGHT, SPADES), c(FOUR, HEARTS)], 4, { tc: -1 })).toBe('H');
    expect(playerPlay(I18, [c(TEN, SPADES), c(THREE, HEARTS)], 2, { tc: -1 })).toBe('S'); // 13 v 2
    expect(playerPlay(I18, [c(TEN, SPADES), c(THREE, HEARTS)], 2, { tc: -2 })).toBe('H');
  });

  it('11 v A: S17 doubles at +1, H17 at -1', () => {
    expect(playerPlay(I18, [c(SIX, SPADES), c(FIVE, HEARTS)], 11, { tc: 1 })).toBe('D');
    expect(playerPlay(I18, [c(SIX, SPADES), c(FIVE, HEARTS)], 11, { tc: 0 })).toBe('H');
    const h17 = blackjackRuleset({ s17: false });
    expect(playerPlay(I18, [c(SIX, SPADES), c(FIVE, HEARTS)], 11, { tc: -1, ruleset: h17 })).toBe('D');
    expect(playerPlay(I18, [c(SIX, SPADES), c(FIVE, HEARTS)], 11, { tc: -2, ruleset: h17 })).toBe('H');
  });

  it('10 v A: doubles at +4 (S17) / +3 (H17)', () => {
    expect(playerPlay(I18, [c(SIX, SPADES), c(FOUR, HEARTS)], 11, { tc: 4 })).toBe('D');
    expect(playerPlay(I18, [c(SIX, SPADES), c(FOUR, HEARTS)], 11, { tc: 3 })).toBe('H');
    const h17 = blackjackRuleset({ s17: false });
    expect(playerPlay(I18, [c(SIX, SPADES), c(FOUR, HEARTS)], 11, { tc: 3, ruleset: h17 })).toBe('D');
  });

  it('9 v 2 / 9 v 7 / 10 v 10 doubles', () => {
    expect(playerPlay(I18, [c(FIVE, SPADES), c(FOUR, HEARTS)], 2, { tc: 1 })).toBe('D');
    expect(playerPlay(I18, [c(FIVE, SPADES), c(FOUR, HEARTS)], 7, { tc: 3 })).toBe('D');
    expect(playerPlay(I18, [c(SIX, SPADES), c(FOUR, HEARTS)], 10, { tc: 4 })).toBe('D');
  });

  it('10,10 v 5 splits at +5; below stands', () => {
    expect(playerPlay(I18, [c(K, SPADES), c(Q, HEARTS)], 5, { tc: 5, canSplit: true })).toBe('P');
    expect(playerPlay(I18, [c(K, SPADES), c(Q, HEARTS)], 5, { tc: 4, canSplit: true })).toBe('S');
    expect(playerPlay(I18, [c(K, SPADES), c(Q, HEARTS)], 6, { tc: 4, canSplit: true })).toBe('P');
  });

  it('16 v 9 stands at +5', () => {
    expect(playerPlay(I18, [c(SEVEN, SPADES), c(NINE, HEARTS)], 9, { tc: 5 })).toBe('S');
    expect(playerPlay(I18, [c(SEVEN, SPADES), c(NINE, HEARTS)], 9, { tc: 4 })).toBe('H');
  });

  it('insurance by index: take at +3, never below; Sp21 never', () => {
    expect(I18.insurance({ ruleset: blackjackRuleset(), upcard: c(A, SPADES), betUnits: 1, tc: 3, rawTc: 3 })).toBe(true);
    expect(I18.insurance({ ruleset: blackjackRuleset(), upcard: c(A, SPADES), betUnits: 1, tc: 2, rawTc: 2 })).toBe(false);
    expect(I18.insurance({ ruleset: blackjackRuleset(), upcard: c(A, SPADES), betUnits: 1, tc: 7, rawTc: 7 })).toBe(true);
    expect(I18.insurance({ ruleset: spanish21Ruleset(), upcard: c(A, SPADES), betUnits: 1, tc: 9, rawTc: 9 })).toBe(false);
  });
});

describe('fab 4', () => {
  const lsI18 = (ruleset: Ruleset) => new SimPlayer({ play: 'i18+fab4', insurance: 'index', bet: 'flat', baseUnits: 1 });

  it('14 v 10 surrenders at +3', () => {
    expect(playerPlay(lsI18(LS_RULES), [c(TEN, SPADES), c(FOUR, HEARTS)], 10, { tc: 3, canSurrender: true, ruleset: LS_RULES })).toBe('R');
    expect(playerPlay(lsI18(LS_RULES), [c(TEN, SPADES), c(FOUR, HEARTS)], 10, { tc: 2, canSurrender: true, ruleset: LS_RULES })).toBe('H');
  });

  it('15 v 9 surrenders at +2', () => {
    expect(playerPlay(lsI18(LS_RULES), [c(NINE, SPADES), c(SIX, HEARTS)], 9, { tc: 2, canSurrender: true, ruleset: LS_RULES })).toBe('R');
    expect(playerPlay(lsI18(LS_RULES), [c(NINE, SPADES), c(SIX, HEARTS)], 9, { tc: 1, canSurrender: true, ruleset: LS_RULES })).toBe('H');
  });

  it('15 v 10 surrenders at >=0 and HITS below (overriding the unconditional surrender)', () => {
    expect(playerPlay(lsI18(LS_RULES), [c(NINE, SPADES), c(SIX, HEARTS)], 10, { tc: 0, canSurrender: true, ruleset: LS_RULES })).toBe('R');
    expect(playerPlay(lsI18(LS_RULES), [c(NINE, SPADES), c(SIX, HEARTS)], 10, { tc: -1, canSurrender: true, ruleset: LS_RULES })).toBe('H');
  });

  it('15 v A: S17 index -1, H17 index +1', () => {
    expect(playerPlay(lsI18(LS_RULES), [c(TEN, SPADES), c(FIVE, HEARTS)], 11, { tc: -1, canSurrender: true, ruleset: LS_RULES })).toBe('R');
    expect(playerPlay(lsI18(LS_RULES), [c(TEN, SPADES), c(FIVE, HEARTS)], 11, { tc: -2, canSurrender: true, ruleset: LS_RULES })).toBe('H');
    const h17ls = blackjackRuleset({ s17: false, surrender: true });
    expect(playerPlay(lsI18(h17ls), [c(TEN, SPADES), c(FIVE, HEARTS)], 11, { tc: 1, canSurrender: true, ruleset: h17ls })).toBe('R');
    expect(playerPlay(lsI18(h17ls), [c(TEN, SPADES), c(FIVE, HEARTS)], 11, { tc: 0, canSurrender: true, ruleset: h17ls })).toBe('H');
  });

  it('non-Fab4 hands keep the unconditional surrender (16 v 9 at TC -5 still surrenders)', () => {
    expect(playerPlay(lsI18(LS_RULES), [c(SEVEN, SPADES), c(NINE, HEARTS)], 9, { tc: -5, canSurrender: true, ruleset: LS_RULES })).toBe('R');
  });
});

describe('betting', () => {
  it('ramp: bet scales with floored TC', () => {
    const p = new SimPlayer({
      play: 'basic',
      insurance: 'never',
      bet: 'ramp',
      baseUnits: 1,
      ramp: [
        { tc: 2, units: 2 },
        { tc: 3, units: 4 },
        { tc: 4, units: 8 },
        { tc: 5, units: 12 },
      ],
    });
    expect(p.betUnits(-3)).toBe(1);
    expect(p.betUnits(0)).toBe(1);
    expect(p.betUnits(2)).toBe(2);
    expect(p.betUnits(3)).toBe(4);
    expect(p.betUnits(4)).toBe(8);
    expect(p.betUnits(5)).toBe(12);
    expect(p.betUnits(9)).toBe(12);
  });

  it('kelly: zero or negative edge bets the minimum; positive edge scales with bankroll', () => {
    const p = new SimPlayer({
      play: 'basic',
      insurance: 'never',
      bet: 'kelly',
      baseUnits: 1,
      kellyBankroll: 1000,
      kellyFraction: 0.5,
      kellyMaxBet: 25,
      tcValuePerUnit: 0.005,
      baseHouseEdge: 0.005,
      varianceEstimate: 1.3,
    });
    expect(p.betUnits(-2)).toBe(1);
    expect(p.betUnits(0)).toBe(1); // edge -0.005
    expect(p.betUnits(1)).toBe(1); // edge 0 -> min
    // tc +3: edge = 3*0.005-0.005 = 0.01 -> 1000*0.5*0.01/1.3 = 3.85 -> 4
    expect(p.betUnits(3)).toBe(4);
    p.bankroll = 5000;
    expect(p.betUnits(3)).toBe(19); // 5000*0.5*0.01/1.3 = 19.2
    p.bankroll = 1_000_000;
    expect(p.betUnits(3)).toBe(25); // capped
  });
});
