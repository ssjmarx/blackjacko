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
