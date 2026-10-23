/**
 * Console UI for the verification battery (user-locked: console-only output).
 * Suites: verify | anchors | sweep | pen | count | list; scales quick/standard/print (1M/20M/100M).
 * e.g. `node src/sim/cli.ts --suite verify --scale quick` or `--scenario anchor-6d-s17-wong --hands 20e6`.
 */
import { runScenario, type ScenarioResult, type Scenario } from './runner.ts';
import { ALL_SCENARIOS, scenarioById, scenariosByGroup } from './scenarios.ts';
import { describeRuleset } from '../core/rules.ts';

const SCALES: Record<string, number> = {
  quick: 1_000_000,
  standard: 20_000_000,
  print: 100_000_000,
};

interface CliOptions {
  suite: string;
  scenario?: string;
  hands?: number;
  scale: string;
  seed: number;
}

/** Parse --suite/--scenario/--hands/--scale/--seed/--list from argv; throws on unknown args. */
function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { suite: 'verify', scale: 'quick', seed: 42 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--suite') opts.suite = argv[++i]!;
    else if (a === '--scenario') opts.scenario = argv[++i]!;
    else if (a === '--hands') opts.hands = parseHands(argv[++i]!);
    else if (a === '--scale') opts.scale = argv[++i]!;
    else if (a === '--seed') opts.seed = Number(argv[++i]!);
    else if (a === '--list' || a === 'list') opts.suite = 'list';
    else throw new Error(`unknown arg: ${a}`);
  }
  return opts;
}

/** Accept plain integers or scientific notation ("20e6"). */
function parseHands(s: string): number {
  const m = /^(\d+(?:\.\d+)?)e(\d+)$/i.exec(s);
  if (m) return Math.round(Number(m[1]) * 10 ** Number(m[2]));
  return Math.round(Number(s));
}

/** Left-justify, truncating with an ellipsis when over the width. */
function pad(s: string, n: number): string {
  const t = s.length > n ? s.slice(0, n - 1) + '…' : s;
  return t.padEnd(n);
}

/** Right-justify, hard-clipping when over the width. */
function padL(s: string, n: number): string {
  const t = s.length > n ? s.slice(0, n) : s;
  return t.padStart(n);
}

interface Verdict {
  text: string;
  detail: string;
}

/** PASS/NEAR/FAIL against the scenario's expectation (absolute, delta vs baseline, or soft reference). */
function verdictFor(res: ScenarioResult, baseline?: ScenarioResult): Verdict {
  const sc = res.scenario;
  const ev = res.stats.evPctInitial();
  const se = res.stats.seEvPctInitial();
  const ex = sc.expected;
  if (!ex) return { text: '—', detail: '' };

  if (ex.kind === 'absolute' && ex.evPct !== undefined) {
    const diff = ev - ex.evPct;
    const tol = Math.max(ex.tolerance, 2.5 * se);
    if (Math.abs(diff) <= tol) return { text: 'PASS', detail: `Δ${fmtPct(diff)}` };
    if (Math.abs(diff) <= Math.max(2 * ex.tolerance, 4 * se)) return { text: 'NEAR', detail: `Δ${fmtPct(diff)}` };
    return { text: 'FAIL', detail: `Δ${fmtPct(diff)}` };
  }

  if (ex.kind === 'delta' && ex.deltaPct !== undefined && baseline) {
    const bEv = baseline.stats.evPctInitial();
    const bSe = baseline.stats.seEvPctInitial();
    const delta = ev - bEv;
    const noise = Math.sqrt(se * se + bSe * bSe);
    const tol = Math.max(ex.tolerance, 2.5 * noise);
    if (Math.abs(delta - ex.deltaPct) <= tol) return { text: 'PASS', detail: `Δ${fmtPct(delta - ex.deltaPct)}` };
    return { text: 'FAIL', detail: `got ${fmtPct(delta)} vs exp ${fmtPct(ex.deltaPct)}` };
  }

  if (ex.kind === 'reference' && ex.soft === 'positive') {
    const margin = 2 * se;
    return ev > margin
      ? { text: 'PASS', detail: `EV ${fmtPct(ev)} > 0` }
      : { text: 'FAIL', detail: `EV ${fmtPct(ev)} not positive` };
  }
  if (ex.kind === 'reference' && ex.soft === 'monotonic') {
    return { text: '(group)', detail: '' };
  }
  return { text: '—', detail: '' };
}

/** ' var✓' when simulated variance matches the target within 0.06, else a ' var✗(...)' flag. */
function varianceOk(res: ScenarioResult): string {
  const ex = res.scenario.expected;
  if (!ex || ex.variance === undefined) return '';
  const v = res.stats.variance();
  return Math.abs(v - ex.variance) <= 0.06 ? ' var✓' : ` var✗(${v.toFixed(3)} vs ${ex.variance})`;
}

/** Signed percent with three decimals ('+0.890%'). */
function fmtPct(x: number): string {
  return `${x >= 0 ? '+' : ''}${(x * 100).toFixed(3)}%`;
}

/** One table row for a finished scenario (verdict + variance check, delta scenarios vs the baseline). */
function printResultRow(res: ScenarioResult, baseline?: ScenarioResult): void {
  const st = res.stats;
  const sc = res.scenario;
  const v = verdictFor(res, baseline);
  const line = [
    pad(sc.id, 26),
    pad(describeRuleset(sc.ruleset), 30),
    padL(String(res.hands), 9),
    padL(st.avgInitialBet().toFixed(2), 6),
    padL(`${fmtPct(st.evPctInitial())}`, 9),
    padL(`±${(st.seEvPctInitial() * 100).toFixed(3)}`, 8),
    padL(st.unitsPer100().toFixed(2), 7),
    padL(st.variance().toFixed(3), 7),
    padL(st.handsPerShoe() > 0 ? st.handsPerShoe().toFixed(1) : '–', 7),
    padL(v.text, 7),
    v.detail + varianceOk(res),
  ].join(' ');
  console.log(line);
}

/** The column header line matching printResultRow. */
function printHeader(): void {
  console.log([
    pad('SCENARIO', 26),
    pad('RULES', 30),
    padL('HANDS', 9),
    padL('AVGBET', 6),
    padL('EV%', 9),
    padL('±SE', 8),
    padL('U/100', 7),
    padL('VAR', 7),
    padL('H/SHOE', 7),
    padL('VERDICT', 7),
    'detail',
  ].join(' '));
  console.log('-'.repeat(150));
}

/** Run a scenario list in order, then the monotonic check when the group declares one. */
function runGroup(name: string, scenarios: Scenario[], hands: number, seed: number): void {
  if (scenarios.length === 0) return;
  console.log(`\n=== ${name} ===`);
  printHeader();
  const results: ScenarioResult[] = [];
  let baseline: ScenarioResult | undefined;
  const withMonotonic = scenarios.some((s) => s.expected?.soft === 'monotonic');
  for (const sc of scenarios) {
    const res = runScenario(sc, hands, seed);
    results.push(res);
    if (sc.id === 'sweep-baseline') baseline = res;
    printResultRow(res, baseline);
  }
  if (scenarios[0]!.expected?.soft === 'monotonic') {
    // ordered monotonic check (spread ladder / pen sweep)
    let prev = -Infinity;
    let mono = true;
    for (const r of results) {
      const u100 = r.stats.unitsPer100();
      if (u100 < prev - r.stats.seUnitsPer100() * 2) mono = false;
      prev = Math.max(prev, u100);
    }
    console.log(`    -> monotonic check: ${mono ? 'PASS (EV rises with the knob)' : 'FAIL (non-monotonic within noise)'}`);
  }
  const ms = results.reduce((a, r) => a + r.elapsedMs, 0);
  console.log(`    (${(ms / 1000).toFixed(1)}s total)`);
  void withMonotonic;
}

/** CLI entry: parse args, dispatch to --list / --scenario / a named suite. */
function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const hands = opts.hands ?? SCALES[opts.scale] ?? SCALES.quick!;

  console.log('BLACKJACK BALATRO — CORE VERIFICATION HARNESS v0.1.0');
  console.log(`scale=${opts.scale} hands/scenario=${hands.toLocaleString()} seed=${opts.seed}`);
  console.log('count convention: floored TC · deck-keyed total-dependent charts · US hole-card');

  if (opts.suite === 'list') {
    for (const s of ALL_SCENARIOS) {
      console.log(`${pad(s.id, 28)} [${s.group}] ${s.name}`);
    }
    return;
  }

  if (opts.scenario) {
    const sc = scenarioById(opts.scenario);
    if (!sc) throw new Error(`unknown scenario: ${opts.scenario} (try --list)`);
    runGroup('single', [sc], hands, opts.seed);
    return;
  }

  switch (opts.suite) {
    case 'verify':
    case 'all':
      runGroup('ANCHORS — exact-ruleset EV/variance vs Wizard of Odds', scenariosByGroup('anchors'), hands, opts.seed);
      runGroup('FRESH SHOE — off-the-top variants', scenariosByGroup('fresh'), hands, opts.seed);
      runGroup('RULE SWEEP — one toggle at a time (delta vs sweep-baseline)', scenariosByGroup('sweep'), hands, opts.seed);
      runGroup('PEN SWEEP — counting EV vs penetration', scenariosByGroup('pen'), hands, opts.seed);
      runGroup('SPREAD LADDER — counting EV vs bet spread', scenariosByGroup('spread'), hands, opts.seed);
      runGroup('COUNTING — flat vs ramps vs Kelly, BJ + Sp21 (Monkey)', scenariosByGroup('count'), hands, opts.seed);
      break;
    case 'anchors':
      runGroup('ANCHORS', scenariosByGroup('anchors'), hands, opts.seed);
      runGroup('FRESH SHOE', scenariosByGroup('fresh'), hands, opts.seed);
      break;
    case 'sweep':
      runGroup('RULE SWEEP', scenariosByGroup('sweep'), hands, opts.seed);
      break;
    case 'pen':
      runGroup('PEN SWEEP', scenariosByGroup('pen'), hands, opts.seed);
      break;
    case 'count':
      runGroup('COUNTING', scenariosByGroup('count'), hands, opts.seed);
      break;
    default:
      throw new Error(`unknown suite: ${opts.suite}`);
  }
}

main();
