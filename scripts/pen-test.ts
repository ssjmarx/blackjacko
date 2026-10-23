// quick probe of wong-benchmark EV vs penetration
import { runScenario } from '../src/sim/runner.ts';
import { scenarioById } from '../src/sim/scenarios.ts';
for (const pen of [0.66, 0.7, 0.75, 0.8]) {
  const sc = scenarioById('anchor-6d-s17-wong')!;
  sc.ruleset = { ...sc.ruleset, pen };
  const res = await runScenario(sc, 20_000_000, 42);
  console.log(`pen ${(pen * 100).toFixed(0)}%: EV ${(res.stats.evPctInitial() * 100).toFixed(3)}% (WoO -0.573)`);
}
