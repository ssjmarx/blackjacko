/**
 * The render kit — the only sanctioned way to create Phaser game objects or
 * wire interactivity (spec E8's hard law). Every creator requires an SR
 * description and registers with the registry; undescribed objects cannot compile.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { registerObject, unregisterObject } from "./domshell.ts";

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
  /** multi-line alignment (Phaser defaults to left) */
  align?: "left" | "center" | "right";
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
    align: opts.align ?? "left",
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

/** Options for mounting a pre-rendered canvas as a described image. */
export interface KitCanvasOptions {
  id: string;
  sr: string;
  debug?: boolean;
}

/** Mount a pre-rendered canvas (a procedural texture) as a described image. */
export function canvasImage(
  scene: Phaser.Scene,
  r: Rect,
  canvas: HTMLCanvasElement,
  key: string,
  opts: KitCanvasOptions,
): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  const img = scene.add.image(r.x, r.y, key).setOrigin(0, 0);
  img.setDisplaySize(r.w, r.h);
  registerObject(opts.id, opts.debug ? "debug" : "image", opts.sr);
  return img;
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