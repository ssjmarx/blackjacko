/**
 * The count-true stack law, v3: the full deck drawn once and stuck in place,
 * dealt sprites hiding from the dealt end; the cut card rides the pen mark
 * from the planted end; the footprint wants card size and yields to the run.
 */
import { describe, it, expect } from "vitest";
import {
  placeStripes,
  placeStripesLeft,
  cutSpriteIndex,
  cutSpriteIdx,
  dealtOrder,
  stackPlan,
  hiddenSprites,
  dealtFrom,
  fitFootprint,
} from "../src/ui/cardstack.ts";

describe("placeStripes — the stuck-in-place run", () => {
  it("steps sprites from the anchor, linear in the count", () => {
    const p = placeStripes(26, 1, 100, 1e9);
    expect(p.sprites).toBe(26);
    expect(p.step).toBe(1);
    expect(p.anchor).toBe(100);
    expect(p.shift).toBe(0);
    expect(p.anchor + (p.sprites - 1) * p.step).toBe(125);
  });

  it("the max deck (104) and max shoe (416) resolve to their sprite counts", () => {
    expect(Math.ceil(104 / 4)).toBe(26);
    expect(Math.ceil(416 / 4)).toBe(104);
  });

  it("clamps a run that would pass the far edge (shifted inward, never shrunk)", () => {
    const p = placeStripes(104, 2, 400, 500);
    expect(p.shift).toBe(-106);
    expect(p.anchor).toBe(294);
    expect(p.anchor + (p.sprites - 1) * p.step).toBe(500);
    const a = placeStripes(50, 3, 10, 1e9);
    const b = placeStripes(50, 3, 10, 100);
    expect(b.sprites).toBe(a.sprites);
    expect(b.step).toBe(a.step);
    expect(b.anchor).toBeLessThan(a.anchor);
  });
});

describe("placeStripesLeft — the reflected run", () => {
  it("steps sprites in the − direction from the anchor", () => {
    const p = placeStripesLeft(26, 1, 500, 0);
    expect(p.anchor).toBe(500);
    expect(p.shift).toBe(0);
    expect(p.anchor - (p.sprites - 1) * p.step).toBe(475);
  });

  it("clamps a run that would pass the near edge (shifted inward, never shrunk)", () => {
    const p = placeStripesLeft(104, 2, 200, 100);
    expect(p.shift).toBe(106);
    expect(p.anchor).toBe(306);
    expect(p.anchor - (p.sprites - 1) * p.step).toBe(100);
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

describe("stackPlan — the full-shoe accounting, and the erosion law", () => {
  it("a 416 shoe at 75% pen: 104 sprites, the cut at 27, a 26-sprite tail", () => {
    const p = stackPlan(0.75, 416, 4);
    expect(p.total).toBe(104);
    expect(p.cut).toBe(27);
    expect(p.tail).toBe(26);
  });

  it("Tony's single deck at full pen: the cut card sits at the planted base", () => {
    const p = stackPlan(1, 52, 4);
    expect(p.total).toBe(13);
    expect(p.cut).toBe(1);
    expect(p.tail).toBe(0);
  });

  it("a fresh shoe has dealt zero and nothing hidden", () => {
    expect(dealtFrom(0.75, 416, 311)).toBe(0);
    expect(hiddenSprites(0, 4)).toBe(0);
  });

  it("the cut card is exposed exactly when the dealable run empties", () => {
    const p = stackPlan(0.75, 416, 4);
    expect(p.total - hiddenSprites(307, 4)).toBe(p.cut + 1);
    expect(p.total - hiddenSprites(311, 4)).toBe(p.cut);
    expect(p.total - hiddenSprites(312, 4)).toBe(p.cut - 1);
  });
});

describe("cutSpriteIdx and dealtOrder — the horizontal reflection laws", () => {
  const plan = stackPlan(0.75, 416, 4); // cut 27, total 104

  it("both horizontal rows put the cut sprite 26 from the plant — 75% down the length", () => {
    expect(cutSpriteIdx("right", plan.total, plan.cut)).toBe(26);
    expect(cutSpriteIdx("left", plan.total, plan.cut)).toBe(26);
    expect(cutSpriteIdx("down", plan.total, plan.cut)).toBe(77);
  });

  it("horizontal rows erode from the far end; the deck sheds from its top", () => {
    expect(dealtOrder("right", 104, 0)).toBe(103);
    expect(dealtOrder("left", 104, 0)).toBe(103);
    expect(dealtOrder("left", 104, 103)).toBe(0);
    expect(dealtOrder("down", 104, 0)).toBe(0);
    expect(dealtOrder("down", 104, 103)).toBe(103);
  });

  it("the pen mark position reads correctly from the planted end", () => {
    // the tail (26 sprites) rides the plant; the cut card is its boundary
    const idx = cutSpriteIdx("left", plan.total, plan.cut);
    expect((idx) * 2).toBeCloseTo(52); // 52px of a 206px run from the plant
    expect(206 - idx * 2).toBeCloseTo(154); // 75% down the length, reading left to right
  });
});

describe("fitFootprint — the card-size-first footprint law", () => {
  const want = { x: 0, y: 0, w: 90, h: 126 };

  it("keeps the full card size with the first card centered in its cell", () => {
    const f = fitFootprint({ x: 0, y: 0, w: 288, h: 259.2 }, "down", 26, 1.498, want, 64.8);
    expect(f.clamped).toBe(false);
    expect(f.box.w).toBe(90);
    expect(f.box.h).toBe(126);
    expect(f.start).toBe(64.8);
    expect(f.box.y).toBeCloseTo(64.8 - 63);
    expect(f.box.x).toBeCloseTo((288 - 90) / 2);
  });

  it("the back yields to the run when it cannot fit below the cell center", () => {
    const f = fitFootprint({ x: 0, y: 0, w: 288, h: 200 }, "down", 60, 1.498, want, 100);
    expect(f.clamped).toBe(false);
    expect(f.start).toBe(100);
    expect(f.box.y).toBeCloseTo(100 - f.box.h / 2);
    expect(f.box.h / 2 + 60).toBeLessThanOrEqual(200);
  });

  it("a rightward run leaves the back left-planted, vertically centered", () => {
    const f = fitFootprint({ x: 0, y: 0, w: 864, h: 129.6 }, "right", 208, 1.498, want);
    expect(f.clamped).toBe(false);
    expect(f.box.x).toBe(0);
    expect(f.box.w).toBe(126);
    expect(f.box.h).toBe(90);
    expect(f.start).toBe(63);
  });

  it("a leftward run plants at the window-side (right) edge, growing toward the pit", () => {
    const f = fitFootprint({ x: 0, y: 0, w: 864, h: 129.6 }, "left", 208, 1.498, want);
    expect(f.clamped).toBe(false);
    expect(f.box.x).toBe(864 - 126);
    expect(f.box.w).toBe(126);
    expect(f.box.h).toBe(90);
    expect(f.start).toBe(864 - 63);
  });

  it("the row's back never yields: card-sized at every extent", () => {
    const f = fitFootprint({ x: 0, y: 0, w: 200, h: 129.6 }, "left", 120, 1.498, want);
    expect(f.clamped).toBe(false);
    expect(f.box.x).toBe(200 - 126);
    expect(f.box.w).toBe(126);
    expect(f.box.h).toBe(90);
  });

  it("the row shrinks at the card's rate: double the card, double the footprint", () => {
    const a = fitFootprint({ x: 0, y: 0, w: 900, h: 400 }, "left", 150, 1.498, want);
    const b = fitFootprint({ x: 0, y: 0, w: 900, h: 400 }, "left", 150, 1.498, { x: 0, y: 0, w: 180, h: 252 });
    expect(b.box.w).toBeCloseTo(a.box.w * 2);
    expect(b.box.h).toBeCloseTo(a.box.h * 2);
  });

  it("the clamped deck pins its tail to the extent floor and lets the head overflow", () => {
    const f = fitFootprint({ x: 0, y: 0, w: 304, h: 120 }, "down", 140, 1.498, want, 60);
    expect(f.clamped).toBe(true);
    expect(f.box.h).toBeLessThanOrEqual(120);
    expect(f.start + f.box.h / 2 + 140).toBeLessThanOrEqual(120 + 0.01);
  });
});