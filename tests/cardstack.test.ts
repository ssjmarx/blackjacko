/**
 * The count-true stack law: stripes step per sprite, clamping shifts inward
 * (never shrinks), and the cut card rides the pen mark — one red sprite per
 * `group` cards of penetration, the ruled 26th-card-becomes-sprite-7 law.
 */
import { describe, it, expect } from "vitest";
import { placeStripes, cutSpriteIndex, stackPlan } from "../src/ui/cardstack.ts";

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

describe("cutSpriteIndex — the pen mark law", () => {
  it("the 26th card is inside the 7th sprite (the ruled example)", () => {
    expect(cutSpriteIndex(0.75, 100, 4)).toBe(7);
  });

  it("the 8-deck shoe at 75% pen marks sprite 27", () => {
    expect(cutSpriteIndex(0.75, 416, 4)).toBe(27);
  });

  it("one sprite of shift for every 4 cards of pen change", () => {
    const at = (pen: number): number => cutSpriteIndex(pen, 100, 4);
    expect(at(0.71)).toBe(at(0.75) + 1);
    expect(at(0.79)).toBe(at(0.75) - 1);
    expect(at(0.67)).toBe(at(0.75) + 2);
  });

  it("pen 1.0 puts the cut card at the base sprite", () => {
    expect(cutSpriteIndex(1, 416, 4)).toBe(1);
  });
});

describe("stackPlan — the sprite accounting", () => {
  it("a fresh 416 shoe at 75% pen: 26 tail sprites, the cut, 78 dealable", () => {
    const p = stackPlan(0.75, 416, 312, 4);
    expect(p.cut).toBe(27);
    expect(p.tail).toBe(26);
    expect(p.total).toBe(105);
  });

  it("a depleted shoe collapses to the tail plus the exposed cut card", () => {
    const p = stackPlan(0.75, 416, 0, 4);
    expect(p.total).toBe(27);
  });

  it("Tony's single deck at full pen: the cut card sits at the base", () => {
    const p = stackPlan(1, 52, 52, 4);
    expect(p.cut).toBe(1);
    expect(p.tail).toBe(0);
    expect(p.total).toBe(14);
  });
});