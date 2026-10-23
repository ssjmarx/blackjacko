/**
 * The announcement map — every RoundEvent kind phrased for speech and
 * captions (spec E8: one string, two sinks). The Record types over the event
 * and outcome unions make a missed kind a compile error.
 */
import type { Action } from "../core/strategy/view.ts";
import type { LineOutcome, RoundEvent } from "../core/resolver.ts";

const RANK_WORDS = ["ace", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "jack", "queen", "king"];
const SUIT_WORDS = ["spades", "hearts", "diamonds", "clubs"];
const ACTION_WORDS: Record<Action, string> = {
  H: "hit",
  S: "stand",
  D: "double down",
  P: "split",
  R: "surrender",
  RESCUE: "rescue the doubled hand",
};
const OUTCOME_WORDS: Record<LineOutcome, string> = {
  blackjack: "blackjack",
  "twenty-one": "twenty-one, automatic win",
  "super-bonus": "super bonus",
  win: "win",
  lose: "loss",
  push: "push",
  bust: "bust",
  surrender: "surrender",
  rescue: "rescued",
};

/** Speak a card byte as words: "ace of spades". */
export function speakCard(card: number): string {
  return `${RANK_WORDS[card >> 2]} of ${SUIT_WORDS[card & 3]}`;
}

/** Phrase a RoundEvent for speech and captions; never empty for a known kind. */
export function phraseFor(e: RoundEvent): string {
  switch (e.kind) {
    case "round-start":
      return "New hand.";
    case "card": {
      if (e.role === "hole") return "Dealer takes a card face down.";
      const name = e.card === undefined ? "a card" : speakCard(e.card);
      if (e.to === "dealer") return `Dealer shows ${name}.`;
      if (e.role === "double") return `Doubled — ${name}.`;
      return `You receive ${name}.`;
    }
    case "hole-revealed":
      return `Dealer's hole card: ${speakCard(e.card)}.`;
    case "decision":
      return `You ${ACTION_WORDS[e.action]}.`;
    case "line-created":
      return `Split hand ${e.line + 1} created.`;
    case "line-settled": {
      const net = e.net === 0 ? "" : e.net > 0 ? `, plus ${e.net} units` : `, minus ${Math.abs(e.net)} units`;
      return `Hand ${e.line + 1}: ${OUTCOME_WORDS[e.outcome]}${net}.`;
    }
    case "round-end":
      return `Round over, ${e.result.net >= 0 ? "plus" : "minus"} ${Math.abs(e.result.net)} units.`;
  }
}