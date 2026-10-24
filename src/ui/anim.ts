/**
 * The animation engine (spec E14): a time-driven runner whose every animation
 * is skippable — any player input snaps all in-flight work to its end state.
 * Builders compose: place, flip, flash, slide — mixed and matched anywhere.
 */

/** An easing curve over normalized time. */
export type Ease = (t: number) => number;

/** Ease-out quad — the default for things arriving. */
export const easeOutQuad: Ease = (t) => t * (2 - t);

/** Ease-in-out sine — the default for things moving between two felt spots. */
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

interface Item {
  t0: number;
  dur: number;
  ease: Ease;
  apply: (k: number) => void;
  resolve: () => void;
}

/** One animation on the runner's clock: eased progress, resolved at done or skip. */
export class AnimRunner {
  private items: Item[] = [];

  constructor(private readonly now: () => number) {}

  /** Add one animation; resolves when it completes or is skipped. */
  add(dur: number, apply: (k: number) => void, ease: Ease = easeOutQuad): Promise<void> {
    return new Promise((resolve) => {
      this.items.push({ t0: this.now(), dur, ease, apply, resolve });
    });
  }

  /** Any player input: every active animation snaps to its end state. */
  skip(): void {
    for (const it of [...this.items]) this.finish(it);
  }

  /** Drive from the scene's update loop; completes and resolves finished items. */
  update(): void {
    const now = this.now();
    for (const it of [...this.items]) {
      const k = Math.min(1, (now - it.t0) / it.dur);
      it.apply(it.ease(k));
      if (k >= 1) this.finish(it);
    }
  }

  /** True while anything is in flight. */
  get busy(): boolean {
    return this.items.length > 0;
  }

  /** Complete one item early: apply(1), resolve its promise, drop it. */
  private finish(it: Item): void {
    this.items = this.items.filter((x) => x !== it);
    it.apply(1);
    it.resolve();
  }
}

/** A minimal movable the builders reposition: anything with a transform. */
export interface Movable {
  x: number;
  y: number;
}

/** A squishable for the flip: anything with a horizontal scale. */
export interface Squishable {
  scaleX: number;
}

/** A tintable for the flash: anything that can take and clear a tint. */
export interface Tintable {
  setTint(top: number): void;
  clearTint(): void;
}

/** Fly a drawable from one point to another. */
export function place(
  runner: AnimRunner,
  d: Movable,
  from: { x: number; y: number },
  to: { x: number; y: number },
  ms: number,
): Promise<void> {
  d.x = from.x;
  d.y = from.y;
  return runner.add(ms, (k) => {
    d.x = from.x + (to.x - from.x) * k;
    d.y = from.y + (to.y - from.y) * k;
  }, easeInOutSine);
}

/** The ruled flip: the back squashes to a line, the face lerps out — relative to the sprite's own rest scale, one input skips both. */
export function flip(
  runner: AnimRunner,
  d: Squishable,
  swap: () => void,
  ms: number,
): Promise<void> {
  let swapped = false;
  let restX = d.scaleX; // the sprite's own resting scale — never animate to 1
  return runner.add(ms, (k) => {
    if (!swapped && k >= 0.5) {
      swapped = true;
      swap();
      restX = d.scaleX; // the face's natural size writes its own scale — re-capture
    }
    d.scaleX = restX * (k < 0.5 ? 1 - 2 * k : 2 * k - 1);
  }, easeInOutSine);
}

/** Pulse a tint over a drawable and settle back to clear. */
export function flash(
  runner: AnimRunner,
  d: Tintable,
  tint: number,
  ms: number,
): Promise<void> {
  return runner.add(ms, (k) => {
    if (k < 0.5) d.setTint(tint);
    else d.clearTint();
  }, easeInOutSine);
}

/** Fade a drawable out in place. */
export function fade(runner: AnimRunner, d: { setAlpha(n: number): void }, ms: number): Promise<void> {
  return runner.add(ms, (k) => d.setAlpha(1 - k), (t) => t);
}