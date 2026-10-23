/**
 * The table layout solver — the single home for every coordinate on screen.
 * Pure geometry: viewport, insets, hand count, and the axis option in; named zones out for both surfaces.
 * Cards target 10% of width; player hands stack; dealer rows grow right and squash.
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

/** The dealing axis follows the longer screen dimension; flips at square. */
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
  penBar: Rect;
  chipTray: Rect;
  dealer: Rect;
  shoe: Rect;
  player: Rect;
  lineSlots: Rect[];
  betSpots: Rect[];
  insuranceSpot: Rect;
  countHud: Rect;
  contextPanel: Rect;
  contextButton: Rect;
  lowerThird: Rect;
  metrics: TableMetrics;
}

// --- geometry constants: the tunables, each with one home ---

const MARGIN = 12;
const PEN_BAR_H = 24;
const CHIP_TRAY_FRAC = 0.12;
const CHIP_TRAY_MIN = 64;
const CHIP_TRAY_MAX = 110;
const CARD_TARGET = 0.1;
const MIN_CARD_W = 36;
const CARD_H_OVER_W = 7 / 5;
const STACK_DX = 0.2;
const STACK_DY = 0.08;
const DEALER_GAP = 0.08;
const HUD_W = 220;
const HUD_H = 56;
const PANEL_W = 260;
const PANEL_H = 148;
const CONTEXT_BUTTON = 48;
const CHIP_R_MIN = 14;
const PORTRAIT_DEALER = 0.24;
const PORTRAIT_PLAYER = 0.32;
const LANDSCAPE_DEALER = 0.26;
const LANDSCAPE_PLAYER = 0.36;
const PORTRAIT_BAND_AT_REST = 0.5;
const CONTEXT_COLLAPSE_AT = 4;

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
    x: ins.left + MARGIN,
    y: ins.top + MARGIN,
    w: Math.max(0, width - ins.left - ins.right - 2 * MARGIN),
    h: Math.max(0, height - ins.top - ins.bottom - 2 * MARGIN),
  };

  // chrome bands, both orientations
  const penBar: Rect = { x: safe.x, y: safe.y, w: safe.w, h: Math.min(PEN_BAR_H, safe.h * 0.06) };
  const trayH = clamp(height * CHIP_TRAY_FRAC, CHIP_TRAY_MIN, CHIP_TRAY_MAX);
  const chipTray: Rect = { x: safe.x, y: safe.y + safe.h - trayH, w: safe.w, h: trayH };
  const fieldY = penBar.y + penBar.h;
  const fieldH = chipTray.y - fieldY;

  // card metrics from the ruled target (10% of screen width, floored)
  const cardW = Math.max(MIN_CARD_W, CARD_TARGET * width);
  const cardH = cardW * CARD_H_OVER_W;
  const metrics: TableMetrics = {
    cardW,
    cardH,
    stackDX: STACK_DX * cardW,
    stackDY: STACK_DY * cardH,
    chipR: 0,
    dealerGap: DEALER_GAP * cardW,
    dealerFits: 0,
  };

  const shoeW = cardW * 1.15;
  const shoeH = cardH * 0.6;
  const chipR = clamp(trayH * 0.38, CHIP_R_MIN, cardH * 0.3);
  metrics.chipR = chipR;

  // dealing bands: portrait = horizontal strips (dealer top, player bottom);
  // landscape = vertical columns (dealer left, player right); axisFlip mirrors.
  let dealer: Rect;
  let player: Rect;
  const slots: Rect[] = [];
  const hudW = Math.min(HUD_W, safe.w * 0.45);
  const hudX = axisFlip ? safe.x + 4 : safe.x + safe.w - hudW - 4;
  if (orientation === "portrait") {
    const dealerH = fieldH * PORTRAIT_DEALER;
    const playerH = fieldH * PORTRAIT_PLAYER;
    const bandY = fieldY + fieldH - playerH;
    const bandW = hands >= CONTEXT_COLLAPSE_AT ? safe.w : safe.w * PORTRAIT_BAND_AT_REST;
    const bandX = axisFlip ? safe.x : safe.x + safe.w - bandW;
    dealer = { x: safe.x, y: fieldY, w: safe.w, h: dealerH };
    player = { x: bandX, y: bandY, w: bandW, h: playerH };
    for (let i = 0; i < 4; i++) {
      slots.push({ x: player.x + (i * player.w) / 4, y: player.y, w: player.w / 4, h: player.h });
    }
  } else {
    const dealerW = safe.w * LANDSCAPE_DEALER;
    const playerW = safe.w * LANDSCAPE_PLAYER;
    const dealerX = axisFlip ? safe.x + safe.w - dealerW : safe.x;
    const playerX = axisFlip ? safe.x : safe.x + safe.w - playerW;
    dealer = { x: dealerX, y: fieldY, w: dealerW, h: fieldH };
    player = { x: playerX, y: fieldY, w: playerW, h: fieldH };
    for (let i = 0; i < 4; i++) {
      slots.push({ x: player.x, y: player.y + (i * player.h) / 4, w: player.w, h: player.h / 4 });
    }
  }

  // the shoe anchors inside the dealer band's outer edge; dealer rows grow screen-right
  const shoe: Rect = {
    x: axisFlip ? dealer.x + dealer.w - shoeW - 4 : dealer.x + 4,
    y: dealer.y + 4,
    w: shoeW,
    h: shoeH,
  };
  const rowAvail = safe.x + safe.w - (shoe.x + shoe.w) - 8;
  metrics.dealerFits = Math.max(2, Math.floor((rowAvail + metrics.dealerGap) / (cardW * (1 + DEALER_GAP))));

  // bet spots: inside each line slot (portrait: below the hand; landscape: beside it);
  // the diameter yields to the slot's tightest dimension on extreme screens
  const betSpots: Rect[] = slots.map((s) => {
    const d = Math.min(cardH * 0.5, s.w * 0.5, s.h * 0.6);
    return orientation === "portrait"
      ? { x: s.x + s.w / 2 - d / 2, y: s.y + s.h - d - 6, w: d, h: d }
      : { x: s.x + s.w - d - 6, y: s.y + s.h / 2 - d / 2, w: d, h: d };
  });

  // insurance lives in the pit, on the dealer's player-facing side
  const insW = cardW * 2.2;
  const insuranceSpot: Rect =
    orientation === "portrait"
      ? { x: safe.x + safe.w / 2 - insW / 2, y: dealer.y + dealer.h + 8, w: insW, h: cardH * 0.5 }
      : {
          x: axisFlip ? Math.max(safe.x + 4, dealer.x - insW - 8) : dealer.x + dealer.w + 8,
          y: fieldY + 8,
          w: insW,
          h: cardH * 0.5,
        };

  const countHud: Rect = { x: hudX, y: fieldY + 4, w: hudW, h: HUD_H };

  // the context block: full panel at rest; collapses to a button when the
  // player band expands over it (portrait, 4 hands). Landscape keeps the panel.
  let contextPanel: Rect;
  let contextButton: Rect;
  if (orientation === "portrait" && hands < CONTEXT_COLLAPSE_AT) {
    const stripW = Math.max(0, safe.w - player.w - 8);
    const panelW = Math.min(PANEL_W, stripW);
    contextPanel = {
      x: axisFlip ? safe.x + safe.w - panelW - 4 : safe.x + 4,
      y: player.y + 4,
      w: panelW,
      h: Math.min(PANEL_H, player.h),
    };
    contextButton = { x: contextPanel.x, y: contextPanel.y, w: 0, h: 0 };
  } else if (orientation === "portrait") {
    contextPanel = { x: 0, y: 0, w: 0, h: 0 };
    contextButton = {
      x: axisFlip ? safe.x + safe.w - CONTEXT_BUTTON - 4 : safe.x + 4,
      y: player.y + 4,
      w: CONTEXT_BUTTON,
      h: CONTEXT_BUTTON,
    };
  } else {
    const panelX = axisFlip ? safe.x + safe.w - PANEL_W - 4 : safe.x + 4;
    const panelH = Math.min(PANEL_H, chipTray.y - fieldY - 8);
    contextPanel = {
      x: panelX,
      y: Math.max(fieldY + 4, chipTray.y - panelH - 4),
      w: Math.min(PANEL_W, safe.w * 0.4),
      h: panelH,
    };
    contextButton = {
      x: panelX,
      y: chipTray.y - CONTEXT_BUTTON - 4,
      w: 0,
      h: 0,
    };
  }

  // transient band: the deck credit hugs the lower-left (television credit)
  const lowerThird: Rect = { x: safe.x, y: chipTray.y - 76, w: safe.w * 0.45, h: 64 };

  return {
    width,
    height,
    orientation,
    axisFlip,
    hands,
    safe,
    penBar,
    chipTray,
    dealer,
    shoe,
    player,
    lineSlots: slots,
    betSpots,
    insuranceSpot,
    countHud,
    contextPanel,
    contextButton,
    lowerThird,
    metrics,
  };
}
