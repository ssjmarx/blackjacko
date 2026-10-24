# dev_log.md — blackjacko development log

Session rulings, changelogs, supersessions. Evidence, not law — consult for
provenance; the law lives in the spec and the roadmap.

## Entry #1 — 2026-10-22 · repo establishment

- Repo founded at `/home/ssjmarx/blackjacko`. The stage 1–2 core (pure-logic
  blackjack + Spanish 21 engine, sim harness, 20M-hand verification battery
  all PASS — see `results/`) was built as `blackjack-balatro/` and is now
  flattened to the repo root (single-root layout). The root-level copies of
  the 20m results were deleted (byte-identical to `results/20m.*`).
- **Working title ruling: blackjacko** — repo, package, and docs all use it.
  The spec's "BLACKJACK BALATRO" and the Godot battery's "BACKOFF" are
  historical names.
- **Memory bank style ruled:** `docs/` (streamslop/witchgame pattern), not
  knkn's `memory-bank/`.
- **Conduct ruled:** not a learning project — human-directed, AI implements
  (streamslop/witchgame instructions, not knkn instructor mode).
- **Engine ruling: TypeScript + Phaser, 2D graphics.** The spec's Godot
  references are superseded; migrating `docs/spec-0.2.md` into a final-form
  TS/Phaser GDD is a roadmap task. The spec stays verbatim until then.
- **Licensing deferred** until an assets plan exists; the `license` field was
  dropped from `package.json`.
- **House tooling adopted** (knkn conventions): exact-pinned deps
  (typescript 7.0.2, vitest 5.0.5, @types/node 26.6.5), the `projectmap.ts`
  docstring audit ported (recursive, writes `docs/PROJECT_MAP.md`; one port
  improvement over the knkn original — call statements are no longer treated
  as method definitions), and the `npm run check` gate (typecheck + test +
  map). `verify` keeps its existing meaning: the full verification battery.
- First `npm run check` caught a real leftover: `scripts/pen-test.ts`
  imported from the original dev machine's absolute path
  (`/home/z/my-project/...`) — repointed to relative imports.
- Remotes wired per the house pattern: `origin` fetches gitea, pushes both
  gitea + GitHub. Founding commit `31a627d` pushed to both.

## Entry #2 — 2026-10-22 · the roadmap authored

- `docs/ROADMAP.md` authored in full (streamslop pattern): 13 gates from
  THE FELT (0.1.0, first Phaser hand) to THE SHIP (1.0.0, full 7-era
  campaign). POC gate at 0.6.0 (spec S11 complete). Dependency chain is
  linear to COUNTERMEASURES, then SPANISH and METER & WHEEL run as
  independent era-5 branches converging at THE MACHINE.
- Gate law: `npm run check` at every commit; the harness battery before any
  tag that touches money math; a six-box hand-run list at every gate (the
  count HUD is the engine's count; seeded UI sessions replay card-for-card;
  one home per number; instant settlement; the fiction teaches; one era
  back still passes).
- **Version field realigned to the versioning law:** `0.1.0` (the core's
  old version) → `0.0.1` — the version is a promise about testability, and
  no gate has passed yet. Bumps resume at THE FELT.
- **Flagged, not resolved (✎):** the POC chip roster — `battery_b3.txt`
  names a Godot-era chip set (New Shoe Who Dis, Baker's Dozen, Bolt Cutter…)
  that doesn't match spec S6 v0.2 (Hot Hand, Camouflage, Team Player…). The
  catalog moved between the battery and the spec; which 12 ship in the POC
  is a human ruling, due before 0.3.0 starts.
- Other open decisions with due dates: Phaser pin + deploy target (0.1.0),
  save storage (0.4.0), assets/licensing plan (before 0.6.0), Sp21 index
  derivation (optional, after 0.10.0).

## Entry #3 — 2026-10-22 · the chip roster ruled

- The ✎ is resolved: the POC roster is a ruled 12-chip table, recorded as
  spec erratum E6. Unchanged from S6: Hot Hand I/II/III, Airbag, Mulligan
  I/II, Insurance Scam I/II/III, Perfect Prediction, Camouflage. Changed:
  Martingale's Ghost (any lost hand → the win doubles; was a 3-streak), Push
  Power (any push → win; the per-shoe cap is gone), Deep Pen (redesigned as a
  +1%-per-won-hand ramp, cap 100%, persists after loss/unstake; was "cut card
  ignored"), First Base Peek → Peek (unconditional hole-card sight). New:
  Psychic (top card visible while staked, quantified on sight), Tourist
  (returns from the B3 battery with a new effect: its line losing consumes
  the chip and zeroes heat).
- Retired: S6's Five-Card Charlie, Double Anything, Surrender Anywhere,
  Burning Question, Ten Density, The Illustrious, Boring Bob, Team Player,
  Cold Deck; B3's New Shoe Who Dis, Housekeeping, The Inside Job, Golden
  Chip, Room Service, Baker's Dozen, Bolt Cutter.
- General chip laws ruled with the roster: chips only have effects while
  staked (at risk every hand — the self-balancer); split hands resolve
  separately and chips bind to their line; Peek×PP only lives through a
  double/split stake; heat chips stay inert until heat exists (their
  rarities wait for the heat model).
- Rarity law extended: all rarities speculative — the 0.3.0 battery assigns
  C/U/R from measured EV; S4's ~70/25/5 governs drop rates only. Battery
  methodology (learned in an earlier iteration): chips that change optimal
  play get bespoke chip-aware strategies before their EV is trusted —
  basic-strategy measurement can show *lost* EV for genuinely good chips.
- Roadmap updated accordingly (0.3.0 ✎ resolved; §6 annotated). The roadmap
  commit (2bf05f7) and this entry's commit are held from push pending the go.

## Entry #4 — 2026-10-22 · THE FELT pt0 — the seam

- `docs/current_plan.md` created (the pt-level working plan for 0.1.0, per the
  five ruled goals) and added to the `.clinerules` boot order; the purity grep
  there aligned to the canonical law (`src/core/` + `src/sim/`).
- pt0 landed: `playRound` is now async — it awaits `Action | Promise<Action>`
  at every decision point (insurance, per-line play, split-aces resplit,
  double-down rescue), so sync sims and the coming async HumanStrategy share
  one `Strategy` interface (`MaybePromise<T>` added in `view.ts`).
- The resolver emits a `RoundEvent` render feed (`events?` on `RoundEnv`):
  round-start / card / hole-revealed / decision / line-created / line-settled
  / round-end. Hole identities stay out of the feed until `hole-revealed` —
  the UI cannot leak what it must not show. Split children's second card now
  emits too (a coverage gap this pass surfaced and closed).
- Consumers adapted: runner, CLI (top-level await), all 81 tests (async),
  pen-test / run-chunk / sp21-diagnose / sp21-calibrate. The auditor's
  function regex now recognizes `async function`.
- Perf datapoint: 800k hands through the async resolver in ~1.7s (~465k
  hands/s) — parity with the sync era; the sync fast-path contingency is
  likely moot. CLI runtime verified (`anchor-1d-s17-das`, 200k hands, PASS,
  0.2s).
- Gate green: typecheck + 81 tests + audit (17 modules).

## Entry #5 — 2026-10-22 · Sp21 index transcription + provenance

- The human added a 23-row Spanish 21 I18 + Fab 4 transcription to the docs —
  now `docs/sp21-i18.md` (renamed from `SP21 I18.md`; no spaces in doc
  filenames, per the spec-0.2.md precedent). Content: 8 doubles, 10 stands
  (including the post-hit hard-17 v A stand/hit rule), 1 rescue row
  ("FORFEIT A DD 12 VS 8 AT 1"), 3 surrenders.
- Provenance ruled and recorded in the file header + spec erratum **E7**:
  source Katarina Walker's *The Pro's Guide to Spanish 21 and Australian
  Pontoon*, adjusted **+4** to the game's balanced Monkey count; specific to
  **8-deck redouble games** (the only ruleset the human has personally seen
  in person); simmed in Casino Verite; **needs verification** — perfecting
  the set is a possible future research task (E4's empirical-derivation
  offer stands as the perfecting path).
- Conventions ruled: every index is implicitly "and above"; X = any 10-value
  card; the 17 v A row is the post-hit rule (surrender 17 v A is otherwise
  standard — "ploppies HATE this play but it's correct").
- Engine impact: none yet — E4's basic-strategy-only deferral holds until the
  rows wire in during 0.10.0 (roadmap scope updated). The presentation-law
  erratum at the FELT gate becomes E8 (E7 now taken).

## Entry #6 — 2026-10-22 · THE FELT pt1 — the shell

- Pins landed: phaser 4.2.1 (runtime) + vite 8.2.2 (dev), exact per knkn
  precedent; scripts gained dev / build / preview (build = `tsc && vite
  build`).
- tsconfig migrated to the knkn shape: module ESNext, moduleResolution
  bundler, lib ES2022 + DOM, isolatedModules, noUnusedLocals,
  resolveJsonModule — keeping `.ts` import extensions and the strict set.
  Node-run scripts are unaffected (Node strips types regardless; tsc stays
  the only type court).
- `noUnusedLocals` paid rent on day one: seven dead declarations deleted —
  sp21-derive's `knownMax` + `ns` pair and the `buildRow` stub,
  sp21-probe's `NINE`, strategy.test's `J`/`DIAMONDS`/`CLUBS` imports and
  the unused `I18F` player.
- The shell boots: `index.html` (canvas host + `sr-announcer`/`sr-state`
  a11y scaffold, `viewport-fit=cover` for the phone wrappers),
  `vite.config.ts`, `src/config.ts` (felt palette + debug flags — one home),
  `src/main.ts` (Phaser.Game in `Scale.RESIZE`), `src/scenes/feltscene.ts`
  (felt + a debug readout of size and dealing axis that flips 20:9↔9:20
  live).
- Verified: check green (typecheck under the new court, 81 tests, audit —
  PROJECT_MAP now 20 modules), vite build clean (1.37 MB / 358 KB gzip —
  that's Phaser), dev server serves the shell and transforms main.ts
  (HTTP 200, ready in 88 ms).
- Eyes pending: the resize/orientation flip (20:9↔9:20) is the human's
  eyeball check at `npm run dev` → localhost:5173 — the pt1 exit test.
  PASSED 2026-10-22 ("looks great!") — pt1 closed.

## Entry #7 — 2026-10-22 · THE FELT pt2 — the solver

- Spec erratum **E8** written (accessibility law + options menu: the hard
  SR law, the contrast law, large-number cards / four-color suits / high
  contrast / captions); the FELT gate's presentation erratum renumbered E9.
  `current_plan.md` gained the aesthetic law (vector cards and chips,
  calculated felt, photographic artifacts), the caption law, and the E8
  summary; pt2/pt3 rows updated to the ruled scope.
- **The solver exists:** `src/layout/table.ts` — a pure function from
  viewport + insets + hand count + axis option to every named zone (safe,
  pen bar, chip tray, dealer, shoe, player, four line slots, bet spots,
  insurance spot, count HUD, context panel + collapsed button, lower
  third). Cards are 10% of screen width (36px floor), upright 5:7; the
  player band runs 50%→100% of width at four hands (portrait), collapsing
  the context panel to a button; `axisFlip` mirrors the hand locations
  (portrait flip = horizontal band swap; dealer stays top).
- **The E8 hard law is enforced, not promised:** `src/ui/kit.ts` is the only
  module allowed to create Phaser objects — every creator takes a required
  SR string; `scripts/a11y-lint.ts` (now in `npm run check`) fails on any
  `this.add.` / `setInteractive` outside the kit; `src/ui/announcements.ts`
  phrases every RoundEvent kind (a missed kind is a compile error via
  Record types); `tests/a11y.test.ts` asserts coverage and hole-card
  secrecy; `tests/contrast.test.ts` enforces WCAG AA on every palette pair.
- The solver's own tests caught three real geometry bugs before any human
  saw them: the count HUD's x used the unclamped width (negative on narrow
  screens), landscape insurance flew off-screen under axisFlip, and bet
  spots escaped their slots at the 480×216 and 100×180 extremes. All fixed;
  the bet-spot diameter now yields to the slot's tightest dimension.
- Gate: typecheck + **106/106 tests** (8 files) + audit (PROJECT_MAP now 24
  modules) + `a11y-lint: kit law holds` + vite build clean. The persistent
  shell's completion detection broke mid-session (a stray dev-server
  process holding the pipe, killed); commands ran fine — verified via log
  files.
- Eyes pending: `npm run dev` → the debug zone overlay at 20:9, square, and
  9:20 — labeled zones, DOM dashed probes sharing the same numbers, and the
  boot caption at the bottom. That closes pt2.

## Entry #9 — 2026-10-22 · THE FELT pt3 — the deck

- The human separated the English-pattern deck into 56 individual SVGs in
  Inkscape (`card images/wikimediaimages/english pattern individuals/`,
  semantically named `as.svg`…`yellow_back.svg`) — the pt3 extraction phase
  collapsed to validation + manifest + move.
- `scripts/build-deck.ts`: validates the set (56 expected names, per-file
  page parse — Inkscape selection bounds vary ~0.2% per card, recorded not
  policed), moves the files to `public/assets/decks/english/`, emits
  `src/ui/decks/english-manifest.json` (byte → file, aspect, credit line)
  and `calibration.html` (the contact sheet). Idempotent: a consumed source
  with a populated output rebuilds the manifest. Lesson learned twice: emit
  before the destructive move, and tolerance beats equality against
  Inkscape floats.
- **The Deck contract** (`src/ui/decks/deck.ts`): pure data — files, credit
  line, byte→art mapping; per-property decks and the large-number option
  slot in without touching the felt. `english.ts` is the first
  implementation; `cardart.ts` is the kit-backed sprite factory (native
  aspect, fit within the solver's card box, SR name via `speakCard`).
- The felt proof: A♠ renders in the dealer zone at solver metrics, the four
  backs fan in the shoe, and the **lower-third deck credit** plays at boot —
  DOM band positioned from the solver's CSS vars, announced + captioned
  (the attribution law, live).
- E9 amended: Corey's Table is the embedded website demo (promos off,
  everything else live) — the deploy ruling's web target.
- Gate: typecheck + **111/111 tests** (9 files) + audit (PROJECT_MAP now 27
  modules) + `a11y-lint: kit law holds` + build clean. The a11y lint's grep
  law tightened to `\w+\.add\.` — the kit guards every object creation,
  including `scene.add.`.
- Eyes pending: the calibration sheet
  (`public/assets/decks/english/calibration.html`) — confirm each file's art
  matches its name; then the felt proof at `npm run dev` (A♠ + backs +
  credit). That closes pt3.

## Entry #10 — 2026-10-22 · pt3 amendment — the credit, the stacks, the outline

- **Calibration PASSED** (human-confirmed) — pt3's identity law holds.
- **Back outlines normalized (ruled):** the English backs outlined navy/
  colored while every face outlines black — `build-deck.ts` now rewrites all
  back strokes to `#000000` post-move (idempotent, pipeline-persistent; all
  four backs verified 2 strokes → black).
- **The lower-third credit, per eyeball rulings:** hugs the lower-left edge
  (solver zone moved, law-tested); renders the structured four-line credit
  (name/author/license/source — manifest fields restructured, `Deck.
  creditLines()` added); television fade (in 600ms, hold 5s, out 800ms —
  `config.LOWER_THIRD`); **once per session** — resizes reposition it
  silently, never re-animate (the re-animation bug the eyeball caught).
- **The count-true stacks (ruled):** `src/ui/cardstack.ts` — a deck stacks
  straight up and a shoe lays its cards down, drawn from the actual card
  count (deck 1px/card, shoe 2px/card — `config.CARD_STACK`), white
  outlines as the estimation stripes. The player reads the remaining count
  by sight. Identical stripes are one SR fact ("Shoe: N cards remaining."),
  not one entry per card. The four-back fan from the pt3 draft is retired —
  neither visual is a hand fan.
- Live counts wire to the engine (`Shoe.remaining()`) in pt4; pt3 draws
  true static counts (Tony's deck at 52, a 104-card shoe-row sample).
- Gate: typecheck + **112/112 tests** (9 files — the lower-third left-edge
  law and structured-credit assertions joined) + audit (PROJECT_MAP now 28
  modules) + `a11y-lint: kit law holds` (7 files) + build clean. The
  docstring auditor gained an arrow-callback guard (`setTimeout(() => {`)
  — a real definition never contains "=>".
- Eyes pending: the credit behavior (fade in/hold/fade out once, left edge,
  four lines; resize = silent reposition) + the two stacks. That closes the
  pt3 amendment.

## Entry #11 — 2026-10-22 · pt3 amendment 2 — the four nits

- **The lower third:** the band now sizes to its text (the solver rect is an
  anchor — left/top/max-width; height and width ride the content), and the
  deck credit no longer announces itself — it registers as a persistent SR
  state entry instead (it is not a game event; no caption, no aria-live).
  The caption mirror the eyeball caught is structurally gone.
- **The count-true stacks stay on screen (ruled):** `placeStripes` (pure,
  tested) places a stripe run along an axis and, when the far end would
  leave the clamp band, shifts the whole run inward by the overshoot —
  pushed down, shifted inward, never shrunk. The deck stack clamps to the
  screen's safe top; the shoe row clamps to the safe right edge.
- **Max sizes are law and are the test cases:** `config.CARD_STACK` gained
  `group: 4, maxDeck: 104, maxShoe: 416`; the felt proof draws the max
  sizes. One sprite per four cards (the resolution cut): a 416 shoe renders
  104 stripes at 2px, a 104 deck renders 26 at 1px — the stripe step stays
  as drawn, per the correction to my first interpretation.
- Gate: typecheck + **118/118 tests** (10 files — the cardstack placement
  law joined: clamping, max sizes, shift-never-shrinks) + audit (28
  modules) + `a11y-lint: kit law holds` + build clean.
- Eyes pending: the credit band hugging its four lines at the left edge,
  the 104-card deck stack clamped to the safe top, the 416-card shoe row
  shifted inward at the safe right edge. That closes pt3 amendment 2.

## Entry #12 — 2026-10-22 · correction — the amendment 2 batch missed two fixes

- Honest accounting: amendment 2's batch planned two lower-third fixes and
  shipped without them — Entry #11's claims that the band sizes to its text
  and that the caption mirror was gone were **wrong as shipped** (the
  eyeball caught both; the gate couldn't, because nothing tests the DOM
  styling). The clamping, grouping, and max-size work Entry #11 describes
  was real — only those two claims were false.
- Now actually fixed: `showLowerThird` anchors the band (left/top/max-width
  from the solver zone) and lets it size to its text — the black backing
  hugs the four lines. The deck credit's `announce()` is gone from the felt
  boot: the credit registers as a persistent SR state entry
  ("deck credit" in the panel) and never touches the announcer or captions.
- The record discipline this earns: when a batch skips a planned fix, the
  dev log says so in the same entry — not after the eyeball catches it.
- Gate: typecheck + 118/118 tests + audit + `a11y-lint: kit law holds` +
  build clean (unchanged surfaces, no new tests — the DOM styling remains
  eyeball-law).





## Entry #14 — 2026-10-22 · the fifths grid — four nits, one coherent revision

- The eyeball caught the deck stack spilling its cell: the footprint now
  **yields to the stripe run** (fit-the-cell law, `fitFootprint`) — the
  whole graphic lives inside the shoe cell; the shift-clamp survives only
  as the physically-impossible fallback (shift, never shrink).
- **The five buttons became cards** — card-sized, card-shaped, driven from
  the solver's card metrics; placeholder white/black, the human's vector
  art later. Shape held under the five-across cap.
- **The grid became fifths:** tray 1/5, four content bands of 1/5; the
  dealer and pit swapped (dealer 3/4 in band 2 beside the hud, the pit
  demoted to the back row); the back row is shoe 1/3 | pit 1/3 | **discard
  tray 1/3** (new zone — empty until settled cards need somewhere to go).
- Button ink/paper joined the contrast law's pairs. Gate: 138/138 + audit
  (31 modules) + kit law + build + purity.

## Entry #13 — 2026-10-22 · FELT pt4 batches 1–1.10 — the relational grid

- Batches 1 through 1.9 (six commits, not logged individually): the command
  bus + the five-button law table, the bar mounted and compressed, the
  deconfliction rounds — culminating in the ruled always-visible bar (D
  Deal/Double, H Hit/Take, S Stand/Pass, P Split, R Surrender/Forfeit).
- **The full solver redesign (batch 1.10, spec E11):** the human scrapped the
  two-layout solver for ONE banded grid at every aspect (21:9–9:21) — dealer
  top, player bottom, always; every zone a viewport fraction; no pixel
  constants, no minimums; cards resize when splits subdivide slots. The
  pen bar, the edge lower-third, contextButton, and the pit insurance spot
  are dead; `pit` and per-slot `insuranceSpots` replace them.
- **The cut card is the pen bar now:** a red rounded card rides the pen mark
  inside the count-true stack — the sprite containing the pen card's
  position goes red (26th card → 7th sprite at 4-grouping), shifting one
  sprite per 4 cards of pen change, re-derived on every update. Exposure =
  last hand (the slide-out lands with the animation kit in batch 2).
- Buttons: always visible, fixed positions; labels and keys rebind by
  context; unbound = disabled at the base label. Button CSS is fully
  relative, driven by the controls cell height.
- The deck credit sprouts from the context panel's outer top corner (up and
  away), auto-sized, once per session, SR-panel-only.
- Gate: typecheck + 134/134 tests + audit (31 modules) + kit law holds +
  build clean + purity. New law suites: the banded-grid ratio sweep (12
  sizes from 21:9 to 9:21, × flip × hands), the cut-card pen-mark laws, the
  always-visible button table.

## Entry #8 — 2026-10-22 · two menu rulings while the pt2 eyeball runs

- **Starting true count** joins the E8 accessibility menu: speeds the game
  up by removing low cards from the shoe, or slows it down by removing high
  ones. Range −20 (all tens/aces out) through +20 (all 2s–6s out); removed
  cards are random; the removal math uses each count system's tags (Monkey
  aces count as 2) — **needs verification** against intent.
- **Corey's Table** ruled as spec erratum **E9**: the free-play/practice
  mode — promo chips on/off, per-shoe summary stats, shoe size, alternate
  rules, count visualizer toggle. Its chips are photographs of the human's
  actual custom poker chips — the photographic layer, made personal.
- The FELT gate's presentation erratum becomes E10 (E9 now taken). Corey's
  Table's roadmap placement is an open ✎ (candidates: alongside the POC
  gate, or its own gate).






- Evidence filed: `docs/evidence/battery_b3.txt` — the BACKOFF chip-tuning
  battery + per-chip ablation (Godot 4.3 export). Design input for promo
  balance: Airbag dominates EV (+43.9pp LOO); Tourist/Baker's Dozen/Bolt
  Cutter currently negative-LOO on blackjack CSM.

---

## Entry #15 — batch 1.12: the deck's double band, the margin, the rail (2026-10-23)

- **The grid, v3 (spec E13):** bands 4/5 swapped — the chip tray sits beside
  the player band, the controls row at the bottom. Band 1 is deck/shoe 1/4 |
  pit 5/12 | discard 1/3; band 2 gains **deck extra** (1/4, the deck stack's
  vertical bleed room, directly under the shoe cell) with dealer 1/2 |
  count hud 1/4.
- **The margin law:** safe = viewport − insets − 5% per window edge (90% in
  use, law-tested with inset composition). Nothing draws on the border.
- **The stack laws, v3:** the deck hangs top-anchored at full card size and
  bleeds down into deck extra; the shoe runs right into the pit; drawn once
  and **stuck in place**, dealt sprites hiding from the dealt end (hidden =
  floor(dealt/group)); the cut card rides the pen mark from the planted end
  and is exposed exactly when the dealable empties (tested at the 307/311/312
  boundaries). The footprint is card-size first, yields only on true
  overflow; the shift-clamp is the last resort. `placeStripes` simplified to
  one +direction law; `stackPlan` plans the full shoe; `hiddenSprites` and
  `dealtFrom` join the tested vocabulary.
- **The dealer bleed:** grow in-cell → bleed into the count-hud cell →
  squash as the last resort; `dealerFits` now measures cell-plus-hud.
- **The buttons-are-cards law, enforced:** `buttonMetrics` (pure, tested) —
  buttons are exactly the game-card box when five fit the controls cell,
  capped with the 5:7 shape held when they don't; explicit CSS vars replace
  derived CSS. Root cause of the "small buttons" report: the proof A♠ was
  drawn in an oversized hand-made box — every real card looked small against
  it. The proof now uses true card metrics.
- **The wood rail:** procedural dark-walnut frame in the margin ring (new
  kit `graphics` creator — the sanctioned escape hatch; one SR registry
  entry, decorative). Grain derives from a child stream of the session seed
  (`?seed=`) — same seed, same table, the shuffle stream untouched.
  `sessionSeed`/`deriveStream` land in `src/ui/session.ts` for batch 2.
- Gate: **142/142 tests**, audit 33 modules, kit law holds (12 files),
  build clean, purity clean.

---

## Entry #16 — batch 1.13: growth-ring wood, bigger cards, band-filling buttons (2026-10-23)

- **The wood rail, rewritten as growth rings** (the rail-tiling hairline
  version was illegible and bled onto the felt): 2-4 squished knots seeded
  in the visible rail; warped ring grains grow from each — coherent per-knot
  warp phase, geometric spacing — packed by circle-envelope collision
  (drawn only when they touch nothing) until every knot is blocked or
  envelops the window. **The felt insets on top** as a real kit rect: grain
  over felt is structurally impossible now. Same seed, same table.
- **Bug (mine):** the pt3-proof A♠ carried `y: 0` out of the TS2783 spread
  fix and rendered on the wood border instead of the dealer band. Fixed via
  a position-free `cardSize` template.
- **Cards grow:** SLOT_CARD_H 0.64 → 0.72 (spots 0.15/0.03 → 0.12/0.02),
  DEALER_CARD_H 0.85 → 0.95, STACK_DY 0.08 → 0.07 — the card box goes
  59.2×82.9 → 66.65×93.31 at 720p, past its pre-margin size.
- **Buttons fill the band:** `buttonMetrics` v2 — card-shaped 5:7, height
  96% of the controls cell (88.9×124.4 at 720p, 17px font), width-capped
  only when five cannot fit. E13's button + wood bullets amended in place
  (E13 unpushed at amendment time).
- New `tests/session.test.ts` — seed parsing (int / hashed string / default
  1) and child-stream determinism (deterministic per (seed, salt),
  salt-separated).
- Gate: **145/145 tests** (12 files), audit 33 modules, kit law holds,
  build clean, purity clean.

---

## Entry #17 — batch 1.14: merged grains, one card size law, the deck stands up (2026-10-23)

- **Grain law v2:** rings halved (base gap 8–12px) and strokes tripled
  (4.8–8.4px); the gap floor carries the stroke's clearance. **The merge
  pass:** when two grain families collide, the survivor absorbs the loser —
  embrace ring at the reach-weighted midpoint enclosing both envelopes,
  loser's envelopes re-tagged — and keeps growing; families chain-merge
  until one envelops the window, so the far side of the frame fills by
  default (the starvation is dead).
- **One size law on the felt:** the card box adopts the button calc —
  **96% of band height**, width from the 5:7 aspect, capped only by the
  slot constraint (`slot.w / 1.2` per hands). `SLOT_CARD_H` and
  `DEALER_CARD_H` retired; `CARD_FILL = 0.96` rules. Card box at 720p:
  88.87×124.42 — buttons and cards identical by construction.
- **Flagged for batch 2:** with 96%-fill cards, a 5-card stacked hand's
  peak (cardH + 4×0.07 rise ≈ 124% of band) exceeds the player band — the
  hand renderer will need a pitch/height ruling when stacks render.
- **The deck stands up:** the 1.12 ceiling-hang read upside-down (a deck
  hovering with air beneath it). The stack now **plants on the floor of
  deck extra** — footprint bottom-planted, run growing upward, next card on
  top, cut card and tail on the floor; dealt sprites still vanish from the
  top, so the visible top edge descends while the bottom stays planted —
  exactly a deck being dealt down on a table. The "first card aligned at
  the top margin" phrasing is superseded (the eyeball outranks the plan).
  The shoe row was never broken (left-planted, eroding right).
- Gate: **145/145 tests** (12 files), audit 33 modules, kit law holds,
  build clean, purity clean.

---

## Entry #18 — batch 1.15: the depth law, the anchored credit, the oversampled wood (2026-10-23)

- **Root cause found for the two rounds of "upside-down" deck:** the z-order
  was inverted for the vertical form — sprites drew with depth increasing
  downward, so the deepest tail card painted fully while the next-to-deal
  card showed as a one-pixel sliver: the cards below literally appeared on
  top of the cards above. The depth law now inverts for the `"down"` axis
  (first card renders on top; the row keeps its fan law).
- **The deck re-anchored (third ruling, superseding twice):** the first
  card **centers in the shoe cell**, the run descending into deck extra.
  `fitFootprint` gains the cell center, yields the back when the run cannot
  fit below it, and pins the tail to the extent floor in the clamped case.
  The floor-plant and ceiling-hang are both superseded; the ORDER law never
  changed — only the paint order and the anchor were wrong.
- **The lower third anchors at the panel's bottom-outer corner** (was the
  top-outer corner), sprouting up across the controls band; mirrored under
  the axis flip. Spec E11's credit bullet amended.
- **The wood oversamples:** 6-12 knots seeded window-wide (was 2-4,
  rail-only — the far side starved); the packing trims, and the felt trims
  the middle. The margin drops to **2.5% per edge** (95% felt).
- Gate: **146/146 tests** (12 files), audit 33 modules, kit law holds,
  build clean, purity clean.

## Entry #19 — batch 1.16: the experiment grid, the one-size law, the Book (2026-10-23)

The human re-sketched the layout as an **experiment** (E14, marked pending
eyeball) and ruled the **one-size law**: the buttons and the cards share
exactly the same calculated value, derived from the control panel — the
limiting factor — as a 5:7 fit inside one button's six-share allocation
(height fit = 96% of the band; width fit = width/(6 + 5×0.06) with
self-consistent 6% gaps). My earlier caveat that six card-sized buttons
"can't fit" at portrait was void: I had pegged buttons to a card law and
used a low-res fiction; the allocation law fills whatever space exists.

- **The quartered grid:** discard ¼ | pit ½ | shoe ¼ over count hud ¼ |
  dealer ½ | deck extra ¼; player ¾ beside the chip column ¼ at **double
  height (2/5)**; the full-width control panel last. The context panel is
  merged away; the credit anchors to the **player zone's bottom-left**;
  captions center on the **band 3/4 border** (horiz + vert).
- **The shoe row reflects** (plants at the window-side edge, grows toward
  the pit, erodes from the far end); chip stacks gain the upward bleed into
  deck extra (pt5); the dealer's overflow retargets the count hud cell.
- **The Book**: sixth button, key **B**, alone on the left, `book` on the
  bus, announcing its pt6 placeholder. `buttonMetrics` is **deleted** — the
  buttons read the solver's card box directly (`buttonGap` joins metrics).
- **Bankroll** lands at the chip column's floor, **table min/max** at the
  pit's floor (backing plate noted for shoe tables) — static until batch 2.
- **Wood v3:** the **inverse-knot pass** (occupancy grid → largest blank
  square → seeded knot → rings to collision, ≤16 fills), the **seeded noise
  tile** (256² film grain, under the felt), and the **cut-in shadow**
  (8-step layered falloff inside the felt edge).
- Test-caught on the way: my countHud mirror assertion was inverted, my
  "never move" test forgot the player band is now an end cell (it mirrors
  sideways; dealer + vertical law hold), and a golden miscounted 2.5% of
  1600 as 36.
- Gate: **150/150 tests** (12 files), audit 33 modules, kit law holds
  (12 files), build clean, purity clean.

## Entry #20 — batch 1.17: wood v4, the flow-field density (2026-10-23)

The stroke-based wood still read as plastic. The diagnosis: **flat color
between features**, stroked hard edges, machine-even spacing, isotropic
noise, and no light response. The rewrite (ruled from the material menu:
A+D+C with B folded in) renders the wood **per-pixel as a density field**:

- **The model:** `ψ(p) = flow(p) + Σ Sᵢ·ln(|p − cᵢ|)` — a stream function.
  Straight grain along the window's long axis; each knot is a log swirl
  (potential flow), so grain bends around knots and **converges near the
  center for free**. Level sets of ψ are the grain lines. No families, no
  merge logic, no seams — one global field.
- **The ramp:** thin dark latewood (~18% of the cycle, sharp year edge),
  gradual earlywood spring-back; **fiber noise** stretched 8:1 along flow;
  **ring-width years** (spacing modulated ±15%); **figure bands**; knot
  cores red-shifted near-black; **baked light** — vignette toward the
  window edges and a top-left biased rim highlight along the felt.
- **Placement** survives as seeded knots + the inverse-knot pass, now
  **law-tested** (`tests/wood.test.ts`): deterministic per seed, ≥6 seeded,
  seeded rejection distances hold, and after the pass **no blank 2-cell
  square remains** (the wall-to-wall guarantee, via exported
  `largestBlankCells`). First coverage metric (0.83) failed honestly and
  drove the pass to fill until nothing ≥2 cells remains; the rejection law
  was re-scoped to seeded knots only (inverse knots legitimately sit in
  gaps).
- **The overlay is off:** `DEBUG.layout = false` — zones, probes, and the
  readout stand down; **the felt renders as its single shade of green**.
  The overlay code stays behind the flag for future solver work.
- `kit.tiledNoise` retired for `canvasImage` (procedural textures mount
  through the kit, lint-clean); rendered at ½ resolution and upscaled —
  soft, never aliased, ~tens of ms per resize.
- Gate: **155/155 tests** (13 files), audit, kit law holds, build clean,
  purity clean.

## Entry #21 — batch 1.18: five nits, two real bugs (2026-10-23)

- **The shoe shrank at ~3× the card's rate:** the row's fit math built the
  lying back in the *upright* frame and sized its yield from
  `extent.w − run` directly (slope ~0.475/px vs the card's ~0.15). The
  lying-frame law replaces it: **the row's back is the card box rotated —
  card-sized 1:1 at every window, never yielding**; overflow shifts, never
  shrinks. The old math also mis-reserved the horizontal half-extent by
  `(cardH − cardW)/2` per side — fixed by the same frame. The deck's yield
  (ruled, eyeballed) is untouched.
- **The cut card sat at 25% instead of 75%:** the 1.16 reflection wrote the
  "left" row's cut index as `total − cut` (the deck's formula) — but
  horizontal rows index sprites *from the plant*, so the cut is `cut − 1`
  for both. The same mirroring inverted the leftward **erosion direction**
  (it was hiding the tail side). Both directions are now uniform across
  horizontal axes, extracted as pure `cutSpriteIdx`/`dealtOrder` and
  law-tested (the pen-0.75 mark reads 75% down the length).
- **Margin 1%** per edge — and the consolidation it forced: `config.MARGIN`
  (0.05, feeding the cut-in width) had drifted from the solver's
  `MARGIN_FRAC` (0.025) — two homes for one law, already wrong. The solver's
  constant is now *the* margin home, exported and imported by the scene.
- **The credit floats** — the black box is gone, replaced by a thick
  per-letter black outline (`-webkit-text-stroke` + `paint-order: stroke
  fill`, layered text-shadow fallback). **Captions sit on the top DOM
  layer** (z 90 vs the credit's 45).
- **Table rules** ("S17 · Blackjacks Pay 3:2") center on **deck extra's
  floor** via a solver `rulesPoint` — config-driven until batch 2 derives
  the strings from the live ruleset.
- Gate: **158/158 tests** (13 files), audit 33 modules, kit law holds,
  build clean, purity clean.
- **Addendum (same session, caught on eyeball):** the lying-frame box was
  being **double-transformed** — `backSprite` scales the art upright into
  whatever box it gets, then the 90° rotation laid it down again, so the
  row's backs rendered at ~⅔ card size and the cut rect (dimensions
  swapped for the old frame) stood upright among lying backs. The
  correction: **the fit/reservation math owns the lying frame; the sprite
  scales from the upright card box and the rotation lays it down; the cut
  rect draws the footprint as-is.** The rules readout also gained the
  ruled stacking (two centered lines) and a safe-edge clamp that pulls it
  toward screen center when the letters would bleed.

## Entry #22 — batch 2a: the first playable hand (2026-10-23)

The felt comes alive. Three new modules and one core seam amendment:

- **`src/ui/anim.ts`** — the skippable animation engine, ruled from the
  jump: a time-driven `AnimRunner` (injectable clock, scene-update driven)
  where **any keypress or pointer input snaps every in-flight animation to
  its end state**. Builders compose: `place`, `flip` (the ruled
  squash-swap-lerp, texture swap exactly once at the halfway line), `flash`
  (tint pulse), `fade` — mixed and matched anywhere.
- **`src/ui/round/driver.ts`** — the state machine, **headless** (a renderer
  port + injected controls/announce; no Phaser, no DOM): owns the shoe
  (child stream of `?seed=` through `SHOE_SALT` — the wood/noise/shuffle
  triad), the bankroll, the fixed 1-unit bet, and a **paced event pump**:
  the core's resolver emits instantly, the pump applies with animation, and
  the control bar lights only when the queue lands (the prompt gate). The
  cut card slides at exhaustion — the **renderer owns that moment**.
- **`src/ui/round/render.ts`** — the Phaser adapter: hand groups under the
  stacking law, the dealer choreography (hole face-down, up card on top,
  slide right + flip at reveal, draws marching right), the count HUD fed by
  the engine (RC/TC — never recounted; exposure-driven so the hole never
  leaks), the live bankroll, the bet marker, the live count-true stack with
  per-deal erosion, the discard sweep at round end.
- **Core seam amendment:** the dealer's draw loop now **emits card events**
  (role `hit`) — the pt0 feed missed it, so dealer draws never animated.
  Presentation-only; no game logic touched. Dealer-hit phrasing added to
  the announcements map ("Dealer draws X.").
- The **debug overlay stands down** (zones, probes, readout) and
  `proveDeck` retires — the live cards are the proof now.
- Tests: the driver **headless against scripted shoes and strategies**
  (stood loss, 3:2 blackjack, insurance prompt, split — exact port-call
  sequences, bankroll arithmetic, mode gating, Deal inert while busy), the
  **seeded replay law** (driver's shoe ≡ sim's shoe, card-for-card), and
  the animation engine (progress, skip, the flip's single swap).
- Gate: **171/171 tests** (15 files), audit 36 modules, kit law holds,
  build clean, purity clean.
