/**
 * The render kit — the only sanctioned way to create Phaser game objects or
 * wire interactivity (spec E8's hard law). Every creator requires an SR
 * description and registers with the registry; undescribed objects cannot compile.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { WOOD_NOISE } from "../config.ts";
import { registerObject, unregisterObject } from "./domshell.ts";
import { deriveStream } from "./session.ts";

/** Options for a kit-created rectangle. */
export interface KitRectOptions {
  id: string;
  sr: string;
  color: number;
  alpha?: number;
  outlined?: boolean;
  debug?: boolean;
}

/** Options for a kit-created text object. */
export interface KitTextOptions {
  id: string;
  sr: string;
  color?: string;
  size?: number;
  debug?: boolean;
}

/** Create a described rectangle: the felt, zones, spots — everything boxy. */
export function rect(scene: Phaser.Scene, r: Rect, opts: KitRectOptions): Phaser.GameObjects.Rectangle {
  const g = scene.add.rectangle(r.x, r.y, r.w, r.h, opts.color, opts.alpha ?? 1).setOrigin(0, 0);
  if (opts.outlined) g.setStrokeStyle(1, 0xffffff, 0.6);
  registerObject(opts.id, opts.debug ? "debug" : "region", opts.sr);
  return g;
}

/** Create a described text object: readouts, labels, zone tags. */
export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  opts: KitTextOptions,
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, content, {
    fontFamily: "monospace",
    fontSize: `${opts.size ?? 14}px`,
    color: opts.color ?? "#e8f5ee",
  });
  registerObject(opts.id, opts.debug ? "debug" : "text", opts.sr);
  return t;
}

/** Options for a kit-created image. */
export interface KitImageOptions {
  id: string;
  sr: string;
  debug?: boolean;
}

/** Create a described image (a card, a chip — anything textured). */
export function image(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  opts: KitImageOptions,
): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, key);
  registerObject(opts.id, opts.debug ? "debug" : "image", opts.sr);
  return img;
}

/** Options for a kit-created rounded rectangle. */
export interface KitRoundRectOptions {
  id: string;
  sr: string;
  color: number;
  alpha?: number;
  /** corner radius in px */
  radius: number;
  debug?: boolean;
}

/** Create a described rounded rectangle (the cut card, drawn chips). */
export function roundRect(
  scene: Phaser.Scene,
  r: Rect,
  opts: KitRoundRectOptions,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(opts.color, opts.alpha ?? 1);
  g.fillRoundedRect(r.x, r.y, r.w, r.h, opts.radius);
  registerObject(opts.id, opts.debug ? "debug" : "region", opts.sr);
  return g;
}

/** Create a described graphics canvas — the sanctioned escape hatch for bespoke vector art (the wood rail). */
export function graphics(
  scene: Phaser.Scene,
  opts: { id: string; sr: string; debug?: boolean },
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  registerObject(opts.id, opts.debug ? "debug" : "region", opts.sr);
  return g;
}

/** Options for the seeded noise layer (the wood's material pass, spec E14). */
export interface KitNoiseOptions {
  id: string;
  sr: string;
  /** the seed for the grain — a child stream, never the shuffle's */
  seed: number;
  /** tile edge in px */
  size?: number;
  alpha?: number;
  debug?: boolean;
}

/** Create a seeded noise texture tiled across the rect — resolution-agnostic film grain. */
export function tiledNoise(
  scene: Phaser.Scene,
  r: Rect,
  opts: KitNoiseOptions,
): Phaser.GameObjects.TileSprite {
  const size = opts.size ?? 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const rng = deriveStream(opts.seed, WOOD_NOISE.salt);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.floor(rng() * 120);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const key = `noise-${opts.seed}-${size}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  const t = scene.add.tileSprite(r.x, r.y, r.w, r.h, key);
  t.setAlpha(opts.alpha ?? 0.05);
  registerObject(opts.id, opts.debug ? "debug" : "region", opts.sr);
  return t;
}

/** Destroy a kit-created object and drop its registry entries. */
export function destroy(
  scene: Phaser.Scene,
  obj:
    | Phaser.GameObjects.Rectangle
    | Phaser.GameObjects.Text
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Graphics
    | Phaser.GameObjects.TileSprite,
  id: string,
): void {
  unregisterObject(id);
  unregisterObject(`debug:${id}`);
  obj.destroy();
  void scene;
}