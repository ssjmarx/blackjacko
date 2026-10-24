/**
 * The count-true card visuals (spec E11/E13): a deck hangs top-anchored and
 * bleeds down into deck extra, a shoe runs right into the pit — card-sized
 * first, stuck in place, dealt sprites vanishing from the dealt end.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { CARD_STACK, CUT_CARD } from "../config.ts";
import { backSprite, fitIn } from "./cardart.ts";
import { roundRect } from "./kit.ts";
import type { Deck } from "./decks/deck.ts";
import { registerObject } from "./domshell.ts";

/** The clamped placement of a stripe run along one axis. */
export interface StripePlacement {
  sprites: number;
  /** stripe 0's anchor coordinate after clamping */
  anchor: number;
  /** px between stripe anchors */
  step: number;
  /** the inward shift the clamp applied (0 when nothing moved) */
  shift: number;
}

/** The full-shoe sprite plan: every card drawn once, positions fixed for the shoe's life. */
export interface StackPlan {
  /** sprites below the cut card, from the planted end (the never-dealt tail) */
  tail: number;
  /** the 1-indexed sprite swapped for the red cut card, from the planted end */
  cut: number;
  /** every sprite of the full deck — dealable, cut, and tail */
  total: number;
}

/** Place a stripe run stepping in the + direction from the anchor; overflow shifts the run inward, never shrinks it. */
export function placeStripes(
  sprites: number,
  step: number,
  anchor: number,
  clampMax: number,
): StripePlacement {
  const run = Math.max(0, (sprites - 1) * step);
  const shift = Math.min(0, clampMax - (anchor + run));
  return { sprites, anchor: anchor + shift, step, shift };
}

/** The ruled cut-card law: the sprite containing the pen card goes red — one sprite per `group` cards of pen. */
export function cutSpriteIndex(pen: number, max: number, group: number): number {
  const position = Math.round((1 - pen) * max) + 1;
  return Math.max(1, Math.ceil(position / group));
}

/** Plan the full stack: every sprite of the deck, the cut riding the pen mark from the planted end. */
export function stackPlan(pen: number, max: number, group: number): StackPlan {
  const cut = cutSpriteIndex(pen, max, group);
  return { total: Math.ceil(max / group), cut, tail: cut - 1 };
}

/** Sprites fully dealt from the dealt end — the sticks-in-place erosion law. */
export function hiddenSprites(dealt: number, group: number): number {
  return Math.floor(Math.max(0, dealt) / group);
}

/** Cards already dealt, derived from the dealable remaining count. */
export function dealtFrom(pen: number, max: number, remaining: number): number {
  return Math.max(0, Math.round(pen * max) - 1 - Math.max(0, remaining));
}

/** The footprint law (spec E13): card size first, yield to the run, clamp only when the run alone cannot fit. */
export function fitFootprint(
  extent: Rect,
  axis: "down" | "right",
  run: number,
  aspect: number,
  want: Rect,
): { box: Rect; clamped: boolean } {
  if (axis === "down") {
    if (want.h + run <= extent.h) {
      return {
        box: { x: extent.x + (extent.w - want.w) / 2, y: extent.y + extent.h - want.h, w: want.w, h: want.h },
        clamped: false,
      };
    }
    const avail = extent.h - run;
    if (avail > 0) {
      let h = avail;
      let w = h / aspect;
      if (w > extent.w) {
        w = extent.w;
        h = w * aspect;
      }
      return { box: { x: extent.x + (extent.w - w) / 2, y: extent.y + extent.h - h, w, h }, clamped: false };
    }
    return { box: fitIn(extent, aspect), clamped: true };
  }
  if (want.w + run <= extent.w) {
    return { box: { x: extent.x, y: extent.y + (extent.h - want.h) / 2, w: want.w, h: want.h }, clamped: false };
  }
  const avail = extent.w - run;
  if (avail > 0) {
    let w = avail;
    let h = w * aspect;
    if (h > extent.h) {
      h = extent.h;
      w = h / aspect;
    }
    return { box: { x: extent.x, y: extent.y + (extent.h - h) / 2, w, h }, clamped: false };
  }
  return { box: fitIn(extent, aspect), clamped: true };
}

/** The options every stack build takes: identity, the wanted card box, and the shoe state. */
export interface StackOpts {
  id: string;
  debug?: boolean;
  /** the card-size footprint the stack prefers (the solver's metrics box) */
  want: Rect;
  /** dealable cards left — the dealt count derives from it */
  remaining: number;
  pen: number;
  max: number;
  perCard: number;
}

/** Build the stack: the full deck drawn once at fixed positions, dealt sprites hidden from the dealt end. */
function buildStack(
  scene: Phaser.Scene,
  deck: Deck,
  extent: Rect,
  axis: "down" | "right",
  perCard: number,
  opts: StackOpts,
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  const plan = stackPlan(opts.pen, opts.max, CARD_STACK.group);
  const hidden = hiddenSprites(dealtFrom(opts.pen, opts.max, opts.remaining), CARD_STACK.group);
  const run = (plan.total - 1) * perCard;
  const fit = fitFootprint(extent, axis, run, deck.aspect, opts.want);
  const fitted = fit.box;
  // the deck plants on the extent floor (grows upward), the shoe plants at the left edge
  let planted = axis === "down" ? extent.y + extent.h - fitted.h / 2 - run : extent.x + fitted.w / 2;
  if (axis === "right" && fit.clamped) {
    planted = placeStripes(plan.total, perCard, planted, extent.x + extent.w - fitted.w / 2).anchor;
  }
  const cutIdx = axis === "down" ? plan.total - plan.cut : plan.cut - 1;
  const cx = extent.x + extent.w / 2;
  const cy = extent.y + extent.h / 2;
  const out: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];
  for (let i = 0; i < plan.total; i++) {
    const fromDealtEnd = axis === "down" ? i : plan.total - 1 - i;
    const visible = fromDealtEnd >= hidden;
    const x = axis === "down" ? cx : planted + i * perCard;
    const y = axis === "down" ? planted + i * perCard : cy;
    if (i === cutIdx) {
      const w = axis === "down" ? fitted.w : fitted.h;
      const h = axis === "down" ? fitted.h : fitted.w;
      const g = roundRect(
        scene,
        { x: x - w / 2, y: y - h / 2, w, h },
        {
          id: `${opts.id} cut card`,
          sr: "The cut card.",
          color: CUT_CARD.red,
          radius: Math.min(w, h) * CUT_CARD.radius,
          debug: true,
        },
      );
      g.setDepth(10 + i).setVisible(visible);
      out.push(g);
    } else {
      const b = backSprite(scene, deck, i % deck.backCount, fitted, { id: `${opts.id} ${i + 1}`, debug: true });
      b.setDepth(10 + i).setVisible(visible);
      b.x = x;
      b.y = y;
      if (axis === "right") b.setAngle(90);
      out.push(b);
    }
  }
  registerObject(opts.id, "stack", `${axis === "down" ? "Deck" : "Shoe"}: ${Math.max(0, opts.remaining)} cards before the cut card.`);
  return out;
}

/** Create the vertical deck stack: card-sized at the top margin, bleeding down, the tail planted at the bottom. */
export function deckStack(
  scene: Phaser.Scene,
  deck: Deck,
  extent: Rect,
  opts: StackOpts,
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  return buildStack(scene, deck, extent, "down", opts.perCard, opts);
}

/** Create the horizontal shoe row: card-sized at the left, running right into the pit, the tail planted. */
export function shoeRow(
  scene: Phaser.Scene,
  deck: Deck,
  extent: Rect,
  opts: StackOpts,
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  return buildStack(scene, deck, extent, "right", opts.perCard, opts);
}