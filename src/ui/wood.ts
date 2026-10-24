/**
 * The wood rail — a procedural flow-field density (spec E13/E14): seeded
 * knots disturb a stream function whose level sets are the grain; every
 * pixel colors from an annual ramp plus fiber, figure, and baked light.
 */
import Phaser from "phaser";
import type { Rect } from "../layout/table.ts";
import { CUT_IN, WOOD } from "../config.ts";
import { canvasImage, graphics } from "./kit.ts";
import { deriveStream } from "./session.ts";

/** One knot: position plus its swirl strength (a length in px). */
export interface KnotSpot {
  cx: number;
  cy: number;
  s: number;
}

interface Lattice {
  n: number;
  data: Float32Array;
}

/** The seeded value-noise lattice shared by every texture term. */
function makeLattice(rng: () => number, n = 32): Lattice {
  const data = new Float32Array(n * n);
  for (let i = 0; i < data.length; i++) data[i] = rng();
  return { n, data };
}

/** Smooth bilinear lattice sample at wrapped normalized coordinates. */
function sampleLattice(l: Lattice, u: number, v: number): number {
  const n = l.n;
  const x = (((u % 1) + 1) % 1) * n;
  const y = (((v % 1) + 1) % 1) * n;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (xx: number, yy: number) => l.data[(((yy % n) + n) % n) * n + (((xx % n) + n) % n)];
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** A knot's influence radius — where its swirl stops shaping the field. */
function influence(k: KnotSpot): number {
  return k.s * 2.4;
}

/** Seed 6-12 knots window-wide, rejection-sampled so none crowd each other. */
export function seedKnots(outer: Rect, rng: () => number): KnotSpot[] {
  const minDim = Math.min(outer.w, outer.h);
  const count = 6 + Math.floor(rng() * 7);
  const spots: KnotSpot[] = [];
  let attempts = 0;
  while (spots.length < count && attempts++ < 90) {
    const cx = outer.x + 8 + rng() * (outer.w - 16);
    const cy = outer.y + 8 + rng() * (outer.h - 16);
    const s = minDim * WOOD.flow * (0.6 + rng() * 0.8);
    if (spots.some((o) => Math.hypot(o.cx - cx, o.cy - cy) < (o.s + s) * 1.6)) continue;
    spots.push({ cx, cy, s });
  }
  return spots;
}

/** Seed the knots, then fill the largest blanks until the grain runs wall to wall (spec E14). */
export function placeKnots(outer: Rect, rng: () => number): KnotSpot[] {
  const minDim = Math.min(outer.w, outer.h);
  const spots = seedKnots(outer, rng);
  for (let pass = 0; pass < 48; pass++) {
    const blank = largestBlank(outer, spots);
    if (!blank) break;
    spots.push({ cx: blank.cx, cy: blank.cy, s: Math.max(minDim * 0.08, blank.side * 0.5) });
  }
  return spots;
}

/** The largest blank square's side, in occupancy cells — the wall-to-wall law's measure. */
export function largestBlankCells(outer: Rect, spots: KnotSpot[]): number {
  const n = 24; // cells on the longer side — resolution-agnostic by construction
  const cell = Math.max(outer.w, outer.h) / n;
  const cols = Math.max(1, Math.ceil(outer.w / cell));
  const rows = Math.max(1, Math.ceil(outer.h / cell));
  const blank: boolean[] = new Array(cols * rows).fill(true);
  for (const k of spots) {
    const r = influence(k);
    const x0 = Math.max(0, Math.floor((k.cx - r - outer.x) / cell));
    const x1 = Math.min(cols - 1, Math.floor((k.cx + r - outer.x) / cell));
    const y0 = Math.max(0, Math.floor((k.cy - r - outer.y) / cell));
    const y1 = Math.min(rows - 1, Math.floor((k.cy + r - outer.y) / cell));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const px = outer.x + (gx + 0.5) * cell;
        const py = outer.y + (gy + 0.5) * cell;
        if (Math.hypot(px - k.cx, py - k.cy) <= r + cell * 0.7) blank[gy * cols + gx] = false;
      }
    }
  }
  let best = 0;
  const dp = new Array(cols * rows).fill(0);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (!blank[gy * cols + gx]) continue;
      dp[gy * cols + gx] =
        gy === 0 || gx === 0 ? 1 : Math.min(dp[(gy - 1) * cols + gx], dp[gy * cols + gx - 1], dp[(gy - 1) * cols + gx - 1]) + 1;
      if (dp[gy * cols + gx] > best) best = dp[gy * cols + gx];
    }
  }
  return best;
}

/** The largest region farther than every knot's influence, or null when coverage holds. */
function largestBlank(outer: Rect, spots: KnotSpot[]): { cx: number; cy: number; side: number } | null {
  const n = 24; // cells on the longer side — resolution-agnostic by construction
  const cell = Math.max(outer.w, outer.h) / n;
  const cols = Math.max(1, Math.ceil(outer.w / cell));
  const rows = Math.max(1, Math.ceil(outer.h / cell));
  const blank: boolean[] = new Array(cols * rows).fill(true);
  for (const k of spots) {
    const r = influence(k);
    const x0 = Math.max(0, Math.floor((k.cx - r - outer.x) / cell));
    const x1 = Math.min(cols - 1, Math.floor((k.cx + r - outer.x) / cell));
    const y0 = Math.max(0, Math.floor((k.cy - r - outer.y) / cell));
    const y1 = Math.min(rows - 1, Math.floor((k.cy + r - outer.y) / cell));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const px = outer.x + (gx + 0.5) * cell;
        const py = outer.y + (gy + 0.5) * cell;
        if (Math.hypot(px - k.cx, py - k.cy) <= r + cell * 0.7) blank[gy * cols + gx] = false;
      }
    }
  }
  let best = 0;
  let bx = 0;
  let by = 0;
  const dp = new Array(cols * rows).fill(0);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (!blank[gy * cols + gx]) continue;
      dp[gy * cols + gx] =
        gy === 0 || gx === 0 ? 1 : Math.min(dp[(gy - 1) * cols + gx], dp[gy * cols + gx - 1], dp[(gy - 1) * cols + gx - 1]) + 1;
      if (dp[gy * cols + gx] > best) {
        best = dp[gy * cols + gx];
        bx = gx;
        by = gy;
      }
    }
  }
  if (best < 2) return null;
  return { cx: outer.x + (bx + best / 2) * cell, cy: outer.y + (by + best / 2) * cell, side: best * cell };
}

/** Render the flow-field wood into a canvas at reduced scale — soft, not aliased. */
export function renderWoodCanvas(outer: Rect, safe: Rect, seed: number, scale = 0.5): HTMLCanvasElement {
  const w = Math.max(2, Math.round(outer.w * scale));
  const h = Math.max(2, Math.round(outer.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const rng = deriveStream(seed, WOOD.salt);
  const knots = placeKnots(outer, rng);
  const fiber = makeLattice(rng);
  const tone = makeLattice(rng);
  const flowX = outer.w >= outer.h; // the grain runs along the window's long axis
  const inv = 1 / scale;
  const halfDiag = Math.hypot(outer.w, outer.h) / 2;
  const rimW = Math.max(10, Math.min(outer.x, outer.y, outer.w - (safe.x - outer.x) - safe.w, outer.h - (safe.y - outer.y) - safe.h));
  const e = 1 - WOOD.lateWidth;
  const earlyR = (WOOD.early >> 16) & 0xff;
  const earlyG = (WOOD.early >> 8) & 0xff;
  const earlyB = WOOD.early & 0xff;
  const lateR = (WOOD.late >> 16) & 0xff;
  const lateG = (WOOD.late >> 8) & 0xff;
  const lateB = WOOD.late & 0xff;
  const coreR = (WOOD.knotCore >> 16) & 0xff;
  const coreG = (WOOD.knotCore >> 8) & 0xff;
  const coreB = WOOD.knotCore & 0xff;
  let p = 0;
  for (let py = 0; py < h; py++) {
    const wy = outer.y + py * inv;
    const cy = wy - (outer.y + outer.h / 2);
    for (let px = 0; px < w; px++) {
      const wx = outer.x + px * inv;
      const cx = wx - (outer.x + outer.w / 2);
      // the stream function: straight flow + one log swirl per knot
      let psi = flowX ? wy : wx;
      let nearR = Infinity;
      let nearS = 1;
      for (const k of knots) {
        const r = Math.hypot(wx - k.cx, wy - k.cy);
        psi += k.s * Math.log(Math.max(r, 4));
        if (r < nearR) {
          nearR = r;
          nearS = k.s;
        }
      }
      // ring-width modulation: fat years and drought years
      const spacing = WOOD.spacing * (0.85 + 0.3 * sampleLattice(tone, wx / 240, wy / 240));
      let t = psi / spacing;
      t -= Math.floor(t);
      // the asymmetric annual ramp: gentle earlywood, fast latewood drop, sharp year edge
      let v = t < e ? 1 - 0.25 * (t / e) * (t / e) : 0.75 * (1 - (t - e) / WOOD.lateWidth);
      // fiber: anisotropic noise, stretched along the flow
      const fu = flowX ? wx / 46 : wy / 6;
      const fv = flowX ? wy / 6 : wx / 46;
      v *= 1 - WOOD.fiberAmp * (sampleLattice(fiber, fu, fv) - 0.5) * 2;
      // figure: broad chatoyance bands parallel to the grain
      v += WOOD.figureAmp * Math.sin(psi / (WOOD.spacing * 7));
      // the knot's core: near-black, red-shifted
      const coreR2 = nearS * 0.9;
      let coreMix = 0;
      if (nearR < coreR2) {
        const b = 1 - nearR / coreR2;
        coreMix = b * b;
        v *= 1 - 0.6 * coreMix;
      }
      // baked light: the vignette toward the window edges
      v -= WOOD.vignette * Math.min(1, (cx * cx + cy * cy) / (halfDiag * halfDiag)) ** 2;
      // the rim highlight along the felt boundary, biased to the top-left light
      const dOut = Math.max(safe.x - wx, wx - (safe.x + safe.w), safe.y - wy, wy - (safe.y + safe.h), 0);
      if (dOut > 0 && dOut < rimW) {
        const bias = (wx < safe.x + safe.w / 2 ? 1 : 0.35) * (wy < safe.y + safe.h / 2 ? 1 : 0.35);
        v += WOOD.rim * (1 - dOut / rimW) * bias;
      }
      v = Math.min(1, Math.max(0, v));
      const r = Math.round(earlyR * v + lateR * (1 - v) + (coreR - lateR) * coreMix);
      const g = Math.round(earlyG * v + lateG * (1 - v) + (coreG - lateG) * coreMix);
      const b = Math.round(earlyB * v + lateB * (1 - v) + (coreB - lateB) * coreMix);
      data[p++] = Math.min(255, Math.max(0, r));
      data[p++] = Math.min(255, Math.max(0, g));
      data[p++] = Math.min(255, Math.max(0, b));
      data[p++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Paint the flow-field wood across the whole window; the caller insets the felt on top. */
export function paintWood(
  scene: Phaser.Scene,
  outer: Rect,
  safe: Rect,
  seed: number,
): Phaser.GameObjects.Image {
  const canvas = renderWoodCanvas(outer, safe, seed);
  return canvasImage(scene, outer, canvas, `wood-${seed}-${canvas.width}x${canvas.height}`, {
    id: "wood rail",
    sr: "Decorative wood rail framing the table.",
  });
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
