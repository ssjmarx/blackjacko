/**
 * Sp21 chart calibration: flip candidate cells, measure EV against the
 * Wizard of Odds anchors (6D H17: -0.76%, S17: -0.40%), keep improvements.
 *
 * The trusted cells (hard 5-15 from the beatingbonuses/WoO transcription)
 * are not touched. Candidates are the reconstructed cells: hard 16+,
 * softs, and pairs.
 */
import { runScenario } from '../src/sim/runner.ts';
import { scenarioById } from '../src/sim/scenarios.ts';
import { sp21ChartFor } from '../src/core/strategy/spanish21.ts';

const H17 = sp21ChartFor(false);
const S17 = sp21ChartFor(true);

interface Flip {
  id: string;
  apply(): void;
  revert(): void;
}

function cellFlip(
  chart: typeof H17,
  table: 'hard' | 'soft' | 'pairs',
  row: number,
  col: number,
  from: string,
  to: string,
): Flip {
  const t = chart[table] as Record<number, string[]>;
  const old = t[row]![col]!;
  return {
    id: `${table}[${row}][${col}] ${from}->${to}`,
    apply() {
      if (old === from) t[row]![col] = to;
      else throw new Error(`precondition failed: expected ${from}, found ${old}`);
    },
    revert() {
      t[row]![col] = old;
    },
  };
}

const candidates: Flip[] = [
  cellFlip(H17, 'pairs', 8, 7, 'H', 'P'), // 8,8 v 9
  cellFlip(H17, 'pairs', 8, 8, 'H', 'P'), // 8,8 v 10
  cellFlip(H17, 'pairs', 9, 9, 'S', 'P'), // 9,9 v A
  cellFlip(H17, 'pairs', 9, 5, 'S', 'P'), // 9,9 v 7
  cellFlip(H17, 'pairs', 4, 3, 'P', 'H'), // 4,4 v 6
  cellFlip(H17, 'pairs', 6, 6, 'P', 'H'), // 6,6 v 8
  cellFlip(H17, 'pairs', 7, 6, 'H', 'P'), // 7,7 v 8
  cellFlip(H17, 'pairs', 2, 6, 'H', 'P'), // 2,2 v 8
  cellFlip(H17, 'pairs', 3, 6, 'H', 'P'), // 3,3 v 8
  cellFlip(H17, 'pairs', 6, 0, 'P', 'H'), // 6,6 v 2
  cellFlip(H17, 'pairs', 4, 2, 'H', 'P'), // 4,4 v 4
];

async function ev(flip: Flip | null, hands: number): Promise<number> {
  if (flip) flip.apply();
  const sc = scenarioById('anchor-sp21-6d-h17')!;
  const res = await runScenario(sc, hands, 4242);
  if (flip) flip.revert();
  return res.stats.evPctInitial();
}

async function main(): Promise<void> {
  const hands = Number(process.argv[2] ?? 8_000_000);
  console.log(`baseline (no flips): running...`);
  const base = await ev(null, hands);
  console.log(`baseline EV: ${(base * 100).toFixed(3)}%  (target -0.760%)`);

  // greedy pass: keep any flip that improves EV beyond ~2 SE
  const noise = (2 * 1.15) / Math.sqrt(hands);
  const kept: Flip[] = [];
  for (const f of candidates) {
    let evWith: number;
    try {
      for (const k of kept) k.apply();
      evWith = await ev(f, hands);
      for (const k of [...kept].reverse()) k.revert();
    } catch (e) {
      console.log(`SKIP ${f.id}: ${(e as Error).message}`);
      continue;
    }
    const delta = evWith - base;
    const verdict = delta > noise ? 'KEEP' : delta < -noise ? 'REJ ' : '~~~~';
    console.log(
      `${verdict} ${f.id}  EV ${(evWith * 100).toFixed(3)}%  delta ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(3)}%`,
    );
    if (delta > noise) kept.push(f);
  }
  console.log(`\nkept ${kept.length} flips:`);
  for (const k of kept) console.log(`  ${k.id}`);
  void S17;
}

await main();
