/**
 * The wood's placement law (spec E14): the knot field is deterministic per
 * seed, spaced by rejection, and covers the window — wall-to-wall grain.
 */
import { describe, it, expect } from "vitest";
import { mulberry32 } from "../src/core/rng.ts";
import { WOOD } from "../src/config.ts";
import { largestBlankCells, placeKnots, seedKnots, type KnotSpot } from "../src/ui/wood.ts";

const outer = { x: 0, y: 0, w: 1280, h: 720 };

/** The knot field for a seed, through the same child stream the painter uses. */
function knots(seed: number): KnotSpot[] {
  return placeKnots(outer, mulberry32(((seed ^ WOOD.salt) >>> 0) || 1));
}

describe("the knot placement law (spec E14)", () => {
  it("is deterministic per seed and distinct across seeds", () => {
    expect(knots(7)).toEqual(knots(7));
    expect(knots(7)).not.toEqual(knots(42));
  });

  it("seeds at least the ruled minimum of six knots", () => {
    const seeded = seedKnots(outer, mulberry32(((7 ^ WOOD.salt) >>> 0) || 1));
    expect(seeded.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps every seeded knot outside every other's rejection distance", () => {
    const seeded = seedKnots(outer, mulberry32(((7 ^ WOOD.salt) >>> 0) || 1));
    for (let i = 0; i < seeded.length; i++) {
      for (let j = i + 1; j < seeded.length; j++) {
        const d = Math.hypot(seeded[i].cx - seeded[j].cx, seeded[i].cy - seeded[j].cy);
        expect(d, `pair ${i}-${j}`).toBeGreaterThanOrEqual((seeded[i].s + seeded[j].s) * 1.6 - 0.01);
      }
    }
  });

  it("runs wall to wall: after the inverse pass, no blank 2-cell square remains", () => {
    expect(largestBlankCells(outer, knots(7))).toBeLessThanOrEqual(1);
    expect(largestBlankCells(outer, knots(42))).toBeLessThanOrEqual(1);
  });

  it("every knot carries positive swirl strength", () => {
    for (const k of knots(7)) expect(k.s).toBeGreaterThan(0);
  });
});