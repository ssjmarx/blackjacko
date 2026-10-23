# docs/ROADMAP.md — blackjacko working roadmap

**Project:** blackjacko · **Author:** corey · **Reviewer:** corey (deferred)
**Status:** living document. Amend only at milestone boundaries. The spec
(`docs/spec-0.2.md`) is design law — this file sequences it, never overrides it.
**Dates:** none. Estimates are in sessions. If anyone asks when it ships: when the ladder says so.

## §1 How this document works

- Milestones are gates, not dates. Each retires one specific risk, phrased as a
  question. We do not start the next milestone until the current one passes its
  exit tests.
- Every milestone ends in a tagged, playable build — someone who is not corey
  must be able to open it and run the exit tests in under 15 minutes. The game
  is playable-at-every-tag. (When motivation dips, "the last playable" is never
  far behind us. This is the one piece of real discipline in the project.)
- Build ritual (end of every milestone): `git tag v0.x.y` → web build → run the
  gate list (§4), by hand → write the dev_log entry, honestly, even though
  nobody reads it. The patch-note habit is practiced deliberately.
- Stage 1–2 is behind us: the pure-logic core and the 20M-hand verification
  battery exist, all anchors PASS (`results/20m-verdicts.txt`). The ladder
  starts where the spec's remaining stages start.

## §2 Versioning policy

- 0.1.0–0.5.x — the POC climb: one property, one deck, the economy taking shape.
- 0.6.0 — THE POC gate: Tony's Backroom complete per spec S11. The first build
  a stranger plays start-to-finish.
- 0.7.0–0.12.x — the campaign climb: the ladder, heat, countermeasures, Sp21,
  the slot economy, the finale.
- 1.0.0 — the full 7-era campaign, balanced by the S14 battery, shipped.
- Version bumps only at gates. No mid-milestone numbers. The version is a
  promise about testability, not a timestamp. (The repo version field follows
  the ladder; it sits at 0.0.x until THE FELT passes.)

## §3 The ladder

| Version | Codename            | The question it retires                                         |
|---------|---------------------|------------------------------------------------------------------|
| 0.1.0   | THE FELT            | Can you play a hand of blackjack on screen?                      |
| 0.2.0   | THE RACK            | Do chips, stakes and payouts behave like a casino?               |
| 0.3.0   | THE PROMOS          | Do the chips change how you play — and is the stacking law law?  |
| 0.4.0   | THE SHOE            | Does a run survive a restart mid-shoe, mid-hand?                 |
| 0.5.0   | THE SIDE ACTION     | Do the side bets pay, tempt, and fish for promos?                |
| 0.6.0   | THE POC             | Is Tony's Backroom a game? (spec S11, complete)                  |
| 0.7.0   | THE LADDER          | Do eras, properties and bankrolls form a campaign?               |
| 0.8.0   | THE HEAT            | Does the Pit Boss make counting dangerous?                       |
| 0.9.0   | THE COUNTERMEASURES | Can heat punish without barring? (AC, cm1–3)                     |
| 0.10.0  | THE SPANISH TABLES  | Does the swing thesis play? (Sp21 alternates, era 5+)            |
| 0.11.0  | THE METER & WHEEL   | Do the progressives run the late-game economy?                   |
| 0.12.0  | THE MACHINE         | Does the finale fight back? (CSM, era 7)                         |
| 1.0.0   | THE SHIP            | Is the campaign done, balanced, and shippable?                   |

Dependency chain (nothing starts before its parents pass):

    FELT → RACK → PROMOS → SHOE → SIDE ACTION → POC → LADDER → HEAT → COUNTERMEASURES ─┬→ SPANISH ───────┐
                                                                                       └→ METER & WHEEL ──┴→ MACHINE → SHIP

(SHOE and SIDE ACTION may swap by ruling if save design stalls. The two
branches after COUNTERMEASURES are independent and may interleave — both are
era-5 content; MACHINE consumes both.)

## §4 Gates before any tag

1. `npm run check` exits 0 — typecheck (tsc is the only type court), vitest,
   docstring audit. Non-negotiable at every commit, not just gates.
2. Money math touched? The harness battery runs before the tag: the anchors
   always; the promo-EV / side-bet / meter batteries once those systems exist.
   A tuning number without a battery run behind it does not ship.
3. The hand-run list, at every gate, by hand, five minutes:
   - ☐ The count HUD is the engine's count — the UI never recounts (S3
     knowledge rule).
   - ☐ A seeded UI session replays card-for-card against the headless harness.
   - ☐ Every number on screen has exactly one home in `src/core` (no UI-side
     constants).
   - ☐ Settlement is instant; nothing lags the deal.
   - ☐ The fiction teaches: the overflow line, the reminders, the placards
     read like a casino, not like a tutorial.
   - ☐ One era back: every earlier gate's exit tests still pass.

A failed box blocks the tag. No exceptions, including for corey.

## §5 The milestones

### v0.1.0 — THE FELT
**Question:** Can you play a hand of blackjack on screen?
**Scope:** Phaser scaffold (Vite + strict TS + exact pins; Phaser version
pinned here ✎). One static property — Tony's Backroom (1D, 100% pen, S17,
3:2, DAS, no PB). The full resolver on the felt: bet circle, deal, hit /
stand / double / split / surrender, insurance, peek, settlement, splits to
resplitMax. Count HUD: RC, floored TC, penetration bar with cut-card marker
(S3 display). Static strategy-card overlay for the active ruleset. `?seed=`
URL param drives the shoe deterministically. Bankroll is a bare number —
THE RACK is next.
**Exit tests:** ☐ 50 hands by hand, zero desyncs, no dead buttons ☐ a
fixed-seed UI session matches a headless replay card-for-card ☐ HUD RC/TC
equals the engine's at every step ☐ strict TS holds; `grep -rni phaser
src/core/` returns nothing ☐ deploy target ruled ✎ and this build is
reachable at it.

### v0.2.0 — THE RACK
**Question:** Do chips, stakes and payouts behave like a casino?
**Scope:** the chip rack: plain chips by denomination, unlimited; staking to
the main circle pre-deal and the insurance line on an ace up; payouts in new
house chips, largest-denomination-first (D); win/push returns staked chips,
loss takes them; color up / color down at the cage between hands (plain swaps
free); rebet + quick-stake; table min/max; the fail check (holdings below the
cheapest available table min). No promo rolls yet — payouts land plain.
**Exit tests:** ☐ a 100-hand UI session's ledger matches a seeded headless
replay to the cent ☐ color-up math is net-zero, always ☐ payouts land
largest-denomination-first ☐ you can go broke and the fail check fires with
its diegetic line ☐ table limits bind at stake time, min and max.

### v0.3.0 — THE PROMOS
**Question:** Do the chips change how you play — and is the stacking law law?
**Scope:** PromoEngine per S5/S12: hook dispatch (pre-deal, deal, action,
settlement, rule, info, shoe, heat), click-order resolution, additive deltas
over base, field-vs-line scope. The ruled 12-chip roster (spec erratum E6,
ruled 2026-10-22). Rack: 6 promo slots; staking a promo triggers
it immediately; payouts roll promo odds (1/20); pity at 30, persisted,
resetting on award; overflow auto-declines at 6/6 with the dealer's line; the
two dealer reminders; promo color-up (sacrificed at face value, slot freed).
Rarity assignment is this milestone's battery output: every chip that
changes optimal play gets a bespoke chip-aware strategy before its measured
EV is trusted; S4's ~70/25/5 weights govern drop rates only. Results recorded
in the dev log.
**Exit tests:** ☐ vitest stacking-law table: two Insurance Scam II = 6:1 ·
Scam I + III = 6:1 · two Airbags on one line both eaten · PP-then-PP no-ops ·
click order breaks ties (S5's worked consequences as tests) ☐ Hot Hand
removals update the count (knowledge rule) ☐ pity fires on the 30th chip and
resets on award ☐ overflow auto-declines with the dealer line at 6/6 ☐
harness battery: marginal promo EV per chip, isolated and stacked, at 20M
hands — jackpots allowed, equilibriums not ☐ the B3 ablation re-run through
the TS core; Airbag is still the load-bearing chip.

**Ruled 2026-10-22:** the POC roster is the 12-chip table in spec erratum E6 —
four effect changes vs old S6 (Ghost, Push Power, Deep Pen ramp, Peek), two
new chips (Psychic, Tourist), the S6 and B3 dead weight retired. The chip
laws ride along: chips only work while staked; chips bind to their line
through splits; rarities are assigned by this milestone's battery, not by
decree (heat chips wait for the heat model).

### v0.4.0 — THE SHOE
**Question:** Does a run survive a restart mid-shoe, mid-hand?
**Scope:** S12 MODULE Save as JSON: level, property, rack (plain + 6 promos),
shoe queue + discards + rng state, count rc/seen, pity, per-property state.
Save between stakes; auto-save at hand end. Storage ruled at this gate ✎
(localStorage vs downloadable file). The save file doubles as the dev cheat
console — hand-editable on purpose.
**Exit tests:** ☐ save mid-hand → load → the next 100 dealt cards match a
no-restart seeded run exactly ☐ barred / countermeasure / heat / pity state
survives the round-trip ☐ a corrupt or truncated save refuses gracefully ☐
the save is valid hand-editable JSON.

### v0.5.0 — THE SIDE ACTION
**Question:** Do the side bets pay, tempt, and fish for promos?
**Scope:** the side-bet framework (S7): paytable data model, `resolve_on`,
per-property rosters, promo-odds boosts on wins. The POC trio: **Queen Bee**
and **Break the Bank** (the ubiquitous pair) and **Lucky Thirteen** (the
countable one). Heat camouflage (−10 while watched) arrives with THE HEAT —
noted, not built here.
**Exit tests:** ☐ each paytable's EV matches closed-form math via the harness
(20M hands) ☐ a side-bet win's promo roll genuinely beats the 1/20 main roll —
the temptation is real, measured, not asserted ☐ Lucky Thirteen's countability
is measured: player EV swings with TC in the harness ☐ side-bet stakes bind
to the felt cleanly (stake, resolve, settle on one screen).

### v0.6.0 — THE POC
**Question:** Is Tony's Backroom a game? (spec S11, complete)
**Scope:** the polish pass to the "Microsoft Solitaire" ceiling: CC0 card
set, green felt, white bet circles, The Riviera Room placeholder logo (SVG),
text tooltips, tier-ringed chips; the dealer's tutorial beats; a session-
stats screen. No PB, no properties screen, no wheel, no Sp21 — that's the
ceiling, honored on purpose. **Prerequisite:** the assets + licensing plan
exists (✎ due before this gate) — CC0 set chosen, `licenses/` seeded with
source-tagged filenames, attribution recorded (knkn convention).
**Exit tests:** ☐ the S11 scope list checked off item by item, in the open ☐
a non-developer plays start → 2× or bust, unaided ☐ no programmer art in the
shipped slice — the ceiling is met, not apologied for ☐ every third-party
asset claimed in `licenses/` ☐ the full hand-run list (§4) passes in one
sitting.

### v0.7.0 — THE LADDER
**Question:** Do eras, properties and bankrolls form a campaign?
**Scope:** level/property select; era 1–3 property rosters per S9 (Tony's
Backroom; Silver Dollar, Elks Lodge, Pappy's; Sandpiper, Palmetto, Oasis);
buy-in = starting bankroll, seeding 2 promos; the win check (holdings ≥ 2×
at settlement); the fail check; linear unlock; walking between properties
between hands (leaving abandons the shoe — the cost goes live here); per-
attempt persistence. The era-2+ Pit Boss renders and walks (diegetic states)
but heat has no teeth yet — THE HEAT is next; the UI slot exists.
**Exit tests:** ☐ eras 1–3 playable start → 2× or fail, unlock chain linear
☐ bankroll/target table matches S9 (sim-tuned values recorded in the dev
log) ☐ walking abandons the shoe mid-deal and the cost is felt ☐ an
attempt's state (barred, bankroll, rack) survives a restart ☐ you can lose
an attempt and the game says so honestly.

### v0.8.0 — THE HEAT
**Question:** Does the Pit Boss make counting dangerous?
**Scope:** the S8 accrual table goes live — only while watched: split 10s
+25 · insurance +15 (+25 won) · bet jump >2× +10 · big bet at TC ≥ +2 +20 ·
sitting out at TC ≤ −1 +15 · side bet −10 · visible blunder −5 · tip −5 ·
decay −1/hand unwatched. Backoff flow: heat >100 → finish the hand →
diegetic sequence → barred from the property → property-select; placards
persist for the attempt. BAR-as-lives: barred everywhere in eras 2–3 =
attempt failed. The heat chips enable where their eras call for them
(Camouflage, Boring Bob, Team Player).
**Exit tests:** ☐ heat accrues only while watched — provable with a seeded
session (watched vs unwatched runs diverge exactly as the table says) ☐ the
PB's states are legible without a numeric meter (relaxed → watching →
suspicious → phone call) ☐ a backoff fires at >100 and the flow completes ☐
Boring Bob's table-min lock is distinct from the mandate's flat-lock (E2,
next gate) ☐ camouflage math checked in the harness.

### v0.9.0 — THE COUNTERMEASURES
**Question:** Can heat punish without barring? (AC, cm1–3)
**Scope:** era 4 (Garden Pier, The Inlet, Steel Pier — all 8D S17 3:2 LS,
all COUNTERMEASURE). Escalation at heat >100, permanent for the attempt:
cm1 half-shoe (pen × 0.5) → cm2 flat-bet mandate → cm3 both + doubled
patrol. Flat-lock per Errata E2: locked to the shoe's opening wager,
re-armed each shoe — the opening bet becomes a per-shoe commitment. The
safe-harbor pattern begins: every era-4+ level includes one AC-annex.
**Exit tests:** ☐ cm1/2/3 escalate in order and never bar ☐ flat-lock binds
to the opening wager, re-arms each shoe, and the stricter of Bob/mandate
wins ☐ the half-shoe penalty measurably kills the count edge (harness: EV
at cm1 vs fresh) ☐ an era-4 level is winnable at cm2+ — soft-fail, not
hard-fail ☐ the annex funnel: burn the barable properties and the game
routes to the annex.

### v0.10.0 — THE SPANISH TABLES
**Question:** Does the swing thesis play? (Sp21 alternates, era 5+)
**Scope:** Sp21 alternate levels unlock alongside era 5, clearing via either
lane (E3, both tracked): El Cortijo (6D H17), Marquesa (8D S17 + redouble —
the best game in the game). Monkey count in the HUD; the Sp21 promo pool
variants (6-card Charlie, PP's 10-value = J/Q/K, 48-card Hot Hand draws);
Match the Dealer natively; the count-in-hand strategy card ships as-is. The
E4 offer stands open: derive Sp21 indices empirically via the exact engine
(`scripts/sp21-probe.ts` lineage) — optional, by ruling.
**Exit tests:** ☐ either lane's clear unlocks the next era; both = tracked
completion ☐ the Monkey count display matches the locked tags on-screen ☐
Sp21 promo variants fire correctly in vitest ☐ harness: Sp21 lane EV vs
standard at equal skill (S14 #6) — the swing thesis measured, recorded ☐ the
Marquesa redouble states play per the WoO-derived strategy.

### v0.11.0 — THE METER & WHEEL
**Question:** Do the progressives run the late-game economy?
**Scope:** eras 5–7 slot economy: The Meter (level-shared; marquee suited
777 v 7 starts $10k and grows $0.20 per $1 bet; Grand = the meter, resets on
hit; Major 500; Mini 25) and the Prize Wheel (trigger: player 21 or BJ →
0.5×–50× the side stake; the wheel scene). The availability arc: countable
bets fade by era 5, gone by 6; slot-attached bets dominate 6–7. Full
side-bet rosters per era (Crown Match, Triple Seven, Triple Threat).
**Exit tests:** ☐ meter growth math matches S7 exactly, shared across the
level, persisted in the save ☐ wheel multipliers land in [0.5, 50] and the
trigger never misfires ☐ the era arc is enforced: Lucky Thirteen vanishes by
era 6, slots own 6–7 ☐ harness: side-bet fishing EV per era incl. promo
share (S14 #4) ☐ worse-EV bets are demonstrably more tempting (promo-odds
tier scaling, tuned, recorded).

### v0.12.0 — THE MACHINE
**Question:** Does the finale fight back? (CSM, era 7)
**Scope:** Emporium and Terminus (6D CSM, H17, 3:2) — recycle un-sees
discards (the core has it; the UI must show information rot) — plus Last
Nickel, the gulag: CSM *and* countermeasure policy. The Cold Deck curse
(house-circulated poison, eras 6–7). The finale's economy runs on Queen Bee
/ Break the Bank / The Meter / Prize Wheel — the fishing holes.
**Exit tests:** ☐ CSM recycle visibly rots the count (TC decays as discards
return — verified against the engine) ☐ the Machine is near-zero edge
promo-less and positive with a tuned build (S14 #7) ☐ Last Nickel is
winnable but honest about it ☐ Cold Deck fires only where the era allows
and updates the count (quantified removal) ☐ era 7 clears start-to-finish
in a seeded run.

### v1.0.0 — THE SHIP
**Question:** Is the campaign done, balanced, and shippable?
**Scope:** the full 7-era ladder, all eras 1–7, standard + Sp21 lanes; the
complete S14 balance battery green across every property; exports built;
CREDITS complete (every asset claimed); the spec's ✎ and (D) items resolved
or consciously kept.
**Exit tests:** ☐ a fresh player can finish the campaign without developer
help ☐ every milestone's exit tests re-pass in one sitting ☐ the balance
battery is green and its numbers are in the dev log ☐ CREDITS complete —
nothing unattributed ships ☐ tagged, exported, playable. Done means done.

## §6 Risks & open decisions

**Open decisions (✎) — ruled by the human, recorded in the dev log:**

- **Chip roster** — RESOLVED 2026-10-22, recorded as spec erratum E6.
  Rarities are the 0.3.0 battery's output; Camouflage/Tourist wait for the
  heat model in the harness.
- **Phaser version pin** — due at 0.1.0 (knkn precedent: Phaser 4, TS-native).
- **Deploy target & domain** — due at 0.1.0 (personal infra, knkn shape).
- **Save storage** — due at 0.4.0 (localStorage vs downloadable file).
- **Assets + licensing plan** — due before 0.6.0 (already ruled deferred
  until this plan exists; CC0 card set is the S11 assumption).
- **Sp21 index derivation** (E4) — optional, after 0.10.0, by ruling.

**The danger list (the project's tripwires):**

1. **UI–core desync** — the project killer. Every gate's seeded-replay exit
   test exists to catch it the day it appears, not the day it ships.
2. **Promo balance runaway** — additive stacking makes 6:1 insurance easy;
   equilibriums are the bug. The marginal-EV battery is the tripwire.
3. **Polish-creep** — "Microsoft Solitaire" is the ceiling, written down. A
   pretty thing that isn't the POC is not the POC.
4. **The transcription slog** — Sp21 indices stay deferred (E4) until the
   exact-engine derivation is explicitly ruled in.
5. **Counting-UX drift** — the HUD is a window onto the engine, never a
   second counter. One home per number, or the game lies.



