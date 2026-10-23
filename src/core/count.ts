/**
 * CountEngine (S3, S12, Errata E1). Hi-Lo (52c): A −1 · 2-6 +1 · 7-9 0 · 10v −1.
 * Monkey (48c, balanced): A −2 · 2-6 +1 · 7-9 0 · J/Q/K −1. TC = RC ÷ max(decks remaining, 0.5), floored (Schlesinger).
 * Knowledge rule: counts anything seen or quantified — the hole card only at reveal; CSM recycle un-sees discards.
 */
import { cardRankIdx, deckSize } from './card.ts';

export type CountSystem = 'hilo' | 'monkey' | 'none';

/** The per-rank tag table for a count system (index = rankIdx, 13 entries). */
export function tagTable(system: 'hilo' | 'monkey'): Int8Array {
  const t = new Int8Array(13);
  switch (system) {
    case 'hilo':
      t[0] = -1; // A
      for (let r = 1; r <= 8; r++) t[r] = r <= 5 ? 1 : 0;
      for (let r = 9; r <= 12; r++) t[r] = -1;
      break;
    case 'monkey':
      t[0] = -2; // A
      for (let r = 1; r <= 8; r++) t[r] = r <= 5 ? 1 : 0;
      t[9] = 0; // '10' does not exist in a Spanish deck (tag stays 0, never used)
      for (let r = 10; r <= 12; r++) t[r] = -1; // J/Q/K
      break;
  }
  return t;
}

/** Running/true count over one ruleset's shoe; exposure events drive it, not deals. */
export class CountEngine {
  readonly tags: Int8Array;
  private rc = 0;
  private seen = 0;
  private readonly totalCards: number;
  private readonly cardsPerDeck: number;

  constructor(
    system: CountSystem,
    totalCards: number,
    spanish: boolean,
  ) {
    this.tags = system === 'none' ? new Int8Array(13) : tagTable(system);
    this.totalCards = totalCards;
    this.cardsPerDeck = deckSize(spanish);
  }

  /** Zero rc and the seen count (fresh shoe). */
  reset(): void {
    this.rc = 0;
    this.seen = 0;
  }

  /** A card (or cards) becomes visible / quantified. */
  expose(...cards: number[]): void {
    for (const c of cards) {
      this.rc += this.tags[cardRankIdx(c)];
      this.seen++;
    }
  }

  /** Known removal from play (Hot Hand / Cold Deck): face-down out-of-play counts as seen (S12). */
  knownRemoval(...cards: number[]): void {
    for (const c of cards) {
      this.rc += this.tags[cardRankIdx(c)];
      this.seen++;
    }
  }

  /** CSM recycle: discards return to unknown — their tags are subtracted. */
  recycle(...cards: number[]): void {
    for (const c of cards) {
      this.rc -= this.tags[cardRankIdx(c)];
      this.seen--;
    }
  }

  /** The raw running count. */
  runningCount(): number {
    return this.rc;
  }

  /** Cards exposed (or quantified) so far. */
  cardsSeen(): number {
    return this.seen;
  }

  /** Decks remaining by seen-count (never negative). */
  decksRemaining(): number {
    return Math.max((this.totalCards - this.seen) / this.cardsPerDeck, 0);
  }

  /** Floored true count (default convention, user-locked). */
  trueCount(): number {
    return Math.floor(this.rc / Math.max(this.decksRemaining(), 0.5));
  }

  /** Unfloored (raw) true count — used for Kelly sizing and diagnostics. */
  rawTrueCount(): number {
    return this.rc / Math.max(this.decksRemaining(), 0.5);
  }
}
