/**
 * The wood rail — procedural growth-ring wood (spec E13/E14): seeded knots,
 * warped ring grains that merge when families meet, and the inverse-knot
 * pass knotting whatever blanks remain; the felt insets on top, cut clean.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { CUT_IN, WOOD } from "../config.ts";
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
  id: number;
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
export function paintWood(scene: Phaser.Scene, outer: Rect, seed: number): Phaser.GameObjects.Graphics {
  const rng = deriveStream(seed, WOOD.salt);
  const g = graphics(scene, { id: "wood rail", sr: "Decorative wood rail framing the table." });
  g.fillStyle(WOOD.base, 1);
  g.fillRect(outer.x, outer.y, outer.w, outer.h);
  const knots: Knot[] = [];
  const envs: Envelope[] = [];
  let nextId = 0;
  for (const pos of seedKnots(outer, rng)) {
    const k = makeKnot(nextId++, pos.x, pos.y, pos.r, rng);
    knots.push(k);
    paintKnot(g, k, rng);
    envs.push({ knot: k.id, cx: k.cx, cy: k.cy, r: k.base * (1 + k.aMax) + 2 });
  }
  growGrains(g, outer, knots, envs, rng);
  fillGaps(g, outer, knots, envs, rng, () => nextId++);
  g.setDepth(-12);
  return g;
}

/** Seed 6-12 knots across the whole window, rejection-sampled so none collide; the felt trims the middle. */
function seedKnots(outer: Rect, rng: () => number): { x: number; y: number; r: number }[] {
  const count = 6 + Math.floor(rng() * 7);
  const spots: { x: number; y: number; r: number }[] = [];
  let attempts = 0;
  while (spots.length < count && attempts++ < 90) {
    const cx = outer.x + 8 + rng() * (outer.w - 16);
    const cy = outer.y + 8 + rng() * (outer.h - 16);
    const r = Math.min(outer.w, outer.h) * (0.015 + rng() * 0.02);
    if (spots.some((o) => Math.hypot(o.x - cx, o.y - cy) < (o.r + r) * 2.2)) continue;
    spots.push({ x: cx, y: cy, r });
  }
  return spots;
}

/** Build one knot's warp profile at a position — shared by seeding and the inverse-knot pass. */
function makeKnot(id: number, cx: number, cy: number, r: number, rng: () => number): Knot {
  const a1 = 0.02 + rng() * 0.02;
  const a2 = 0.015 + rng() * 0.02;
  return {
    id,
    cx,
    cy,
    r,
    base: r,
    squish: 0.75 + rng() * 0.2,
    angle: rng() * Math.PI,
    gap: 8 + rng() * 4,
    a1,
    a2,
    f1: 2 + Math.floor(rng() * 3),
    f2: 5 + Math.floor(rng() * 5),
    p1: rng() * Math.PI * 2,
    p2: rng() * Math.PI * 2,
    aMax: a1 + a2,
    blocked: false,
  };
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

/** Grow warped rings from every knot; meeting families merge and keep growing until the frame is filled. */
function growGrains(
  g: Phaser.GameObjects.Graphics,
  outer: Rect,
  knots: Knot[],
  envs: Envelope[],
  rng: () => number,
): void {
  const diag = Math.hypot(outer.w, outer.h);
  let active = knots.filter((k) => !k.blocked).length;
  let guard = 0;
  while (active > 0 && guard++ < 400) {
    for (const k of knots) {
      if (k.blocked) continue;
      k.gap = Math.max(k.gap, 2.6 * k.r * k.aMax + 3);
      k.r += k.gap;
      const reach = k.r * (1 + k.aMax);
      if (reach > diag) {
        k.blocked = true;
        active--;
        continue;
      }
      const hit = envs.find(
        (s) => s.knot !== k.id && Math.hypot(s.cx - k.cx, s.cy - k.cy) < s.r + reach + 1.5,
      );
      if (hit) {
        // families meet: the survivor embraces both and keeps growing as one
        const j = knots.find((o) => o.id === hit.knot);
        if (!j) continue;
        const rj = j.r * (1 + j.aMax);
        const oldX = k.cx;
        const oldY = k.cy;
        k.cx = (oldX * reach + hit.cx * rj) / (reach + rj);
        k.cy = (oldY * reach + hit.cy * rj) / (reach + rj);
        k.r =
          Math.max(
            Math.hypot(oldX - k.cx, oldY - k.cy) + reach,
            Math.hypot(hit.cx - k.cx, hit.cy - k.cy) + rj,
          ) + k.gap;
        k.aMax = Math.max(k.aMax, j.aMax);
        k.gap = Math.max(k.gap, j.gap);
        for (const s of envs) if (s.knot === hit.knot) s.knot = k.id;
        if (!j.blocked) {
          j.blocked = true;
          active--;
        }
        continue;
      }
      drawGrain(g, k, rng);
      envs.push({ knot: k.id, cx: k.cx, cy: k.cy, r: reach + 1.5 });
    }
  }
}

/** The largest blank square in the occupancy grid, or null when nothing hosts a knot. */
function largestBlank(
  outer: Rect,
  envs: Envelope[],
): { cx: number; cy: number; side: number } | null {
  const n = 24; // cells on the longer side — resolution-agnostic by construction
  const cell = Math.max(outer.w, outer.h) / n;
  const cols = Math.max(1, Math.ceil(outer.w / cell));
  const rows = Math.max(1, Math.ceil(outer.h / cell));
  const blank: boolean[] = new Array(cols * rows).fill(true);
  for (const e of envs) {
    const x0 = Math.max(0, Math.floor((e.cx - e.r - outer.x) / cell));
    const x1 = Math.min(cols - 1, Math.floor((e.cx + e.r - outer.x) / cell));
    const y0 = Math.max(0, Math.floor((e.cy - e.r - outer.y) / cell));
    const y1 = Math.min(rows - 1, Math.floor((e.cy + e.r - outer.y) / cell));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const px = outer.x + (gx + 0.5) * cell;
        const py = outer.y + (gy + 0.5) * cell;
        if (Math.hypot(px - e.cx, py - e.cy) <= e.r + cell * 0.7) blank[gy * cols + gx] = false;
      }
    }
  }
  // largest blank square, dynamic programming
  let best = 0;
  let bx = 0;
  let by = 0;
  const dp = new Array(cols * rows).fill(0);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (!blank[gy * cols + gx]) continue;
      dp[gy * cols + gx] =
        gy === 0 || gx === 0
          ? 1
          : Math.min(dp[(gy - 1) * cols + gx], dp[gy * cols + gx - 1], dp[(gy - 1) * cols + gx - 1]) + 1;
      if (dp[gy * cols + gx] > best) {
        best = dp[gy * cols + gx];
        bx = gx;
        by = gy;
      }
    }
  }
  if (best < 3) return null;
  return {
    cx: outer.x + (bx + best / 2) * cell,
    cy: outer.y + (by + best / 2) * cell,
    side: best * cell,
  };
}

/** The inverse-knot pass (spec E14): knot the largest blank region, grow it into the gap, repeat until full. */
function fillGaps(
  g: Phaser.GameObjects.Graphics,
  outer: Rect,
  knots: Knot[],
  envs: Envelope[],
  rng: () => number,
  nextId: () => number,
): void {
  const minR = Math.min(outer.w, outer.h) * 0.012;
  for (let pass = 0; pass < 16; pass++) {
    const blank = largestBlank(outer, envs);
    if (!blank) break;
    const k = makeKnot(nextId(), blank.cx, blank.cy, Math.max(minR, blank.side * 0.3), rng);
    knots.push(k);
    paintKnot(g, k, rng);
    envs.push({ knot: k.id, cx: k.cx, cy: k.cy, r: k.base * (1 + k.aMax) + 2 });
    growGrains(g, outer, [k], envs, rng);
  }
}

/** One warped ring: 40 sampled points around the knot's coherent warp profile. */
function drawGrain(g: Phaser.GameObjects.Graphics, k: Knot, rng: () => number): void {
  g.lineStyle(4.8 + rng() * 3.6, WOOD.grain, 0.5 + rng() * 0.3);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const rr = k.r * (1 + k.a1 * Math.sin(k.f1 * t + k.p1) + k.a2 * Math.sin(k.f2 * t + k.p2));
    pts.push(new Phaser.Math.Vector2(k.cx + Math.cos(t) * rr, k.cy + Math.sin(t) * rr));
  }
  g.strokePoints(pts, true);
}

/** The felt's cut-in shadow (spec E14): the wood ring casting layered darkness onto the cloth's edge. */
export function paintCutIn(scene: Phaser.Scene, safe: Rect, margin: number): Phaser.GameObjects.Graphics {
  const g = graphics(scene, { id: "felt cut-in shadow", sr: "Decorative shadow where the wood frames the felt." });
  const steps = CUT_IN.steps;
  const step = Math.max(2, margin / steps);
  for (let i = 0; i < steps; i++) {
    const inset = i * step;
    const a = CUT_IN.alpha * Math.pow(1 - i / steps, 1.6);
    g.lineStyle(step, 0x000000, a);
    g.strokeRect(safe.x + inset, safe.y + inset, safe.w - inset * 2, safe.h - inset * 2);
  }
  g.setDepth(-9);
  return g;
}