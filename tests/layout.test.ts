/**
 * The relational grid's contract (spec E11): one banded layout at every
 * aspect, dealer top and player bottom forever, fractions not pixels, spots
 * centered in their slots, and the axis option mirroring horizontally only.
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

/** Every named zone of a layout, for the on-screen invariant. */
function zonesOf(l: TableLayout): Record<string, Rect> {
  return {
    safe: l.safe,
    pit: l.pit,
    discard: l.discard,
    shoe: l.shoe,
    dealer: l.dealer,
    player: l.player,
    countHud: l.countHud,
    contextPanel: l.contextPanel,
    controls: l.controls,
    chipTray: l.chipTray,
  };
}

/** The ruled ratio ladder, 21:9 landscape through 9:21 portrait. */
const SIZES: [number, number][] = [
  [2520, 1080],
  [1680, 720],
  [1920, 1080],
  [1280, 720],
  [1024, 768],
  [768, 768],
  [768, 1024],
  [360, 800],
  [360, 840],
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
          const bandH = l.safe.h / 5;

          // orientation is reported; the grid never branches on it
          expect(l.orientation, where).toBe(h > w ? "portrait" : "landscape");

          // the banded grid: five clean fifths, touching
          expect(l.chipTray.h, where).toBeCloseTo(bandH);
          expect(l.shoe.y, where).toBeCloseTo(l.safe.y);
          expect(l.pit.y, where).toBeCloseTo(l.safe.y);
          expect(l.discard.y, where).toBeCloseTo(l.safe.y);
          expect(l.dealer.y, where).toBeCloseTo(l.safe.y + bandH);
          expect(l.countHud.y, where).toBeCloseTo(l.safe.y + bandH);
          expect(l.player.y, where).toBeCloseTo(l.safe.y + 2 * bandH);
          expect(l.contextPanel.y, where).toBeCloseTo(l.safe.y + 3 * bandH);
          expect(l.chipTray.y, where).toBeCloseTo(l.safe.y + 4 * bandH);
          expect(l.shoe.h, where).toBeCloseTo(bandH);
          expect(l.dealer.h, where).toBeCloseTo(bandH);
          expect(l.countHud.h, where).toBeCloseTo(bandH);
          expect(l.player.h, where).toBeCloseTo(bandH);
          expect(l.contextPanel.h, where).toBeCloseTo(bandH);
          expect(l.controls.h, where).toBeCloseTo(bandH);

          // the width fractions: the back row in thirds, dealer 3/4, hud 1/4, panel 1/4, controls 3/4
          expect(l.shoe.w, where).toBeCloseTo(l.safe.w / 3);
          expect(l.pit.w, where).toBeCloseTo(l.safe.w / 3);
          expect(l.discard.w, where).toBeCloseTo(l.safe.w / 3);
          expect(l.pit.x, where).toBeCloseTo(l.safe.x + l.safe.w / 3);
          expect(l.discard.x + l.discard.w, where).toBeCloseTo(
            axisFlip ? l.safe.x + l.safe.w / 3 : l.safe.x + l.safe.w,
          );
          expect(l.dealer.w, where).toBeCloseTo((l.safe.w * 3) / 4);
          expect(l.countHud.w, where).toBeCloseTo(l.safe.w / 4);
          expect(l.contextPanel.w, where).toBeCloseTo(l.safe.w / 4);
          expect(l.controls.w, where).toBeCloseTo((l.safe.w * 3) / 4);

          // every zone stays on screen
          for (const [name, r] of Object.entries(zonesOf(l))) {
            expect(contains({ x: 0, y: 0, w, h }, r), `${name} off-screen at ${where}`).toBe(true);
          }

          // the card box: one shared size, relational, no floors
          const slot = l.lineSlots[0];
          const expectW = Math.min(slot.w / 1.2, (slot.h * 0.64) / 1.4, (l.dealer.h * 0.85) / 1.4);
          expect(l.metrics.cardW, where).toBeCloseTo(expectW);
          expect(l.metrics.cardH, where).toBeCloseTo(l.metrics.cardW * 1.4);

          // the stakes: bet bottom-center, insurance top-center, per slot
          for (const [i, s] of l.lineSlots.entries()) {
            const bet = l.betSpots[i];
            const ins = l.insuranceSpots[i];
            expect(bet.x + bet.w / 2, where).toBeCloseTo(s.x + s.w / 2);
            expect(bet.y + bet.h, where).toBeCloseTo(s.y + s.h - s.h * 0.03);
            expect(ins.x + ins.w / 2, where).toBeCloseTo(s.x + s.w / 2);
            expect(ins.y, where).toBeCloseTo(s.y + s.h * 0.03);
          }
        }
      }
    });
  }
});

describe("layout: the named laws", () => {
  it("the dealer and player never move: bands 1 and 3 in every aspect and flip", () => {
    for (const [w, h] of SIZES) {
      for (const axisFlip of [false, true]) {
        const l = solveTable(w, h, { axisFlip });
        const where = `${w}x${h} flip=${axisFlip}`;
        expect(l.dealer.y, where).toBeCloseTo(l.safe.y + l.safe.h / 5);
        expect(l.player.y + l.player.h, where).toBeCloseTo(l.contextPanel.y);
        const flipped = solveTable(w, h, { axisFlip: !axisFlip });
        expect(flipped.dealer.y, where).toBe(l.dealer.y);
        expect(flipped.player.y, where).toBe(l.player.y);
        expect(flipped.dealer.h, where).toBe(l.dealer.h);
        expect(flipped.player.h, where).toBe(l.player.h);
      }
    }
  });

  it("axisFlip mirrors the horizontal anchors only", () => {
    const l = solveTable(1280, 720);
    const f = solveTable(1280, 720, { axisFlip: true });
    expect(f.shoe.x).toBeCloseTo(l.discard.x);
    expect(f.discard.x).toBeCloseTo(l.shoe.x);
    expect(f.pit.x).toBeCloseTo(l.pit.x);
    expect(f.countHud.x).toBeCloseTo(l.safe.x);
    expect(f.dealer.x + f.dealer.w).toBeCloseTo(l.safe.x + l.safe.w);
    expect(f.contextPanel.x + f.contextPanel.w).toBeCloseTo(l.safe.x + l.safe.w);
    expect(f.controls.x).toBeCloseTo(l.safe.x);
    expect(f.dealer.y).toBe(l.dealer.y);
    expect(f.player.y).toBe(l.player.y);
  });

  it("line slots are context-sensitive: one at rest, subdividing to the cap", () => {
    expect(solveTable(360, 800, { hands: 1 }).lineSlots).toHaveLength(1);
    expect(solveTable(360, 800, { hands: 2 }).lineSlots).toHaveLength(2);
    const four = solveTable(360, 800, { hands: 4 });
    expect(four.lineSlots).toHaveLength(4);
    let x = four.player.x;
    for (const s of four.lineSlots) {
      expect(s.x).toBeCloseTo(x);
      expect(s.y).toBe(four.player.y);
      expect(s.h).toBeCloseTo(four.player.h);
      x += s.w;
    }
    expect(x).toBeCloseTo(four.player.x + four.player.w);
  });

  it("cards resize when hands split", () => {
    const one = solveTable(360, 800, { hands: 1 });
    const four = solveTable(360, 800, { hands: 4 });
    expect(four.metrics.cardW).toBeLessThanOrEqual(one.metrics.cardW);
  });

  it("goldens: canonical sizes", () => {
    const d = solveTable(1280, 720);
    expect(d.safe).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
    expect(d.chipTray.h).toBe(144);
    const bandH = 144;
    expect(d.metrics.cardW).toBeCloseTo(Math.min(1280 / 1.2, (bandH * 0.64) / 1.4, (bandH * 0.85) / 1.4));
    expect(d.metrics.cardW).toBeCloseTo(65.83, 1);
    expect(d.metrics.cardH).toBeCloseTo(92.16, 1);
    expect(d.controls.w).toBeCloseTo(960);
    expect(d.contextPanel.w).toBeCloseTo(320);
    expect(d.countHud.w).toBe(320);
    expect(d.shoe.w).toBeCloseTo(1280 / 3);
    const p = solveTable(360, 800);
    expect(p.chipTray.h).toBe(160);
    expect(p.metrics.cardW).toBeCloseTo(Math.min(360 / 1.2, (160 * 0.64) / 1.4, (160 * 0.85) / 1.4));
  });

  it("the dealer row squashes before leaving its cell", () => {
    const l = solveTable(1280, 720);
    const rowW = l.metrics.dealerFits * l.metrics.cardW * 1.08;
    expect(rowW).toBeLessThanOrEqual(l.dealer.w + 0.01);
  });
});