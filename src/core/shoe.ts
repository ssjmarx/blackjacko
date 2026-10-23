/**
 * Shoe (S12 MODULE Shoe): queue + cut card + known-removal + CSM recycle.
 * Dealing does NOT update the count — exposure events do; the caller (HandResolver)
 * owns when cards become "seen" (the hole card stays uncounted until revealed).
 */
import { buildDeck, cardRankIdx, isTenValue } from './card.ts';
import type { RngFn } from './rng.ts';
import { CountEngine, type CountSystem } from './count.ts';
import type { Ruleset } from './rules.ts';

/** The dealt shoe: Fisher-Yates queue, cut card, count engine, CSM recycle; testing helpers included. */
export class Shoe {
  readonly cards: Uint8Array;
  readonly total: number;
  private pos = 0;
  private readonly rng: RngFn;
  readonly count: CountEngine;
  private readonly ruleset: Ruleset;
  readonly cutIndex: number;
  /** cards removed from play by known-removal (Hot Hand / Cold Deck, later stages) */
  private deadCards = 0;
  readonly discards: number[] = [];

  constructor(ruleset: Ruleset, rng: RngFn) {
    this.ruleset = ruleset;
    this.rng = rng;
    const deck = buildDeck(ruleset.decks, ruleset.spanish);
    this.cards = Uint8Array.from(deck);
    this.total = deck.length;
    const system: CountSystem =
      ruleset.countSystem === 'monkey' ? 'monkey' : ruleset.countSystem === 'hilo' ? 'hilo' : 'none';
    this.count = new CountEngine(system, this.total, ruleset.spanish);
    this.cutIndex = Math.floor(this.total * ruleset.pen);
    this.shuffle();
  }

  /** Fisher-Yates over the full shoe; resets count to fresh-shoe state. */
  shuffle(): void {
    const a = this.cards;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = a[i] as number;
      a[i] = a[j] as number;
      a[j] = tmp;
    }
    this.pos = 0;
    this.deadCards = 0;
    this.discards.length = 0;
    this.count.reset();
  }

  /** Pop the next card (reshuffles first if a deep-split round exhausts the shoe — ~1e-8/round). */
  deal(): number {
    if (this.pos >= this.total - this.deadCards) {
      // freak deep-split round exhausted the shoe: reshuffle and continue.
      // Expected ~1e-8/round; counted so sims can report it.
      this.exhaustionEvents++;
      this.shuffle();
    }
    const c = this.cards[this.pos] as number;
    this.pos++;
    return c;
  }

  exhaustionEvents = 0;

  /** Deal a specific card (testing): swaps the wanted card to the front. */
  dealSpecific(card: number): number {
    for (let i = this.pos; i < this.total - this.deadCards; i++) {
      if (this.cards[i] === card) {
        const tmp = this.cards[this.pos] as number;
        this.cards[this.pos] = card;
        this.cards[i] = tmp;
        return this.deal();
      }
    }
    throw new Error(`card ${card} not available in shoe`);
  }

  /** Deal the next card of a given rank (testing only). */
  dealRank(rankIdx: number): number {
    for (let i = this.pos; i < this.total - this.deadCards; i++) {
      if (cardRankIdx(this.cards[i] as number) === rankIdx) {
        const tmp = this.cards[this.pos] as number;
        this.cards[this.pos] = this.cards[i] as number;
        this.cards[i] = tmp;
        return this.deal();
      }
    }
    throw new Error(`rank ${rankIdx} not available in shoe`);
  }

  /** Deal the next ten-value card (testing only). */
  dealTenValue(): number {
    for (let i = this.pos; i < this.total - this.deadCards; i++) {
      if (isTenValue(this.cards[i] as number)) {
        const tmp = this.cards[this.pos] as number;
        this.cards[this.pos] = this.cards[i] as number;
        this.cards[i] = tmp;
        return this.deal();
      }
    }
    throw new Error('no ten-value card available in shoe');
  }

  /** Cards left in the live queue (total minus dead minus dealt). */
  remaining(): number {
    return this.total - this.deadCards - this.pos;
  }

  /** Cards dealt so far (penetration diagnostics). */
  dealtCount(): number {
    return this.pos;
  }

  /** True when a new round must trigger a shuffle first (cut card is out). */
  needsShuffle(): boolean {
    return this.pos >= this.cutIndex;
  }

  /** Stage a finished round's card for the CSM (already counted at exposure). */
  discard(card: number): void {
    this.discards.push(card);
  }

  /** Known removal (S12): pull `n` low/high cards from the next `windowSize`, face-down out of play (stage-3 promos). */
  removeKnown(n: number, klass: 'low' | 'high', windowSize = 20): number[] {
    const removed: number[] = [];
    let i = this.pos;
    while (i < this.pos + windowSize && i < this.total - this.deadCards && removed.length < n) {
      const c = this.cards[i] as number;
      const r = cardRankIdx(c);
      // Hi-Lo / Monkey share rank classes: lows 2-6, highs = 10-value + ace
      const isLow = r >= 1 && r <= 5;
      const isHigh = isTenValue(c) || r === 0;
      if ((klass === 'low' && isLow) || (klass === 'high' && isHigh)) {
        removed.push(c);
        // shift the live queue left over the removed card
        for (let j = i; j < this.total - this.deadCards - 1; j++) {
          this.cards[j] = this.cards[j + 1] as number;
        }
        this.deadCards++;
      } else {
        i++;
      }
    }
    for (const c of removed) this.count.knownRemoval(c);
    return removed;
  }

  /** CSM recycle (S12): discards rejoin the queue and become unknown again. */
  recycleDiscards(): void {
    if (this.discards.length === 0) return;
    for (const c of this.discards) this.count.recycle(c);
    const queue: number[] = [];
    for (let i = this.pos; i < this.total - this.deadCards; i++) queue.push(this.cards[i] as number);
    for (const c of this.discards) queue.push(c);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = queue[i] as number;
      queue[i] = queue[j] as number;
      queue[j] = tmp;
    }
    for (let i = 0; i < queue.length; i++) this.cards[this.pos + i] = queue[i] as number;
    this.discards.length = 0;
    void this.ruleset;
  }
}
