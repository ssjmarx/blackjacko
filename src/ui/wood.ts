/**
 * The wood rail — procedural growth-ring wood (spec E13): 2-4 squished
 * knots, warped ring grains growing from each until the packing blocks
 * them, the frame filled; the felt insets on top, cut clean.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { WOOD } from "../config.ts";
import { graphics } from "./kit.ts";
import { deriveStream } from "./session.ts";

/** A drawn shape's collision envelope: which knot, center, outer reach. */
interface Envelope {
  knot: number;
  cx: number;
  cy: number;
  r: number;
}

/** One knot and its grain family's growth state. */
interface Knot {
  cx: number;
  cy: number;
  r: number;
  base: number;
  squish: number;
  angle: number;
  gap: number;
  a1: number;
  a2: number;
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  aMax: number;
  blocked: boolean;
}

/** Paint full-window growth-ring wood; the caller insets the felt on top. */
export function paintWood(
  scene: Phaser.Scene,
  outer: Rect,
  inner: Rect,
  seed: number,
): Phaser.GameObjects.Graphics {
  const rng = deriveStream(seed, WOOD.salt);
  const g = graphics(scene, { id: "wood rail", sr: "Decorative wood rail framing the table." });
  g.fillStyle(WOOD.base, 1);
  g.fillRect(outer.x, outer.y, outer.w, outer.h);
  const knots = seedKnots(outer, inner, rng);
  const envs: Envelope[] = [];
  for (const [i, k] of knots.entries()) {
    paintKnot(g, k, rng);
    envs.push({ knot: i, cx: k.cx, cy: k.cy, r: k.r * (1 + k.aMax) + 2 });
  }
  growGrains(g, outer, knots, envs, rng);
  g.setDepth(-10);
  return g;
}

/** Seed 2-4 knots in the visible rail, rejection-sampled so none collide. */
function seedKnots(outer: Rect, inner: Rect, rng: () => number): Knot[] {
  const count = 2 + Math.floor(rng() * 3);
  const base = Math.min(outer.w, outer.h);
  const knots: Knot[] = [];
  let attempts = 0;
  while (knots.length < count && attempts++ < 60) {
    const cx = outer.x + 8 + rng() * (outer.w - 16);
    const cy = outer.y + 8 + rng() * (outer.h - 16);
    const inFelt = cx > inner.x && cx < inner.x + inner.w && cy > inner.y && cy < inner.y + inner.h;
    if (inFelt) continue;
    const r = base * (0.02 + rng() * 0.02);
    if (knots.some((o) => Math.hypot(o.cx - cx, o.cy - cy) < (o.base + r) * 3.5)) continue;
    const a1 = 0.02 + rng() * 0.02;
    const a2 = 0.015 + rng() * 0.02;
    knots.push({
      cx,
      cy,
      r,
      base: r,
      squish: 0.75 + rng() * 0.2,
      angle: rng() * Math.PI,
      gap: 3.5 + rng() * 2,
      a1,
      a2,
      f1: 2 + Math.floor(rng() * 3),
      f2: 5 + Math.floor(rng() * 5),
      p1: rng() * Math.PI * 2,
      p2: rng() * Math.PI * 2,
      aMax: a1 + a2,
      blocked: false,
    });
  }
  return knots;
}

/** Draw one knot: tight concentric squished ellipses, the darkest strokes on the frame. */
function paintKnot(g: Phaser.GameObjects.Graphics, k: Knot, rng: () => number): void {
  const rings = 2 + Math.floor(rng() * 3);
  for (let i = rings; i >= 1; i--) {
    const rr = k.base * (0.4 + (0.6 * i) / rings);
    g.lineStyle(2 + rng(), WOOD.knot, 0.85);
    strokeSquished(g, k.cx, k.cy, rr, k.squish, k.angle);
  }
}

/** Stroke a squished circle: 40 sampled points, rotated by angle. */
function strokeSquished(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  squish: number,
  angle: number,
): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const ex = Math.cos(t) * r;
    const ey = Math.sin(t) * r * squish;
    pts.push(
      new Phaser.Math.Vector2(
        cx + ex * Math.cos(angle) - ey * Math.sin(angle),
        cy + ex * Math.sin(angle) + ey * Math.cos(angle),
      ),
    );
  }
  g.strokePoints(pts, true);
}

/** Grow warped ring grains from every knot until the packing blocks them all. */
function growGrains(
  g: Phaser.GameObjects.Graphics,
  outer: Rect,
  knots: Knot[],
  envs: Envelope[],
  rng: () => number,
): void {
  const diag = Math.hypot(outer.w, outer.h);
  let active = knots.length;
  let guard = 0;
  while (active > 0 && guard++ < 400) {
    for (const [i, k] of knots.entries()) {
      if (k.blocked) continue;
      k.gap = Math.max(k.gap, 2.6 * k.r * k.aMax);
      k.r += k.gap;
      const reach = k.r * (1 + k.aMax);
      if (reach > diag) {
        k.blocked = true;
        active--;
        continue;
      }
      const hit = envs.some(
        (s) => s.knot !== i && Math.hypot(s.cx - k.cx, s.cy - k.cy) < s.r + reach + 1.5,
      );
      if (hit) {
        k.blocked = true;
        active--;
        continue;
      }
      drawGrain(g, k, rng);
      envs.push({ knot: i, cx: k.cx, cy: k.cy, r: reach + 1.5 });
    }
  }
}

/** One warped ring: 40 sampled points around the knot's coherent warp profile. */
function drawGrain(g: Phaser.GameObjects.Graphics, k: Knot, rng: () => number): void {
  g.lineStyle(1.6 + rng() * 1.2, WOOD.grain, 0.5 + rng() * 0.3);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const rr = k.r * (1 + k.a1 * Math.sin(k.f1 * t + k.p1) + k.a2 * Math.sin(k.f2 * t + k.p2));
    pts.push(new Phaser.Math.Vector2(k.cx + Math.cos(t) * rr, k.cy + Math.sin(t) * rr));
  }
  g.strokePoints(pts, true);
}