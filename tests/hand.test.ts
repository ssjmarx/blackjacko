import { describe, it, expect } from 'vitest';
import {
  handTotal,
  isNatural,
  isBust,
  isSplitPair,
  sp21BonusMultiplier,
  isSuitedTripleSeven,
  sp21TripleBonusPossible,
} from '../src/core/hand.ts';
import { makeCard, A, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, J, Q, K, SPADES, HEARTS, DIAMONDS, CLUBS } from '../src/core/card.ts';

const c = (rank: number, suit: number): number => makeCard(rank, suit);

describe('hand totals', () => {
  it('computes hard totals', () => {
    expect(handTotal([c(K, SPADES), c(SIX, HEARTS)]).total).toBe(16);
    expect(handTotal([c(TEN, SPADES), c(NINE, HEARTS)]).total).toBe(19);
  });
  it('handles aces', () => {
    expect(handTotal([c(A, SPADES), c(SIX, HEARTS)])).toEqual({ total: 17, soft: true });
    expect(handTotal([c(A, SPADES), c(A, HEARTS)])).toEqual({ total: 12, soft: true });
    expect(handTotal([c(A, SPADES), c(A, HEARTS), c(NINE, DIAMONDS)])).toEqual({ total: 21, soft: true });
    expect(handTotal([c(A, SPADES), c(A, HEARTS), c(A, DIAMONDS), c(A, CLUBS)])).toEqual({ total: 14, soft: true });
    expect(handTotal([c(A, SPADES), c(TEN, HEARTS)])).toEqual({ total: 21, soft: true });
    // soft hand pushed over 21 reduces
    expect(handTotal([c(A, SPADES), c(FIVE, HEARTS), c(TEN, DIAMONDS)])).toEqual({ total: 16, soft: false });
  });
  it('bust detection', () => {
    expect(isBust([c(K, SPADES), c(SIX, HEARTS), c(K, HEARTS)])).toBe(true);
    expect(isBust([c(K, SPADES), c(SIX, HEARTS)])).toBe(false);
  });
  it('naturals are 2-card 21s only', () => {
    expect(isNatural([c(A, SPADES), c(K, HEARTS)])).toBe(true);
    expect(isNatural([c(A, SPADES), c(FIVE, HEARTS), c(FIVE, DIAMONDS)])).toBe(false);
  });
  it('split pairs by face value (mixed 10s splittable)', () => {
    expect(isSplitPair([c(K, SPADES), c(TEN, HEARTS)])).toBe(true);
    expect(isSplitPair([c(Q, SPADES), c(J, HEARTS)])).toBe(true);
    expect(isSplitPair([c(K, SPADES), c(A, HEARTS)])).toBe(false);
    expect(isSplitPair([c(SEVEN, SPADES), c(SEVEN, HEARTS)])).toBe(true);
  });
});

describe('spanish 21 bonuses', () => {
  it('3-card 6-7-8 mixed pays 3:2', () => {
    expect(sp21BonusMultiplier([c(SIX, SPADES), c(SEVEN, HEARTS), c(EIGHT, DIAMONDS)])).toBe(1.5);
  });
  it('3-card 6-7-8 suited non-spades pays 2:1', () => {
    expect(sp21BonusMultiplier([c(SIX, HEARTS), c(SEVEN, HEARTS), c(EIGHT, HEARTS)])).toBe(2);
  });
  it('3-card 6-7-8 of spades pays 3:1', () => {
    expect(sp21BonusMultiplier([c(SIX, SPADES), c(SEVEN, SPADES), c(EIGHT, SPADES)])).toBe(3);
  });
  it('7-7-7 mixed / suited / spades', () => {
    expect(sp21BonusMultiplier([c(SEVEN, SPADES), c(SEVEN, HEARTS), c(SEVEN, DIAMONDS)])).toBe(1.5);
    expect(sp21BonusMultiplier([c(SEVEN, HEARTS), c(SEVEN, HEARTS), c(SEVEN, HEARTS)])).toBe(2);
    expect(sp21BonusMultiplier([c(SEVEN, SPADES), c(SEVEN, SPADES), c(SEVEN, SPADES)])).toBe(3);
  });
  it('5/6/7-card 21s pay 3:2 / 2:1 / 3:1', () => {
    const five = [c(TWO, SPADES), c(THREE, HEARTS), c(FOUR, DIAMONDS), c(FIVE, CLUBS), c(SEVEN, SPADES)];
    expect(handTotal(five).total).toBe(21);
    expect(sp21BonusMultiplier(five)).toBe(1.5);
    const six = [c(A, SPADES), c(TWO, HEARTS), c(THREE, DIAMONDS), c(FOUR, CLUBS), c(FIVE, SPADES), c(SIX, HEARTS)];
    expect(handTotal(six).total).toBe(21);
    expect(sp21BonusMultiplier(six)).toBe(2);
    const seven = [c(A, SPADES), c(TWO, HEARTS), c(TWO, DIAMONDS), c(TWO, CLUBS), c(FOUR, SPADES), c(FIVE, HEARTS), c(FIVE, DIAMONDS)];
    expect(handTotal(seven).total).toBe(21);
    expect(sp21BonusMultiplier(seven)).toBe(3);
  });
  it('4-card 21 and plain totals pay no bonus', () => {
    const four21 = [c(FIVE, SPADES), c(FIVE, HEARTS), c(SIX, DIAMONDS), c(FIVE, CLUBS)];
    expect(handTotal(four21).total).toBe(21);
    expect(sp21BonusMultiplier(four21)).toBe(0);
  });
  it('suited triple seven detection', () => {
    expect(isSuitedTripleSeven([c(SEVEN, SPADES), c(SEVEN, SPADES), c(SEVEN, SPADES)])).toBe(true);
    expect(isSuitedTripleSeven([c(SEVEN, SPADES), c(SEVEN, HEARTS), c(SEVEN, SPADES)])).toBe(false);
    expect(isSuitedTripleSeven([c(SEVEN, SPADES), c(SEVEN, SPADES)])).toBe(false);
  });
  it('triple bonus possibility for 2-card hands (chart * modifier)', () => {
    expect(sp21TripleBonusPossible([c(SIX, SPADES), c(SEVEN, HEARTS)])).toBe(true); // 678 possible
    expect(sp21TripleBonusPossible([c(SEVEN, SPADES), c(EIGHT, HEARTS)])).toBe(true);
    expect(sp21TripleBonusPossible([c(SEVEN, SPADES), c(SEVEN, HEARTS)])).toBe(true); // 777 possible
    expect(sp21TripleBonusPossible([c(FIVE, SPADES), c(EIGHT, HEARTS)])).toBe(false);
    expect(sp21TripleBonusPossible([c(SEVEN, SPADES), c(K, HEARTS)])).toBe(false);
    expect(sp21TripleBonusPossible([c(SIX, SPADES), c(EIGHT, HEARTS), c(A, DIAMONDS)])).toBe(false);
  });
});
