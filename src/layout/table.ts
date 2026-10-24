/**
 * The table layout solver — the single home for every coordinate on screen.
 * One quartered grid serves every aspect (spec E14): dealer top, player
 * bottom, and one calculated card size shared by buttons and every card.
 */

/** A rectangle in logical pixels; every zone is one. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Safe-area insets (notches, browser chrome) in logical pixels, per edge. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Reported for readouts and CSS; the grid geometry itself never branches on it. */
export type Orientation = "portrait" | "landscape";

/** Solver options: safe insets, the axis mirror, and the active hand count. */
export interface TableOptions {
  insets?: Insets;
  axisFlip?: boolean;
  /** active player lines 1..4 — splits and (future) multiple spots share slots */
  hands?: number;
}

/** A point anchor for readouts and the caption band — solver-derived, one home. */
export interface Point {
  x: number;
  y: number;
}

/** Derived card and chip metrics, shared by every render surface. */
export interface TableMetrics {
  cardW: number;
  cardH: number;
  stackDX: number;
  stackDY: number;
  chipR: number;
  dealerGap: number;
  /** how many dealer cards fit the cell-plus-hud bleed before the squash policy */
  dealerFits: number;
  /** the self-consistent button gap (6% of the shared card width) */
  buttonGap: number;
}

/** The solved table: every named zone, plus the shared metrics. */
export interface TableLayout {
  width: number;
  height: number;
  orientation: Orientation;
  axisFlip: boolean;
  hands: number;
  safe: Rect;
  pit: Rect;
  discard: Rect;
  shoe: Rect;
  /** the deck stack's vertical bleed room, directly under the shoe cell */
  deckExtra: Rect;
  dealer: Rect;
  player: Rect;
  lineSlots: Rect[];
  betSpots: Rect[];
  insuranceSpots: Rect[];
  countHud: Rect;
  controls: Rect;
  chipTray: Rect;
  /** centered on the border between the player band and the control panel */
  captionPoint: Point;
  /** the chip column's floor, centered — the bankroll readout's home */
  bankrollPoint: Point;
  /** the pit's floor, centered — the table min/max readout's home */
  stakesPoint: Point;
  metrics: TableMetrics;
}

// --- the grid fractions: the tunables, each with one home (spec E14) ---

const MARGIN_FRAC = 0.025; // the margin law: 2.5% of the window per edge (spec E13)
const BAND = 1 / 5; // bands 1, 2, and 4 are fifths; band 3 (the player) is two
const QUARTER = 1 / 4; // the back row's and band 2's end cells; the chip column
const CARD_BOX_ASPECT = 7 / 5; // the canonical card box ratio (art fits within)
const BTN_FILL = 0.96; // the control panel's vertical fill when height binds
const BTN_GAP_FRAC = 0.06; // the button gap, self-consistent: a fraction of the shared width
const BTN_COUNT = 6; // five action buttons + the Book (spec E14)
const STACK_DX = 0.2; // stacked-card horizontal bias vs card width
const STACK_DY = 0.07; // stacked-card vertical bias vs card height
const DEALER_GAP = 0.08; // dealer row pitch vs card width
const HAND_W = 1.2; // a stacked hand's width vs card width
const SPOT_H = 0.12; // spot diameter vs slot height
const SPOT_W = 0.45; // spot diameter vs slot width
const SPOT_INSET = 0.02; // spot inset vs slot height
const SPOT_CARD = 0.6; // spot diameter vs card width (the tall band must not balloon it)

/** Clamp a value into [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** The bounding rectangle of two rects — the stack bleed extents live here too. */
export function unionRects(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** Solve the table for a viewport — pure: identical inputs, identical layout. */
export function solveTable(width: number, height: number, opts: TableOptions = {}): TableLayout {
  const ins = opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const axisFlip = opts.axisFlip ?? false;
  const hands = clamp(Math.round(opts.hands ?? 1), 1, 4);
  const orientation: Orientation = height > width ? "portrait" : "landscape";

  // the margin law (spec E13): device insets first, then 2.5% of the window per edge
  const mx = width * MARGIN_FRAC;
  const my = height * MARGIN_FRAC;
  const safe: Rect = {
    x: ins.left + mx,
    y: ins.top + my,
    w: Math.max(0, width - ins.left - ins.right - mx * 2),
    h: Math.max(0, height - ins.top - ins.bottom - my * 2),
  };

  // the quartered grid (spec E14): three fifths-bands and the double-height player band
  const bandH = safe.h * BAND;
  const q = safe.w * QUARTER;
  const b1Y = safe.y;
  const b2Y = safe.y + bandH;
  const b3Y = safe.y + bandH * 2;
  const b3H = bandH * 2;
  const b4Y = safe.y + bandH * 4;

  // band 1: discard 1/4 | pit 1/2 | shoe 1/4 — the axis mirrors the two ends
  const shoe: Rect = axisFlip
    ? { x: safe.x, y: b1Y, w: q, h: bandH }
    : { x: safe.x + safe.w - q, y: b1Y, w: q, h: bandH };
  const discard: Rect = axisFlip
    ? { x: safe.x + safe.w - q, y: b1Y, w: q, h: bandH }
    : { x: safe.x, y: b1Y, w: q, h: bandH };
  const pit: Rect = { x: safe.x + q, y: b1Y, w: safe.w - q * 2, h: bandH };

  // band 2: count hud 1/4 | dealer 1/2 | deck extra 1/4 — the extra sits under the shoe
  const deckExtra: Rect = { x: shoe.x, y: b2Y, w: shoe.w, h: bandH };
  const dealer: Rect = { x: safe.x + q, y: b2Y, w: safe.w - q * 2, h: bandH };
  const countHud: Rect = axisFlip
    ? { x: safe.x + safe.w - q, y: b2Y, w: q, h: bandH }
    : { x: safe.x, y: b2Y, w: q, h: bandH };

  // band 3 (double height): player 3/4 | the chip column 1/4 — the axis mirrors
  const player: Rect = axisFlip
    ? { x: safe.x + q, y: b3Y, w: safe.w - q, h: b3H }
    : { x: safe.x, y: b3Y, w: safe.w - q, h: b3H };
  const chipTray: Rect = axisFlip
    ? { x: safe.x, y: b3Y, w: q, h: b3H }
    : { x: safe.x + safe.w - q, y: b3Y, w: q, h: b3H };

  // band 4: the control panel — full width, home of the six buttons and the one-size law
  const controls: Rect = { x: safe.x, y: b4Y, w: safe.w, h: bandH };

  // hand slots: one per active line, side by side across the player band
  const slots: Rect[] = [];
  for (let i = 0; i < hands; i++) {
    slots.push({ x: player.x + (i * player.w) / hands, y: player.y, w: player.w / hands, h: player.h });
  }

  // the one-size law (spec E14): the control panel's six-button allocation IS the
  // card size — height fit (96% of the band) vs width fit (the six-share with
  // self-consistent 6% gaps), whichever binds; the split trim is the only secondary,
  // and the buttons read the same value so the two can never diverge.
  const heightFit = (controls.h * BTN_FILL) / CARD_BOX_ASPECT;
  const widthFit = controls.w / (BTN_COUNT + (BTN_COUNT - 1) * BTN_GAP_FRAC);
  const cardW = Math.min(heightFit, widthFit, slots[0].w / HAND_W);
  const cardH = cardW * CARD_BOX_ASPECT;
  const buttonGap = BTN_GAP_FRAC * cardW;
  const metrics: TableMetrics = {
    cardW,
    cardH,
    stackDX: STACK_DX * cardW,
    stackDY: STACK_DY * cardH,
    chipR: Math.min(cardW * 0.45, chipTray.w * 0.42),
    dealerGap: DEALER_GAP * cardW,
    dealerFits: Math.max(
      1,
      Math.floor((dealer.w + countHud.w + DEALER_GAP * cardW) / (cardW * (1 + DEALER_GAP))),
    ),
    buttonGap,
  };

  // the stakes: bet bottom-center of its slot, insurance top-center (spec E11)
  const betSpots: Rect[] = slots.map((s) => {
    const d = Math.min(s.w * SPOT_W, s.h * SPOT_H, cardW * SPOT_CARD);
    return { x: s.x + s.w / 2 - d / 2, y: s.y + s.h - s.h * SPOT_INSET - d, w: d, h: d };
  });
  const insuranceSpots: Rect[] = slots.map((s) => {
    const d = Math.min(s.w * SPOT_W, s.h * SPOT_H, cardW * SPOT_CARD);
    return { x: s.x + s.w / 2 - d / 2, y: s.y + s.h * SPOT_INSET, w: d, h: d };
  });

  return {
    width,
    height,
    orientation,
    axisFlip,
    hands,
    safe,
    pit,
    discard,
    shoe,
    deckExtra,
    dealer,
    player,
    lineSlots: slots,
    betSpots,
    insuranceSpots,
    countHud,
    controls,
    chipTray,
    captionPoint: { x: safe.x + safe.w / 2, y: b4Y },
    bankrollPoint: { x: chipTray.x + chipTray.w / 2, y: chipTray.y + chipTray.h },
    stakesPoint: { x: pit.x + pit.w / 2, y: pit.y + pit.h },
    metrics,
  };
}
