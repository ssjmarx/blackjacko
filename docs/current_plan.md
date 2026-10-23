# docs/current_plan.md — THE FELT (0.1.0) patch cycle

**Status:** active. This file is the pt-level working plan for the current
milestone; `docs/ROADMAP.md` remains the ladder. Amend pt scope by ruling;
record rulings in the dev log.

## The five goals (ruled 2026-10-22)

1. **Any aspect ratio** — 20:9 through 9:20. The table reflows; nothing letterboxes.
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
  the DOM overlay. Dealer top/left, player bottom/right (left/right axis
  reversible in a later options ruling); the dealing axis follows the longer
  screen dimension.
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
- **HUD placement:** RC/TC top right. Context info bottom left (min/max bet +
  bankroll while betting; strategy card while playing). The HUD flips with the
  reversed axis. Penetration bar on top: the whole shoe, played part black, cut
  tail red, updating live when the cut moves. The cut card sits in the shoe as
  a red rounded square, roughly card-sized.
- **Chips:** diegetic circles along the bottom, denomination-sorted, promo area
  reserved (empty until 0.3.0). Click+drag plays them; keyboard selects and
  plays them.

## The patch cycle

| pt | Name | Ships | Exit |
|---|---|---|---|
| pt0 | the seam | async resolver (awaits `Action \| Promise<Action>`) + the RoundEvent stream (card / hole-reveal / decision / line events); sims and tests adapt | check green; sim anchors sane |
| pt1 | the shell | phaser 4.2.1 + vite 8.2.2 pins; tsconfig → knkn shape (bundler + DOM, `.ts` imports); index.html DOM shell; canvas boots to felt; resize + orientation flip live 20:9↔9:20 | first pixels; resize verified |
| pt2 | the solver | pure zone solver (`src/layout/table.ts`) + vitest tests; debug zone overlay; DOM anchors share the same numbers | solver tested across the ratio sweep |
| pt3 | the deck | `scripts/extract-deck.ts`: parse the English-pattern SVG (grid-positional — the source has no labels — calibrated once against your eyes) → per-card SVGs + manifest in `public/assets/decks/english/`; Deck interface; device-scaled rasterization; lower-third deck credit at start of play | A♠ lands where A♠ should |
| pt4 | the hand | HumanStrategy over the command bus; DOM buttons + keybinds; events → animation kit; a full Tony's round (hit/stand/double/split/surrender, insurance, peek); settlement flash | the first playable hand |
| pt5 | the money | drawn chip tray (denomination-sorted, promo area reserved), click+drag + keyboard chips, bet circle, bankroll + min/max context, rebet | betting plays by all three input modes |
| pt6 | the counter | RC/TC top right; penetration bar (black played / red cut tail, live cut updates) + the rounded red cut card in the shoe; strategy card bottom-left during play; a11y layer complete end-to-end; HUD flips with the axis | SR-playable; counts never drift from the engine |
| pt7 | the gate | exit tests (50 hands by hand; seeded card-for-card replay vs the harness; purity greps; check); the gate's dev_log entry; spec erratum E8 (presentation law); roadmap 0.1.0 scope rewrite; tag v0.1.0 on the go | the gate passes or it doesn't |

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

