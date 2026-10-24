/**
 * The count-true card visuals (spec E11/E14): a deck hangs from its shoe cell
 * and bleeds down into deck extra; a shoe plants at its cell's window-side
 * edge and runs toward the pit — stuck in place, dealt sprites vanishing.
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

/** The mirrored run: stepping in the − direction from the anchor, clamped by a minimum. */
export function placeStripesLeft(
  sprites: number,
  step: number,
  anchor: number,
  clampMin: number,
): StripePlacement {
  const run = Math.max(0, (sprites - 1) * step);
  const shift = Math.max(0, clampMin - (anchor - run));
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

/** The footprint law (spec E13/E14): the first card centers in its cell at card size; the back yields to the run; the clamp is the last resort. Horizontal rows plant at the window-side edge and grow toward the pit. */
export function fitFootprint(
  extent: Rect,
  axis: "down" | "right" | "left",
  run: number,
  aspect: number,
  want: Rect,
  cellCenter?: number,
): { box: Rect; start: number; clamped: boolean } {
  if (axis === "down" && cellCenter !== undefined) {
    const room = extent.y + extent.h - cellCenter;
    if (want.h / 2 + run <= room) {
      return {
        box: { x: extent.x + (extent.w - want.w) / 2, y: cellCenter - want.h / 2, w: want.w, h: want.h },
        start: cellCenter,
        clamped: false,
      };
    }
    const h = 2 * (room - run);
    if (h > 0) {
      const w = Math.min(extent.w, h / aspect);
      return {
        box: { x: extent.x + (extent.w - w) / 2, y: cellCenter - (w * aspect) / 2, w, h: w * aspect },
        start: cellCenter,
        clamped: false,
      };
    }
    const box = fitIn(extent, aspect);
    return { box, start: extent.y + extent.h - box.h / 2 - run, clamped: true };
  }
  const rightward = axis === "right";
  const farX = rightward ? extent.x : extent.x + extent.w;
  if (want.w + run <= extent.w) {
    const boxX = rightward ? extent.x : farX - want.w;
    return {
      box: { x: boxX, y: extent.y + (extent.h - want.h) / 2, w: want.w, h: want.h },
      start: boxX + want.w / 2,
      clamped: false,
    };
  }
  const avail = extent.w - run;
  if (avail > 0) {
    let w = avail;
    let h = w * aspect;
    if (h > extent.h) {
      h = extent.h;
      w = h / aspect;
    }
    const boxX = rightward ? extent.x : farX - w;
    return { box: { x: boxX, y: extent.y + (extent.h - h) / 2, w, h }, start: boxX + w / 2, clamped: false };
  }
  const box = fitIn(extent, aspect);
  const boxX = rightward ? extent.x : farX - box.w;
  return { box: { ...box, x: boxX }, start: boxX + box.w / 2, clamped: true };
}

/** The options every stack build takes: identity, the anchor cell, the wanted card box, and the shoe state. */
export interface StackOpts {
  id: string;
  debug?: boolean;
  /** the anchor cell the first card centers in (the shoe, for both forms) */
  cell: Rect;
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
  axis: "down" | "right" | "left",
  perCard: number,
  opts: StackOpts,
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  const plan = stackPlan(opts.pen, opts.max, CARD_STACK.group);
  const hidden = hiddenSprites(dealtFrom(opts.pen, opts.max, opts.remaining), CARD_STACK.group);
  const run = (plan.total - 1) * perCard;
  const fit = fitFootprint(
    extent,
    axis,
    run,
    deck.aspect,
    opts.want,
    axis === "down" ? opts.cell.y + opts.cell.h / 2 : undefined,
  );
  const fitted = fit.box;
  // the deck's first card centers in the shoe cell; a row plants at its window-side edge
  let planted = fit.start;
  if (axis === "right" && fit.clamped) {
    planted = placeStripes(plan.total, perCard, planted, extent.x + extent.w - fitted.w / 2).anchor;
  }
  if (axis === "left" && fit.clamped) {
    planted = placeStripesLeft(plan.total, perCard, planted, extent.x + fitted.w / 2).anchor;
  }
  const cutIdx = axis === "right" ? plan.cut - 1 : plan.total - plan.cut;
  const cx = extent.x + extent.w / 2;
  const cy = extent.y + extent.h / 2;
  const out: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];
  for (let i = 0; i < plan.total; i++) {
    // the dealt end: the deck sheds from its top, a rightward row from its right, a leftward from its left
    const fromDealtEnd = axis === "right" ? plan.total - 1 - i : i;
    const visible = fromDealtEnd >= hidden;
    const x = axis === "down" ? cx : axis === "left" ? planted - i * perCard : planted + i * perCard;
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
      g.setDepth(axis === "down" ? 10 + (plan.total - 1 - i) : 10 + i).setVisible(visible);
      out.push(g);
    } else {
      const b = backSprite(scene, deck, i % deck.backCount, fitted, { id: `${opts.id} ${i + 1}`, debug: true });
      b.setDepth(axis === "down" ? 10 + (plan.total - 1 - i) : 10 + i).setVisible(visible);
      b.x = x;
      b.y = y;
      if (axis !== "down") b.setAngle(90);
      out.push(b);
    }
  }
  registerObject(opts.id, "stack", `${axis === "down" ? "Deck" : "Shoe"}: ${Math.max(0, opts.remaining)} cards before the cut card.`);
  return out;
}

/** Create the vertical deck stack: card-sized in its shoe cell, bleeding down, the top card on top. */
export function deckStack(
  scene: Phaser.Scene,
  deck: Deck,
  extent: Rect,
  opts: StackOpts,
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  return buildStack(scene, deck, extent, "down", opts.perCard, opts);
}

/** Create the horizontal shoe row: planted at the window-side edge, running toward the pit, the tail planted. */
export function shoeRow(
  scene: Phaser.Scene,
  deck: Deck,
  extent: Rect,
  opts: StackOpts,
  axis: "right" | "left" = "left",
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  return buildStack(scene, deck, extent, axis, opts.perCard, opts);
}