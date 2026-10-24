/**
 * The wood rail — a procedural dark-walnut frame drawn in the margin ring
 * (spec E13): seeded grain lines along each rail, knots ringed darkest.
 * Same session seed, same grain — a child stream, so the shuffle is untouched.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { WOOD } from "../config.ts";
import { graphics } from "./kit.ts";
import { deriveStream } from "./session.ts";

/** Paint the wood ring between the window and the safe area; deterministic per seed. */
export function paintWood(
  scene: Phaser.Scene,
  outer: Rect,
  inner: Rect,
  seed: number,
): Phaser.GameObjects.Graphics {
  const rng = deriveStream(seed, WOOD.salt);
  const g = graphics(scene, { id: "wood rail", sr: "Decorative wood rail framing the table." });
  // four rails tile the ring exactly: top and bottom full-width, sides between
  const rails: Rect[] = [
    { x: outer.x, y: outer.y, w: outer.w, h: inner.y - outer.y },
    { x: outer.x, y: inner.y + inner.h, w: outer.w, h: outer.y + outer.h - (inner.y + inner.h) },
    { x: outer.x, y: inner.y, w: inner.x - outer.x, h: inner.h },
    { x: inner.x + inner.w, y: inner.y, w: outer.x + outer.w - (inner.x + inner.w), h: inner.h },
  ];
  for (const r of rails) {
    if (r.w <= 0 || r.h <= 0) continue;
    paintRail(g, r, rng);
  }
  g.setDepth(-10);
  return g;
}

/** Fill one rail and streak it with wavy grain lines and a knot or two. */
function paintRail(
  g: Phaser.GameObjects.Graphics,
  r: Rect,
  rng: () => number,
): void {
  g.fillStyle(WOOD.base, 1);
  g.fillRect(r.x, r.y, r.w, r.h);
  const along = Math.max(r.w, r.h);
  const lines = 8 + Math.floor(rng() * 8);
  for (let i = 0; i < lines; i++) {
    grainLine(g, r, along, rng);
  }
  const knots = Math.floor(rng() * 3);
  for (let i = 0; i < knots; i++) {
    knot(g, r, rng);
  }
}

/** One wavy grain stroke, running the rail's long axis with seeded wander. */
function grainLine(
  g: Phaser.GameObjects.Graphics,
  r: Rect,
  along: number,
  rng: () => number,
): void {
  const horizontal = r.w >= r.h;
  const thick = horizontal ? r.h : r.w;
  const pos = r.y + 2 + rng() * Math.max(1, thick - 4);
  const amp = 0.6 + rng() * 2.2;
  const wavelength = along / (5 + rng() * 7);
  const phase = rng() * Math.PI * 2;
  g.lineStyle(0.7 + rng() * 1.6, WOOD.grain, 0.25 + rng() * 0.4);
  g.beginPath();
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = (r.x + t * r.w) || 0;
    const wob = Math.sin(phase + (t * along) / wavelength) * amp + Math.sin(phase * 2 + t * 9) * amp * 0.4;
    const x = horizontal ? s : pos + wob;
    const y = horizontal ? pos + wob : r.y + t * r.h;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokePath();
}

/** A knot: concentric dark ellipses, the growth rings around a seeded heart. */
function knot(
  g: Phaser.GameObjects.Graphics,
  r: Rect,
  rng: () => number,
): void {
  const cx = r.x + r.w * (0.2 + rng() * 0.6);
  const cy = r.y + r.h * (0.25 + rng() * 0.5);
  const rings = 3 + Math.floor(rng() * 4);
  const reach = Math.min(r.w, r.h) * (0.25 + rng() * 0.35);
  for (let i = rings; i >= 1; i--) {
    const rad = (reach * i) / rings;
    g.lineStyle(1 + rng(), WOOD.knot, 0.4 + rng() * 0.35);
    g.strokeEllipse(cx, cy, rad * 2.4, rad * 2);
  }
}