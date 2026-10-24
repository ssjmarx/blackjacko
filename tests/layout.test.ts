/**
 * The quartered grid's contract (spec E14): one layout at every aspect under
 * the margin law — dealer top, player bottom, the chip column beside the
 * player, the full-width control panel, and the one-size law: the cards and
 * the buttons share the control panel's single calculated value.
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
    deckExtra: l.deckExtra,
    dealer: l.dealer,
    player: l.player,
    countHud: l.countHud,
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
  [720, 1600],
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
          const q = l.safe.w / 4;

          // orientation is reported; the grid never branches on it
          expect(l.orientation, where).toBe(h > w ? "portrait" : "landscape");

          // the quartered bands: 1/5 | 1/5 | 2/5 | 1/5, touching
          expect(l.shoe.y, where).toBeCloseTo(l.safe.y);
          expect(l.pit.y, where).toBeCloseTo(l.safe.y);
          expect(l.discard.y, where).toBeCloseTo(l.safe.y);
          expect(l.countHud.y, where).toBeCloseTo(l.safe.y + bandH);
          expect(l.dealer.y, where).toBeCloseTo(l.safe.y + bandH);
          expect(l.deckExtra.y, where).toBeCloseTo(l.safe.y + bandH);
          expect(l.player.y, where).toBeCloseTo(l.safe.y + bandH * 2);
          expect(l.chipTray.y, where).toBeCloseTo(l.safe.y + bandH * 2);
          expect(l.controls.y, where).toBeCloseTo(l.safe.y + bandH * 4);
          expect(l.shoe.h, where).toBeCloseTo(bandH);
          expect(l.dealer.h, where).toBeCloseTo(bandH);
          expect(l.countHud.h, where).toBeCloseTo(bandH);
          expect(l.player.h, where).toBeCloseTo(bandH * 2);
          expect(l.chipTray.h, where).toBeCloseTo(bandH * 2);
          expect(l.controls.h, where).toBeCloseTo(bandH);

          // the width fractions: ends at quarters, middles at halves
          expect(l.shoe.w, where).toBeCloseTo(q);
          expect(l.discard.w, where).toBeCloseTo(q);
          expect(l.pit.w, where).toBeCloseTo(q * 2);
          expect(l.countHud.w, where).toBeCloseTo(q);
          expect(l.deckExtra.w, where).toBeCloseTo(q);
          expect(l.dealer.w, where).toBeCloseTo(q * 2);
          expect(l.player.w, where).toBeCloseTo(q * 3);
          expect(l.chipTray.w, where).toBeCloseTo(q);
          expect(l.controls.w, where).toBeCloseTo(l.safe.w);

          // the ends mirror with the axis; the middles never move
          expect(l.shoe.x + l.shoe.w, where).toBeCloseTo(axisFlip ? l.safe.x + q : l.safe.x + l.safe.w);
          expect(l.discard.x, where).toBeCloseTo(axisFlip ? l.safe.x + l.safe.w - q : l.safe.x);
          expect(l.deckExtra.x, where).toBeCloseTo(l.shoe.x);
          expect(l.countHud.x + l.countHud.w, where).toBeCloseTo(axisFlip ? l.safe.x + l.safe.w : l.safe.x + q);
          expect(l.pit.x, where).toBeCloseTo(l.safe.x + q);
          expect(l.dealer.x, where).toBeCloseTo(l.safe.x + q);
          expect(l.player.x, where).toBeCloseTo(axisFlip ? l.safe.x + q : l.safe.x);
          expect(l.chipTray.x + l.chipTray.w, where).toBeCloseTo(axisFlip ? l.safe.x + q : l.safe.x + l.safe.w);

          // the deck extra sits directly under the shoe cell, always
          expect(l.deckExtra.y, where).toBeCloseTo(l.shoe.y + l.shoe.h);

          // every zone inside the safe area
          for (const [name, r] of Object.entries(zonesOf(l))) {
            expect(contains(l.safe, r), `${name} off-screen ${where}`).toBe(true);
          }

          // the one-size law: cards and buttons share one calculated value
          const heightFit = (l.controls.h * 0.96) / 1.4;
          const widthFit = l.controls.w / 6.3;
          const slotCap = l.lineSlots[0].w / 1.2;
          expect(l.metrics.cardW, where).toBeCloseTo(Math.min(heightFit, widthFit, slotCap));
          expect(l.metrics.cardH, where).toBeCloseTo(l.metrics.cardW * 1.4);
          expect(l.metrics.buttonGap, where).toBeCloseTo(l.metrics.cardW * 0.06);

          // the solver's points
          expect(l.captionPoint.x, where).toBeCloseTo(l.safe.x + l.safe.w / 2);
          expect(l.captionPoint.y, where).toBeCloseTo(l.safe.y + bandH * 4);
          expect(l.bankrollPoint.x, where).toBeCloseTo(l.chipTray.x + l.chipTray.w / 2);
          expect(l.bankrollPoint.y, where).toBeCloseTo(l.chipTray.y + l.chipTray.h);
          expect(l.stakesPoint.x, where).toBeCloseTo(l.pit.x + l.pit.w / 2);
          expect(l.stakesPoint.y, where).toBeCloseTo(l.pit.y + l.pit.h);
        }
      }
    });
  }

  it("dealer + player never move vertically: only the ends mirror sideways", () => {
    const l = solveTable(1280, 720);
    const f = solveTable(1280, 720, { axisFlip: true });
    expect(f.dealer.y).toBe(l.dealer.y);
    expect(f.player.y).toBe(l.player.y);
    expect(f.dealer.x).toBe(l.dealer.x);
    // the player band is an end cell now: it mirrors sideways
    expect(f.player.x).toBeCloseTo(l.safe.x + l.safe.w - l.player.w);
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

  it("goldens: canonical sizes under the margin law", () => {
    const d = solveTable(1280, 720);
    expect(d.safe).toEqual({ x: 32, y: 18, w: 1216, h: 684 });
    const bandH = 136.8;
    expect(d.metrics.cardW).toBeCloseTo(Math.min((bandH * 0.96) / 1.4, 1216 / 6.3, (1216 * 0.75) / 1.2));
    expect(d.metrics.cardW).toBeCloseTo(93.81, 2);
    expect(d.metrics.cardH).toBeCloseTo(131.33, 2);
    expect(d.controls.w).toBeCloseTo(1216);
    expect(d.countHud.w).toBeCloseTo(304);
    expect(d.shoe.w).toBeCloseTo(304);
    expect(d.discard.w).toBeCloseTo(304);
    expect(d.pit.w).toBeCloseTo(608);
    expect(d.dealer.w).toBeCloseTo(608);
    expect(d.player.h).toBeCloseTo(bandH * 2);
    expect(d.chipTray.w).toBeCloseTo(304);
    expect(d.metrics.dealerFits).toBe(9);
    const p = solveTable(720, 1600);
    expect(p.safe).toEqual({ x: 18, y: 40, w: 684, h: 1520 });
    expect(p.metrics.cardW).toBeCloseTo(684 / 6.3, 2);
    expect(p.metrics.cardW).toBeCloseTo(108.57, 2);
    expect(p.metrics.cardH).toBeCloseTo(152.0, 2);
  });

  it("the margin frames the table: 2.5% per window edge, insets compose", () => {
    const bare = solveTable(1000, 1000);
    expect(bare.safe).toEqual({ x: 25, y: 25, w: 950, h: 950 });
    const notched = solveTable(1000, 1000, { insets: { top: 40, right: 0, bottom: 0, left: 0 } });
    expect(notched.safe).toEqual({ x: 25, y: 65, w: 950, h: 910 });
  });

  it("the one-size law: height binds at landscape, width at portrait", () => {
    const wide = solveTable(1280, 720);
    expect(wide.metrics.cardW).toBeCloseTo((wide.controls.h * 0.96) / 1.4);
    const tall = solveTable(720, 1600);
    expect(tall.metrics.cardW).toBeCloseTo(tall.controls.w / 6.3);
    expect(tall.metrics.cardH).toBeLessThan(tall.controls.h * 0.96);
  });

  it("the dealer row squashes before leaving its cell-plus-hud bleed", () => {
    const l = solveTable(1280, 720);
    const rowW = l.metrics.dealerFits * l.metrics.cardW * 1.08;
    expect(rowW).toBeLessThanOrEqual(l.dealer.w + l.countHud.w + 0.01);
  });
});
