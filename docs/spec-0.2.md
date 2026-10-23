# BLACKJACK BALATRO — Design Spec v0.2

## Changelog v0.1 → v0.2

- **Properties system (NEW):** each level contains multiple casinos; backoffs are lives; AC-style no-bar properties with escalating countermeasures are the safe harbor / soft-fail state
- **Stacking law (NEW):** duplicates stack, effects add (never multiply), resolution follows click order
- **Insurance Scam** is a field effect — resolves from any line placement
- **Overflow:** full rack = auto-decline new promos + diegetic dealer reminders
- **Side bet catalog (NEW):** fictional non-trademarked bets, countable-early → degenerate-late arc
- **Spanish 21:** full verified ruleset (cited), Monkey count tags locked, era-5 alternate levels
- **Illustrious 18 + Fab 4** sourced and encoded (v0.1 said 21 — corrected)
- **Pseudocode** added for all core modules

## S1. Locked decisions (cumulative)

| Area | Decision |
|---|---|
| Promo lifecycle | At-risk: return on win/push, taken on loss; **6 promo slots**, unlimited plain stack |
| Staking | No promo-count limit; wager bounded by table min/max only |
| Stacking law | Duplicates stack; **additive deltas over base**; click-order resolution; state effects may no-op |
| Effect scope | Promos are **field effects** (global) unless inherently line-bound (Airbag, Mulligan) |
| Level goal | Double starting bankroll; save/resume anytime; level-select, linear unlock, no roguelike |
| Promo source | 1/20 payout chips; buy-in seeds promos; side bets boosted; **30-chip pity, any promo chip** |
| Overflow | **Auto-decline when 6/6** + dealer reminders to stake/color |
| Count UX | RC + TC displayed; Monkey count at Sp21: **2–6 = +1, 10-val = +1, A = −2** |
| CSM | Discards recycle every 2–3 hands; count decays accordingly |
| Heat | PB walks the floor; accrues **only while watched**; >100 → backoff |
| Backoff | Barred from the *property*, not the level; properties = lives; AC-style properties never bar (half-shoe → flat-bet) |
| Side bets | Fictional names; countable early, degenerate late; Queen Bee + Break the Bank ubiquitous |
| Sp21 | Full standard American rules; alternate levels unlocked at era 5; Monkey count |
| Indices | Illustrious 18 + Fab 4 (researched, cited); Sp21 indexes from your book |
| POC | "Microsoft Solitaire" polish ceiling |

## S2. Table rules & data model

```
LevelDef   { era, name, starting_bankroll, win_target = 2×, property_ids[], sp21_level_ids[] }
Property   { name, ruleset, table_min/max, side_bets[], pb_config, policy: BAR | COUNTERMEASURE }
Ruleset    { decks, spanish:Bool, pen, bj_payout, s17, double_on, das, rsa,
             resplit_max, surrender, peek, csm{enabled, recycle_hands} }
PromoDef   { id, tier, rarity, category, hook, scope: GLOBAL|LINE, delta/params, text }
SideBetDef { id, era_availability, paytable, promo_odds, resolve_on }
```

All rules data-driven. US hole-card (peek) throughout. No redoubling except where a property's hook offers it.

## S3. Counting system

- **Standard tables — Hi-Lo:** 2–6 +1, 7–9 0, 10-value −1. Display: RC, TC (**(D)** RC ÷ decks remaining, nearest half-deck), penetration bar with cut-card marker. No side counts shown.
- **Sp21 tables — Monkey count (L):** 2–6 **+1**, 7–9 0, 10-value (J/Q/K only) **+1**, Ace **−2** (dealt aces subtract 2, per your first note — see Q1 to confirm sign/direction). This count is *unbalanced* (per-deck sum +24), so the TC display normalizes drift: **(D)** `TC = (RC − 24 × decks_dealt) ÷ decks_remaining`, with a raw-RC fallback toggle.
- **Knowledge rule (L, generalized):** HUD count updates for anything seen *or quantified* — dealt cards, exposed hole cards, Mulligan discards, revealed burns, Hot Hand/Cold Deck removals.
- **CSM decay:** when the machine recycles discards, those cards return to unknown — their tags are subtracted from RC at recycle time. Information rots; that's what kills the count at The Machine, mechanically.

## S4. Chip economy

- Rack = plain chips (unlimited, by denomination) + **6 promo slots**. Promo = {denomination, ability, tier}; any denomination, same effect.
- Staking: any chips to any open line (main circle pre-deal; insurance line on dealer Ace; split/double lines mid-hand). Promos trigger immediately on staking **(L)**.
- Win/push returns staked chips; loss takes them **(L)**. Payouts pay in new house chips (largest-denomination-first **(D)**), each rolling promo odds.
- **Overflow (L):** promo rolls auto-decline while 6/6. The moment is called out diegetically — *"The dealer slides you plain chips: 'Rack's full, friend. Color up if you want the good ones.'"*
- **Dealer reminders (NEW, diegetic onboarding):** (a) on any overflow decline → color-up nudge; (b) 5 consecutive hands holding promos but staking none → *"You gonna play those or frame 'em?"*; (c) tutorial beats.
- Color up/down at the cage between hands: plain swaps free; a promo may be **colored up** — sacrificed at face value, slot freed. The sell-a-joker move.
- **Pity (L):** 30 consecutive received-without-promo chips → next chip is a guaranteed promo (any chip, rarity rolled normally). Counter saved with the game; resets on award; **(D)** resets on new attempt.
- Rarity: Common / Uncommon / Rare, weights **~70/25/5 — set by simulation (S14)**.

## S5. Stacking law (NEW)

1. Every staked promo triggers on its hook — no exceptions.
2. Within a hook, chips resolve in **stake (click) order**.
3. Numeric effects combine **additively**: `final = base + Σ delta_i`. Never multiply.
4. State effects apply sequentially; a later resolution may overwrite or no-op an earlier one (PP after PP sets a 10-value hole card to a 10-value hole card).
5. Scope is **GLOBAL** ("on the field") unless the ability is inherently line-bound.

Worked consequences: two Insurance Scam II on the field → insurance pays 2 + 2 + 2 = **6:1**. Scam I + Scam III → **6:1**. Hot Hand II + Hot Hand I → 8 lows removed from the next 20. Two Airbags on one line → both eaten on a loss (don't). Insurance Scam works from the main circle, a split line, or the insurance line — the *effect* is a field effect; the *placement* is a risk-allocation decision (main-bet placement is usually the bad play: the chip is at risk every hand while its ability only matters on ~8% of hands).

## S6. Promo catalog v0.2

| Chip | Tier | Cat | Hook | Scope | Effect (deltas vs base) |
|---|---|---|---|---|---|
| Hot Hand I / II / III | C/U/R | Shoe | pre-deal | G | Remove 3 / 5 / 8 lows from next 20; count updates |
| Airbag | C | Money | on-lose | **L** | Line loses only this chip (all staked Airbags) |
| Mulligan I / II | C/U | Action | action | **L** | Discard-and-rehit 1× / 2× per hand; discard is seen |
| Insurance Scam I / II / III | C/U/R | Money | settlement | G | Insurance odds +1 / +2 / +3 (stacks additively) |
| Perfect Prediction | U | Shoe | deal | G | Dealer hole card → random 10-value card |
| Five-Card Charlie | C | Rules | rule | G | 5 cards ≤ 21 auto-wins even money |
| Double Anything | C | Rules | rule | G | Double on 3+ cards, incl. after hitting |
| Surrender Anywhere | C | Rules | rule | G | Late surrender at tables lacking it |
| Burning Question | C | Info | info | G | See the burn card; count updates |
| Ten Density | U | Info | info | G | Live % of 10-value cards remaining |
| The Illustrious | U | Info | info | G | Highlights the index-correct play this hand |
| Martingale's Ghost | U | Money | settlement | G | After 3 straight losses, next main win +1:1 odds |
| Push Power | U | Money | settlement | G | First push each shoe → +1:1 |
| Deep Pen | R | Shoe | shoe | G | Cut card ignored rest of shoe |
| First Base Peek | R | Info | info | G | See dealer hole card when acting first |
| Camouflage | U | Heat | heat | G | Heat gains ×0.5 while staked |
| Boring Bob | R | Heat | heat | G | Zero heat accrual; wager locked to table min while staked |
| Team Player | R | Heat | heat | G | One raise per shoe is heat-free |
| Cold Deck | curse | Shoe | pre-deal | G | Remove 4 highs from next 20; house-circulated fat-denomination poison (eras 6–7) |

At Sp21 tables: Five-Card Charlie becomes **6-card Charlie** (5-card 21 already pays), Perfect Prediction's "10-value" = J/Q/K, Hot Hand/Cold Deck draw from the 48-card composition. `Ruleset.promo_pool` filters per variant.

## S7. Side bet catalog (NEW — all fictional names)

Design triangle per bet: house EV (bad) ↔ promo fishing (boosted odds) ↔ camouflage (−10 heat while watched). Ubiquitous pair: **Queen Bee** and **Break the Bank** at every property, every era.

| Name | Eras | Resolves on | Paytable sketch | HE (tune) | Promo odds |
|---|---|---|---|---|---|
| Queen Bee | 1–7 | Player first 2 cards | Q♥-Q♥ 200:1 · suited QQ 25:1 · any QQ 12:1 · any 20 4:1 · heart-20 9:1 | ~20% | 1/6 |
| Break the Bank | 1–7 | Dealer bust | Bust 3:2 · bust total ≥ 24: 3:1 · bust exactly 26: 10:1 | ~8% | 1/8 |
| Lucky Thirteen | 1–4 | Player first 2 cards | Over 13 or under 13, 1:1; exactly 13 pushes | ~6%, **countable** | 1/10 |
| Crown Match | 2–5 | Player first 2 cards | Suited K-Q 25:1 · any two suited 3:1 | ~8% | 1/8 |
| Triple Seven | 2–6 | First card(s) | First 7: 3:1 · two 7s 40:1 · suited 150:1 · 777 500:1 | ~10% | 1/8 |
| Triple Threat | 3–7 | Player 2 + dealer up | Flush 9:1 · trips 30:1 · straight flush 40:1 · suited trips 100:1 | ~5% | 1/8 |
| The Meter | 5–7 | Progressive | $1 flat: suited 777 vs 7 = marquee meter (starts $10k, grows per bet, shared across the level) · Q♥Q♥ $500 · suited pair $25 | 15–25% | **1/5** |
| The Prize Wheel | 5–7 | Trigger | Player 21 or BJ → spin wheel, 0.5×–50× the side stake | ~15% | 1/6 (POC2: wheel scene) |

Availability arc (L): countable bets (Lucky Thirteen) fade by era 5 and vanish by 6; slot-attached bets (The Meter, Prize Wheel) dominate eras 6–7. Era 7's economy runs on Queen Bee / Break the Bank / The Meter / Prize Wheel — the fishing holes of The Machine. Worse EV → better promo odds, so the siren bets are genuinely tempting **(D — tier scaling, tune in sim)**. Sp21 tables carry **Match the Dealer** natively (6-deck pays per WoO: 4:1/8:1... encode at build).

## S8. Properties, heat & backoff (NEW)

- Each level = a small roster of **properties**; each has its own ruleset, limits, side bets, PB behavior, and backoff policy. You walk between them between hands (leaving abandons the shoe — a real cost). Bankroll, promo slots, and pity travel with you; heat and barred status are per-property.
- **Backoff flow (L):** heat >100 → diegetic sequence (phone call → the look → walks over; you finish the hand) → barred from that property → property-select screen. Barred placards persist for the attempt (and in the save).
- **BAR properties = lives.** Eras 2–3: barred everywhere = attempt failed (restart from starting bankroll).
- **COUNTERMEASURE properties never bar** (Uston v. Resorts world — the design's history lesson): at heat >100 they escalate instead, permanently for the attempt: **cm1 = half-shoe** (pen × 0.5) → **cm2 = flat-bet mandate** (wager locked to table min) → **cm3 = both + doubled patrol**. Era 4 (Atlantic City) is *all* countermeasure properties — an endurance level where heat degrades your game instead of ending it.
- **The safe harbor (L):** from era 4 onward every level includes one AC-annex property (COUNTERMEASURE policy) — you can *always* continue the level. Burn every barable property and you're funneled into the annex at cm2+: the **soft fail state** — count edge nearly dead, promo-dependent, still beatable.
- PB is diegetic, no numeric meter: relaxed → watching → suspicious (lingers) → phone call. Heat accrual table (only while watched, per **(D)** values): split 10-values +25 · insurance taken +15 (+25 if won) · bet jump > 2× +10 · big bet (≥ half max) at TC ≥ +2 +20 · sitting out at TC ≤ −1 +15 · side bet played −10 · visible blunder −5 · dealer tip −5. Decay −1/hand unwatched.

## S9. Campaign & properties

All limits/bankrolls **(D)**, sim-tuned. Buy-in = starting bankroll, seeds 2 promos **(D)**.

| # | Era | Properties (ruleset deltas) | Bankroll → Target |
|---|---|---|---|
| 1 | The Backroom ('50s) | **Tony's Backroom** — 1D, 100% pen, S17, 3:2, DAS, no PB | $200 → $400 |
| 2 | Downtown ('60s) | **Silver Dollar** (1D 75% S17, mild PB) · **Elks Lodge** (1D 80%, double 10–11 only, no PB) · **Pappy's** (1D 85% H17, hot PB — best game, guarded) | $300 → $600 |
| 3 | Four-Deck Scare ('70s) | **Sandpiper** (4D 75% S17 LS) · **Palmetto** (4D 66% H17, lenient) · **Oasis** (4D 80% S17 LS, hot PB) | $500 → $1000 |
| 4 | The Boardwalk (AC '80s) | **Garden Pier** · **The Inlet** · **Steel Pier** — all 8D S17 3:2 LS, all COUNTERMEASURE (no bars, escalating heat pain) | $1000 → $2000 |
| 5 | Corporate Takeover ('90s) | **Meridian** (6D 66% H17) · **Casa Grande** (6D 75%, hot PB) · **Boardwalk Bus** (AC annex, S17 LS) · *Sp21 alternates: El Cortijo (6D H17), Marquesa (8D S17 + redouble — best game in the game)* | $1500 → $3000 |
| 6 | The 6:5 Trap ('00s) | **Gilded Lily** (1D 6:5, loose PB — the bait house) · **Casa Verde** (6D 6:5, Meter palace) · **Old Timer** (6D 66% 3:2 LS — the last good game, brutal PB) · **Boardwalk Express** (annex) | $2000 → $4000 |
| 7 | The Machine | **Emporium** (6D CSM, H17, 3:2, PB hovering) · **Terminus** (CSM, high limits, Meter/Wheel paradise) · **Last Nickel** (annex — CSM *and* countermeasure policy: the gulag of the finale) | $5000 → $10000 |

Sp21 alternate levels unlock alongside era 5 **(L)**, one per era 5–7, own property lists, marked complete independently **(D)**. Side-bet rosters per property follow S7's arc.

## S10. Spanish 21 (verified)

Per Wizard of Odds (wizardofodds.com/games/spanish-21), encoded exactly:

- 48-card Spanish decks (tens removed; J/Q/K are 10-value), 6 or 8 decks, dealer peeks.
- Late surrender; DAS; resplit aces; **may hit and double after splitting aces**; double on any number of cards.
- **Player 21 always wins. Player BJ beats dealer BJ, pays 3:2.**
- **Double down rescue:** after doubling, surrender by forfeiting an amount equal to the original bet (retrieve the doubled portion).
- Bonus 21s (void after doubling; **(D)** void after split, matching most houses, ~0.01% effect): 5-card 3:2 · 6-card 2:1 · 7+ 3:1 · 6-7-8 / 7-7-7 mixed 3:2 · suited 2:1 · spades 3:1.
- **Super Bonus:** suited 7-7-7 vs dealer 7 → $1000 (stake under $25) / $5000 (stake ≥ $25); no envy (single player); void after double/split. (~1/668k per hand at 6D.)
- House edge ~0.76% H17 / ~0.40% S17 before counting and promos — the swing thesis (promo synergy out-earning standard tables) is a first-class sim measurement.
- Monkey count display (S3). Strategy card is the Sp21 chart — note its structure is **card-count-in-hand dependent** (D3/D4/S# notation), which the resolver must honor (S12).
- No redouble except The Marquesa's hook (strategy for the redouble states exists at WoO).

## S11. POC scope (unchanged ceiling)

Level 1 (Tony's Backroom) fully playable: full hand rules incl. splits/doubles/insurance; 12 chips (rows 1–12 of S6 minus Deep Pen); economy with pity, reminders, overflow; Queen Bee, Break the Bank, Lucky Thirteen; count HUD; static per-ruleset strategy card; save/resume mid-shoe; rebet + quick-stake. Visual ceiling: CC0 card set, green felt, white bet circles, one fake logo SVG (*The Riviera Room* placeholder **(D)**), text tooltips, tier-ringed chips. No PB, no properties screen (one property), no wheel, no Sp21.

## S12. Pseudocode

```text
MODULE Shoe
  state: queue[], discards[], rng(seed), ruleset
  draw() -> Card                     # queue.pop; CountEngine.on_seen when exposed
  cut_card_reached() -> Bool         # dealt >= decks × 48|52 × pen
  remove_known(n, klass):            # Hot Hand / Cold Deck
      picks = n cards of klass in queue[0:20]
      queue.remove(picks)
      CountEngine.on_known_removal(picks)      # NOT into discards: face-down, out of play
  recycle_discards():                # CSM, every recycle_hands (2–3)
      CountEngine.on_recycle(discards)         # un-see: subtract tags
      queue.shuffle_in(rng, discards); discards.clear()

MODULE CountEngine
  config: tags (HILO | MONKEY), deck_size (52 | 48)
  state: rc, cards_seen
  on_seen(cards):         rc += Σ tag[c]
  on_known_removal(cards):rc += Σ tag[c]
  on_recycle(cards):      rc -= Σ tag[c]
  true_count():
      if MONKEY: return (rc − 24 × decks_dealt) / decks_remaining     # unbalanced drift
      return rc / max(0.5, decks_remaining)

MODULE PromoEngine                       # STACKING LAW (S5)
  dispatch(hook, ctx):
      for chip in staked_in_click_order() where chip.def.hook == hook:
          chip.def.resolve(ctx)          # ctx.mods accumulate: e.g. ctx.odds.insurance += delta
  # two Scam II staked → insurance odds = 2(base) + 2 + 2 = 6:1
  # PP then PP → hole := random 10-value; hole := random 10-value (no-op); both at risk

MODULE HandResolver
  play_hand():
      dispatch(PRE_DEAL)                 # Hot Hand removals, Deep Pen
      deal(); dispatch(DEAL)             # Perfect Prediction swaps hole
      if up == ACE: insurance_phase()    # stake insurance line (Scam boosts odds from field)
      if peek and dealer_BJ: settle_all(); return
      player_turn():                     # rule chips active while staked (Charlie, Double Anything,
          hit | stand | double | split | surrender   #  Surrender Anywhere)
          on hit: if mulligan_staked(line): prompt keep | discard+redraw
      dealer_turn() per s17
      for line in lines: settle_line(line)
  settle_line(line):
      odds = base_odds(line) + Σ ctx.odds_mods[line]     # BJ 3:2|1.2, Sp21 bonuses, Ghost, PushPower
      outcome = resolve(line)
      ChipRack.settle(line, outcome)     # on LOSE: Airbag(LINE scope) → take only Airbags, return rest
      PayoutLedger.pay(line.stake × odds)   # new house chips → promo rolls + pity

MODULE ChipRack & PityLedger
  on_chips_received(chips, source):      # MAIN | INSURANCE | SIDEBET | BUYIN
      for chip in chips:
          odds = PROMO_ODDS[source]      # 1/20 base; side bets 1/5..1/10 by HE tier
          pity += 1; forced = pity >= 30
          if promos.count < 6 and (forced or rng.randf() < odds):
              promos.add(chip.with_promo(weighted_pick(rarity))); pity = 0
          elif forced or roll_hit:
              chip.lands_plain(); Dealer.say(RACK_FULL)    # auto-decline + reminder (L)
  reminders(): 5 hands no promo staked while holding ≥1 → Dealer.say(PLAY_THEM)

MODULE PitBoss & Properties
  loop: PB.state ∈ {PATROL, AT_TABLE(2–4 hands)}
  heat accrues only while AT_TABLE (table in S8)
  on hand_end and heat > 100:
      if property.policy == BAR:
          cinematic_backoff(); property.barred = true
          if no unbarred BAR property and annex exists: open_property_select()
          elif no unbarred property at all: FAIL_ATTEMPT()          # eras 2–3
      else:  # COUNTERMEASURE (AC world)
          property.cm_level += 1        # cm1 pen×0.5 → cm2 wager locked table_min → cm3 both + patrol×2
  win_check(at settlement): holdings ≥ 2 × starting_bankroll → LEVEL_CLEAR
  fail_check(new hand): holdings < cheapest available table_min → FAIL_ATTEMPT

MODULE SideBets
  resolve(sidebet, ctx): pay = paytable.match(ctx)
      if pay > 0: PayoutLedger.pay(stake × pay, source=SIDEBET)
      if PB.watching: heat −= 10
  TheMeter: level_shared_meter += 0.20 per $1; Grand = meter (resets on hit), Major 500, Mini 25
  PrizeWheel [POC2]: trigger = player 21 | BJ → spin(multipliers 0.5–50)

MODULE SpanishMode (flag on Ruleset)
  deck 48s; count = MONKEY
  player 21 always wins; player BJ beats dealer BJ (3:2)
  double any #cards; hit/double/resplit aces; DAS; LS
  bonus21(hand): 5c 3:2 | 6c 2:1 | 7c+ 3:1 | 678/777 mixed 3:2 suited 2:1 spades 3:1 (void post-double/split)
  rescue(): forfeit original stake, retrieve doubled portion
  strategy lookups honor card-count-in-hand (D3/S4 notation)

MODULE Save (JSON, mid-shoe)
  {level, property_id, rack{plain, promos[6]}, shoe{queue, discards, rng_state},
   count{rc, cards_seen}, pity, per_property{barred, cm_level, heat},
   meter_pool, session_stats}
```

## S13. Strategy card data (researched)

- **Basic strategy:** encoded per-ruleset (1D vs multi-deck and S17/H17 charts differ; the card overlay renders the *active property's* chart). Source: published charts (Wizard of Odds); single-deck and shoe tables both encoded.
- **Illustrious 18** (Hi-Lo TC thresholds; H17 / S17 where they differ) — ranked by value:

| # | Play | Index | # | Play | Index |
|---|---|---|---|---|---|
| 1 | Insurance | ≥ +3 | 10 | 9 v 2 — double | ≥ +1 |
| 2 | 16 v 10 — stand | ≥ 0 | 11 | 10 v A — double | ≥ +3 / +4 |
| 3 | 15 v 10 — stand | ≥ +4 | 12 | 9 v 7 — double | ≥ +3 |
| 4 | 10,10 v 5 — split | ≥ +5 | 13 | 16 v 9 — stand | ≥ +5 |
| 5 | 10,10 v 6 — split | ≥ +4 | 14 | 13 v 2 — stand | ≥ −1 |
| 6 | 10 v 10 — double | ≥ +4 | 15 | 12 v 4 — stand | ≥ 0 |
| 7 | 12 v 3 — stand | ≥ +2 | 16 | 12 v 5 — stand | ≥ −2 |
| 8 | 12 v 2 — stand | ≥ +3 | 17 | 12 v 6 — stand | ≥ −3 / −1 |
| 9 | 11 v A — double | ≥ −1 / +1 | 18 | 13 v 3 — stand | ≥ −2 |

- **Fab 4 surrenders:** 14 v 10 ≥ +3 · 15 v 9 ≥ +2 · 15 v 10 ≥ 0 · 15 v A ≥ −1 (S17) / +1 (H17). (Some published tables add a fifth row, 16 v 8 ≥ +4 — encode the canonical four, keep the fifth as a variant flag.)
- Sources: blackjacktrainer.fyi's rendered I18 list, Zender/BJA lineage (Schlesinger, "Attacking the Shoe," *Blackjack Forum*, 1986 → *Blackjack Attack*). Indices shift ±1 by rules/deck count — the engine keys index tables per ruleset, exactly like the base charts.
- **Sp21:** basic strategy from WoO (H17 and S17 charts; card-count-in-hand dependent). **Indexes: not publicly published** — WoO's FAQ explicitly notes the gap. When we build the Sp21 level, I encode from your book notes.

Deliberate teaching interaction, worth calling out: the card shows *Insurance: never (take at +3)* — which is exactly wrong the moment a Scam is on the field (3:1 flips it to always-take at any count, 6:1 is a license to print). The static card and the dynamic chips are designed to disagree; noticing *why* is the mastery moment.

## S14. Simulation & balance plan

Headless harness over the pure-logic core: (1) baseline EV/RoR/hands-to-2× per property; (2) marginal promo EV per chip and tier, isolated and stacked — hunt additive-delta breakage (6:1 insurance etc. is *allowed* to be a jackpot; it shouldn't be an equilibrium); (3) economy rates — promo arrivals/hour, slot pressure, pity frequency, overflow/decline rate; (4) side-bet fishing EV per era incl. promo share; meter growth rate; (5) properties — expected backs-off per level, annex-gulag win rate at cm2+; (6) Sp21 lane EV vs standard at equal skill; (7) The Machine: near-zero edge promo-less, positive with a tuned build. Outputs tune rarity weights, promo odds tiers, pity, limits, bankrolls.

All eight processed — and your Monkey count correction is quietly beautiful: with the sign flipped, the tags **perfectly balance over the 48-card Spanish deck**:

```
2-6:   20 cards × +1  = +20
7-9:   12 cards ×  0  =   0
J/Q/K: 12 cards × −1  = −12
A:      4 cards × −2  =  −8
                    Σ =   0
```

So it’s a proper balanced count — TC is plain `RC ÷ decks remaining`, identical machinery to Hi-Lo, no drift correction needed. The v0.2 unbalanced-workaround gets deleted. And the double-weight on aces is exactly right for Sp21, where aces carry the bonuses, the soft doubles, and the rescue plays. Nice system.

## Errata v0.2 → v0.3 (spec is now fully ratified)

**E1 — S3 Monkey count (final):** 2–6 = +1 · 7–9 = 0 · 10-value (J/Q/K) = **−1** · A = **−2**. Balanced; standard TC division. Delete the `(RC – 24 × decks_dealt)` normalization from S3 and from `CountEngine.true_count()` in S12 — both count systems now share one formula.

**E2 — S8 flat-bet mandate (final):** cm2 locks your wager to **whatever your first wager of the shoe was**. Encode as `flat_lock`: set by the shoe’s opening wager (including the shoe in progress when the mandate lands), re-armed each new shoe. Note the emergent decision this creates — at a mandated property, your opening bet is a per-shoe commitment decision, which is a much more interesting rule than a min-lock. Boring Bob stays distinct: Bob = table-min lock *while staked* (player-timed), mandate = first-wager lock (house-imposed); if both apply, the stricter wins.

**E3 — S9 Sp21 alternates (final):** era-5+ nodes clear via the standard level **or** the Sp21 level — either unlocks the next era; both are tracked independently (both = completion **(D)**).

**E4 — S13 Sp21 indexes:** deferred. Era-5 Sp21 strategy card ships with basic strategy only, no deviation rows. One offer for later since transcription is a slog: once the sim harness is running, we can *derive* Sp21 indices empirically — sweep each decision’s EV across TC thresholds and find the crossovers, machine-generated like Schlesinger did it. Optional, when we get there.

**E5 — S12 pseudocode:** two touch-ups — `true_count()` drops the MONKEY special case; `PitBoss` cm2 line becomes `flat_lock = first_wager_of_current_shoe`.

**E7 — Sp21 index transcription exists (extends E4, ruling 2026-10-22):** the
human transcribed a Spanish 21 I18 + Fab 4 set into `docs/sp21-i18.md`.
Source: Katarina Walker's *The Pro's Guide to Spanish 21 and Australian
Pontoon*, adjusted **+4** to the game's balanced Monkey count; specific to
**8-deck games with redoubling** (the only ruleset the human has personally
seen in person); simmed in Casino Verite; marked **needs verification** —
perfecting them is a possible future research task (E4's empirical-derivation
offer stands as the perfecting path). Conventions: every index is "and
above"; X = any 10-value; one rescue row ("FORFEIT A DD 12 VS 8 AT 1"); the
"STAND 17 VS A AT 2" row is the post-hit hard-17 rule (surrender 17 v A is
otherwise standard). Until wired into the engine, E4's basic-strategy-only
deferral holds; wiring + verifying these rows is 0.10.0 THE SPANISH TABLES
work.

**E8 — Accessibility law + options menu (ruled with FELT pt2):**

1. **The hard law:** every game object, every visual event, and every player
   control is screen-reader complete — no gaps, ever. Enforced from the first
   visual commit: the render kit (no Phaser object exists undescribed — the
   kit's creators require an SR string, type-checked), the a11y lint (grep
   law: object creation and interactivity live only in the kit; `npm run
   check` fails on violations), and the announcement bridge (every
   RoundEvent kind produces an announcement — a missed kind is a compile
   error, and a test asserts every phrase is non-empty).
2. **Contrast law:** every palette fg/bg pair clears WCAG AA (4.5:1),
   test-enforced (`tests/contrast.test.ts`). White card face on the felt
   (`#0b5d3b`) measures ≈7.9:1 (AAA). Card backs must be light or
   white-outlined: the English-pattern deck's four backs (blue, purple, red,
   yellow — all white-outlined; the SVG's green background makes the outline
   trivial to preserve on extraction) pass by design.
3. **The accessibility menu** (options ship with their systems):
   - **Large number cards** — the key option: rank/number art and face art
     separately swappable. Arrives with swappable card art (the Deck
     interface, pt3 onward; per-property decks later). The extraction
     pipeline keeps number and face layers separable for exactly this.
   - **Four-color suits** — spades black, hearts red, diamonds blue, clubs
     green: shape redundancy stays, color becomes a second channel. Vector
     recolor; seeded with deck rendering.
   - **High contrast mode** — felt, backs, and HUD recolored at runtime.
   - **Starting true count** — pacing made visible: speeds the game up by
     removing low cards from the shoe, or slows it down by removing high
     cards from it. Range **−20** (all tens/aces removed) through **+20**
     (all 2s–6s removed); the removed cards are chosen randomly. The removal
     math uses each count system's tags — at Sp21 tables an ace counts as 2
     (the Monkey tag), which the feature must handle. **Needs verification**
     that the behavior matches intent.
   - (Standing with these: hand-location axis flip; mouse/keyboard/touch
     parity — goal 4.)
4. **Closed captions:** every announcement prints as a visible caption,
   CEA-style — bottom-center band, white on translucent dark, speaker labels
   ("Dealer: ..."), bracketed sounds ("[shuffle]") — **on by default**. The
   caption text and the SR announcement are the same string by construction:
   one bridge, two sinks.

**E9 — Corey's Table: free play (ruled 2026-10-22):** the practice mode.
Promo chips on or off; per-shoe summary stats at the end of every shoe;
shoe size settable; alternate rules settable; the count visualizer
toggleable. The table's chips are not generated art — they are photographs
of the human's actual custom poker chips, a personal artifact no one else
can hope to fake (the aesthetic law's photographic layer, made personal).
Roadmap placement is an open ruling ✎ — natural candidates: alongside the
POC gate, or as its own gate.

**E6 — S6 chip catalog superseded (roster ruling 2026-10-22):** the S6 table
above is replaced by the ruled 12-chip POC roster below. All rarities are
SPECULATIVE — a per-chip battery assigns each chip to Common / Uncommon /
Rare from measured EV (S14 #2 extended: the battery owns rarity assignment;
S4's ~70/25/5 weights govern drop rates only). Dropped from the catalog:
Five-Card Charlie, Double Anything, Surrender Anywhere, Burning Question, Ten
Density, The Illustrious, Boring Bob, Team Player, Cold Deck. The B3
battery's Godot-era chips (New Shoe Who Dis, Housekeeping, The Inside Job,
Golden Chip, Room Service, Baker's Dozen, Bolt Cutter) are confirmed retired.

| # | Chip | Tier | Cat | Hook | Scope | Effect |
|---|---|---|---|---|---|---|
| 1 | Hot Hand | I/II/III (C/U/R) | Shoe | pre-deal | G | Remove 3 / 5 / 8 lows from next 20; count updates |
| 2 | Airbag | C | Money | on-lose | L | Line loses only this chip (all staked Airbags) |
| 3 | Mulligan | I/II (C/U) | Action | action | L | Discard-and-rehit 1× / 2× per hand; discard is seen |
| 4 | Insurance Scam | I/II/III (C/U/R) | Money | settlement | G | Insurance odds +1 / +2 / +3 (additive) |
| 5 | Perfect Prediction | U | Shoe | deal | G | Dealer hole card → random 10-value card |
| 6 | Martingale's Ghost | U | Money | settlement | G | If you lost your last hand and win this one, double your winnings |
| 7 | Push Power | U | Money | settlement | G | If you push this hand, win instead |
| 8 | Deep Pen | R | Shoe | shoe | G | Every hand you win with this chip increases penetration by 1% |
| 9 | Peek | R | Info | info | G | See dealer hole card |
| 10 | Camouflage | U | Heat | heat | G | Heat gains ×0.5 while staked |
| 11 | Psychic | R | Info | info | G | See the top card of the shoe as long as this chip is staked |
| 12 | Tourist | R | Heat | heat | G | Heat resets to 0 when you lose this chip |

**E6a — effect changes vs old S6:** Martingale's Ghost trigger loosened (any
lost hand → the next win doubles; was a 3-loss streak) · Push Power loses the
per-shoe cap (any push converts to a win) · Deep Pen redesigned from "cut
card ignored" to the +1%-per-won-hand ramp · First Base Peek renamed **Peek**
and made unconditional.

**E6b — general chip laws (ruled with the roster):**
- **Chips only have their effect while staked.** An unstaked promo is
  inventory; a staked promo is live and at risk every hand — the economy's
  self-balancer (Push Power's strength is rented, not owned).
- **Split hands resolve separately; chips bind to their line.** Deep Pen
  ramps only on the winning half carrying it; Ghost doubles only its own
  line's settlement; Tourist only fires when its line loses.
- **Psychic quantifies on sight:** the visible top card updates the count and
  cardsSeen (S3 knowledge rule) for every new top card while staked.
- **Deep Pen ramp:** +1% penetration per hand won with it staked (split
  halves independent), caps at 100%, persists after the chip is lost or
  unstaked.
- **Martingale's Ghost** doubles the entire settlement of its line (3:2 →
  3:1, even wins → 2:1, Sp21 bonus payouts ×2); split siblings unaffected.
- **Tourist** fires only when its line loses in a regular hand: chip
  consumed, heat → 0.
- **Peek × Perfect Prediction** — both staked pre-deal, the combo teaches
  nothing; the live play is Peek pre-deal → see the hole → stake PP on a
  double or split to act on it.
- **Heat chips (Camouflage, Tourist)** are inert until heat exists; their
  rarities stay speculative until the harness has a heat model.
- **Battery methodology:** any chip that changes optimal play gets a bespoke
  chip-aware strategy before its measured EV is trusted — basic-strategy
  measurement can show *lost* EV for genuinely good chips.
