/**
 * Basic strategy charts (total-dependent), encoded from the Wizard of Odds 4-8 deck and
 * single-deck pages (fetched 2026-10); LS overlays per the same page; the 1-deck EV anchor
 * (~0.00% off the top) adjudicates the reconstructed single-deck tables. Columns 2..A; codes H/S/D/Ds/P.
 */

export interface Chart {
  /** hard totals 5..21 -> 10 cells */
  hard: Record<number, string[]>;
  /** soft totals 13..21 (A,x where x = total-11) -> 10 cells */
  soft: Record<number, string[]>;
  /** pair face value 2..11 (11 = aces) -> 10 cells */
  pairs: Record<number, string[]>;
}

const H10 = ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
const S10 = ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'];
const P10 = ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'];

/** Assemble a Chart from its three row tables. */
function chart(hard: Record<number, string[]>, soft: Record<number, string[]>, pairs: Record<number, string[]>): Chart {
  return { hard, soft, pairs };
}

// ---------------------------------------------------------------------------
// 4-8 deck charts
// ---------------------------------------------------------------------------

const SHOE_S17_DAS = chart(
  {
    5: [...H10], 6: [...H10], 7: [...H10], 8: [...H10],
    9: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
    12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    13: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    14: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    15: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    16: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    17: [...S10], 18: [...S10], 19: [...S10], 20: [...S10], 21: [...S10],
  },
  {
    13: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    14: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    15: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    16: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    17: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    18: ['S', 'D', 'D', 'D', 'D', 'S', 'S', 'H', 'H', 'H'],
    19: [...S10], 20: [...S10], 21: [...S10],
  },
  {
    2: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    3: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    4: ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    5: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    6: ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    7: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    8: [...P10],
    9: ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
    10: [...S10],
    11: [...P10],
  },
);

const SHOE_H17_DAS = chart(
  {
    ...SHOE_S17_DAS.hard,
    11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
  },
  {
    ...SHOE_S17_DAS.soft,
    18: ['D', 'D', 'D', 'D', 'D', 'S', 'S', 'H', 'H', 'H'],
    19: ['S', 'S', 'S', 'S', 'D', 'S', 'S', 'S', 'S', 'S'],
  },
  { ...SHOE_S17_DAS.pairs },
);

const SHOE_S17_NODAS = chart({ ...SHOE_S17_DAS.hard }, { ...SHOE_S17_DAS.soft }, {
  2: ['H', 'H', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  3: ['H', 'H', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  4: [...H10],
  5: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  6: ['H', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  7: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  8: [...P10],
  9: ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
  10: [...S10],
  11: [...P10],
});

const SHOE_H17_NODAS = chart({ ...SHOE_H17_DAS.hard }, { ...SHOE_H17_DAS.soft }, {
  ...SHOE_S17_NODAS.pairs,
});

// ---------------------------------------------------------------------------
// Single-deck charts (S17 DAS baseline; anchor: 1D S17 DAS EV ~ 0.00%)
// ---------------------------------------------------------------------------

const SD_S17_DAS = chart(
  {
    5: [...H10], 6: [...H10], 7: [...H10],
    8: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    9: ['D', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
    12: ['H', 'H', 'H', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    13: ['H', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    14: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    15: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    16: [...S10.slice(0, 5), 'H', 'H', 'H', 'H', 'H'],
    17: [...S10], 18: [...S10], 19: [...S10], 20: [...S10], 21: [...S10],
  },
  {
    13: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    14: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    15: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    16: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    17: ['D', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    18: ['D', 'D', 'D', 'D', 'D', 'S', 'S', 'H', 'H', 'H'],
    19: [...S10], 20: [...S10], 21: [...S10],
  },
  {
    2: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    3: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    4: ['H', 'H', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    5: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    6: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    7: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    8: [...P10],
    9: ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
    10: [...S10],
    11: [...P10],
  },
);

const SD_H17_DAS = chart(
  {
    ...SD_S17_DAS.hard,
    11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
  },
  {
    ...SD_S17_DAS.soft,
  },
  { ...SD_S17_DAS.pairs },
);

const SD_S17_NODAS = chart({ ...SD_S17_DAS.hard }, { ...SD_S17_DAS.soft }, {
  ...SD_S17_DAS.pairs,
  2: ['H', 'H', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  3: ['H', 'H', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  4: [...H10],
  6: ['H', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
});

const SD_H17_NODAS = chart({ ...SD_H17_DAS.hard }, { ...SD_H17_DAS.soft }, {
  ...SD_S17_NODAS.pairs,
});

/** Select the chart for a ruleset. */
export function chartFor(decks: number, s17: boolean, das: boolean): Chart {
  if (decks === 1) {
    if (s17) return das ? SD_S17_DAS : SD_S17_NODAS;
    return das ? SD_H17_DAS : SD_H17_NODAS;
  }
  if (s17) return das ? SHOE_S17_DAS : SHOE_S17_NODAS;
  return das ? SHOE_H17_DAS : SHOE_H17_NODAS;
}

/** Chart column for an upcard face value (A = 11 → column 9). */
export function upCol(up: number): number {
  return up >= 11 ? 9 : up - 2;
}

/** Look up the base-chart action for a (possibly soft / pair) hand. */
export function lookupBasic(chart: Chart, v: { total: number; soft: boolean; cardCount: number; up: number; isPair: boolean; pairValue: number }): 'H' | 'S' | 'D' | 'Ds' | 'P' {
  const col = upCol(v.up);
  if (v.isPair) {
    const row = chart.pairs[v.pairValue];
    if (row) {
      const cell = row[col];
      if (cell === 'P') return 'P';
      // fall through to hard-total play for non-split pairs (5,5 and 10,10)
    }
  }
  if (v.soft && v.total <= 21) {
    if (v.total === 12) return 'H'; // unsplit A,A: always hit
    const row = chart.soft[v.total];
    if (row) return row[col] as 'H' | 'S' | 'D' | 'Ds';
  }
  const t = Math.min(v.total, 21);
  const row = chart.hard[t] ?? chart.hard[t < 5 ? 5 : t > 21 ? 21 : t];
  return (row![col]) as 'H' | 'S' | 'D' | 'Ds';
}

// ---------------------------------------------------------------------------
// Late surrender overlays (unconditional basic-strategy surrenders).
// Keys: `${total}|${up}` where up is 9/10/11(A). Pairs handled separately.
// ---------------------------------------------------------------------------

export interface SurrenderTable {
  /** hard 2-card hands: "total|up" -> true */
  hands: Set<string>;
  /** pair surrenders: "pairValue|up" -> true */
  pairs: Set<string>;
}

/** The unconditional late-surrender overlay for a dealer rule (16 v 9/10/A, 15 v 10; H17 adds 15/17 v A, 8,8 v A). */
export function surrenderTableFor(s17: boolean): SurrenderTable {
  const hands = new Set<string>();
  const pairs = new Set<string>();
  // 16 v 9,10,A and 15 v 10 (both S17 and H17)
  hands.add('16|9'); hands.add('16|10'); hands.add('16|11'); hands.add('15|10');
  if (!s17) {
    hands.add('15|11'); // 15 v A
    hands.add('17|11'); // 17 v A
    pairs.add('8|11');  // 8,8 v A
  }
  return { hands, pairs };
}
