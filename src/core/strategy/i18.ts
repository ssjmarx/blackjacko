/**
 * Illustrious 18 + Fab 4 (spec S13, Schlesinger lineage); floored TC, 2-card hands, Hi-Lo.
 * Indices are the canonical multi-deck set (per-config SD sets slot in later; documented ±1 caveat).
 * Precedence: Fab 4 governs its four hands entirely, then I18, then the base chart.
 */

export type I18Kind = 'hard' | 'pair' | 'insurance';

export interface I18Entry {
  kind: I18Kind;
  /** hard total, pair face value (10 = any 10-value pair), or 0 for insurance */
  key: number;
  /** dealer upcard face value (11 = ace) */
  up: number;
  /** stand (H->S), double (H->D), split (S->P) */
  dev: 'S' | 'D' | 'P';
  idxH17: number;
  idxS17: number;
  /**
   * Action when TC is BELOW the index, when it differs from basic strategy.
   * Needed for the negative-side entries on stand-basic hands (12 v 4/5/6,
   * 13 v 2/3: basic stands, the index says hit below) and 11 v A under H17
   * (basic doubles, the index says hit below -1).
   */
  below?: 'H';
  label: string;
}

export const ILLUSTRIOUS_18: I18Entry[] = [
  { kind: 'insurance', key: 0, up: 11, dev: 'S', idxH17: 3, idxS17: 3, label: 'Insurance (take at TC >= +3)' },
  { kind: 'hard', key: 16, up: 10, dev: 'S', idxH17: 0, idxS17: 0, label: '16 v 10 stand' },
  { kind: 'hard', key: 15, up: 10, dev: 'S', idxH17: 4, idxS17: 4, label: '15 v 10 stand' },
  { kind: 'pair', key: 10, up: 5, dev: 'P', idxH17: 5, idxS17: 5, label: '10,10 v 5 split' },
  { kind: 'pair', key: 10, up: 6, dev: 'P', idxH17: 4, idxS17: 4, label: '10,10 v 6 split' },
  { kind: 'hard', key: 10, up: 10, dev: 'D', idxH17: 4, idxS17: 4, label: '10 v 10 double' },
  { kind: 'hard', key: 12, up: 3, dev: 'S', idxH17: 2, idxS17: 2, label: '12 v 3 stand' },
  { kind: 'hard', key: 12, up: 2, dev: 'S', idxH17: 3, idxS17: 3, label: '12 v 2 stand' },
  { kind: 'hard', key: 11, up: 11, dev: 'D', idxH17: -1, idxS17: 1, below: 'H', label: '11 v A double' },
  { kind: 'hard', key: 9, up: 2, dev: 'D', idxH17: 1, idxS17: 1, label: '9 v 2 double' },
  { kind: 'hard', key: 10, up: 11, dev: 'D', idxH17: 3, idxS17: 4, label: '10 v A double' },
  { kind: 'hard', key: 9, up: 7, dev: 'D', idxH17: 3, idxS17: 3, label: '9 v 7 double' },
  { kind: 'hard', key: 16, up: 9, dev: 'S', idxH17: 5, idxS17: 5, label: '16 v 9 stand' },
  { kind: 'hard', key: 13, up: 2, dev: 'S', idxH17: -1, idxS17: -1, below: 'H', label: '13 v 2 stand' },
  { kind: 'hard', key: 12, up: 4, dev: 'S', idxH17: 0, idxS17: 0, below: 'H', label: '12 v 4 stand' },
  { kind: 'hard', key: 12, up: 5, dev: 'S', idxH17: -2, idxS17: -2, below: 'H', label: '12 v 5 stand' },
  { kind: 'hard', key: 12, up: 6, dev: 'S', idxH17: -3, idxS17: -1, below: 'H', label: '12 v 6 stand' },
  { kind: 'hard', key: 13, up: 3, dev: 'S', idxH17: -2, idxS17: -2, below: 'H', label: '13 v 3 stand' },
];

export interface Fab4Entry {
  total: number;
  up: number;
  idxH17: number;
  idxS17: number;
  label: string;
}

/** Canonical four. The published fifth variant (16 v 8, +4) is a config flag, off by default. */
export const FAB_4: Fab4Entry[] = [
  { total: 14, up: 10, idxH17: 3, idxS17: 3, label: '14 v 10' },
  { total: 15, up: 9, idxH17: 2, idxS17: 2, label: '15 v 9' },
  { total: 15, up: 10, idxH17: 0, idxS17: 0, label: '15 v 10' },
  { total: 15, up: 11, idxH17: 1, idxS17: -1, label: '15 v A' },
];

export const FAB_4_FIFTH: Fab4Entry = { total: 16, up: 8, idxH17: 4, idxS17: 4, label: '16 v 8 (variant, off)' };

/** The index for this entry under the dealer rule (S17/H17). */
export function idxFor(entry: { idxH17: number; idxS17: number }, s17: boolean): number {
  return s17 ? entry.idxS17 : entry.idxH17;
}

/** Insurance decision per I18 #1: take at floored TC >= +3. */
export function insuranceByI18(tc: number | null): boolean {
  return tc !== null && tc >= 3;
}
