/**
 * Verification scenario battery: anchors, fresh-shoe variants, rule sweep, pen sweep, counting.
 * Targets: WoO "Variance in Blackjack" (10B-hand sims — the anchors), WoO "Rule Variations"
 * (per-rule deltas — the sweep), WoO "Spanish 21" (0.76% H17 / 0.40% S17 incl. super bonus).
 */
import type { Scenario } from './runner.ts';
import { blackjackRuleset, spanish21Ruleset } from '../core/rules.ts';
import type { RampStep, SimPlayerConfig } from '../core/player.ts';

const RAMP_1_12: RampStep[] = [
  { tc: 2, units: 2 },
  { tc: 3, units: 4 },
  { tc: 4, units: 8 },
  { tc: 5, units: 12 },
];
const RAMP_1_5: RampStep[] = [
  { tc: 1, units: 2 },
  { tc: 2, units: 3 },
  { tc: 3, units: 4 },
  { tc: 4, units: 5 },
];

const BASIC_FLAT: Partial<SimPlayerConfig> = { play: 'basic', insurance: 'never', bet: 'flat', baseUnits: 1 };
const SP21_BASIC: Partial<SimPlayerConfig> = { play: 'sp21', insurance: 'never', bet: 'flat', baseUnits: 1 };
const HILO_I18_RAMP: Partial<SimPlayerConfig> = {
  play: 'i18+fab4',
  insurance: 'index',
  bet: 'ramp',
  baseUnits: 1,
  ramp: RAMP_1_12,
};
const HILO_I18_1D: Partial<SimPlayerConfig> = {
  play: 'i18+fab4',
  insurance: 'index',
  bet: 'ramp',
  baseUnits: 1,
  ramp: RAMP_1_5,
  baseHouseEdge: 0.0,
  tcValuePerUnit: 0.005,
};
const MONKEY_RAMP: Partial<SimPlayerConfig> = {
  play: 'sp21',
  insurance: 'never',
  bet: 'ramp',
  baseUnits: 1,
  ramp: RAMP_1_12,
  tcValuePerUnit: 0.004,
  baseHouseEdge: 0.0076,
};
const KELLY: Partial<SimPlayerConfig> = {
  play: 'i18+fab4',
  insurance: 'index',
  bet: 'kelly',
  baseUnits: 1,
  kellyBankroll: 1000,
  kellyFraction: 0.5,
  kellyMaxBet: 25,
};

// ---------------------------------------------------------------------------
// Anchors — exact-ruleset EV/variance vs Wizard of Odds (cut-card sims)
// ---------------------------------------------------------------------------

const WOO_VARIANCE = 'WoO Variance in Blackjack (10B-hand cut-card sim)';
const WOO_SP21 = 'WoO Spanish 21';
const DERIVED_1D = 'derived: WoO rule deltas (8D S17 DAS ~-0.45% + 1D +0.48%) & published SD parity';

const anchors: Scenario[] = [
  {
    id: 'anchor-6d-s17-wong',
    name: '6D S17 noDAS noLS noRSA ("Wong benchmark")',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 6, s17: true, das: false, rsa: false, surrender: false, pen: 0.8 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    expected: { evPct: -0.00573, variance: 1.295, tolerance: 0.0009, source: WOO_VARIANCE, kind: 'absolute' }, // note: WoO pen unspecified; +-0.09 band
  },
  {
    id: 'anchor-6d-s17-das-ls-rsa',
    name: '6D S17 DAS LS RSA (liberal strip)',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 6, s17: true, das: true, rsa: true, surrender: true, pen: 0.8 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    expected: { evPct: -0.00281, variance: 1.303, tolerance: 0.0009, source: WOO_VARIANCE, kind: 'absolute' },
  },
  {
    id: 'anchor-6d-h17-nodas',
    name: '6D H17 noDAS noLS noRSA',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 6, s17: false, das: false, rsa: false, surrender: false, pen: 0.8 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    expected: { evPct: -0.00787, variance: 1.308, tolerance: 0.0009, source: WOO_VARIANCE, kind: 'absolute' },
  },
  {
    id: 'anchor-6d-h17-das',
    name: '6D H17 DAS noLS noRSA',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 6, s17: false, das: true, rsa: false, surrender: false, pen: 0.8 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    expected: { evPct: -0.00628, variance: 1.346, tolerance: 0.0009, source: WOO_VARIANCE, kind: 'absolute' },
  },
  {
    id: 'anchor-8d-h17-nodas',
    name: '8D H17 noDAS noLS noRSA',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 8, s17: false, das: false, rsa: false, surrender: false, pen: 0.8 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    expected: { evPct: -0.00812, variance: 1.309, tolerance: 0.0009, source: WOO_VARIANCE, kind: 'absolute' },
  },
  {
    id: 'anchor-2d-h17-das',
    name: '2D H17 DAS noLS noRSA (shoe chart caveat)',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 2, s17: false, das: true, rsa: false, surrender: false, pen: 0.8 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    note: 'plays the 4-8 deck chart; WoO 2D chart differs in a few cells',
    expected: { evPct: -0.00398, variance: 1.341, tolerance: 0.001, source: WOO_VARIANCE, kind: 'absolute' },
  },
  {
    id: 'anchor-1d-s17-das',
    name: '1D S17 DAS noLS — off the top (fresh shoe)',
    group: 'anchors',
    ruleset: blackjackRuleset({ decks: 1, s17: true, das: true, rsa: false, surrender: false, freshShoe: true }),
    player: BASIC_FLAT,
    unitDollars: 25,
    note: 'single-deck chart adjudicator: lands at ~0.00% only if the SD chart is right',
    expected: { evPct: 0.0, tolerance: 0.0012, source: DERIVED_1D, kind: 'absolute' },
  },
  {
    id: 'anchor-sp21-6d-h17',
    name: 'Spanish 21 6D H17 (bonuses + super bonus, $25 units)',
    group: 'anchors',
    ruleset: spanish21Ruleset({ decks: 6, s17: false, pen: 0.8 }),
    player: SP21_BASIC,
    unitDollars: 25,
    note: 'chart derived by exact-EV policy iteration (scripts/sp21-probe.ts); ~0.1% residual vs WoO from the suit-tier collapse and unaudited pairs',
    expected: { evPct: -0.0076, tolerance: 0.0015, source: WOO_SP21, kind: 'absolute' },
  },
  {
    id: 'anchor-sp21-6d-s17',
    name: 'Spanish 21 6D S17 (bonuses + super bonus, $25 units)',
    group: 'anchors',
    ruleset: spanish21Ruleset({ decks: 6, s17: true, pen: 0.8 }),
    player: SP21_BASIC,
    unitDollars: 25,
    expected: { evPct: -0.004, tolerance: 0.0015, source: WOO_SP21, kind: 'absolute' },
  },
];

// Fresh-shoe variants of the shoe-game anchors: same targets, +tolerance for
// the (small) cut-card effect difference.
const fresh: Scenario[] = anchors.slice(0, 6).map((a) => ({
  ...a,
  id: `${a.id}-fresh`,
  group: 'fresh' as const,
  ruleset: { ...a.ruleset, freshShoe: true, pen: 1.0 },
  name: `${a.name} — fresh shoe (off the top)`,
  expected: a.expected ? { ...a.expected, tolerance: a.expected.tolerance + 0.0006 } : undefined,
}));

// ---------------------------------------------------------------------------
// Rule sweep — one toggle at a time off the 6D S17 DAS RSA baseline (fresh shoe)
// ---------------------------------------------------------------------------

const SWEEP_BASE = blackjackRuleset({ decks: 6, s17: true, das: true, rsa: true, surrender: false, freshShoe: true });
const WOO_DELTAS = 'WoO Blackjack Rule Variations (8D S17 DAS baseline deltas)';

/** Build one rule-sweep scenario: a single toggle off the fresh-shoe baseline with its WoO delta. */
function sweep(id: string, name: string, deltaPct: number, over: Parameters<typeof blackjackRuleset>[0], note?: string): Scenario {
  return {
    id: `sweep-${id}`,
    name,
    group: 'sweep',
    ruleset: blackjackRuleset({ ...SWEEP_BASE, ...over }),
    player: BASIC_FLAT,
    unitDollars: 25,
    note,
    expected: { deltaPct, tolerance: 0.0008, source: WOO_DELTAS, kind: 'delta' },
  };
}

const sweepScenarios: Scenario[] = [
  {
    id: 'sweep-baseline',
    name: 'baseline: 6D S17 DAS RSA noLS (fresh)',
    group: 'sweep',
    ruleset: SWEEP_BASE,
    player: BASIC_FLAT,
    unitDollars: 25,
    note: 'reference EV ~ -0.33% (derived)',
    expected: { evPct: -0.0033, tolerance: 0.001, source: 'derived: WoO anchors cross-checked through LS/pen adjustments', kind: 'reference' },
  },
  sweep('h17', 'H17 (dealer hits soft 17)', -0.0022, { s17: false }),
  sweep('nodas', 'no DAS', -0.0014, { das: false }),
  sweep('norsa', 'no resplit aces', -0.0008, { rsa: false }),
  sweep('ls', 'late surrender', 0.0007, { surrender: true }),
  sweep('65', 'blackjack pays 6:5', -0.0139, { bjPayout: 1.2 }),
  sweep('dbl-1011', 'double 10-11 only', -0.0018, { doubleOn: '10-11' }),
  sweep('8d', '8 decks (vs 6)', -0.0002, { decks: 8 }),
  sweep('1d', 'single deck (vs 6)', 0.0048, { decks: 1 }, 'uses the single-deck chart'),
];

// ---------------------------------------------------------------------------
// Penetration sweep — counting EV vs pen (reference curve)
// ---------------------------------------------------------------------------

const penScenarios: Scenario[] = [0.5, 0.66, 0.75, 0.85, 1.0].map((pen) => ({
  id: `pen-${Math.round(pen * 100)}`,
  name: `6D S17 DAS, pen ${(pen * 100).toFixed(0)}%, Hi-Lo 1-12 + I18/Fab4`,
  group: 'pen' as const,
  ruleset: blackjackRuleset({ decks: 6, s17: true, das: true, pen }),
  player: HILO_I18_RAMP,
  unitDollars: 25,
  expected: {
    tolerance: 0,
    source: 'reference curve: win rate should rise with penetration',
    kind: 'reference' as const,
    soft: 'monotonic' as const,
  },
}));

// ---------------------------------------------------------------------------
// Counting presets — the four user-selected scenarios (+ baselines)
// ---------------------------------------------------------------------------

const countScenarios: Scenario[] = [
  {
    id: 'count-6d-flat-basic',
    name: 'baseline: 6D S17 DAS 75%, flat basic',
    group: 'count',
    ruleset: blackjackRuleset({ decks: 6, s17: true, das: true, surrender: true, pen: 0.75 }),
    player: BASIC_FLAT,
    unitDollars: 25,
    expected: { tolerance: 0, source: 'baseline for the counting comparisons', kind: 'reference' },
  },
  {
    id: 'count-6d-hilo-1-12',
    name: 'Hi-Lo 6D S17 DAS 75%, ramp 1-12, I18+Fab4',
    group: 'count',
    ruleset: blackjackRuleset({ decks: 6, s17: true, das: true, surrender: true, pen: 0.75 }),
    player: HILO_I18_RAMP,
    unitDollars: 25,
    note: 'Schlesinger-style benchmark: BJA ballparks ~0.2-0.6 units/100 at 75% pen',
    expected: { tolerance: 0, source: 'soft check: EV% > 0 (BJA ballpark 0.1-1.2% of avg bet)', kind: 'reference', soft: "positive" },
  },
  {
    id: 'count-1d-hilo-1-5',
    name: "Hi-Lo Tony's ruleset: 1D S17 DAS 100% pen, ramp 1-5, I18 (SD caveat)",
    group: 'count',
    ruleset: blackjackRuleset({ decks: 1, s17: true, das: true, pen: 1.0 }),
    player: HILO_I18_1D,
    unitDollars: 25,
    note: 'I18 are the multi-deck indices (spec: per-ruleset index sets slot in later)',
    expected: { tolerance: 0, source: 'soft check: EV% > 0 (SD 100% pen is a strong game)', kind: 'reference', soft: "positive" },
  },
  {
    id: 'count-sp21-flat-basic',
    name: 'baseline: Sp21 6D H17 75%, flat basic',
    group: 'count',
    ruleset: spanish21Ruleset({ decks: 6, s17: false, pen: 0.75 }),
    player: SP21_BASIC,
    unitDollars: 25,
    expected: { tolerance: 0, source: 'baseline for the Monkey-count comparison', kind: 'reference' },
  },
  {
    id: 'count-sp21-monkey-1-12',
    name: 'Sp21 6D H17 75%, Monkey count, ramp 1-12 (swing thesis)',
    group: 'count',
    ruleset: spanish21Ruleset({ decks: 6, s17: false, pen: 0.75 }),
    player: MONKEY_RAMP,
    unitDollars: 25,
    note: 'first swing-thesis measurement: Monkey-count Sp21 vs flat basic',
    expected: { tolerance: 0, source: 'soft check: EV% > 0', kind: 'reference', soft: "positive" },
  },
  {
    id: 'count-6d-kelly',
    name: 'Hi-Lo 6D S17 DAS 75%, half-Kelly sizing, I18+Fab4',
    group: 'count',
    ruleset: blackjackRuleset({ decks: 6, s17: true, das: true, surrender: true, pen: 0.75 }),
    player: KELLY,
    unitDollars: 25,
    expected: { tolerance: 0, source: 'soft check: EV% > 0', kind: 'reference', soft: "positive" },
  },
  // spread ladder: the "EV shift as the betting ramp changes" measurement
  ...([2, 4, 8, 12, 16] as const).map((max) => ({
    id: `spread-1-${max}`,
    name: `Hi-Lo 6D S17 DAS 75%, spread 1-${max}, I18+Fab4`,
    group: 'spread' as const,
    ruleset: blackjackRuleset({ decks: 6, s17: true, das: true, surrender: true, pen: 0.75 }),
    player: {
      play: 'i18+fab4',
      insurance: 'index',
      bet: 'ramp',
      baseUnits: 1,
      ramp: [
        { tc: 2, units: Math.max(2, Math.round(max / 6)) },
        { tc: 3, units: Math.max(3, Math.round((max / 12) * 4)) },
        { tc: 4, units: Math.max(4, Math.round((max / 12) * 8)) },
        { tc: 5, units: max },
      ],
    } satisfies Partial<SimPlayerConfig>,
    unitDollars: 25,
    note: 'EV must rise monotonically with the spread',
    expected: { tolerance: 0, source: 'reference: monotonic EV vs spread', kind: 'reference' as const, soft: 'monotonic' as const },
  })),
];

export const ALL_SCENARIOS: Scenario[] = [...anchors, ...fresh, ...sweepScenarios, ...penScenarios, ...countScenarios];

/** All scenarios in a group, in declaration order. */
export function scenariosByGroup(group: Scenario['group']): Scenario[] {
  return ALL_SCENARIOS.filter((s) => s.group === group);
}

/** Look a scenario up by id (undefined when unknown). */
export function scenarioById(id: string): Scenario | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id);
}
