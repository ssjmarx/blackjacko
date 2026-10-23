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

