/**
 * Deterministic, seedable RNG for reproducible simulations.
 * mulberry32: fast, small-state, Monte-Carlo-grade (not cryptographic).
 * Every scenario run is exactly reproducible from its integer seed.
 */
export type RngFn = () => number;

/** Build a mulberry32 generator from an integer seed; the result maps () => [0, 1). */
export function mulberry32(seed: number): RngFn {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of a string, usable as a mulberry32 seed. */
export function hashStringToSeed(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
