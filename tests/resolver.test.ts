import { describe, it, expect } from 'vitest';
import { blackjackRuleset, spanish21Ruleset } from '../src/core/rules.ts';
import { playRound } from '../src/core/resolver.ts';
import { makeCard, cardValue, A, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, J, Q, K, SPADES, HEARTS, DIAMONDS, CLUBS } from '../src/core/card.ts';
import { frontLoad, makeShoe } from './helpers.ts';
import type { Action, PlayerView, Strategy } from '../src/core/strategy/view.ts';

const c = (r: number, s: number): number => makeCard(r, s);

const isPair = (v: PlayerView): boolean =>
  v.cardCount === 2 && cardValue(v.cards[0]!) === cardValue(v.cards[1]!);

const strat = (fn: (v: PlayerView) => Action, ins = false): Strategy => ({
  insurance: () => ins,
  play: fn,
});
const STAND = strat(() => 'S');

const BJ = () => blackjackRuleset({ decks: 6 });
const SP21 = () => spanish21Ruleset({ decks: 6 });

async function run(ruleset: ReturnType<typeof BJ>, deal: number[], strategy: Strategy, betUnits = 1, unitDollars = 25) {
  const shoe = makeShoe(ruleset, 42);
  frontLoad(shoe, deal);
  const result = await playRound({ ruleset, shoe, strategy, betUnits, unitDollars });
  return { result, shoe };
}

describe('naturals & payouts', () => {
  it('natural pays 3:2 and takes no cards', async () => {
    const { result, shoe } = await run(BJ(), [c(K, SPADES), c(FIVE, DIAMONDS), c(A, SPADES), c(NINE, HEARTS)], STAND);
    expect(result.net).toBe(1.5);
    expect(result.naturals).toBe(1);
    expect(shoe.dealtCount()).toBe(4);
  });

  it('natural pays 6:5 under the trap ruleset', async () => {
    const { result } = await run(
      blackjackRuleset({ decks: 1, bjPayout: 1.2 }),
      [c(K, SPADES), c(FIVE, DIAMONDS), c(A, SPADES), c(NINE, HEARTS)],
      STAND,
    );
    expect(result.net).toBe(1.2);
  });

  it('20 vs dealer 20 pushes', async () => {
    const { result } = await run(BJ(), [c(K, SPADES), c(J, DIAMONDS), c(Q, HEARTS), c(TEN, CLUBS)], STAND);
    expect(result.net).toBe(0);
  });

  it('dealer natural beats 20 via peek; round ends immediately', async () => {
    const { result, shoe } = await run(BJ(), [c(Q, DIAMONDS), c(A, SPADES), c(NINE, CLUBS), c(K, HEARTS)], STAND);
    expect(result.net).toBe(-1);
    expect(shoe.dealtCount()).toBe(4);
  });

  it('player natural pushes dealer natural (standard)', async () => {
    const { result } = await run(BJ(), [c(A, SPADES), c(A, DIAMONDS), c(K, HEARTS), c(Q, CLUBS)], STAND);
    expect(result.net).toBe(0);
  });

  it('Sp21: player natural BEATS dealer natural and pays 3:2', async () => {
    const { result } = await run(SP21(), [c(A, SPADES), c(A, DIAMONDS), c(K, HEARTS), c(Q, CLUBS)], STAND);
    expect(result.net).toBe(1.5);
  });

  it('Sp21 deck has no tens but J/Q/K work', async () => {
    const { result } = await run(SP21(), [c(K, SPADES), c(FIVE, DIAMONDS), c(A, SPADES), c(NINE, HEARTS)], STAND);
    expect(result.net).toBe(1.5);
  });
});

describe('insurance', () => {
  it('pays 2:1 when dealer has BJ; main bet loses', async () => {
    const s = strat(() => 'S', true);
    const { result, shoe } = await run(BJ(), [c(Q, DIAMONDS), c(A, SPADES), c(NINE, CLUBS), c(K, HEARTS)], s);
    expect(result.net).toBe(0); // -1 main + 2*0.5 insurance
    expect(result.totalAtRisk).toBe(1.5);
    expect(shoe.dealtCount()).toBe(4);
  });

  it('even money: natural + insurance + dealer BJ nets exactly 1.0', async () => {
    const s = strat(() => 'S', true);
    const { result } = await run(BJ(), [c(A, SPADES), c(A, DIAMONDS), c(K, HEARTS), c(Q, CLUBS)], s);
    expect(result.net).toBe(1);
  });

  it('insurance is lost when dealer has no BJ', async () => {
    const s = strat(() => 'S', true);
    const { result } = await run(BJ(), [c(Q, DIAMONDS), c(A, SPADES), c(NINE, CLUBS), c(SIX, HEARTS)], s);
    expect(result.net).toBe(0.5);
  });

  it('peek with no dealer BJ reveals nothing until round end (count invariant)', async () => {
    const { result, shoe } = await run(
      BJ(),
      [c(Q, SPADES), c(K, DIAMONDS), c(NINE, HEARTS), c(FIVE, CLUBS), c(TEN, SPADES)],
      STAND,
    );
    expect(result.net).toBe(1);
    expect(shoe.count.cardsSeen()).toBe(5);
    expect(shoe.count.cardsSeen()).toBe(shoe.dealtCount());
  });
});

describe('splits & doubles', () => {
  it('split + DAS doubles: one hand busts, one doubles to 21, dealer busts', async () => {
    const s = strat((v) => {
      if (isPair(v) && v.canSplit) return 'P';
      return 'D';
    });
    const deal = [
      c(EIGHT, SPADES), c(SIX, DIAMONDS), c(EIGHT, HEARTS), c(NINE, CLUBS),
      c(FIVE, DIAMONDS), c(TEN, SPADES), // parent: 8+5=13, double -> 23 bust (-2)
      c(SIX, CLUBS), c(SEVEN, DIAMONDS), // child: 8+6=14, double -> 21 (+2)
      c(TEN, HEARTS), // dealer 6+9=15 -> draw -> bust
    ];
    const { result, shoe } = await run(BJ(), deal, s);
    expect(result.net).toBe(0);
    expect(result.hands).toBe(2);
    expect(result.totalAtRisk).toBe(4);
    expect(shoe.count.cardsSeen()).toBe(shoe.dealtCount());
    expect(shoe.dealtCount()).toBe(9);
  });

  it('split aces take one card each (no hit)', async () => {
    const s = strat((v) => {
      if (isPair(v) && v.canSplit) return 'P';
      return 'S';
    });
    const deal = [
      c(A, SPADES), c(SIX, DIAMONDS), c(A, HEARTS), c(NINE, CLUBS),
      c(TEN, SPADES), c(J, HEARTS), // one card each -> 21, 21 (not naturals)
      c(K, CLUBS), // dealer 15 draws, busts
    ];
    const { result } = await run(BJ(), deal, s);
    expect(result.net).toBe(2);
    expect(result.hands).toBe(2);
  });

  it('RSA: split aces can resplit', async () => {
    const rules = blackjackRuleset({ decks: 6, rsa: true });
    const s = strat((v) => {
      if (isPair(v) && v.canSplit) return 'P';
      return 'S';
    });
    const deal = [
      c(A, SPADES), c(SIX, DIAMONDS), c(A, HEARTS), c(NINE, CLUBS),
      c(A, DIAMONDS), // parent draws an ace -> resplit
      c(TEN, SPADES), c(J, HEARTS), c(K, CLUBS), // one card each: 21, 21, 21
      c(Q, DIAMONDS), // dealer 15 draws, busts
    ];
    const { result } = await run(rules, deal, s);
    expect(result.hands).toBe(3);
    expect(result.net).toBe(3);
  });

  it('no RSA: aces cannot resplit (soft 12 stands)', async () => {
    const rules = blackjackRuleset({ decks: 6, rsa: false });
    const s = strat((v) => {
      if (isPair(v) && v.canSplit) return 'P';
      return 'S';
    });
    const deal = [
      c(A, SPADES), c(SIX, DIAMONDS), c(A, HEARTS), c(NINE, CLUBS),
      c(A, DIAMONDS), // parent draws an ace -> cannot resplit -> soft 12 stands
      c(TEN, SPADES), // child: 21
      c(K, CLUBS), // dealer 15 draws, busts
    ];
    const { result, shoe } = await run(rules, deal, s);
    expect(result.hands).toBe(2);
    expect(result.net).toBe(2); // soft 12 and 21 both beat the busted dealer
    expect(shoe.dealtCount()).toBe(7);
  });

  it('resplit to exactly 4 hands (cap), blind-split strategy clamped', async () => {
    const s = strat(() => 'P');
    const deal = [
      c(EIGHT, SPADES), c(SIX, DIAMONDS), c(EIGHT, HEARTS), c(NINE, CLUBS),
      c(EIGHT, DIAMONDS), c(EIGHT, CLUBS), // resplits to 4 hands
      c(TEN, SPADES), c(TEN, HEARTS), c(TEN, DIAMONDS), c(K, CLUBS), // 18 each
      c(Q, DIAMONDS), // dealer 15 draws, busts
    ];
    const { result } = await run(BJ(), deal, s);
    expect(result.hands).toBe(4);
    expect(result.net).toBe(4);
  });

  it('D clamped to H on 3-card hands in standard blackjack', async () => {
    const s = strat((v) => (v.cardCount === 2 ? 'H' : 'D'));
    const deal = [
      c(TWO, SPADES), c(SIX, DIAMONDS), c(THREE, HEARTS), c(NINE, CLUBS),
      c(FOUR, DIAMONDS), // 9
      c(FIVE, CLUBS), // 14 (D clamped to H)
      c(K, SPADES), // bust
    ];
    const { result, shoe } = await run(BJ(), deal, s);
    expect(result.net).toBe(-1);
    expect(shoe.dealtCount()).toBe(7);
  });
});

describe('surrender & H17', () => {
  it('late surrender loses half', async () => {
    const rules = blackjackRuleset({ decks: 6, surrender: true });
    const s = strat(() => 'R');
    const { result } = await run(rules, [c(EIGHT, SPADES), c(TEN, DIAMONDS), c(EIGHT, HEARTS), c(NINE, CLUBS)], s);
    expect(result.net).toBe(-0.5);
  });

  it('17 vs dealer soft 17: S17 pushes, H17 dealer busts and player wins', async () => {
    const deal = [
      c(TEN, SPADES), c(A, DIAMONDS), c(SEVEN, HEARTS), c(SIX, CLUBS),
      c(NINE, DIAMONDS), c(TEN, HEARTS), // H17: soft 17 -> hit -> 16 -> hit -> bust
    ];
    const s17 = await run(blackjackRuleset({ decks: 6, s17: true }), deal, STAND);
    expect(s17.result.net).toBe(0);
    expect(s17.shoe.dealtCount()).toBe(4);
    const h17 = await run(blackjackRuleset({ decks: 6, s17: false }), deal, STAND);
    expect(h17.result.net).toBe(1);
    expect(h17.shoe.dealtCount()).toBe(6);
  });
});

describe('spanish 21 rules', () => {
  it('player 21 always wins immediately (dealer never draws)', async () => {
    const s = strat((v) => (v.cardCount === 2 ? 'H' : 'S'));
    const deal = [c(FIVE, SPADES), c(SEVEN, DIAMONDS), c(SIX, HEARTS), c(NINE, CLUBS), c(J, SPADES)];
    const { result, shoe } = await run(SP21(), deal, s);
    expect(result.net).toBe(1);
    expect(shoe.dealtCount()).toBe(5);
  });

  it('5-card 21 pays 3:2', async () => {
    const s = strat((v) => (v.total < 21 ? 'H' : 'S'));
    const deal = [
      c(TWO, SPADES), c(SEVEN, DIAMONDS), c(THREE, HEARTS), c(NINE, CLUBS),
      c(FOUR, DIAMONDS), c(FIVE, CLUBS), c(SEVEN, SPADES),
    ];
    const { result, shoe } = await run(SP21(), deal, s);
    expect(result.net).toBe(1.5);
    expect(shoe.dealtCount()).toBe(7);
  });

  it('6-7-8 of spades pays 3:1', async () => {
    const s = strat((v) => (v.total < 21 ? 'H' : 'S'));
    const deal = [c(SIX, SPADES), c(TWO, DIAMONDS), c(SEVEN, SPADES), c(NINE, CLUBS), c(EIGHT, SPADES)];
    const { result } = await run(SP21(), deal, s);
    expect(result.net).toBe(3);
  });

  it('doubling voids the bonus: doubled 5-card 21 pays even money on 2x', async () => {
    const s = strat((v) => (v.total === 14 ? 'D' : v.total < 21 ? 'H' : 'S'));
    const deal = [
      c(TWO, SPADES), c(TWO, DIAMONDS), c(THREE, HEARTS), c(NINE, CLUBS),
      c(FOUR, DIAMONDS), c(FIVE, CLUBS), // 14 -> double
      c(SEVEN, SPADES), // 5-card 21, doubled -> even money on 2x
    ];
    const { result } = await run(SP21(), deal, s);
    expect(result.net).toBe(2);
  });

  it('bonuses void after split (design D): split-hand 7-7-7 pays even money only', async () => {
    const s = strat((v) => {
      if (isPair(v) && !v.fromSplit && v.canSplit) return 'P';
      return v.total < 21 ? 'H' : 'S';
    });
    const deal = [
      c(SEVEN, SPADES), c(TWO, DIAMONDS), c(SEVEN, HEARTS), c(NINE, CLUBS),
      c(SEVEN, DIAMONDS), // parent: 7♠+7♦ = 14
      c(SEVEN, CLUBS), // hit -> 21: mixed 7-7-7, fromSplit -> void -> even money
      c(FIVE, HEARTS), c(FOUR, DIAMONDS), c(FIVE, SPADES), // child: 7♥+5+4+5 = 21 (5-card, void)
    ];
    const { result } = await run(SP21(), deal, s);
    expect(result.net).toBe(2); // mixed 7-7-7 would have paid 1.5; 5-card 21 would have paid 1.5
  });

  it('super bonus: suited 7-7-7 vs dealer 7 pays $5000 at $25 units (200u)', async () => {
    const s = strat((v) => (v.total < 21 ? 'H' : 'S'));
    const deal = [c(SEVEN, SPADES), c(SEVEN, DIAMONDS), c(SEVEN, SPADES), c(NINE, CLUBS), c(SEVEN, SPADES)];
    const { result, shoe } = await run(SP21(), deal, s);
    expect(result.net).toBe(200);
    expect(shoe.dealtCount()).toBe(5);
  });

  it('super bonus tier: $1000 at $10 units (100u)', async () => {
    const s = strat((v) => (v.total < 21 ? 'H' : 'S'));
    const deal = [c(SEVEN, HEARTS), c(SEVEN, DIAMONDS), c(SEVEN, HEARTS), c(NINE, CLUBS), c(SEVEN, HEARTS)];
    const { result } = await run(SP21(), deal, s, 1, 10);
    expect(result.net).toBe(100);
  });

  it('double-down rescue: forfeit exactly the original bet', async () => {
    const s = strat((v) => (v.cardCount === 2 && v.total === 11 ? 'D' : v.canRescue ? 'RESCUE' : 'S'));
    const deal = [c(FIVE, SPADES), c(K, DIAMONDS), c(SIX, HEARTS), c(SIX, CLUBS), c(FOUR, SPADES)];
    const { result, shoe } = await run(SP21(), deal, s);
    expect(result.net).toBe(-1); // doubled 15 vs 10: rescued for -1 (not -2)
    expect(shoe.dealtCount()).toBe(5);
  });

  it('rescue not taken on strong doubled hands', async () => {
    const s = strat((v) => (v.cardCount === 2 && v.total === 11 ? 'D' : 'S'));
    const deal = [
      c(FIVE, SPADES), c(K, DIAMONDS), c(SIX, HEARTS), c(SIX, CLUBS),
      c(EIGHT, SPADES), // doubled to 19 vs K -> stand
      c(K, HEARTS), // dealer 6+6=12 -> draw -> bust
    ];
    const { result } = await run(SP21(), deal, s);
    expect(result.net).toBe(2);
  });

  it('Sp21 split aces draw one card, play like normal split hands', async () => {
    const s = strat((v) => {
      if (isPair(v) && !v.fromSplit && v.canSplit) return 'P';
      return 'S';
    });
    const deal = [
      c(A, SPADES), c(SEVEN, DIAMONDS), c(A, HEARTS), c(NINE, CLUBS),
      c(FIVE, DIAMONDS), // parent A♠+5 = soft 16, stands
      c(K, CLUBS), // child A♥+K = 21 -> auto-win even money (not a natural)
      c(J, SPADES), // dealer 7+9=16 -> draw -> bust
    ];
    const { result, shoe } = await run(SP21(), deal, s);
    expect(result.hands).toBe(2);
    expect(result.net).toBe(2);
    expect(shoe.dealtCount()).toBe(7);
  });
});
