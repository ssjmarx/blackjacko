/**
 * The session seed — the one number every deterministic stream derives from.
 * `?seed=` names it; the wood rail and (batch 2) the shoe shuffle branch from
 * separate child streams, so decoration can never perturb the cards.
 */
import { hashStringToSeed, mulberry32, type RngFn } from "../core/rng.ts";

/** The session seed: `?seed=` as an int (or hashed string); default 1. */
export function sessionSeed(search: string = window.location.search): number {
  const raw = new URLSearchParams(search).get("seed");
  if (raw === null || raw === "") return 1;
  return /^[0-9]+$/.test(raw) ? (Number(raw) >>> 0) : hashStringToSeed(raw);
}

/** Branch a child stream off the session seed — deterministic, shuffle-safe. */
export function deriveStream(seed: number, salt: number): RngFn {
  return mulberry32(((seed ^ salt) >>> 0) || 1);
}