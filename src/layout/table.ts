/**
 * The table layout solver — the single home for every coordinate on screen.
 * One banded grid serves every aspect (spec E11/E13): dealer top, player
 * bottom, framed by the margin law — every zone a viewport fraction.
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
  contextPanel: Rect;
  controls: Rect;
  chipTray: Rect;
  metrics: TableMetrics;
}

// --- the grid fractions: the tunables, each with one home (spec E11) ---

const MARGIN_FRAC = 0.05; // the margin law: 5% of the window per edge (spec E13)
const BANDS = 5; // five clean fifths of the safe area (spec E12/E13)
const SHOE_W = 1 / 4; // band 1: shoe cell width
const PIT_W = 5 / 12; // band 1: pit width (the shoe row bleeds into it)
const DISCARD_W = 1 / 3; // band 1: discard tray width
const HUD_W = 1 / 4; // band 2: count hud width (also the deck-extra width)
const PANEL_W = 1 / 4; // band 5: context panel width
const CARD_BOX_ASPECT = 7 / 5; // the canonical card box ratio (art fits within)
const STACK_DX = 0.2; // stacked-card horizontal bias vs card width
const STACK_DY = 0.07; // stacked-card vertical bias vs card height
const DEALER_GAP = 0.08; // dealer row pitch vs card width
const HAND_W = 1.2; // a stacked hand's width vs card width
const SPOT_H = 0.12; // spot diameter vs slot height
const SPOT_W = 0.45; // spot diameter vs slot width
const SPOT_INSET = 0.02; // spot inset vs slot height
const SLOT_CARD_H = 1 - 2 * (SPOT_H + SPOT_INSET); // the cards' share of a slot
const DEALER_CARD_H = 0.95; // dealer cards' share of their band height

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

  // the margin law (spec E13): device insets first, then 5% of the window per edge
  const mx = width * MARGIN_FRAC;
  const my = height * MARGIN_FRAC;
  const safe: Rect = {
    x: ins.left + mx,
    y: ins.top + my,
    w: Math.max(0, width - ins.left - ins.right - mx * 2),
    h: Math.max(0, height - ins.top - ins.bottom - my * 2),
  };

  // the five bands: clean fifths of the safe area, touching (spec E12/E13)
  const bandH = safe.h / BANDS;

  /** One content band of the grid, by index. */
  function band(i: number): Rect {
    return { x: safe.x, y: safe.y + i * bandH, w: safe.w, h: bandH };
  }
  const b1 = band(0);
  const b2 = band(1);
  const b3 = band(2);
  const trayBand = band(3);
  const b5 = band(4);

  // band 1: the back row — shoe 1/4 | pit 5/12 | discard 1/3 (the axis mirrors the ends)
  const shoeW = safe.w * SHOE_W;
  const pitW = safe.w * PIT_W;
  const discardW = safe.w * DISCARD_W;
  const shoe: Rect = axisFlip
    ? { x: safe.x + safe.w - shoeW, y: b1.y, w: shoeW, h: b1.h }
    : { x: safe.x, y: b1.y, w: shoeW, h: b1.h };
  const pit: Rect = axisFlip
    ? { x: safe.x + discardW, y: b1.y, w: pitW, h: b1.h }
    : { x: safe.x + shoeW, y: b1.y, w: pitW, h: b1.h };
  const discard: Rect = axisFlip
    ? { x: safe.x, y: b1.y, w: discardW, h: b1.h }
    : { x: safe.x + safe.w - discardW, y: b1.y, w: discardW, h: b1.h };

  // band 2: deck extra 1/4 (under the shoe cell) | dealer 1/2 | count hud 1/4
  const hudW = safe.w * HUD_W;
  const deckExtra: Rect = { x: shoe.x, y: b2.y, w: shoe.w, h: b2.h };
  const dealer: Rect = { x: safe.x + hudW, y: b2.y, w: safe.w - hudW * 2, h: b2.h };
  const countHud: Rect = axisFlip
    ? { x: safe.x, y: b2.y, w: hudW, h: b2.h }
    : { x: safe.x + safe.w - hudW, y: b2.y, w: hudW, h: b2.h };
  const player: Rect = { ...b3 };
  const chipTray: Rect = { ...trayBand };

  // band 5: context panel 1/4 | controls 3/4 (the axis mirrors the ends)
  const panelW = safe.w * PANEL_W;
  const contextPanel: Rect = axisFlip
    ? { x: safe.x + safe.w - panelW, y: b5.y, w: panelW, h: b5.h }
    : { x: safe.x, y: b5.y, w: panelW, h: b5.h };
  const controls: Rect = axisFlip
    ? { x: safe.x, y: b5.y, w: safe.w - panelW, h: b5.h }
    : { x: safe.x + panelW, y: b5.y, w: safe.w - panelW, h: b5.h };

  // hand slots: one per active line, side by side across the player band
  const slots: Rect[] = [];
  for (let i = 0; i < hands; i++) {
    slots.push({ x: player.x + (i * player.w) / hands, y: player.y, w: player.w / hands, h: player.h });
  }

  // one shared card box: fit within slot and dealer constraints — no minimums
  const cardW = Math.min(
    slots[0].w / HAND_W,
    (slots[0].h * SLOT_CARD_H) / CARD_BOX_ASPECT,
    (dealer.h * DEALER_CARD_H) / CARD_BOX_ASPECT,
  );
  const cardH = cardW * CARD_BOX_ASPECT;
  const metrics: TableMetrics = {
    cardW,
    cardH,
    stackDX: STACK_DX * cardW,
    stackDY: STACK_DY * cardH,
    chipR: Math.min(cardW * 0.45, chipTray.h * 0.42),
    dealerGap: DEALER_GAP * cardW,
    dealerFits: Math.max(
      1,
      Math.floor((dealer.w + countHud.w + DEALER_GAP * cardW) / (cardW * (1 + DEALER_GAP))),
    ),
  };

  // the stakes: bet bottom-center of its slot, insurance top-center (spec E11)
  const betSpots: Rect[] = slots.map((s) => {
    const d = Math.min(s.w * SPOT_W, s.h * SPOT_H);
    return { x: s.x + s.w / 2 - d / 2, y: s.y + s.h - s.h * SPOT_INSET - d, w: d, h: d };
  });
  const insuranceSpots: Rect[] = slots.map((s) => {
    const d = Math.min(s.w * SPOT_W, s.h * SPOT_H);
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
    contextPanel,
    controls,
    chipTray,
    metrics,
  };
}
