# docs/current_plan.md — THE FELT (0.1.0) patch cycle

**Status:** active. This file is the pt-level working plan for the current
milestone; `docs/ROADMAP.md` remains the ladder. Amend pt scope by ruling;
record rulings in the dev log.

## The five goals (ruled 2026-10-22)

1. **Any aspect ratio** — 21:9 through 9:21 (widened 2026-10-22). One banded
   layout serves every aspect (spec E11); nothing letterboxes.
2. **Screen-reader compatible** — all information is mirrored to the DOM (aria-live
   announcer + state panel); the game is playable without the canvas.
3. **Distribution-ready** — Steam / itch / Android stay open doors: static builds
   only, pointer events, safe-area insets, no browser-only APIs without guards.
   Tauri 2 / Capacitor come later; no wrapper work in 0.1.0.
4. **Three input modes, equal citizens** — mouse, keyboard, and touch drive one
   command bus; DOM buttons are the keyboard/SR path, the canvas adds drag and
   direct manipulation.
5. **Sharp feel** — composable animation kit (flip and placement are separate,
   mix-and-match functions); snappy, time-driven tweens; nothing dead on screen.

## Presentation law (ruled 2026-10-22)

- **Adaptive layout from day 1:** one pure zone solver drives both the canvas and
  the DOM overlay. One banded grid at every aspect (spec E11/E13, ruled
  2026-10-22/23): the margin law frames the table (5% of the window per
  edge); dealer top, player bottom, always — five clean fifths; the back row
  is deck/shoe 1/4 | pit 5/12 | discard 1/3; deck extra 1/4 | dealer 1/2 |
  count hud 1/4; player full width; chip tray (band 4); context panel 1/4 |
  controls 3/4 (band 5). Fully relational: every element sizes from its
  cell, no pixel minimums; the axis option mirrors the horizontal anchors
  only. The five action buttons are card-shaped and fill the controls band,
  and the cards fill their band identically (the `buttonMetrics` law — one
  size law on the felt), placeholders until the human's vector art
  lands. Procedural growth-ring wood fills the frame with the felt inset on
  top, seeded from a child stream of the session seed (same seed, same
  table; the shuffle untouched).
- **Vector-first assets:** cards come from the English-pattern SVG (wikimedia,
  CC0, Loren Osborn) first — per-property decks arrive later through a `Deck`
  interface. Chips, bet circles, side-bet spots, the pen bar, and the cut card
  are drawn logically — never image files.
- **Attribution law:** every deck is credited when it appears on screen — a
  lower-third, television-style credit at the start of play naming the current
  deck. (Licensing ruled commercial-safe: the CC0 and Pixabay regimes both
  cover in-game use — no trademarks, no standalone asset distribution.)
- **Animation law:** a card flip = the back lerps full-width → a single line,
  then the front lerps out the same way; placement = fly from the shoe. Flip
  and placement are independent, composable functions.
- **HUD placement (spec E11/E13):** RC/TC in its band-2 cell, right side. Context
  info in the band-5 panel (min/max bet + bankroll while betting; strategy
  card while playing; the deck credit sprouting from its outer top corner).
  The pen bar is cancelled — the count-true deck/shoe graphic carries a red
  rounded cut card riding the pen mark, shifting one sprite per `group`
  cards of pen change; when exposed it slides out and lands by the dealer
  hand: last hand.
- **Chips:** diegetic circles along the bottom, denomination-sorted, promo area
  reserved (empty until 0.3.0). Click+drag plays them; keyboard selects and
  plays them.
- **Aesthetic law:** vector cards and chips, calculated felt, photographic
  artifacts — the strategy and index cards ship as photographs of the human's
  actual card-counter cards, and Corey's Table's chips as photographs of the
  human's actual custom poker chips (spec E9).
- **Accessibility law (spec E8):** every game object, visual event, and player
  control is SR-complete — enforced per commit by the render kit, the a11y
  lint, and the announcement map. Contrast law: every palette pair clears
  WCAG AA, test-enforced; card backs light or white-outlined. Closed captions
  (CEA-style, bottom-center, speaker labels, bracketed sounds) print every
  announcement, on by default — one string, two sinks.

## The patch cycle

| pt | Name | Ships | Exit |
|---|---|---|---|
| pt0 | the seam | async resolver (awaits `Action \| Promise<Action>`) + the RoundEvent stream (card / hole-reveal / decision / line events); sims and tests adapt | check green; sim anchors sane |
| pt1 | the shell | phaser 4.2.1 + vite 8.2.2 pins; tsconfig → knkn shape (bundler + DOM, `.ts` imports); index.html DOM shell; canvas boots to felt; resize + orientation flip live 20:9↔9:20 | first pixels; resize verified |
| pt2 | the solver | zone solver v2 (stacking law, dealer choreography, 10%/50% card metrics, hands parameter, dual context rects, axisFlip) + vitest suite (ratio sweep, goldens, hand-count expansion); the render kit + A11y registry (E8 law: SR-required creators, a11y grep lint, announcement map); contrast-law test; debug zone overlay through the kit; DOM anchors share one solve | solver tested across the ratio sweep; a11y lint green |
| pt3 | the deck | `scripts/extract-deck.ts`: parse the English-pattern SVG (grid-positional — the source has no labels — calibrated once against your eyes) → per-card SVGs + manifest in `public/assets/decks/english/`; green background dropped, the four white-outlined backs preserved; number and face art extracted in separable layers (the large-number option swaps them independently — E8); Deck interface; device-scaled rasterization; lower-third deck credit at start of play | A♠ lands where A♠ should |
| pt4 | the hand | HumanStrategy over the command bus; DOM buttons + keybinds; events → animation kit; a full Tony's round (hit/stand/double/split/surrender, insurance, peek); settlement flash | the first playable hand |
| pt5 | the money | drawn chip tray (denomination-sorted, promo area reserved), click+drag + keyboard chips, bet circle, bankroll + min/max context, rebet | betting plays by all three input modes |
| pt6 | the counter | RC/TC in its grid cell; the count visualizer; strategy card in the context panel; a11y layer complete end-to-end | SR-playable; counts never drift from the engine |
| pt7 | the gate | exit tests (50 hands by hand; seeded card-for-card replay vs the harness; purity greps; the a11y lint; check); the gate's dev_log entry; spec erratum E10 (presentation law); roadmap 0.1.0 scope rewrite; tag v0.1.0 on the go | the gate passes or it doesn't |

## Architecture notes

- **One layout solver, two surfaces:** `src/layout/table.ts` computes the zones;
  the Phaser canvas and the DOM overlay both consume it (CSS variables carry the
  DOM side). One home per coordinate.
- **Command bus:** one vocabulary — `bet/unbet/deal/hit/stand/double/split/
  surrender/insurance/rebet/chip-focus/chip-play`. Drivers = DOM buttons,
  keybinds, canvas pointer. `HumanStrategy` resolves its strategy promises from
  bus commands.
- **Deck pipeline:** the 7.8 MB wikimedia SVG never ships to the browser —
  `extract-deck.ts` emits per-card SVGs plus a generated manifest. Kenney PNGs
  stay in the repo as future per-property decks.
- **Core purity holds:** `src/core/` + `src/sim/` stay engine-free (grep law).
  The front end lives in `src/scenes/` + `src/ui/`.
- **Pins:** phaser 4.2.1 · vite 8.2.2 (knkn precedent, exact).

## Open items for this cycle

- **Deploy target ruling** (roadmap exit test) — due at gate close.
- **Card back source:** the English deck PLUS may include one; else Kenney's CC0
  back; else drawn. Decided during pt3.
- **Keybind map:** proposal lands in pt4 (H/S/D/P/R, arrows+Enter chips,
  I insurance) — adjust by ruling anytime.
- **Battery-perf contingency:** if pt0's async measurably slows the 20M battery,
  a sync fast-path for sync strategies is the sanctioned fix (flagged, not
  built).

