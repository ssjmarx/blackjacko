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
- Evidence filed: `docs/evidence/battery_b3.txt` — the BACKOFF chip-tuning
  battery + per-chip ablation (Godot 4.3 export). Design input for promo
  balance: Airbag dominates EV (+43.9pp LOO); Tourist/Baker's Dozen/Bolt
  Cutter currently negative-LOO on blackjack CSM.
