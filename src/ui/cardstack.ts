/**
 * The count-true card visuals (spec E11): a deck stacks straight up, a shoe
 * lays its cards down — drawn from the actual remaining count, one stripe per
 * group, with the ruled cut card riding red at the penetration mark.
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

/** The stack's sprite plan: tail sprites below, the red cut sprite, the dealable run above. */
export interface StackPlan {
  /** sprites below the cut card (the never-dealt tail) */
  tail: number;
  /** the 1-indexed sprite swapped for the red cut card */
  cut: number;
  /** tail + cut + dealable sprites */
  total: number;
}

/** Place a clamped stripe run: sprites step `step` from the anchor; overflow shifts the run inward, never shrinks it. */
export function placeStripes(
  sprites: number,
  step: number,
  anchor: number,
  axis: "up" | "right",
  clampMin: number,
  clampMax: number,
): StripePlacement {
  const run = Math.max(0, (sprites - 1) * step);
  let shift = 0;
  if (axis === "up") {
    const far = anchor - run;
    if (far < clampMin) shift = clampMin - far;
  } else {
    const far = anchor + run;
    if (far > clampMax) shift = clampMax - far;
  }
  return { sprites, anchor: anchor + shift, step, shift };
}

/** The ruled cut-card law: the sprite containing the pen card goes red — one sprite per `group` cards of pen. */
export function cutSpriteIndex(pen: number, max: number, group: number): number {
  const position = Math.round((1 - pen) * max) + 1;
  return Math.max(1, Math.ceil(position / group));
}

/** Plan a stack's sprites from pen, shoe size, and the dealable remaining count. */
export function stackPlan(pen: number, max: number, remaining: number, group: number): StackPlan {
  const cut = cutSpriteIndex(pen, max, group);
  const dealable = Math.ceil(Math.max(0, remaining) / group);
  return { tail: cut - 1, cut, total: cut + dealable };
}

/** Build the stack along one axis: backs step out, the cut card swaps in at the plan's mark. */
function buildStack(
  scene: Phaser.Scene,
  deck: Deck,
  box: Rect,
  axis: "up" | "right",
  perCard: number,
  opts: {
    id: string;
    debug?: boolean;
    clampMin?: number;
    clampMax?: number;
    remaining: number;
    pen: number;
    max: number;
  },
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  const fitted = fitIn(box, deck.aspect);
  const plan = stackPlan(opts.pen, opts.max, opts.remaining, CARD_STACK.group);
  const restMin = axis === "up" ? box.y + fitted.h / 2 : box.x + fitted.w / 2;
  const restMax = axis === "up" ? box.y + box.h - fitted.h / 2 : box.x + box.w - fitted.w / 2;
  const anchor = axis === "up" ? box.y + box.h - fitted.h / 2 : box.x + fitted.w / 2;
  const placed = placeStripes(plan.total, perCard, anchor, axis, opts.clampMin ?? restMin, opts.clampMax ?? restMax);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const out: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = [];
  for (let i = 0; i < placed.sprites; i++) {
    const x = axis === "up" ? cx : placed.anchor + i * placed.step;
    const y = axis === "up" ? placed.anchor - i * placed.step : cy;
    if (i === plan.cut - 1) {
      const w = axis === "up" ? fitted.w : fitted.h;
      const h = axis === "up" ? fitted.h : fitted.w;
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
      g.setDepth(10 + i);
      out.push(g);
    } else {
      const b = backSprite(scene, deck, i % deck.backCount, box, { id: `${opts.id} ${i + 1}`, debug: true });
      b.setDepth(10 + i);
      b.x = x;
      b.y = y;
      if (axis === "right") b.setAngle(90);
      out.push(b);
    }
  }
  registerObject(opts.id, "stack", `${axis === "up" ? "Deck" : "Shoe"}: ${opts.remaining} cards before the cut card.`);
  return out;
}

/** Create a vertical deck stack: tail, the red cut card, then the dealable run, bottom-anchored. */
export function deckStack(
  scene: Phaser.Scene,
  deck: Deck,
  box: Rect,
  opts: {
    id: string;
    debug?: boolean;
    clampMin?: number;
    remaining: number;
    pen: number;
    max: number;
    perCard: number;
  },
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  return buildStack(scene, deck, box, "up", opts.perCard, opts);
}

/** Create a horizontal shoe row: the same plan laid end to end, clamped inward. */
export function shoeRow(
  scene: Phaser.Scene,
  deck: Deck,
  box: Rect,
  opts: {
    id: string;
    debug?: boolean;
    clampMax?: number;
    remaining: number;
    pen: number;
    max: number;
    perCard: number;
  },
): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  return buildStack(scene, deck, box, "right", opts.perCard, opts);
}