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

- Evidence filed: `docs/evidence/battery_b3.txt` — the BACKOFF chip-tuning
  battery + per-chip ablation (Godot 4.3 export). Design input for promo
  balance: Airbag dominates EV (+43.9pp LOO); Tourist/Baker's Dozen/Bolt
  Cutter currently negative-LOO on blackjack CSM.
