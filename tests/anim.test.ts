/**
 * The animation engine's law (spec E14): animations run on the runner's
 * clock, complete in order, and any skip snaps every in-flight item to its
 * end state — one input, everything landed.
 */
import { describe, it, expect } from "vitest";
import { AnimRunner, easeOutQuad, easeInOutSine, place, flip, fade } from "../src/ui/anim.ts";

/** A runner on a manual clock. */
function makeRunner(t: { now: number }): { runner: AnimRunner; advance: (ms: number) => void } {
  const r = new AnimRunner(() => t.now);
  return { runner: r, advance: (ms) => { t.now += ms; r.update(); } };
}

describe("AnimRunner — the skippable clock", () => {
  it("drives progress through update and resolves at completion", async () => {
    const t = { now: 0 };
    const { runner, advance } = makeRunner(t);
    const seen: number[] = [];
    const done = runner.add(100, (k) => seen.push(k));
    advance(50);
    expect(seen.length).toBeGreaterThan(0);
    expect(runner.busy).toBe(true);
    advance(100);
    await done;
    expect(seen.at(-1)).toBe(1);
    expect(runner.busy).toBe(false);
  });

  it("skip snaps every in-flight item to its end state at once", async () => {
    const t = { now: 0 };
    const { runner } = makeRunner(t);
    const ends: number[] = [];
    const a = runner.add(1000, (k) => ends.push(k));
    const b = runner.add(1000, (k) => ends.push(k));
    runner.skip();
    await Promise.all([a, b]);
    expect(ends.filter((k) => k === 1)).toHaveLength(2);
    expect(runner.busy).toBe(false);
  });

  it("eases: easeOutQuad arrives fast, easeInOutSine leaves slow", () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
    expect(easeInOutSine(0.25)).toBeLessThan(0.25);
  });
});

describe("the builders", () => {
  it("place lerps position from the shoe to the spot", async () => {
    const t = { now: 0 };
    const { runner } = makeRunner(t);
    const img = { x: 0, y: 0 };
    const done = place(runner, img, { x: 0, y: 0 }, { x: 100, y: 50 }, 100);
    t.now += 50;
    runner.update();
    expect(img.x).toBeCloseTo(50);
    expect(img.y).toBeCloseTo(25);
    t.now += 100;
    runner.update();
    await done;
    expect(img.x).toBe(100);
    expect(img.y).toBe(50);
  });

  it("flip swaps the texture exactly once at the halfway line and lands face-out", async () => {
    const t = { now: 0 };
    const { runner, advance } = makeRunner(t);
    const img = { scaleX: 1 };
    let swaps = 0;
    const done = flip(runner, img, () => {
      swaps++;
      img.scaleX = 1; // the face's natural size writes its own rest scale
    }, 100);
    advance(10);
    advance(60);
    expect(swaps).toBe(1);
    expect(img.scaleX).toBeGreaterThan(0);
    advance(100);
    await done;
    expect(swaps).toBe(1);
    expect(img.scaleX).toBe(1);
  });

  it("flip is relative to the sprite's rest scale and lands back at rest", async () => {
    const t = { now: 0 };
    const { runner, advance } = makeRunner(t);
    const img = { scaleX: 0.3 };
    let swaps = 0;
    const done = flip(runner, img, () => {
      swaps++;
      img.scaleX = 0.31; // the face's natural size writes a fresh scale at the swap
    }, 100);
    advance(10);
    // mid-squash: below rest, never at 1
    expect(img.scaleX).toBeLessThan(0.3);
    advance(100);
    await done;
    expect(swaps).toBe(1);
    expect(img.scaleX).toBeCloseTo(0.31, 5);
  });

  it("fade runs to zero", async () => {
    const t = { now: 0 };
    const { runner, advance } = makeRunner(t);
    let alpha = 1;
    const img = { setAlpha: (n: number) => { alpha = n; } };
    const done = fade(runner, img, 100);
    advance(100);
    await done;
    expect(alpha).toBe(0);
  });
});