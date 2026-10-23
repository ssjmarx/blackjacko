/**
 * Hand evaluation: totals, naturals, and Spanish 21 bonus detection.
 * Pure functions over card-byte arrays; the resolver and stats consume them.
 * Bonus voiding after double/split is the caller's job (ruleset flags).
 */
import { cardRankIdx, cardSuit, cardValue, isAce, SPADES } from './card.ts';

export interface HandTotal {
  total: number;
  /** true when an ace is counted as 11 */
  soft: boolean;
}

/** Best blackjack total (aces degrade 11→1 as needed) plus whether it is soft. */
export function handTotal(cards: number[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (let i = 0; i < cards.length; i++) {
    const v = cardValue(cards[i]);
    total += v;
    if (isAce(cards[i])) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

/** True for a 2-card 21 (blackjack / natural). */
export function isNatural(cards: number[]): boolean {
  if (cards.length !== 2) return false;
  return handTotal(cards).total === 21;
}

/** True when the best total exceeds 21. */
export function isBust(cards: number[]): boolean {
  return handTotal(cards).total > 21;
}

/** True when two cards share the same face value (split eligibility, 10s mix allowed). */
export function isSplitPair(cards: number[]): boolean {
  if (cards.length !== 2) return false;
  return cardValue(cards[0]) === cardValue(cards[1]);
}

/** True when two cards share the same rank (used for Sp21 suited-7 checks and stats). */
export function sameRank(a: number, b: number): boolean {
  return cardRankIdx(a) === cardRankIdx(b);
}

/** Can this 2-card hand still complete a 3-card 6-7-8 or 7-7-7 bonus? (Sp21 chart '*' modifier) */
export function sp21TripleBonusPossible(cards: number[]): boolean {
  if (cards.length !== 2) return false;
  const r0 = cardRankIdx(cards[0]);
  const r1 = cardRankIdx(cards[1]);
  const SIX = 5, SEVEN = 6, EIGHT = 7;
  if (r0 === SEVEN && r1 === SEVEN) return true; // 7-7-7 possible
  // 6-7-8 possible: both ranks in {6,7,8} and distinct
  const inSet = (r: number) => r === SIX || r === SEVEN || r === EIGHT;
  return inSet(r0) && inSet(r1) && r0 !== r1;
}

/** Sp21 bonus multiplier on a 21 (3c 678/777: 1.5 mixed / 2 suited / 3 spades; 5c 1.5, 6c 2, 7c+ 3), else 0. */
export function sp21BonusMultiplier(cards: number[]): number {
  const n = cards.length;
  if (handTotal(cards).total !== 21) return 0;
  if (n === 3) {
    const ranks = cards.map((c) => cardRankIdx(c)).sort((a, b) => a - b);
    const SIX = 5, SEVEN = 6, EIGHT = 7;
    const is678 = ranks[0] === SIX && ranks[1] === SEVEN && ranks[2] === EIGHT;
    const is777 = ranks[0] === SEVEN && ranks[1] === SEVEN && ranks[2] === SEVEN;
    if (!is678 && !is777) return 0;
    const allSpades = cards.every((c) => cardSuit(c) === SPADES);
    if (allSpades) return 3;
    const allSuited =
      cardSuit(cards[0]) === cardSuit(cards[1]) && cardSuit(cards[1]) === cardSuit(cards[2]);
    return allSuited ? 2 : 1.5;
  }
  if (n === 5) return 1.5;
  if (n === 6) return 2;
  if (n >= 7) return 3;
  return 0;
}

/** Suited 7-7-7 in exactly 3 cards (super bonus precondition). */
export function isSuitedTripleSeven(cards: number[]): boolean {
  if (cards.length !== 3) return false;
  const SEVEN = 6;
  if (!cards.every((c) => cardRankIdx(c) === SEVEN)) return false;
  const s = cardSuit(cards[0]);
  return cardSuit(cards[1]) === s && cardSuit(cards[2]) === s;
}
