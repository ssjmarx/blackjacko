/**
 * One home for presentation constants: felt palette, card metrics, animation
 * timings, keybinds, and the debug flags the scenes read. Pure data — no
 * imports, no engine code — so the whole UI skin is tunable in one place.
 */

/** The felt: table surface colors (camera background + readout ink). */
export const FELT = {
  background: "#0b5d3b",
  fill: 0x0b5d3b,
  readout: "#e8f5ee",
} as const;

/** Debug flags: off in play — the felt renders as its single shade of green. */
export const DEBUG = {
  layout: false,
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

/** The margin law (spec E13): 5% of the window per edge frames the play field. */
export const MARGIN = {
  frac: 0.05,
} as const;

/**
 * The wood rail (spec E14): a procedural flow-field density — seeded knots
 * disturb a stream function whose level sets are the grain; every pixel is
 * an asymmetric annual ramp modulated by fiber, figure, and baked light.
 * The salt branches the rail's child RNG stream off the session seed (same
 * seed, same table; the shuffle's stream is never touched).
 */
export const WOOD = {
  salt: 0x776f6f64,
  early: 0x6b4423, // the light warm field between the annual lines
  late: 0x241307, // the thin dark latewood band
  knotCore: 0x2b120a, // the red-shifted near-black at a knot's center
  flow: 0.12, // swirl strength vs the window's short side, seeded ±40%
  spacing: 13, // base ring spacing in px, modulated ±15% by tone
  lateWidth: 0.18, // the latewood band's share of the annual cycle
  fiberAmp: 0.06, // fiber-noise luminance swing (stretched 8:1 along flow)
  figureAmp: 0.05, // the broad chatoyance bands' swing
  vignette: 0.28, // darkening toward the window edges
  rim: 0.18, // the warm highlight along the felt boundary (top-left biased)
} as const;

/** The cut-in shadow (spec E14): layered darkness just inside the felt's edge. */
export const CUT_IN = {
  steps: 8,
  alpha: 0.32,
} as const;

/** The cut card (spec E11): a red rounded square riding the pen mark in the stack graphic. */
export const CUT_CARD = {
  red: 0xc8102e,
  radius: 0.08,
} as const;

/** The action buttons (spec E12): card-shaped placeholders — paper and ink. */
export const BUTTON = {
  paper: "#ffffff",
  ink: "#1a1a1a",
} as const;

/** Animation kit timings (ms) — the composable tween durations. */
export const ANIM = {
  place: 260,
  stagger: 90,
  flip: 280,
  flash: 450,
} as const;

/** Tony's Backroom (spec S9 era 1): the pt4 table's stakes (max is a pt4 placeholder). */
export const TONYS = {
  bankroll: 200,
  betUnits: 1,
  min: 1,
  max: 25,
} as const;

