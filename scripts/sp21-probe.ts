/**
 * Sp21 cell audit: exact finite-deck EVs for chart states vs the chart's
 * choice, with the current chart as the continuation policy (policy
 * iteration: fix flagged cells, re-run until clean).
 *
 * Approximations (documented, direction-safe):
 *  - rank-level recursion; suited/spades bonus tiers collapse to the
 *    mixed-suit tier (overall EV effect < 0.03%)
 *  - audit composition = fresh shoe minus hand minus upcard
 *  - peek conditioning removes dealer-natural mass
 *
 * Usage: node scripts/sp21-probe.ts [decks=2] [minDelta=0.003]
 */
import { ExactEngine, freshCounts } from '../src/core/exact.ts';
import { sp21ChartFor, sp21Decision } from '../src/core/strategy/spanish21.ts';
import type { Action, PlayerView } from '../src/core/strategy/view.ts';
import { spanish21Ruleset } from '../src/core/rules.ts';
import { handTotal, sp21TripleBonusPossible } from '../src/core/hand.ts';
import { makeCard, RANK_IDX, A, TEN, J, Q, K } from '../src/core/card.ts';

const SIX = RANK_IDX.six;
const SEVEN = RANK_IDX.seven;
const EIGHT = RANK_IDX.eight;

const decks = Number(process.argv[2] ?? 2);
const minDelta = Number(process.argv[3] ?? 0.004);
const dump = process.argv[4] === '--dump';
const s17 = process.argv[5] === 's17';
const ruleset = spanish21Ruleset({ decks, s17 });
void sp21ChartFor;

class Probe {
  private readonly eng: ExactEngine;
  private readonly memo = new Map<string, number>();
  private readonly upVal: number;

  constructor(upVal: number) {
    this.upVal = upVal;
    this.eng = new ExactEngine(true, ruleset.s17, freshCounts(decks, true));
    const upRank = upVal === 11 ? 0 : upVal === 10 ? TEN : upVal - 1;
    this.eng.counts[upRank] -= 1;
  }

  remove(hand: number[]): void {
    for (const c of hand) this.eng.counts[c >> 2] -= 1;
  }
  restore(hand: number[]): void {
    for (const c of hand) this.eng.counts[c >> 2] += 1;
  }

  /** rank-based bonus multiplier for a 21 hand (suit tiers collapsed) */
  bonusFor(ranks: number[]): number {
    const n = ranks.length;
    if (n === 3) {
      const s = [...ranks].sort((x, y) => x - y);
      const is678 = s[0] === SIX && s[1] === SEVEN && s[2] === EIGHT;
      const is777 = s[0] === SEVEN && s[1] === SEVEN && s[2] === SEVEN;
      return is678 || is777 ? 1.5 : 0;
    }
    if (n === 5) return 1.5;
    if (n === 6) return 2;
    if (n >= 7) return 3;
    return 0;
  }

  chartActionFor(cards: number[]): Action {
    const ht = handTotal(cards);
    const view: PlayerView = {
      ruleset,
      cards,
      total: ht.total,
      soft: ht.soft,
      cardCount: cards.length,
      doubled: false,
      fromSplit: false,
      splitOf: 0,
      upcard: 0,
      up: this.upVal,
      canDouble: ruleset.doubleAnyNumberOfCards && ht.total < 21,
      canSplit: false,
      canSurrender: cards.length === 2,
      canRescue: false,
      tc: null,
      rawTc: null,
      runningCount: null,
      decksRemaining: null,
    };
    return sp21Decision(view);
  }

  /** EV of hitting (chart plays the continuation) */
  evHit(ranks: number[], total: number, soft: boolean): number {
    const key = `${this.eng.compHash()}|${[...ranks].sort((a, b) => a - b).join(',')}|${total}|${soft ? 1 : 0}`;
    const m = this.memo.get(key);
    if (m !== undefined) return m;
    let ev = 0;
    const rem = this.eng.remaining();
    for (let r = 0; r < 13; r++) {
      const c = this.eng.counts[r]!;
      if (r === RANK_IDX.ten || c === 0) continue;
      const p = c / rem;
      this.eng.counts[r] = c - 1;
      const v = r === 0 ? 11 : r >= 9 ? 10 : r + 1;
      let t = total + v;
      let s = soft || v === 11;
      while (t > 21 && s) {
        t -= 10;
        s = false;
      }
      const newRanks = [...ranks, r];
      if (t > 21) {
        ev += p * -1;
      } else if (t === 21) {
        const bonus = this.bonusFor(newRanks);
        ev += p * (bonus > 1 ? bonus : 1);
      } else {
        const cards = newRanks.map((rr, i) => makeCard(rr, i % 4));
        const action = this.chartActionFor(cards);
        let sub: number;
        if (action === 'H') sub = this.evHit(newRanks, t, s);
        else if (action === 'D') sub = this.evDoubleOnce(newRanks, t, s);
        else sub = this.eng.standEv(t, this.upVal);
        ev += p * sub;
      }
      this.eng.counts[r] = c;
    }
    this.memo.set(key, ev);
    return ev;
  }

  /** EV of doubling: one draw, settle at 2x (21 after double = even money) */
  evDoubleOnce(ranks: number[], total: number, soft: boolean): number {
    let ev = 0;
    const rem = this.eng.remaining();
    for (let r = 0; r < 13; r++) {
      const c = this.eng.counts[r]!;
      if (r === RANK_IDX.ten || c === 0) continue;
      const p = c / rem;
      this.eng.counts[r] = c - 1;
      const v = r === 0 ? 11 : r >= 9 ? 10 : r + 1;
      let t = total + v;
      let s = soft || v === 11;
      while (t > 21 && s) {
        t -= 10;
        s = false;
      }
      if (t > 21) ev += p * -2;
      else if (t === 21) ev += p * 2;
      else {
        // rescue option: after doubling, the player may forfeit the original
        // bet (net -1). Optimal doubled-hand value = max(-1, 2 x stand EV).
        const two = 2 * this.eng.standEv(t, this.upVal);
        ev += p * Math.max(-1, two);
      }
      this.eng.counts[r] = c;
    }
    return ev;
  }

  audit(cards: number[]): { chart: Action; best: Action; evChart: number; evBest: number } | null {
    const ht = handTotal(cards);
    if (ht.total >= 21) return null;
    const canSurr = cards.length === 2;
    const ranks = cards.map((c) => c >> 2);
    this.remove(cards);
    const evStand = this.eng.standEv(ht.total, this.upVal);
    const evHit = this.evHit(ranks, ht.total, ht.soft);
    const evDouble = this.evDoubleOnce(ranks, ht.total, ht.soft);
    this.restore(cards);
    const evSurr = -0.5;
    const chartAction = this.chartActionFor(cards);
    const actions: { a: Action; ev: number }[] = [
      { a: 'S', ev: evStand },
      { a: 'H', ev: evHit },
      { a: 'D', ev: evDouble },
    ];
    if (canSurr) actions.push({ a: 'R', ev: evSurr });
    let best = actions[0]!;
    for (const x of actions) if (x.ev > best.ev) best = x;
    const chartEv = actions.find((x) => x.a === chartAction)?.ev ?? evStand;
    return { chart: chartAction, best: best.a, evChart: chartEv, evBest: best.ev };
  }
}

const suit = (r: number, i: number): number => makeCard(r, i % 4);
const RANKS_TENVAL = [TEN, J, Q, K];

function hardHands2(total: number): number[][] {
  const hands: number[][] = [];
  if (total <= 11) {
    for (let a = 2; a <= Math.min(9, total - 2); a++) {
      const b = total - a;
      if (b >= 2 && b <= 9) {
        hands.push([suit(a - 1, 0), suit(b - 1, 1)]);
        break;
      }
    }
  } else {
    const c2 = total - 10;
    if (c2 >= 2 && c2 <= 9) hands.push([suit(RANKS_TENVAL[0]!, 0), suit(c2 - 1, 1)]);
    if (total === 20) hands.push([suit(TEN, 0), suit(J, 1)]);
  }
  // bonus-possible variants (chart '*' modifier)
  if (total === 13) hands.push([suit(SIX, 2), suit(SEVEN, 3)]);
  if (total === 14) {
    hands.push([suit(SIX, 0), suit(EIGHT, 1)]);
    hands.push([suit(SEVEN, 0), suit(SEVEN, 1)]);
  }
  if (total === 15) hands.push([suit(SEVEN, 0), suit(EIGHT, 1)]);
  return hands;
}

function softHands2(total: number): number[][] {
  const other = total - 11;
  if (other < 2 || other > 9) return [];
  return [[suit(A, 0), suit(other - 1, 1)]];
}

function pipHands(count: number, total: number, allowTen: boolean): number[][] {
  const hands: number[][] = [];
  const tens = Math.min(allowTen ? Math.floor((total - 2 * count) / 8) : 0, count - 1);
  for (let nTen = 0; nTen <= tens; nTen++) {
    const rest = total - nTen * 10;
    const pips = count - nTen;
    if (rest < 2 * pips || rest > 9 * pips) continue;
    const hand: number[] = [];
    let remaining = rest;
    for (let i = 0; i < pips; i++) {
      const maxPip = Math.min(9, remaining - 2 * (pips - i - 1));
      const pip = Math.max(2, remaining - 9 * (pips - i - 1));
      const take = Math.min(maxPip, Math.max(pip, 2));
      hand.push(suit(take - 1, hand.length));
      remaining -= take;
    }
    if (remaining === 0) {
      for (let i = 0; i < nTen; i++) hand.push(suit(RANKS_TENVAL[i % 4]!, hand.length));
      hands.push(hand);
      break;
    }
  }
  return hands;
}

function hardHands3(total: number): number[][] {
  return pipHands(3, total, true);
}
function hardHands4(total: number): number[][] {
  return pipHands(4, total, true);
}
function hardHands5(total: number): number[][] {
  return pipHands(5, total, true);
}
function hardHands6(total: number): number[][] {
  return pipHands(6, total, true);
}
function softHands3(total: number): number[][] {
  return softN(3, total);
}
function softHands4(total: number): number[][] {
  return softN(4, total);
}
function softHands5(total: number): number[][] {
  return softN(5, total);
}
function softHands6(total: number): number[][] {
  return softN(6, total);
}
function softN(n: number, total: number): number[][] {
  const rest = total - 11;
  const pips = n - 1;
  if (rest < 2 * pips || rest > 9 * pips) return [];
  for (const h of pipHands(pips, rest, false)) return [[suit(A, 0), ...h]];
  return [];
}

const label = (cards: number[]): string =>
  cards.map((c) => `${'A2345678 9TJQK'[c >> 2] ?? '?'}${'SHDC'[c & 3]}`).join('');

const t0 = performance.now();
let issues = 0;
let cells = 0;

for (const upVal of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
  const probe = new Probe(upVal);
  const upName = upVal === 11 ? 'A' : String(upVal);
  const groups: [string, number, number, (t: number) => number[][]][] = [
    ['hard2', 5, 20, hardHands2],
    ['soft2', 13, 20, softHands2],
    ['hard3', 8, 21, hardHands3],
    ['hard4', 8, 19, hardHands4],
    ['soft3', 14, 20, softHands3],
    ['hard5', 10, 20, hardHands5],
    ['hard6', 12, 20, hardHands6],
    ['soft4', 14, 20, softHands4],
    ['soft5', 15, 20, softHands5],
    ['soft6', 17, 21, softHands6],
  ];
  for (const [gname, lo, hi, gen] of groups) {
    for (let total = lo; total <= hi; total++) {
      for (const cards of gen(total)) {
        const res = probe.audit(cards);
        if (!res) continue;
        cells++;
        const delta = res.evBest - res.evChart;
        if (dump) {
          const ht = handTotal(cards);
          const bonus2 = cards.length === 2 && sp21TripleBonusPossible(cards);
          const plain = cards.length === 2 && !bonus2;
          console.log(
            `DUMP up=${upVal} kind=${ht.soft ? 'soft' : 'hard'} total=${ht.total} n=${cards.length} ` +
            `bonus=${bonus2 ? 1 : 0} plain=${plain ? 1 : 0} chart=${res.chart} best=${res.best} ` +
            `evChart=${res.evChart.toFixed(4)} evBest=${res.evBest.toFixed(4)}`,
          );
        }
        if (delta > minDelta) {
          issues++;
          console.log(
            `UP ${upName.padEnd(2)} ${gname} ${label(cards).padEnd(8)} chart=${res.chart} best=${res.best} ` +
              `evChart=${res.evChart.toFixed(4)} evBest=${res.evBest.toFixed(4)} delta=+${delta.toFixed(4)}`,
          );
        }
      }
    }
  }
}

console.log(`\naudited ${cells} cells in ${((performance.now() - t0) / 1000).toFixed(1)}s — ${issues} flagged (delta > ${minDelta})`);

// rescue table: rescue (doubled) iff 2 x standEV(t, up) < -1, at a representative
// doubled 3-card composition (fresh shoe minus 4 player cards minus upcard)
if (dump) {
  for (const upVal2 of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    const eng = new ExactEngine(true, ruleset.s17, freshCounts(decks, true));
    const upRank = upVal2 === 11 ? 0 : upVal2 === 10 ? TEN : upVal2 - 1;
    eng.counts[upRank] -= 1;
    // representative doubled hand removal: e.g., 5+6 doubled then drew to t:
    // remove 5,6 and a card of value (t-11) when t-11 in 2..9 else tens
    eng.counts[4] -= 1; // the 5
    eng.counts[5] -= 1; // the 6
    const rest = 11; // base 11 doubled
    for (let t = 12; t <= 17; t++) {
      eng.counts[4] += 1; // restore previous draw rank crudely
      // draw rank for value (t - 11)
      const v = t - rest;
      const r = v === 11 ? 0 : v === 10 ? TEN : v - 1;
      eng.counts[r] -= 1;
      const two = 2 * eng.standEv(t, upVal2);
      console.log(`RESCUE up=${upVal2} t=${t} twoStand=${two.toFixed(4)} rescue=${two < -1 ? 1 : 0}`);
      eng.counts[r] += 1;
    }
  }
}
