/**
 * Chunked battery driver: run a list of scenarios, append one JSON line per
 * scenario to results/<tag>.jsonl so parallel windows can share one result set.
 *
 *   node scripts/run-chunk.ts --ids sweep-baseline,sweep-h17 --hands 20e6 --seed 42 --tag 20m
 */
import { runScenario } from '../src/sim/runner.ts';
import { scenarioById } from '../src/sim/scenarios.ts';
import { mkdirSync, appendFileSync } from 'node:fs';

function parseArgs(argv: string[]): { ids: string[]; hands: number; seed: number; tag: string } {
  const out = { ids: [] as string[], hands: 1_000_000, seed: 42, tag: '20m' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--ids') out.ids = argv[++i]!.split(',').filter(Boolean);
    else if (a === '--hands') {
      const s = argv[++i]!;
      const m = /^(\d+(?:\.\d+)?)e(\d+)$/i.exec(s);
      out.hands = m ? Math.round(Number(m[1]) * 10 ** Number(m[2])) : Math.round(Number(s));
    } else if (a === '--seed') out.seed = Number(argv[++i]!);
    else if (a === '--tag') out.tag = argv[++i]!;
    else throw new Error(`unknown arg: ${a}`);
  }
  if (out.ids.length === 0) throw new Error('no --ids given');
  return out;
}

const opts = parseArgs(process.argv.slice(2));
mkdirSync('results', { recursive: true });
const path = `results/${opts.tag}.jsonl`;

for (const id of opts.ids) {
  const sc = scenarioById(id);
  if (!sc) throw new Error(`unknown scenario: ${id}`);
  const t0 = performance.now();
  const res = await runScenario(sc, opts.hands, opts.seed);
  const st = res.stats;
  const rebuys = (res as { rebuys?: number }).rebuys ?? 0;
  const line = JSON.stringify({
    id: sc.id,
    group: sc.group,
    hands: res.hands,
    seed: res.seed,
    elapsedMs: Math.round(performance.now() - t0),
    avgBet: st.avgInitialBet(),
    evPct: st.evPctInitial(),
    sePct: st.seEvPctInitial(),
    evAtRisk: st.evPctAtRisk(),
    unitsPer100: st.unitsPer100(),
    seU100: st.seUnitsPer100(),
    variance: st.variance(),
    handsPerShoe: st.handsPerShoe(),
    peakBankroll: st.peakBankroll,
    maxDrawdown: st.maxDrawdown,
    rebuys,
  });
  appendFileSync(path, line + '\n');
  console.log(`done ${sc.id}: ev=${(st.evPctInitial() * 100).toFixed(3)}% ±${(st.seEvPctInitial() * 100).toFixed(3)} (${Math.round(res.elapsedMs / 1000)}s)`);
}
console.log(`chunk complete -> ${path}`);
