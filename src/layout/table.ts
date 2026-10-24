/**
 * The table layout solver — the single home for every coordinate on screen.
 * One banded grid serves every aspect (spec E11): dealer top, player bottom,
 * every zone a viewport fraction — no pixel constants, no minimums.
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
  /** how many dealer cards fit un-squashed before the compression policy */
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
  shoe: Rect;
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

const TRAY_FRAC = 1 / 8; // chip tray height vs safe height
const BANDS = 4; // equal content bands above the tray
const SHOE_W = 1 / 8; // shoe cell width vs safe width (band 1)
const HUD_W = 1 / 4; // count hud width vs safe width (band 2)
const PANEL_W = 1 / 4; // context panel width vs safe width (band 4)
const CARD_BOX_ASPECT = 7 / 5; // the canonical card box ratio (art fits within)
const STACK_DX = 0.2; // stacked-card horizontal bias vs card width
const STACK_DY = 0.08; // stacked-card vertical bias vs card height
const DEALER_GAP = 0.08; // dealer row pitch vs card width
const HAND_W = 1.2; // a stacked hand's width vs card width
const SPOT_H = 0.15; // spot diameter vs slot height
const SPOT_W = 0.45; // spot diameter vs slot width
const SPOT_INSET = 0.03; // spot inset vs slot height
const SLOT_CARD_H = 1 - 2 * (SPOT_H + SPOT_INSET); // the cards' share of a slot
const DEALER_CARD_H = 0.85; // dealer cards' share of their band height

/** Clamp a value into [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Solve the table for a viewport — pure: identical inputs, identical layout. */
export function solveTable(width: number, height: number, opts: TableOptions = {}): TableLayout {
  const ins = opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const axisFlip = opts.axisFlip ?? false;
  const hands = clamp(Math.round(opts.hands ?? 1), 1, 4);
  const orientation: Orientation = height > width ? "portrait" : "landscape";

  const safe: Rect = {
    x: ins.left,
    y: ins.top,
    w: Math.max(0, width - ins.left - ins.right),
    h: Math.max(0, height - ins.top - ins.bottom),
  };

  // the five bands: four equal content quarters, then the chip tray
  const trayH = safe.h * TRAY_FRAC;
  const chipTray: Rect = { x: safe.x, y: safe.y + safe.h - trayH, w: safe.w, h: trayH };
  const bandH = (safe.h - trayH) / BANDS;

  /** One content band of the grid, by index. */
  function band(i: number): Rect {
    return { x: safe.x, y: safe.y + i * bandH, w: safe.w, h: bandH };
  }
  const b1 = band(0);
  const b2 = band(1);
  const b3 = band(2);
  const b4 = band(3);

  // band 1: shoe 1/8 | dealer 7/8; band 2: pit | hud 1/4; band 4: panel 1/4 | controls 3/4
  const shoe: Rect = axisFlip
    ? { x: safe.x + safe.w - safe.w * SHOE_W, y: b1.y, w: safe.w * SHOE_W, h: b1.h }
    : { x: safe.x, y: b1.y, w: safe.w * SHOE_W, h: b1.h };
  const dealer: Rect = axisFlip
    ? { x: safe.x, y: b1.y, w: safe.w - shoe.w, h: b1.h }
    : { x: safe.x + shoe.w, y: b1.y, w: safe.w - shoe.w, h: b1.h };
  const hudW = safe.w * HUD_W;
  const countHud: Rect = axisFlip
    ? { x: safe.x, y: b2.y, w: hudW, h: b2.h }
    : { x: safe.x + safe.w - hudW, y: b2.y, w: hudW, h: b2.h };
  const pit: Rect = axisFlip
    ? { x: safe.x + hudW, y: b2.y, w: safe.w - hudW, h: b2.h }
    : { x: safe.x, y: b2.y, w: safe.w - hudW, h: b2.h };
  const player: Rect = { ...b3 };
  const panelW = safe.w * PANEL_W;
  const contextPanel: Rect = axisFlip
    ? { x: safe.x + safe.w - panelW, y: b4.y, w: panelW, h: b4.h }
    : { x: safe.x, y: b4.y, w: panelW, h: b4.h };
  const controls: Rect = axisFlip
    ? { x: safe.x, y: b4.y, w: safe.w - panelW, h: b4.h }
    : { x: safe.x + panelW, y: b4.y, w: safe.w - panelW, h: b4.h };

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
    dealerFits: Math.max(1, Math.floor((dealer.w + DEALER_GAP * cardW) / (cardW * (1 + DEALER_GAP)))),
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
    shoe,
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
