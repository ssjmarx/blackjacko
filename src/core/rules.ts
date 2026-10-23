/**
 * Rulesets (S2): all rules data-driven, per the locked spec.
 * US hole-card (peek) throughout — ENHC is out of scope for this stage.
 * The two factories return full Ruleset values; overrides patch any field but `name`.
 */

export type DoubleOn = 'any' | '9-11' | '10-11';

export interface Ruleset {
  name: string;
  decks: number;
  /** 48-card Spanish decks (no '10' rank) */
  spanish: boolean;
  /** fraction of the shoe dealt before the cut card forces a shuffle */
  pen: number;
  /** reshuffle before every round — measures off-the-top EV with zero cut-card effect */
  freshShoe: boolean;

  /** natural blackjack payout multiplier on the main bet (1.5 = 3:2, 1.2 = 6:5) */
  bjPayout: number;
  /** dealer stands on soft 17 */
  s17: boolean;

  doubleOn: DoubleOn;
  /** Spanish 21: double on any number of cards */
  doubleAnyNumberOfCards: boolean;
  das: boolean;
  /** resplit aces allowed */
  rsa: boolean;
  /** max total hands after splitting (2 = one split, 4 = up to three resplits) */
  resplitMax: number;
  /** may hit / double split aces (standard blackjack: false; Sp21: true) */
  hitSplitAces: boolean;

  /** late surrender allowed (Sp21: also gates double-down rescue) */
  surrender: boolean;
  /** Spanish 21 double-down rescue */
  rescue: boolean;

  /** US hole-card game: dealer peeks on A/10 up */
  peek: boolean;

  // --- Spanish 21 flags ---
  player21AlwaysWins: boolean;
  playerBjBeatsDealerBj: boolean;
  bonus21: boolean;
  superBonus: boolean;
  /** design decision (D): bonuses void after split, matching most houses (~0.01%) */
  voidBonusAfterSplit: boolean;
  /** bonuses void after doubling (universal rule) */
  voidBonusAfterDouble: boolean;

  countSystem: 'hilo' | 'monkey';
}

export interface RulesetOverrides extends Partial<Omit<Ruleset, 'name'>> {}

/** Standard blackjack ruleset. */
export function blackjackRuleset(overrides: RulesetOverrides = {}): Ruleset {
  const base: Ruleset = {
    name: 'blackjack',
    decks: 6,
    spanish: false,
    pen: 0.75,
    freshShoe: false,
    bjPayout: 1.5,
    s17: true,
    doubleOn: 'any',
    doubleAnyNumberOfCards: false,
    das: true,
    rsa: false,
    resplitMax: 4,
    hitSplitAces: false,
    surrender: false,
    rescue: false,
    peek: true,
    player21AlwaysWins: false,
    playerBjBeatsDealerBj: false,
    bonus21: false,
    superBonus: false,
    voidBonusAfterSplit: true,
    voidBonusAfterDouble: true,
    countSystem: 'hilo',
  };
  return { ...base, ...overrides };
}

/** Spanish 21 ruleset — full verified ruleset per design spec S10 (Wizard of Odds). */
export function spanish21Ruleset(overrides: RulesetOverrides = {}): Ruleset {
  const base: Ruleset = {
    name: 'spanish21',
    decks: 6,
    spanish: true,
    pen: 0.75,
    freshShoe: false,
    bjPayout: 1.5,
    s17: true,
    doubleOn: 'any',
    doubleAnyNumberOfCards: true,
    das: true,
    rsa: true,
    resplitMax: 4,
    hitSplitAces: true,
    surrender: true,
    rescue: true,
    peek: true,
    player21AlwaysWins: true,
    playerBjBeatsDealerBj: true,
    bonus21: true,
    superBonus: true,
    voidBonusAfterSplit: true,
    voidBonusAfterDouble: true,
    countSystem: 'monkey',
  };
  return { ...base, ...overrides };
}

/** Human-readable one-line description of a ruleset (for console output). */
export function describeRuleset(r: Ruleset): string {
  const parts: string[] = [];
  parts.push(`${r.decks}D`);
  parts.push(r.spanish ? 'Sp21' : r.bjPayout === 1.5 ? '3:2' : '6:5');
  parts.push(r.s17 ? 'S17' : 'H17');
  if (r.doubleOn !== 'any') parts.push(`dbl ${r.doubleOn}`);
  if (r.das) parts.push('DAS');
  if (r.rsa) parts.push('RSA');
  if (r.surrender) parts.push('LS');
  if (!r.peek) parts.push('no-peek');
  if (r.freshShoe) parts.push('fresh');
  else parts.push(`pen ${(r.pen * 100).toFixed(0)}%`);
  return parts.join(' ');
}
