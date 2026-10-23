/**
 * The count-true card visuals (ruled): a deck stacks straight up, a shoe lays
 * its cards down — drawn from the actual card count, one white-outlined stripe
 * per card. Identical stripes are one SR fact, not one per card.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { backSprite, fitIn } from "./cardart.ts";
import type { Deck } from "./decks/deck.ts";
import { registerObject } from "./domshell.ts";

/** Create a vertical deck stack of `count` backs; stripe per card, bottom-anchored. */
export function deckStack(
  scene: Phaser.Scene,
  deck: Deck,
  count: number,
  box: Rect,
  perCard: number,
  opts: { id: string; debug?: boolean },
): Phaser.GameObjects.Image[] {
  const out: Phaser.GameObjects.Image[] = [];
  const cx = box.x + box.w / 2;
  const bottom = box.y + box.h - fitIn(box, deck.aspect).h / 2;
  for (let i = 0; i < count; i++) {
    const b = backSprite(scene, deck, i % deck.backCount, box, { id: `${opts.id} ${i + 1}`, debug: true });
    b.setDepth(10 + i);
    b.y = bottom - i * perCard;
    b.x = cx;
    out.push(b);
  }
  registerObject(opts.id, "stack", `Deck: ${count} cards remaining.`);
  return out;
}

/** Create a horizontal shoe row of `count` laid-down backs; stripe per card. */
export function shoeRow(
  scene: Phaser.Scene,
  deck: Deck,
  count: number,
  box: Rect,
  perCard: number,
  opts: { id: string; debug?: boolean },
): Phaser.GameObjects.Image[] {
  const out: Phaser.GameObjects.Image[] = [];
  const fitted = fitIn(box, deck.aspect);
  const cy = box.y + box.h / 2;
  const left = box.x + fitted.h / 2;
  for (let i = 0; i < count; i++) {
    const b = backSprite(scene, deck, i % deck.backCount, box, { id: `${opts.id} ${i + 1}`, debug: true });
    b.setDepth(10 + i);
    b.setAngle(90);
    b.x = left + i * perCard;
    b.y = cy;
    out.push(b);
  }
  registerObject(opts.id, "stack", `Shoe: ${count} cards remaining.`);
  return out;
}