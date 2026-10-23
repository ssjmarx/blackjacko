/**
 * Spanish 21 basic strategy (S10, S13): card-count-in-hand dependent charts.
 * Hard/soft tables DERIVED from exact finite-deck EV (scripts/sp21-probe.ts policy iteration) —
 * no public no-redouble transcription exists; pairs carried over pending a split-exact audit.
 */
import type { Action, PlayerView } from './view.ts';
import { cardFaceValue, cardValue } from '../card.ts';
import { sp21TripleBonusPossible } from '../hand.ts';
import { upCol } from './basic.ts';

export type Sp21Cell = string;

export interface Sp21Chart {
  hard: Record<number, Sp21Cell[]>;
  soft: Record<number, Sp21Cell[]>;
  pairs: Record<number, Sp21Cell[]>;
}

const H = 'H';
const S = 'S';
const P = 'P';

const H10: Sp21Cell[] = [H, H, H, H, H, H, H, H, H, H];
const S10: Sp21Cell[] = [S, S, S, S, S, S, S, S, S, S];

// pairs (carried over; split-exact audit pending)
const SP21_PAIRS: Record<number, Sp21Cell[]> = {
  2: [P, P, P, P, P, P, H, H, H, H],
  3: [P, P, P, P, P, P, H, H, H, H],
  4: [H, H, H, P, P, H, H, H, H, H],
  5: ['D4', 'D4', 'D', 'D', 'D', 'D3', 'D2', H, H, H], // 5,5 plays as the derived hard-10 row
  6: [P, P, P, P, P, P, H, H, H, H],
  7: [P, P, P, P, P, P, 'P*', H, H, H],
  8: [P, P, P, P, P, P, P, H, H, H],
  9: [P, P, P, P, P, S, P, P, S, S],
  10: [...S10],
  11: [P, P, P, P, P, P, P, P, P, P],
};

const SP21_H17: Sp21Chart = {
  hard: {
    5: [...H10],
    6: [...H10],
    7: [...H10],
    8: [...H10],
    9: [H, H, H, H, 'D', H, H, H, H, H],
    10: ['D4', 'D4', 'D', 'D', 'D', 'D3', 'D2', H, H, H],
    11: ['D3', 'D4', 'D4', 'D4', 'D4', 'D3', 'D3', 'D3', 'D2', 'D2'],
    12: [...H10],
    13: [H, H, H, H, 'S3*', H, H, H, H, H],
    14: [H, H, 'S3*', 'S4', 'S5', H, H, H, H, H],
    15: ['S3*', 'S4', 'S4', 'S5', S, H, H, H, H, H],
    16: ['S4', 'S5', 'S5', S, S, H, H, H, H, H],
    17: [S, S, S, S, S, S, 'S5', 'S5', 'S5', 'R'],
    18: [...S10],
    19: [...S10],
    20: [...S10],
  },
  soft: {
    13: [H, H, H, H, 'D', H, H, H, H, H],
    14: [H, H, H, 'D', 'D', H, H, H, H, H],
    15: [H, H, 'D', 'D', 'D', H, H, H, H, H],
    16: [H, 'D2', 'D', 'D', 'D', H, H, H, H, H],
    17: [H, H, 'D3', 'D', 'D', H, H, H, H, H],
    18: ['S3', 'S3', 'D3', 'D', 'D', S, 'S3', H, H, H],
    19: [...S10],
    20: [...S10],
    21: [...S10],
  },
  pairs: { ...SP21_PAIRS },
};

const SP21_S17: Sp21Chart = {
  hard: {
    ...SP21_H17.hard,
    9: [H, H, H, H, 'D3', H, H, H, H, H],
    10: ['D4', 'D4', 'D', 'D', 'D', 'D3', 'D2', H, H, H],
    13: [...H10],
    14: [H, H, 'S3*', 'S4', 'S3*', H, H, H, H, H],
    15: ['S3*', 'S3*', 'S4', 'S5', 'S5', H, H, H, H, H],
    17: [S, S, S, S, S, S, 'S5', 'S5', 'S5', 'S4'],
  },
  soft: {
    ...SP21_H17.soft,
    13: [H, H, H, H, H, H, H, H, H, H],
  },
  pairs: { ...SP21_PAIRS },
};

/** The Sp21 chart for a dealer rule (S17/H17). */
export function sp21ChartFor(s17: boolean): Sp21Chart {
  return s17 ? SP21_S17 : SP21_H17;
}

/** Double-down rescue (after doubling): forfeit original, retrieve the doubled portion; exact-probe cells. */
export function sp21RescueDecision(view: PlayerView): Action {
  const up = view.up;
  const t = view.total;
  if (view.canRescue) {
    if (t >= 12 && t <= 16 && up >= 8) return 'RESCUE';
    if (t === 17 && up === 11) return 'RESCUE';
  }
  return 'S';
}

/** Sp21 chart decision for a not-yet-doubled hand (21s auto-win upstream). */
export function sp21Decision(view: PlayerView): Action {
  const chart = sp21ChartFor(view.ruleset.s17);
  const col = upCol(view.up);
  const cards = view.cards;

  // Pairs (2-card, splittable)
  if (view.canSplit && cards.length === 2 && cardValue(cards[0]!) === cardValue(cards[1]!)) {
    const row = chart.pairs[cardFaceValue(cards[0]!)];
    const cell = row ? row[col] : H;
    if (cell === 'P') return 'P';
    if (cell === 'P*') {
      const suited = (cards[0] & 3) === (cards[1] & 3);
      if (!suited) return 'P';
      return H;
    }
    // fall through to hard/soft play (5,5 and 10,10)
  }

  const soft = view.soft;
  let cell: Sp21Cell;
  if (soft) {
    const row = chart.soft[view.total];
    cell = row ? row[col] : H;
  } else {
    const row = chart.hard[view.total];
    cell = row ? row[col] : H;
  }

  return interpretCell(cell, view);
}

/** Expand a chart cell (D#, S#, S3*-style stars, S*, P*, R — "#": act only at # cards or fewer) into a legal Action. */
function interpretCell(cell: Sp21Cell, view: PlayerView): Action {
  if (cell === 'H') return 'H';
  if (cell === 'S') return 'S';
  if (cell === 'D') return view.canDouble ? 'D' : 'H';
  const mD = /^D(\d+)$/.exec(cell);
  if (mD) {
    const max = Number(mD[1]);
    if (view.canDouble && view.cardCount <= max) return 'D';
    return 'H';
  }
  const mSstar = /^S(\d+)\*$/.exec(cell);
  if (mSstar) {
    const max = Number(mSstar[1]);
    const bonusPossible = view.cardCount === 2 && sp21TripleBonusPossible(view.cards);
    if (bonusPossible) return 'H';
    if (view.cardCount <= max) return 'S';
    return 'H';
  }
  const mS = /^S(\d+)$/.exec(cell);
  if (mS) {
    const max = Number(mS[1]);
    if (view.cardCount <= max) return 'S';
    return 'H';
  }
  if (cell === 'S*') {
    if (view.cardCount === 2 && sp21TripleBonusPossible(view.cards)) return 'H';
    return 'S';
  }
  if (cell === 'R') {
    // 2-card hands: surrender; 3+ cards: hit (17 v A rule)
    if (view.cardCount >= 3) return 'H';
    return view.canSurrender ? 'R' : 'H';
  }
  return 'H';
}
