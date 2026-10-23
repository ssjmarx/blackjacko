/**
 * The card sprite factory — kit-backed card rendering for any deck (spec E8).
 * Every card registers its spoken name and keeps its deck's native aspect
 * fit within the solver's card box; registry cleanup rides through the kit.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { speakCard } from "./announcements.ts";
import { image } from "./kit.ts";
import type { Deck } from "./decks/deck.ts";

/** Fit the deck's native aspect inside a box; returns the centered rect. */
function fitIn(box: Rect, aspect: number): Rect {
  const w = Math.min(box.w, box.h / aspect);
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - w * aspect) / 2, w, h: w * aspect };
}

/** Create a face-up card sprite for a card byte, fit inside the solver's box. */
export function cardSprite(
  scene: Phaser.Scene,
  deck: Deck,
  card: number,
  box: Rect,
  opts: { id: string; debug?: boolean },
): Phaser.GameObjects.Image {
  const frame = deck.faceFor(card);
  const r = fitIn(box, deck.aspect);
  const img = image(scene, frame.key, r.x + r.w / 2, r.y + r.h / 2, {
    id: opts.id,
    sr: `Card: ${speakCard(card)}.`,
    debug: opts.debug,
  });
  img.setDisplaySize(r.w, r.h);
  return img;
}

/** Create a face-down back sprite (deck index wraps across the back set). */
export function backSprite(
  scene: Phaser.Scene,
  deck: Deck,
  index: number,
  box: Rect,
  opts: { id: string; debug?: boolean },
): Phaser.GameObjects.Image {
  const frame = deck.backFor(index);
  const r = fitIn(box, deck.aspect);
  const img = image(scene, frame.key, r.x + r.w / 2, r.y + r.h / 2, {
    id: opts.id,
    sr: "A card back.",
    debug: opts.debug,
  });
  img.setDisplaySize(r.w, r.h);
  return img;
}