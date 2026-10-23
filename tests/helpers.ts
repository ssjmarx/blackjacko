/**
 * Test helpers: forced deal sequences and view construction.
 */
import { Shoe } from '../src/core/shoe.ts';
import { mulberry32 } from '../src/core/rng.ts';
import type { Ruleset } from '../src/core/rules.ts';
import type { PlayerView } from '../src/core/strategy/view.ts';
import { blackjackRuleset } from '../src/core/rules.ts';
import { handTotal, isSplitPair } from '../src/core/hand.ts';
import { cardValue } from '../src/core/card.ts';

/**
 * Place an exact upcoming deal sequence at the front of the shoe without
 * consuming anything. Position 0..3 map to p1, up, p2, hole; further entries
 * are subsequent draws in deal order.
 */
export function frontLoad(shoe: Shoe, cards: number[]): void {
  const base = shoe.dealtCount();
  for (let i = 0; i < cards.length; i++) {
    const target = base + i;
    const want = cards[i]!;
    let found = -1;
    for (let j = target; j < shoe.total; j++) {
      if (shoe.cards[j] === want) {
        found = j;
        break;
      }
    }
    if (found < 0) throw new Error(`card byte ${want} not found for frontLoad`);
    const tmp = shoe.cards[target] as number;
    shoe.cards[target] = want;
    shoe.cards[found] = tmp;
  }
}

export function makeShoe(ruleset: Ruleset, seed = 1): Shoe {
  return new Shoe(ruleset, mulberry32(seed));
}

export function makeView(over: Partial<PlayerView> & { cards: number[]; up: number }): PlayerView {
  const ht = handTotal(over.cards);
  const ruleset = over.ruleset ?? blackjackRuleset();
  const pair =
    over.cards.length === 2 && cardValue(over.cards[0]!) === cardValue(over.cards[1]!) ? cardValue(over.cards[0]!) : 0;
  return {
    ruleset,
    cards: over.cards,
    total: ht.total,
    soft: ht.soft,
    cardCount: over.cards.length,
    doubled: over.doubled ?? false,
    fromSplit: over.fromSplit ?? false,
    splitOf: over.splitOf ?? 0,
    upcard: over.upcard ?? over.up,
    up: over.up,
    canDouble: over.canDouble ?? true,
    canSplit: over.canSplit ?? (pair > 0 && isSplitPair(over.cards)),
    canSurrender: over.canSurrender ?? false,
    canRescue: over.canRescue ?? false,
    tc: over.tc ?? null,
    rawTc: over.rawTc ?? over.tc ?? null,
    runningCount: over.runningCount ?? null,
    decksRemaining: over.decksRemaining ?? null,
  };
}
