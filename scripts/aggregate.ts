/**
 * Aggregate results/<tag>.jsonl chunks into the final verdict table
 * (same verdict logic as the console harness, applied after parallel runs).
 *
 *   node scripts/aggregate.ts --tag 20m
 */
import { readFileSync, existsSync } from 'node:fs';
import { ALL_SCENARIOS } from '../src/sim/scenarios.ts';

const tag = process.argv.find((a) => a === '--tag') ? process.argv[process.argv.indexOf('--tag') + 1]! : '20m';
const path = `results/${tag}.jsonl`;
if (!existsSync(path)) throw new Error(`no results file: ${path}`);

interface Row {
  id: string;
  group: string;
  hands: number;
  seed: number;
  avgBet: number;
  evPct: number;
  sePct: number;
  evAtRisk: number;
  unitsPer100: number;
  seU100: number;
  variance: number;
  handsPerShoe: number;
  peakBankroll: number;
  maxDrawdown: number;
  rebuys: number;
}
const rows: Row[] = readFileSync(path, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Row);

// keep the longest run per id if duplicates exist
const byId = new Map<string, Row>();
for (const r of rows) {
  const prev = byId.get(r.id);
  if (!prev || r.hands > prev.hands) byId.set(r.id, r);
}

const fmtPct = (x: number): string => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(3)}%`;
const pad = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n);
const padL = (s: string, n: number): string => s.slice(0, n).padStart(n);

interface Out { id: string; verdict: string; detail: string; varNote: string; }
const outs: Out[] = [];
let pass = 0, near = 0, fail = 0, groupFails: string[] = [];

for (const sc of ALL_SCENARIOS) {
  const r = byId.get(sc.id);
  if (!r) continue;
  const ex = sc.expected;
  let verdict = '—', detail = '';
  if (ex?.kind === 'absolute' && ex.evPct !== undefined) {
    const diff = r.evPct - ex.evPct;
    const tol = Math.max(ex.tolerance, 2.5 * r.sePct);
    if (Math.abs(diff) <= tol) { verdict = 'PASS'; detail = `Δ${fmtPct(diff)}`; }
    else if (Math.abs(diff) <= Math.max(2 * ex.tolerance, 4 * r.sePct)) { verdict = 'NEAR'; detail = `Δ${fmtPct(diff)}`; }
    else { verdict = 'FAIL'; detail = `Δ${fmtPct(diff)}`; }
  } else if (ex?.kind === 'delta' && ex.deltaPct !== undefined) {
    const b = byId.get('sweep-baseline');
    if (b) {
      const delta = r.evPct - b.evPct;
      const noise = Math.sqrt(r.sePct ** 2 + b.sePct ** 2);
      const tol = Math.max(ex.tolerance, 2.5 * noise);
      if (Math.abs(delta - ex.deltaPct) <= tol) { verdict = 'PASS'; detail = `Δ-rule ${fmtPct(delta)} vs exp ${fmtPct(ex.deltaPct)}`; }
      else { verdict = 'FAIL'; detail = `Δ-rule ${fmtPct(delta)} vs exp ${fmtPct(ex.deltaPct)}`; }
    } else { verdict = '—'; detail = 'no baseline in file'; }
  } else if (ex?.kind === 'reference' && ex.soft === 'positive') {
    if (r.evPct > 2 * r.sePct) { verdict = 'PASS'; detail = `EV ${fmtPct(r.evPct)} > 0 (${(r.evPct / r.sePct).toFixed(1)}σ)`; }
    else { verdict = 'FAIL'; detail = `EV ${fmtPct(r.evPct)} not positive`; }
  } else if (ex?.kind === 'reference' && ex.soft === 'monotonic') {
    verdict = '(group)'; detail = '';
  }
  let varNote = '';
  if (ex?.variance !== undefined) varNote = Math.abs(r.variance - ex.variance) <= 0.06 ? ' var✓' : ` var✗(${r.variance.toFixed(3)} vs ${ex.variance})`;
  if (verdict === 'PASS') pass++; else if (verdict === 'NEAR') near++; else if (verdict === 'FAIL') { fail++; groupFails.push(sc.id); }
  outs.push({ id: sc.id, verdict, detail, varNote });
}

// group-level monotonic checks (pen sweep & spread ladder), in scenario order
for (const groupName of ['pen', 'spread'] as const) {
  const groupRows = ALL_SCENARIOS.filter((s) => s.group === groupName).map((s) => byId.get(s.id)).filter((r): r is Row => !!r);
  if (groupRows.length < 2) continue;
  let prev = -Infinity, mono = true, culprit = '';
  for (const r of groupRows) {
    if (r.unitsPer100 < prev - 2 * r.seU100) { mono = false; culprit = r.id; }
    prev = Math.max(prev, r.unitsPer100);
  }
  const line = `${groupName} monotonic: ${mono ? 'PASS' : `FAIL (drop at ${culprit})`}`;
  console.log(`    -> ${line}`);
  if (mono) pass++; else { fail++; groupFails.push(`${groupName}-monotonic`); }
}

console.log('\n' + [
  pad('SCENARIO', 26), padL('HANDS', 9), padL('AVGBET', 6), padL('EV%', 9), padL('±SE', 8),
  padL('U/100', 7), padL('VAR', 7), padL('H/SHOE', 7), padL('VERDICT', 8), 'detail',
].join(' '));
console.log('-'.repeat(148));
for (const sc of ALL_SCENARIOS) {
  const r = byId.get(sc.id);
  const o = outs.find((o) => o.id === sc.id);
  if (!r || !o) continue;
  console.log([
    pad(sc.id, 26), padL(String(r.hands), 9), padL(r.avgBet.toFixed(2), 6), padL(fmtPct(r.evPct), 9),
    padL(`±${(r.sePct * 100).toFixed(3)}`, 8), padL(r.unitsPer100.toFixed(2), 7), padL(r.variance.toFixed(3), 7),
    padL(r.handsPerShoe > 0 ? r.handsPerShoe.toFixed(1) : '–', 7), padL(o.verdict, 8), o.detail + o.varNote,
  ].join(' '));
}

// count-preset comparison: counting vs flat baseline in the same group
const pairs: [string, string][] = [
  ['count-6d-hilo-1-12', 'count-6d-flat-basic'],
  ['count-sp21-monkey-1-12', 'count-sp21-flat-basic'],
];
console.log('\ncounting edge vs flat-basic baseline (units/100 and EV-lift):');
for (const [counter, base] of pairs) {
  const c = byId.get(counter), b = byId.get(base);
  if (!c || !b) continue;
  const lift = c.evPct - b.evPct;
  const noise = Math.sqrt(c.sePct ** 2 + b.sePct ** 2);
  console.log(`  ${counter}: ${(c.unitsPer100 - b.unitsPer100).toFixed(2)} u/100 extra vs ${base}; EV-lift ${fmtPct(lift)} (${(lift / noise).toFixed(1)}σ)`);
}

console.log(`\nVERDICTS: ${pass} PASS · ${near} NEAR · ${fail} FAIL${groupFails.length ? ' — failing: ' + groupFails.join(', ') : ' — ALL GREEN'}`);
