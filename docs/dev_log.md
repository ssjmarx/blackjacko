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
