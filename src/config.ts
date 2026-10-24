/**
 * One home for presentation constants: felt palette, card metrics, animation
 * timings, keybinds, and the debug flags the scenes read. Pure data — no
 * imports, no engine code — so the whole UI skin is tunable in one place.
 */

/** The felt: table surface colors (camera background + readout ink). */
export const FELT = {
  background: "#0b5d3b",
  readout: "#e8f5ee",
} as const;

/** Debug flags: the layout overlay shows until pt2's solver makes it honest. */
export const DEBUG = {
  layout: true,
} as const;

/** The card palette: face, ink, and the red suit — the contrast law's subjects (spec E8). */
export const CARD = {
  face: "#ffffff",
  ink: "#1a1a1a",
  red: "#c8102e",
} as const;

/** Closed captions (CEA-style, spec E8): bottom-center band, on by default. */
export const CAPTIONS = {
  background: "rgba(0, 0, 0, 0.75)",
  color: "#ffffff",
  displayMs: 4000,
  maxWidthPct: 0.8,
} as const;

/** The lower-third credit (television style, spec E9): fade timings. */
export const LOWER_THIRD = {
  inMs: 600,
  holdMs: 5000,
  outMs: 800,
} as const;

/**
 * The count-true stacks (ruled): one sprite per group of cards, pixels of
 * stripe per sprite; the max deck (2 decks) and shoe (8 decks) are tested.
 */
export const CARD_STACK = {
  deckPx: 1,
  shoePx: 2,
  group: 4,
  maxDeck: 104,
  maxShoe: 416,
} as const;

/** The cut card (spec E11): a red rounded square riding the pen mark in the stack graphic. */
export const CUT_CARD = {
  red: 0xc8102e,
  radius: 0.08,
} as const;

/** Animation kit timings (ms) — the composable tween durations. */
export const ANIM = {
  place: 260,
  stagger: 90,
  flip: 280,
  flash: 450,
} as const;

/** Tony's Backroom (spec S9 era 1): the pt4 table's stakes. */
export const TONYS = {
  bankroll: 200,
  betUnits: 1,
} as const;

