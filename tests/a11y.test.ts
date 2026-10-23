/**
 * The announcement map's coverage law (spec E8): every RoundEvent kind has a
 * non-empty phrase, and the hole card stays hidden until it is revealed — no
 * visual event can ever ship unvoiced, and none can leak what it must not.
 */
import { describe, it, expect } from "vitest";
import { phraseFor } from "../src/ui/announcements.ts";
import type { RoundEvent } from "../src/core/resolver.ts";

const EVENTS: RoundEvent[] = [
  { kind: "round-start" },
  { kind: "card", to: "player", line: 0, role: "initial", card: 0 },
  { kind: "card", to: "player", line: 0, role: "hit", card: 5 },
  { kind: "card", to: "player", line: 0, role: "double", card: 9 },
  { kind: "card", to: "dealer", line: 0, role: "up", card: 1 },
  { kind: "card", to: "dealer", line: 0, role: "hole" },
  { kind: "hole-revealed", card: 3 },
  { kind: "decision", line: 0, action: "S" },
  { kind: "line-created", line: 1 },
  { kind: "line-settled", line: 0, net: 1.5, outcome: "blackjack" },
  { kind: "line-settled", line: 1, net: -2, outcome: "bust" },
  {
    kind: "round-end",
    result: { net: 1.5, initialWager: 1, totalAtRisk: 1, hands: 1, naturals: 1 },
  },
];

describe("announcement map (spec E8)", () => {
  it("phrases every RoundEvent kind, non-empty", () => {
    for (const e of EVENTS) {
      const p = phraseFor(e);
      expect(p.length, `kind ${e.kind} has no phrase`).toBeGreaterThan(0);
    }
  });

  it("hides the hole card until it is revealed", () => {
    const hidden = phraseFor({ kind: "card", to: "dealer", line: 0, role: "hole" });
    expect(hidden).toMatch(/face down/);
    expect(hidden).not.toMatch(/of (spades|hearts|diamonds|clubs)/i);
    expect(phraseFor({ kind: "hole-revealed", card: 0 })).toMatch(/ace of spades/i);
  });

  it("speaks the settled outcome with its net", () => {
    expect(phraseFor({ kind: "line-settled", line: 0, net: 1.5, outcome: "blackjack" })).toMatch(/blackjack, plus 1\.5 units/);
    expect(phraseFor({ kind: "line-settled", line: 1, net: -2, outcome: "bust" })).toMatch(/bust, minus 2 units/);
  });
});