/**
 * Exact finite-deck EV engine (Braun-style): memoized dealer distributions keyed by
 * composition hash, stand/hit EVs, US peek conditioning (natural mass removed, renormalized).
 * Purpose: audit/derive Spanish 21 strategy cells with no published transcription (spec E4).
 */
import { RANK_IDX, cardFaceValue } from './card.ts';

export const IDX_BUST = 0;
export const IDX_17 = 1;
export const IDX_18 = 2;
export const IDX_19 = 3;
export const IDX_20 = 4;
export const IDX_21 = 5;

/** Exact-EV probe over a mutable rank composition (counts[rankIdx] = cards remaining). */
export class ExactEngine {
  /** composition hash -> (total,soft) -> dist(6) */
  private readonly dealerMemo = new Map<string, Map<string, number[]>>();
  readonly counts: Int16Array;
  private readonly spanish: boolean;
  private readonly s17: boolean;
  private readonly ranksList: number[];
  nodes = 0;

  constructor(spanish: boolean, s17: boolean, counts: Int16Array) {
    this.counts = counts;
    this.spanish = spanish;
    this.s17 = s17;
    this.ranksList = [];
    for (let r = 0; r < 13; r++) {
      if (this.spanish && r === RANK_IDX.ten) continue;
      this.ranksList.push(r);
    }
  }

  /** Total cards left in the composition. */
  remaining(): number {
    let n = 0;
    for (const r of this.ranksList) n += this.counts[r]!;
    return n;
  }

  /** remove a seen card from the composition */
  remove(card: number): void {
    this.counts[card >> 2] -= 1;
  }

  /** Undo a remove() — put a seen card back into the composition. */
  restore(card: number): void {
    this.counts[card >> 2] += 1;
  }

  /** The composition hash — the dealer memo key (base-97 packed rank counts). */
  compHash(): string {
    // 12 ranks, counts <= 96 -> base-97 packing
    let h = '';
    for (const r of this.ranksList) h += String.fromCharCode(48 + this.counts[r]!);
    return h;
  }

  /** value of a rank in blackjack terms */
  rankValue(r: number): number {
    return r === 0 ? 11 : r >= 9 ? 10 : r + 1;
  }

  /** dealer outcome distribution; the up card must be removed from counts */
  dealerDist(upVal: number): { p: number[]; natural: number; mass: number } {
    const d = this.dealerRec(upVal, upVal === 11);
    let nat = 0;
    if (upVal === 11) {
      // hole 10-value
      let ten = 0;
      for (let r = 9; r <= 12; r++) ten += this.counts[r]!;
      nat = this.remaining() > 0 ? ten / this.remaining() : 0;
    } else if (upVal === 10) {
      nat = this.remaining() > 0 ? this.counts[0]! / this.remaining() : 0;
    }
    const p = d.slice();
    if (nat > 0) p[IDX_21] = Math.max(0, p[IDX_21]! - nat);
    const mass = Math.max(1e-9, 1 - nat);
    return { p, natural: nat, mass };
  }

  /** stand EV for player total vs conditioned dist (stake 1) */
  standEv(playerTotal: number, upVal: number): number {
    const dist = this.dealerDist(upVal);
    let ev = 0;
    const p = dist.p;
    ev += p[IDX_BUST]! * 1;
    for (let t = 17; t <= 21; t++) {
      const pd = p[t - 16]!;
      ev += pd * (playerTotal > t ? 1 : playerTotal < t ? -1 : 0);
    }
    return ev / dist.mass;
  }

  /** Dealer outcome dist (IDX_* indices) continuing from (total, soft); memoized by composition. */
  private dealerRec(total: number, soft: boolean): number[] {
    this.nodes++;
    if (total > 21) return [1, 0, 0, 0, 0, 0];
    const stand = total >= 17 && !(total === 17 && soft && !this.s17);
    if (total >= 17 && stand) {
      const d = [0, 0, 0, 0, 0, 0];
      d[total > 21 ? 0 : total === 21 ? IDX_21 : total - 16] = 1;
      return d;
    }
    const ch = this.compHash();
    const key = `${total}|${soft ? 1 : 0}`;
    let m = this.dealerMemo.get(ch);
    if (m) {
      const hit = m.get(key);
      if (hit) return hit;
    }
    const rem = this.remaining();
    const out = [0, 0, 0, 0, 0, 0];
    for (const r of this.ranksList) {
      const c = this.counts[r]!;
      if (c === 0) continue;
      const p = c / rem;
      this.counts[r] = c - 1;
      const v = this.rankValue(r);
      let t = total + v;
      let s = soft || v === 11;
      while (t > 21 && s) {
        t -= 10;
        s = false;
      }
      const sub = this.dealerRec(t, s);
      this.counts[r] = c;
      for (let i = 0; i < 6; i++) out[i] += p * sub[i]!;
    }
    if (!m) {
      m = new Map();
      this.dealerMemo.set(ch, m);
    }
    m.set(key, out);
    return out;
  }
}

/** A fresh full-shoe rank composition for `decks` decks (Spanish omits the '10' rank). */
export function freshCounts(decks: number, spanish: boolean): Int16Array {
  const counts = new Int16Array(13);
  for (let r = 0; r < 13; r++) {
    if (spanish && r === RANK_IDX.ten) continue;
    counts[r] = decks * 4;
  }
  return counts;
}

/** face value used for strategy tables: 2..9, 10, 11(A) */
export function upval(card: number): number {
  return cardFaceValue(card);
}
