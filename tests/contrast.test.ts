/**
 * The contrast law (spec E8): every palette foreground/background pair the
 * game ships must clear WCAG AA (4.5:1), computed here from the config so
 * the palette can never silently drift into illegibility.
 */
import { describe, it, expect } from "vitest";
import { CARD, CAPTIONS, FELT } from "../src/config.ts";

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const lin = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** The WCAG contrast ratio between two colors. */
function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("contrast law (spec E8)", () => {
  const PAIRS: [string, string, string][] = [
    ["HUD readout on felt", FELT.readout, FELT.background],
    ["card face on felt", CARD.face, FELT.background],
    ["card ink on face", CARD.ink, CARD.face],
    ["card red on face", CARD.red, CARD.face],
    ["captions on band (vs black)", CAPTIONS.color, "#000000"],
  ];
  for (const [name, fg, bg] of PAIRS) {
    it(`${name} clears WCAG AA`, () => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("card ink on face reaches AAA", () => {
    expect(ratio(CARD.ink, CARD.face)).toBeGreaterThanOrEqual(7);
  });
});