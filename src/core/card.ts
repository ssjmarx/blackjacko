/**
 * Card encoding for both 52-card and 48-card (Spanish) decks; byte = rankIdx * 4 + suit.
 * rankIdx: 0=A, 1..8 = 2..9, 9='10', 10=J, 11=Q, 12=K; suit: 0=spades, 1=hearts, 2=diamonds, 3=clubs.
 * Spanish decks omit rankIdx 9 (the '10'), giving the 48-card shoe.
 */
export const RANK_IDX = {
  ace: 0,
  two: 1,
  three: 2,
  four: 3,
  five: 4,
  six: 5,
  seven: 6,
  eight: 7,
  nine: 8,
  ten: 9,
  jack: 10,
  queen: 11,
  king: 12,
} as const;

export const RANK_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const SUIT_NAMES = ['S', 'H', 'D', 'C'] as const; // spades, hearts, diamonds, clubs

export const SPADES = 0;
export const HEARTS = 1;
export const DIAMONDS = 2;
export const CLUBS = 3;

// short rank aliases for tests and strategy tables
export const A = RANK_IDX.ace;
export const TWO = RANK_IDX.two;
export const THREE = RANK_IDX.three;
export const FOUR = RANK_IDX.four;
export const FIVE = RANK_IDX.five;
export const SIX = RANK_IDX.six;
export const SEVEN = RANK_IDX.seven;
export const EIGHT = RANK_IDX.eight;
export const NINE = RANK_IDX.nine;
export const TEN = RANK_IDX.ten;
export const J = RANK_IDX.jack;
export const Q = RANK_IDX.queen;
export const K = RANK_IDX.king;

/** Pack a rank and suit into the one-byte card encoding. */
export function makeCard(rankIdx: number, suit: number): number {
  return rankIdx * 4 + suit;
}

/** The rank index (0=A .. 12=K) of a card byte. */
export function cardRankIdx(card: number): number {
  return card >> 2;
}

/** The suit (0=spades, 1=hearts, 2=diamonds, 3=clubs) of a card byte. */
export function cardSuit(card: number): number {
  return card & 3;
}

/** Blackjack value of a card: ace = 11 (soft, reduced where needed), faces/10 = 10. */
export function cardValue(card: number): number {
  const r = card >> 2;
  return r === 0 ? 11 : r >= 9 ? 10 : r + 1;
}

/** Value for strategy keys: face cards collapse to 10, ace stays 11. */
export function cardFaceValue(card: number): number {
  const r = card >> 2;
  return r === 0 ? 11 : r >= 9 ? 10 : r + 1;
}

/** True for any 10-valued card (10/J/Q/K) — the Hi-Lo −1 class. */
export function isTenValue(card: number): boolean {
  return (card >> 2) >= 9;
}

/** True when the card byte is an ace (rankIdx 0). */
export function isAce(card: number): boolean {
  return (card >> 2) === 0;
}

/** Human-readable short name, e.g. "AS" or "TH" (rank letter then suit letter). */
export function cardName(card: number): string {
  return `${RANK_NAMES[card >> 2]}${SUIT_NAMES[card & 3]}`;
}

/** Upcard value used as strategy table key: 2..9, 10, 11(ace). */
export function upcardValue(card: number): number {
  return cardFaceValue(card);
}

/** Number of distinct ranks in this game's deck (13 standard, 12 Spanish). */
export function rankCount(spanish: boolean): number {
  return spanish ? 12 : 13;
}

/** Deck size in cards. */
export function deckSize(spanish: boolean): number {
  return spanish ? 48 : 52;
}

/** Build the full ordered card list for a shoe of `decks` decks (Spanish skips the '10' rank). */
export function buildDeck(decks: number, spanish: boolean): number[] {
  const cards: number[] = [];
  for (let d = 0; d < decks; d++) {
    for (let r = 0; r < 13; r++) {
      if (spanish && r === RANK_IDX.ten) continue;
      for (let s = 0; s < 4; s++) cards.push(makeCard(r, s));
    }
  }
  return cards;
}
