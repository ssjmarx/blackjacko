/**
 * The count-true card visuals (ruled): a deck stacks straight up, a shoe lays
 * its cards down — drawn from the actual card count, one white-outlined stripe
 * per group of cards. Identical stripes are one SR fact, not one per card.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { CARD_STACK } from "../config.ts";
import { backSprite, fitIn } from "./cardart.ts";
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

/** Create a vertical deck stack of `count` cards; one stripe per group, bottom-anchored, clamped down. */
export function deckStack(
  scene: Phaser.Scene,
  deck: Deck,
  count: number,
  box: Rect,
  perCard: number,
  opts: { id: string; debug?: boolean; clampMin?: number },
): Phaser.GameObjects.Image[] {
  const fitted = fitIn(box, deck.aspect);
  const cx = box.x + box.w / 2;
  const anchor = box.y + box.h - fitted.h / 2;
  const placed = placeStripes(
    Math.ceil(count / CARD_STACK.group),
    perCard,
    anchor,
    "up",
    opts.clampMin ?? box.y + fitted.h / 2,
    anchor,
  );
  const out: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < placed.sprites; i++) {
    const b = backSprite(scene, deck, i % deck.backCount, box, { id: `${opts.id} ${i + 1}`, debug: true });
    b.setDepth(10 + i);
    b.x = cx;
    b.y = placed.anchor - i * placed.step;
    out.push(b);
  }
  registerObject(opts.id, "stack", `Deck: ${count} cards remaining.`);
  return out;
}

/** Create a horizontal shoe row of `count` laid-down cards; one stripe per group, clamped inward. */
export function shoeRow(
  scene: Phaser.Scene,
  deck: Deck,
  count: number,
  box: Rect,
  perCard: number,
  opts: { id: string; debug?: boolean; clampMax?: number },
): Phaser.GameObjects.Image[] {
  const fitted = fitIn(box, deck.aspect);
  const cy = box.y + box.h / 2;
  const anchor = box.x + fitted.w / 2;
  const placed = placeStripes(
    Math.ceil(count / CARD_STACK.group),
    perCard,
    anchor,
    "right",
    box.x + fitted.w / 2,
    opts.clampMax ?? box.x + box.w - fitted.w / 2,
  );
  const out: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < placed.sprites; i++) {
    const b = backSprite(scene, deck, i % deck.backCount, box, { id: `${opts.id} ${i + 1}`, debug: true });
    b.setDepth(10 + i);
    b.setAngle(90);
    b.x = placed.anchor + i * placed.step;
    b.y = cy;
    out.push(b);
  }
  registerObject(opts.id, "stack", `Shoe: ${count} cards remaining.`);
  return out;
}