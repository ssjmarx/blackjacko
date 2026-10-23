/**
 * Derive the Sp21 hard/soft chart from a probe dump (policy iteration).
 *
 * Cell encoding from per-count best actions:
 *   b2 = best at 2 cards (plain), b3..b6 = best at 3..6 cards,
 *   b2b = best at 2 cards when a 678/777 bonus is still possible.
 *   - all D prefix through count k  -> 'D' (k >= 6) or 'D<k>'
 *   - all S prefix through count k  -> 'S' (k >= 6) or 'S<k>'
 *   - R at 2 cards                  -> 'R' (3+ handled by the interpreter)
 *   - b2b = H while plain stands    -> append '*'
 *
 * Usage: node scripts/sp21-derive.ts < dumpfile
 */
import { readFileSync } from 'node:fs';

const path = process.argv[2] ?? '/tmp/sp21-dump-h17.txt';
const lines = readFileSync(path, 'utf8').split('\n');

interface Cell {
  bestByN: Map<number, string>; // n -> action
  bonus2?: string;
  chart: string;
}

const cells = new Map<string, Cell>(); // kind|total|up
for (const line of lines) {
  if (!line.startsWith('DUMP')) continue;
  const f = line.split(/\s+/).map((x) => x.split('=')[1] ?? '');
  const up = Number(f[1]);
  const kind = f[2] ?? '';
  const total = Number(f[3]);
  const n = Number(f[4]);
  const bonus = f[5] === '1';
  const best = f[8] ?? '';
  const key = `${kind}|${total}|${up}`;
  let c = cells.get(key);
  if (!c) {
    c = { bestByN: new Map(), chart: f[7] ?? '' };
    cells.set(key, c);
  }
  if (bonus) c.bonus2 = best;
  else c.bestByN.set(n, best);
}

const warnings: string[] = [];

function encode(kind: string, total: number, up: number, c: Cell): string {
  const b2 = c.bestByN.get(2) ?? 'H';
  if (b2 === 'R') return 'R';
  // prefix over KNOWN counts; gap-tolerant. capped = some known count above
  // the prefix disagrees.
  const knownCounts = [...c.bestByN.keys()].sort((a, b) => a - b);
  const prefixLen = (act: string): { k: number; capped: boolean } => {
    let k = 2;
    let capped = false;
    for (const n of knownCounts) {
      if (n <= 2) continue;
      const b = c.bestByN.get(n);
      if (b === act) k = Math.max(k, n);
      else {
        capped = true;
        break;
      }
    }
    return { k, capped };
  };
  if (b2 === 'D') {
    const { k, capped } = prefixLen('D');
    if (!capped || k >= 6) return 'D';
    return `D${Math.max(2, k)}`;
  }
  if (b2 === 'S') {
    const { k, capped } = prefixLen('S');
    let cell = !capped || k >= 6 ? 'S' : `S${Math.max(2, k)}`;
    if (c.bonus2 === 'H') cell += cell === 'S' ? '*' : '*';
    if (c.bonus2 && c.bonus2 !== 'H' && c.bonus2 !== b2) {
      warnings.push(`${kind} ${total} v ${up}: bonus-hand best ${c.bonus2} vs plain ${b2} (cannot encode)`);
    }
    return cell;
  }
  // b2 === 'H'
  if (c.bestByN.get(3) === 'D' || c.bestByN.get(3) === 'S') {
    const later = c.bestByN.get(3);
    warnings.push(`${kind} ${total} v ${up}: H at 2 but ${later} at 3 (kept H)`);
  }
  return 'H';
}


const hardRows: Record<number, string[]> = {};
const softRows: Record<number, string[]> = {};
for (const kind of ['hard', 'soft']) {
  const totals = kind === 'hard' ? [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] : [13, 14, 15, 16, 17, 18, 19, 20];
  for (const total of totals) {
    const row: string[] = [];
    for (let up = 2; up <= 11; up++) {
      const c = cells.get(`${kind}|${total}|${up}`);
      row.push(c ? encode(kind, total, up, c) : '??');
    }
    if (kind === 'hard') hardRows[total] = row;
    else softRows[total] = row;
  }
}

// rescue table from RESCUE lines
const rescue: { up: number; t: number }[] = [];
for (const line of lines) {
  if (!line.startsWith('RESCUE')) continue;
  const f = line.split(/\s+/).map((x) => x.split('=')[1] ?? '');
  const up = Number(f[1]);
  const t = Number(f[2]);
  if (f[3] === '1') rescue.push({ up, t });
}

function fmtRow(row: string[]): string {
  return `    [${row.map((x) => `'${x}'`).join(', ')}],`;
}

console.log('// Derived chart (policy iteration from exact 2D-Spanish probe).');
console.log('// Pairs carried over from the previous chart pending split-exact audit.');
console.log('hard: {');
for (const t of Object.keys(hardRows).map(Number).sort((a, b) => a - b)) {
  console.log(`  ${t}: ${fmtRow(hardRows[t]!)}`.replace('    [', '[').replace('],', '],'));
}
console.log('},');
console.log('soft: {');
for (const t of Object.keys(softRows).map(Number).sort((a, b) => a - b)) {
  console.log(`  ${t}: ${fmtRow(softRows[t]!)}`.replace('    [', '[').replace('],', '],'));
}
console.log('},');
console.log('// rescue cells:');
const byUp = new Map<number, number[]>();
for (const r of rescue) {
  const arr = byUp.get(r.up) ?? [];
  arr.push(r.t);
  byUp.set(r.up, arr);
}
for (const up of [...byUp.keys()].sort((a, b) => a - b)) {
  console.log(`//   v ${up === 11 ? 'A' : up}: rescue totals ${byUp.get(up)!.join(', ')}`);
}
if (warnings.length) {
  console.log('\n// WARNINGS:');
  for (const w of warnings) console.log(`//   ${w}`);
}
