/**
 * The count-true stack law: stripes step per sprite, the run extent is
 * linear in the count, clamping shifts the run inward (never shrinks it),
 * and the max deck (104) and shoe (416) stay on screen at the extremes.
 */
import { describe, it, expect } from "vitest";
import { placeStripes } from "../src/ui/cardstack.ts";

describe("placeStripes — the count-true stack law", () => {
  it("steps sprites apart, linear in the count", () => {
    const p = placeStripes(26, 1, 100, "up", 0, 1e9);
    expect(p.sprites).toBe(26);
    expect(p.step).toBe(1);
    expect(p.anchor).toBe(100);
    expect(p.shift).toBe(0);
    expect(p.anchor - (p.sprites - 1) * p.step).toBe(75);
  });

  it("clamps an upward run that would leave the top (pushed down)", () => {
    const p = placeStripes(26, 1, 20, "up", 0, 1e9);
    expect(p.shift).toBe(5);
    expect(p.anchor).toBe(25);
    expect(p.anchor - (p.sprites - 1) * p.step).toBe(0);
  });

  it("clamps a rightward run that would leave the side (shifted inward)", () => {
    const p = placeStripes(104, 2, 400, "right", 0, 500);
    expect(p.shift).toBe(-106);
    expect(p.anchor).toBe(294);
    expect(p.anchor + (p.sprites - 1) * p.step).toBe(500);
  });

  it("the max deck (104) and max shoe (416) resolve to their sprite counts", () => {
    expect(Math.ceil(104 / 4)).toBe(26);
    expect(Math.ceil(416 / 4)).toBe(104);
  });

  it("the max sizes stay inside the clamp band at the extremes", () => {
    const deck = placeStripes(26, 1, 150, "up", 12, 1e9);
    expect(deck.anchor - (deck.sprites - 1) * deck.step).toBeGreaterThanOrEqual(12);
    const shoe = placeStripes(104, 2, 468, "right", 0, 468);
    expect(shoe.anchor + (shoe.sprites - 1) * shoe.step).toBeLessThanOrEqual(468);
  });

  it("never shrinks a run: the shift moves, the step and sprites hold", () => {
    const a = placeStripes(50, 3, 10, "right", 0, 1e9);
    const b = placeStripes(50, 3, 10, "right", 0, 100);
    expect(b.sprites).toBe(a.sprites);
    expect(b.step).toBe(a.step);
    expect(b.anchor).toBeLessThan(a.anchor);
  });
});