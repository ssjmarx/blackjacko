/**
 * The layout solver's contract: zone placement, card metrics, the ratio
 * sweep, the axis flip, and the hand-count expansion. The pure heart of
 * goal 1 — if these hold, the felt reflows honestly at any aspect.
 */
import { describe, it, expect } from "vitest";
import { solveTable, type Rect, type TableLayout } from "../src/layout/table.ts";

/** True when inner sits fully inside outer (with a float tolerance). */
function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - 0.01 &&
    inner.y >= outer.y - 0.01 &&
    inner.x + inner.w <= outer.x + outer.w + 0.01 &&
    inner.y + inner.h <= outer.y + outer.h + 0.01
  );
}

/** True when two rects share any area. */
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Every non-transient zone of a layout, for the on-screen invariant. */
function zonesOf(l: TableLayout): Record<string, Rect> {
  return {
    safe: l.safe,
    penBar: l.penBar,
    chipTray: l.chipTray,
    controls: l.controls,
    dealer: l.dealer,
    shoe: l.shoe,
    player: l.player,
    insuranceSpot: l.insuranceSpot,
    countHud: l.countHud,
    contextPanel: l.contextPanel,
    contextButton: l.contextButton,
    lowerThird: l.lowerThird,
  };
}

/** The ruled ratio ladder, from 20:9 landscape to 9:20 portrait. */
const SIZES: [number, number][] = [
  [1920, 864],
  [1920, 1080],
  [1280, 720],
  [1024, 768],
  [768, 768],
  [768, 1024],
  [360, 800],
  [480, 216],
  [216, 480],
  [100, 180],
];

describe("layout: the ratio sweep", () => {
  for (const [w, h] of SIZES) {
    it(`holds the law at ${w}x${h}`, () => {
      for (const axisFlip of [false, true]) {
        for (const hands of [1, 2, 4]) {
          const l = solveTable(w, h, { axisFlip, hands });
          const where = `${w}x${h} flip=${axisFlip} hands=${hands}`;

          // the card law: 10% of screen width, floored; always upright 5:7
          expect(l.metrics.cardW, where).toBe(Math.max(36, w * 0.1));
          expect(l.metrics.cardH, where).toBeCloseTo(l.metrics.cardW * 1.4);

          // the hand cap: a stacked hand fits half the screen width
          expect(l.metrics.cardW * 1.2, where).toBeLessThanOrEqual(w * 0.5 + 0.01);

          // orientation flips at square (landscape wins the tie)
          expect(l.orientation, where).toBe(h > w ? "portrait" : "landscape");

          // every zone stays on screen
          for (const [name, r] of Object.entries(zonesOf(l))) {
            if (r.w === 0 && r.h === 0) continue;
            expect(contains({ x: 0, y: 0, w, h }, r), `${name} off-screen at ${where}`).toBe(true);
          }

          // field zones never collide with the chrome bands
          expect(overlaps(l.dealer, l.penBar), where).toBe(false);
          expect(overlaps(l.player, l.chipTray), where).toBe(false);
          expect(overlaps(l.controls, l.chipTray), where).toBe(false);
          expect(overlaps(l.player, l.controls), where).toBe(false);
          expect(overlaps(l.countHud, l.chipTray), where).toBe(false);

          // line slots live inside the player band; bet spots inside their slot
          for (const s of l.lineSlots) expect(contains(l.player, s), where).toBe(true);
          for (const [i, b] of l.betSpots.entries()) {
            expect(contains(l.lineSlots[i]!, b), `${where} bet ${i + 1}`).toBe(true);
          }

          // the dealer row reports at least two cards fit before squashing
          expect(l.metrics.dealerFits, where).toBeGreaterThanOrEqual(2);
        }
      }
    });
  }
});

describe("layout: rulings", () => {
  it("portrait player band is half the width at rest, full width at four hands", () => {
    const rest = solveTable(360, 800, { hands: 1 });
    const four = solveTable(360, 800, { hands: 4 });
    expect(rest.player.w).toBeCloseTo(rest.safe.w * 0.5);
    expect(four.player.w).toBeCloseTo(four.safe.w);
  });

  it("the context panel collapses to the button at four hands (portrait)", () => {
    const rest = solveTable(360, 800, { hands: 1 });
    const four = solveTable(360, 800, { hands: 4 });
    expect(rest.contextPanel.w).toBeGreaterThan(0);
    expect(four.contextPanel.w).toBe(0);
    expect(four.contextButton.w).toBe(48);
  });

  it("axisFlip mirrors the hand locations", () => {
    const plain = solveTable(1280, 720);
    const flipped = solveTable(1280, 720, { axisFlip: true });
    expect(plain.dealer.x).toBeLessThan(plain.player.x);
    expect(flipped.dealer.x).toBeGreaterThan(flipped.player.x);
    const pPlain = solveTable(360, 800);
    const pFlip = solveTable(360, 800, { axisFlip: true });
    expect(pPlain.player.x).toBeGreaterThan(pFlip.player.x); // the band moves left
    expect(pPlain.dealer.y).toBeLessThan(pPlain.player.y); // dealer stays top in portrait
  });

  it("the axis flips exactly at square (landscape wins the tie)", () => {
    expect(solveTable(768, 768).orientation).toBe("landscape");
    expect(solveTable(767, 768).orientation).toBe("portrait");
  });

  it("the lower third hugs the lower-left edge (television credit)", () => {
    const l = solveTable(1280, 720);
    expect(l.lowerThird.x).toBe(l.safe.x);
    expect(l.lowerThird.y + l.lowerThird.h).toBeLessThanOrEqual(l.chipTray.y);
  });

  it("goldens: canonical sizes", () => {
    const desktop = solveTable(1280, 720);
    expect(desktop.metrics.cardW).toBe(128);
    expect(desktop.metrics.cardH).toBeCloseTo(179.2);
    expect(desktop.player.w).toBeCloseTo(desktop.safe.w * 0.36);
    const phone = solveTable(360, 800, { hands: 1 });
    expect(phone.metrics.cardW).toBe(36);
    expect(phone.player.w).toBeCloseTo(phone.safe.w * 0.5);
  });

  it("the dealer row squashes before leaving the screen", () => {
    const l = solveTable(1280, 720);
    const rowW = l.metrics.dealerFits * l.metrics.cardW * 1.08;
    expect(rowW).toBeLessThanOrEqual(l.safe.w + 0.01);
  });
});
