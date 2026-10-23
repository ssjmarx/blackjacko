import { describe, it, expect } from 'vitest';
import { Shoe } from '../src/core/shoe.ts';
import { CountEngine, tagTable } from '../src/core/count.ts';
import { mulberry32 } from '../src/core/rng.ts';
import { blackjackRuleset, spanish21Ruleset } from '../src/core/rules.ts';
import { buildDeck, cardRankIdx, RANK_IDX } from '../src/core/card.ts';

describe('Shoe', () => {
  it('is deterministic for a given seed', () => {
    const r = blackjackRuleset();
    const a = new Shoe(r, mulberry32(7));
    const b = new Shoe(r, mulberry32(7));
    for (let i = 0; i < 52; i++) expect(a.deal()).toBe(b.deal());
  });

  it('builds correct composition for 52-card decks', () => {
    const deck = buildDeck(6, false);
    expect(deck.length).toBe(312);
    const counts = new Map<number, number>();
    for (const c of deck) counts.set(cardRankIdx(c), (counts.get(cardRankIdx(c)) ?? 0) + 1);
    for (let r = 0; r < 13; r++) expect(counts.get(r)).toBe(24);
    const shoe = new Shoe(blackjackRuleset({ decks: 6 }), mulberry32(1));
    expect(shoe.total).toBe(312);
    expect(shoe.cutIndex).toBe(Math.floor(312 * 0.75));
  });

  it('builds 48-card Spanish decks with the tens removed', () => {
    const deck = buildDeck(6, true);
    expect(deck.length).toBe(288);
    const counts = new Map<number, number>();
    for (const c of deck) counts.set(cardRankIdx(c), (counts.get(cardRankIdx(c)) ?? 0) + 1);
    expect(counts.get(RANK_IDX.ten)).toBeUndefined();
    for (let r = 0; r < 13; r++) {
      if (r === RANK_IDX.ten) continue;
      expect(counts.get(r)).toBe(24);
    }
  });

  it('cut card: needsShuffle only past the cut index', () => {
    const shoe = new Shoe(blackjackRuleset({ pen: 0.5, decks: 1 }), mulberry32(1));
    expect(shoe.needsShuffle()).toBe(false);
    for (let i = 0; i < 25; i++) shoe.deal();
    expect(shoe.needsShuffle()).toBe(false);
    for (let i = 0; i < 1; i++) shoe.deal();
    expect(shoe.needsShuffle()).toBe(true); // 26 of 52 dealt = 50%
  });

  it('known removal removes the right class from the window and counts it', () => {
    const shoe = new Shoe(blackjackRuleset({ decks: 1 }), mulberry32(3));
    // expose nothing yet; remove 3 lows from the next 20
    const rc0 = shoe.count.runningCount();
    const removed = shoe.removeKnown(3, 'low', 20);
    expect(removed.length).toBe(3);
    for (const c of removed) {
      const r = cardRankIdx(c);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(5);
    }
    // Hi-Lo: each removed low adds +1
    expect(shoe.count.runningCount()).toBe(rc0 + 3);
    expect(shoe.count.cardsSeen()).toBe(3);
    // removed cards are NOT in discards
    expect(shoe.discards.length).toBe(0);
    // and they can never be dealt
    expect(shoe.remaining()).toBe(52 - 3);
  });

  it('csm recycle un-sees discards and returns RC to pre-round state', () => {
    const shoe = new Shoe(blackjackRuleset({ decks: 1 }), mulberry32(3));
    const c1 = shoe.deal();
    const c2 = shoe.deal();
    const rcAfterExposure = shoe.count.runningCount();
    const seen = shoe.count.cardsSeen();
    shoe.count.expose(c1, c2);
    const rc = shoe.count.runningCount();
    shoe.discard(c1);
    shoe.discard(c2);
    shoe.recycleDiscards();
    expect(shoe.count.runningCount()).toBe(rcAfterExposure);
    expect(shoe.count.cardsSeen()).toBe(seen);
    expect(rc).not.toBe(0); // sanity: the two cards had nonzero tags
    expect(shoe.discards.length).toBe(0);
  });
});

describe('CountEngine', () => {
  it('Hi-Lo tags sum to zero over a 52-card deck', () => {
    const deck = buildDeck(1, false);
    const t = tagTable('hilo');
    let sum = 0;
    for (const c of deck) sum += t[cardRankIdx(c)];
    expect(sum).toBe(0);
  });

  it('Monkey tags sum to zero over a 48-card Spanish deck (E1)', () => {
    const deck = buildDeck(1, true);
    const t = tagTable('monkey');
    let sum = 0;
    for (const c of deck) sum += t[cardRankIdx(c)];
    expect(sum).toBe(0); // +20 (2-6) - 12 (J/Q/K) - 8 (aces) = 0
  });

  it('Hi-Lo tag values are canonical', () => {
    const t = tagTable('hilo');
    expect(t[RANK_IDX.ace]).toBe(-1);
    expect(t[RANK_IDX.two]).toBe(1);
    expect(t[RANK_IDX.six]).toBe(1);
    expect(t[RANK_IDX.seven]).toBe(0);
    expect(t[RANK_IDX.nine]).toBe(0);
    expect(t[RANK_IDX.ten]).toBe(-1);
    expect(t[RANK_IDX.jack]).toBe(-1);
    expect(t[RANK_IDX.king]).toBe(-1);
  });

  it('Monkey tag values are canonical (A -2, J/Q/K -1, no tag for 10)', () => {
    const t = tagTable('monkey');
    expect(t[RANK_IDX.ace]).toBe(-2);
    expect(t[RANK_IDX.two]).toBe(1);
    expect(t[RANK_IDX.six]).toBe(1);
    expect(t[RANK_IDX.seven]).toBe(0);
    expect(t[RANK_IDX.jack]).toBe(-1);
    expect(t[RANK_IDX.queen]).toBe(-1);
    expect(t[RANK_IDX.king]).toBe(-1);
    expect(t[RANK_IDX.ten]).toBe(0);
  });

  it('true count uses flooring (Schlesinger convention) and the 0.5-deck floor', () => {
    const eng = new CountEngine('hilo', 312, false);
    // rc=5, 3.1 decks remaining -> floor(1.61) = 1
    for (let i = 0; i < 5; i++) eng.expose(5 * 4); // five 2s (rankIdx 1) = +5? no — card byte for rank 2
    // fix: use rank 2 cards
    eng.reset();
    const two = 1 * 4 + 0; // 2♠
    for (let i = 0; i < 5; i++) eng.expose(two);
    // seen 5 of 312 -> decks remaining = 307/52 = 5.90 -> TC = floor(5/5.90) = 0
    expect(eng.trueCount()).toBe(0);
    // expose 25 more lows: rc=30, seen 30 -> remaining 282/52=5.42 -> floor(5.53)=5
    for (let i = 0; i < 25; i++) eng.expose(two);
    expect(eng.runningCount()).toBe(30);
    expect(eng.trueCount()).toBe(5);
    // negative flooring: rc=-3, remaining ~5.4 -> floor(-0.55) = -1
    eng.reset();
    const king = 12 * 4 + 0;
    for (let i = 0; i < 3; i++) eng.expose(king);
    expect(eng.trueCount()).toBe(-1);
  });

  it('decks remaining derives from cards seen', () => {
    const eng = new CountEngine('hilo', 312, false);
    expect(eng.decksRemaining()).toBeCloseTo(6, 5);
    const two = 1 * 4 + 0;
    for (let i = 0; i < 52; i++) eng.expose(two);
    expect(eng.decksRemaining()).toBeCloseTo(5, 5);
  });

  it('spanish ruleset wires the monkey count', () => {
    const shoe = new Shoe(spanish21Ruleset({ decks: 6 }), mulberry32(1));
    const jack = 10 * 4 + 0;
    const ace = 0 * 4 + 0;
    shoe.count.expose(jack, ace); // -1 + -2 = -3
    expect(shoe.count.runningCount()).toBe(-3);
  });
});
