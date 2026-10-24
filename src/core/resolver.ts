/**
 * HandResolver (S12, stage-1 scope: no promo hooks — dispatch points marked `// PROMO:`).
 * Round: deal+expose → insurance (ace up) → US peek → player turn (hit/stand/double/split/
 * LS/rescue, resplitMax, aces per ruleset) → dealer turn → settle; the hole counts only at reveal (S3).
 */
import type { Ruleset } from './rules.ts';
import type { Shoe } from './shoe.ts';
import {
  handTotal,
  isNatural,
  isSplitPair,
  sp21BonusMultiplier,
  isSuitedTripleSeven,
} from './hand.ts';
import { cardFaceValue, cardValue, isAce, isTenValue } from './card.ts';
import type { Action, InsuranceView, PlayerView, Strategy } from './strategy/view.ts';

type Phase = 'play' | 'standing' | 'done';

interface Line {
  cards: number[];
  stake: number; // original main-bet for this line, units
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  phase: Phase;
  net: number;
  natural: boolean;
}

export interface RoundResult {
  net: number;
  initialWager: number;
  totalAtRisk: number;
  hands: number;
  naturals: number;
}

export interface RoundTally {
  hands: number;
  rounds: number;
  naturals: number;
  dealerNaturals: number;
  plain21Wins: number;
  bonus21_15: number;
  bonus21_2: number;
  bonus21_3: number;
  superBonus: number;
  wins: number;
  losses: number;
  pushes: number;
  busts: number;
  dealerBusts: number;
  surrenders: number;
  rescues: number;
  doubles: number;
  splits: number;
  insuranceTaken: number;
  insuranceWon: number;
}

/** A zeroed RoundTally for optional diagnostics collection. */
export function newTally(): RoundTally {
  return {
    hands: 0, rounds: 0, naturals: 0, dealerNaturals: 0, plain21Wins: 0,
    bonus21_15: 0, bonus21_2: 0, bonus21_3: 0, superBonus: 0,
    wins: 0, losses: 0, pushes: 0, busts: 0, dealerBusts: 0,
    surrenders: 0, rescues: 0, doubles: 0, splits: 0,
    insuranceTaken: 0, insuranceWon: 0,
  };
}

/** What happened to one settled line — the UI's vocabulary for flashes and announcer lines. */
export type LineOutcome =
  | 'blackjack'
  | 'twenty-one'
  | 'super-bonus'
  | 'win'
  | 'lose'
  | 'push'
  | 'bust'
  | 'surrender'
  | 'rescue';

/** The render feed for one round: the sim ignores these, the felt animates from them. Hole identities stay hidden until 'hole-revealed'. */
export type RoundEvent =
  | { kind: 'round-start' }
  | { kind: 'card'; to: 'player' | 'dealer'; line: number; role: 'initial' | 'hit' | 'double' | 'up' | 'hole'; card?: number }
  | { kind: 'hole-revealed'; card: number }
  | { kind: 'decision'; line: number; action: Action }
  | { kind: 'line-created'; line: number }
  | { kind: 'line-settled'; line: number; net: number; outcome: LineOutcome }
  | { kind: 'round-end'; result: RoundResult };

export interface RoundEnv {
  ruleset: Ruleset;
  shoe: Shoe;
  strategy: Strategy;
  betUnits: number;
  unitDollars: number;
  /** optional render-feed sink; the felt animates from these, sims leave it unset */
  events?: (e: RoundEvent) => void;
  /** optional diagnostics collector */
  tally?: RoundTally;
}

/** A fresh play-phase line carrying one stake. */
function newLine(stake: number): Line {
  return { cards: [], stake, doubled: false, fromSplit: false, splitAces: false, phase: 'play', net: 0, natural: false };
}

/** Play one full round to settlement; net/initialWager/atRisk are in units. Awaits promise-returning strategies at every decision point. */
export async function playRound(env: RoundEnv): Promise<RoundResult> {
  const { ruleset: rules, shoe, strategy, betUnits, unitDollars, tally, events } = env;
  const emit = (e: RoundEvent): void => {
    events?.(e);
  };
  emit({ kind: 'round-start' });
  if (!rules.peek) throw new Error('stage 1 supports US hole-card (peek) rulesets only');
  if (tally) tally.rounds++;

  let net = 0;
  let atRisk = 0;
  let naturals = 0;

  // PROMO: dispatch(PRE_DEAL) — Hot Hand removals / Deep Pen live here in stage 3

  // --- deal: player, up, player, hole ---
  const p1 = shoe.deal();
  const up = shoe.deal();
  const p2 = shoe.deal();
  const hole = shoe.deal();
  emit({ kind: 'card', to: 'player', line: 0, role: 'initial', card: p1 });
  emit({ kind: 'card', to: 'dealer', line: 0, role: 'up', card: up });
  emit({ kind: 'card', to: 'player', line: 0, role: 'initial', card: p2 });
  emit({ kind: 'card', to: 'dealer', line: 0, role: 'hole' });
  const roundCards: number[] = [p1, up, p2, hole];
  const dealerCards: number[] = [up, hole];

  shoe.count.expose(p1, up, p2);

  const upVal = cardFaceValue(up);
  const upIsAce = isAce(up);
  const dealerHasNatural = isNatural(dealerCards);

  // --- insurance (ace up), then peek ---
  let insuranceBet = 0;
  if (upIsAce) {
    const insView: InsuranceView = {
      ruleset: rules,
      upcard: up,
      betUnits,
      tc: shoe.count.trueCount(),
      rawTc: shoe.count.rawTrueCount(),
    };
    if (await strategy.insurance(insView)) {
      insuranceBet = betUnits / 2;
      atRisk += insuranceBet;
      if (tally) tally.insuranceTaken++;
    }
  }

  let holeExposed = false;
  const exposeHole = (): void => {
    if (!holeExposed) {
      shoe.count.expose(hole);
      holeExposed = true;
      emit({ kind: 'hole-revealed', card: hole });
    }
  };

  const finish = (handsCount: number): RoundResult => {
    for (const c of roundCards) shoe.discard(c);
    const result: RoundResult = { net, initialWager: betUnits, totalAtRisk: atRisk, hands: handsCount, naturals };
    emit({ kind: 'round-end', result });
    return result;
  };

  // --- peek (US hole card) ---
  if (isTenValue(up) || upIsAce) {
    if (dealerHasNatural) {
      exposeHole();
      if (insuranceBet > 0) net += insuranceBet * 2;
      if (tally) tally.dealerNaturals++;
      if (tally && insuranceBet > 0) tally.insuranceWon++;
      if (isNatural([p1, p2])) {
        naturals++;
        if (rules.playerBjBeatsDealerBj) {
          net += betUnits * rules.bjPayout; // Sp21: player BJ beats dealer BJ
          emit({ kind: 'line-settled', line: 0, net: betUnits * rules.bjPayout, outcome: 'blackjack' });
        } else {
          // standard: natural pushes against dealer natural
          emit({ kind: 'line-settled', line: 0, net: 0, outcome: 'push' });
        }
      } else {
        net -= betUnits;
        emit({ kind: 'line-settled', line: 0, net: -betUnits, outcome: 'lose' });
      }
      atRisk += betUnits;
      return finish(1);
    }
    // no dealer natural: taken insurance is lost; the hole card stays unknown
    if (insuranceBet > 0) net -= insuranceBet;
  }

  // --- main line ---
  const main = newLine(betUnits);
  main.cards.push(p1, p2);
  main.natural = isNatural(main.cards);
  const lines: Line[] = [main];

  // PROMO: dispatch(DEAL) — Perfect Prediction swaps the hole card in stage 3

  if (main.natural) {
    main.phase = 'done';
    main.net = main.stake * rules.bjPayout;
    if (tally) tally.naturals++;
    net += main.net;
    naturals++;
    atRisk += betUnits;
    emit({ kind: 'line-settled', line: 0, net: main.net, outcome: 'blackjack' });
    exposeHole(); // dealer reveals the hole when paying
    return finish(1);
  }
  atRisk += betUnits;

  // --- Spanish 21 21-win settlement (player 21 always wins) ---
  const settleSp21Win = (line: Line, lineIdx: number): void => {
    let outcome: LineOutcome = 'twenty-one';
    if (rules.superBonus && isSuitedTripleSeven(line.cards) && upVal === 7 && !line.doubled && !line.fromSplit) {
      const betDollars = line.stake * unitDollars;
      line.net = (betDollars >= 25 ? 5000 : 1000) / unitDollars;
      outcome = 'super-bonus';
      if (tally) tally.superBonus++;
    } else {
      let bonus = 0;
      const eligible =
        rules.bonus21 &&
        !line.doubled &&
        !(line.fromSplit && rules.voidBonusAfterSplit);
      if (eligible) bonus = sp21BonusMultiplier(line.cards);
      const mult = line.doubled ? 2 : bonus > 1 ? bonus : 1;
      line.net = line.stake * mult;
      if (tally) {
        if (bonus >= 3) tally.bonus21_3++;
        else if (bonus >= 2) tally.bonus21_2++;
        else if (bonus >= 1.5) tally.bonus21_15++;
        else tally.plain21Wins++;
      }
    }
    line.phase = 'done';
    net += line.net;
    emit({ kind: 'line-settled', line: lineIdx, net: line.net, outcome });
  };

  // --- player turn ---
  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx]!;
    if (line.phase !== 'play') {
      idx++;
      continue;
    }

    // split lines take their second card when played
    if (line.cards.length === 1) {
      const c = shoe.deal();
      roundCards.push(c);
      line.cards.push(c);
      shoe.count.expose(c);
      emit({ kind: 'card', to: 'player', line: idx, role: 'initial', card: c });
    }

    const ht = handTotal(line.cards);

    // Sp21: any 21 is an immediate win
    if (rules.player21AlwaysWins && ht.total === 21) {
      settleSp21Win(line, idx);
      idx++;
      continue;
    }

    // standard 21 after draws: auto-stand
    if (!rules.player21AlwaysWins && ht.total >= 21) {
      line.phase = 'standing';
      idx++;
      continue;
    }

    // split aces without draw: one card, done — except a possible resplit
    if (line.splitAces && !rules.hitSplitAces && line.cards.length >= 2) {
      if (isSplitPair(line.cards) && canSplit(line, lines, rules)) {
        const v = buildView(line, lines, up, upVal, rules, shoe);
        if ((await strategy.play(v)) === 'P') {
          splitLine(line, lines, betUnits);
          emit({ kind: 'line-created', line: lines.length - 1 });
          atRisk += betUnits;
          if (tally) tally.splits++;
          continue;
        }
      }
      line.phase = 'standing';
      idx++;
      continue;
    }

    const view = buildView(line, lines, up, upVal, rules, shoe);
    const action = clampAction(await strategy.play(view), view);
    emit({ kind: 'decision', line: idx, action });

    switch (action) {
      case 'H': {
        const c = shoe.deal();
        roundCards.push(c);
        line.cards.push(c);
        shoe.count.expose(c);
        emit({ kind: 'card', to: 'player', line: idx, role: 'hit', card: c });
        const t2 = handTotal(line.cards);
        if (t2.total > 21) {
          line.net = -line.stake * (line.doubled ? 2 : 1);
          line.phase = 'done';
          net += line.net;
          if (tally) tally.busts++;
          emit({ kind: 'line-settled', line: idx, net: line.net, outcome: 'bust' });
        } else if (rules.player21AlwaysWins && t2.total === 21) {
          settleSp21Win(line, idx);
        } else if (t2.total === 21) {
          line.phase = 'standing';
        }
        break;
      }
      case 'S':
        line.phase = 'standing';
        break;
      case 'D': {
        const c = shoe.deal();
        roundCards.push(c);
        line.cards.push(c);
        shoe.count.expose(c);
        emit({ kind: 'card', to: 'player', line: idx, role: 'double', card: c });
        line.doubled = true;
        atRisk += line.stake;
        if (tally) tally.doubles++;
        const t2 = handTotal(line.cards);
        if (t2.total > 21) {
          line.net = -line.stake * 2;
          line.phase = 'done';
          net += line.net;
          if (tally) tally.busts++;
          emit({ kind: 'line-settled', line: idx, net: line.net, outcome: 'bust' });
        } else if (rules.player21AlwaysWins && t2.total === 21) {
          settleSp21Win(line, idx); // bonus void after double: even money on 2x
        } else if (rules.rescue) {
          // double-down rescue: decision after seeing the doubled card
          const v = buildView(line, lines, up, upVal, rules, shoe);
          if (clampAction(await strategy.play(v), v) === 'RESCUE') {
            line.net = -line.stake; // forfeit original, retrieve doubled portion
            line.phase = 'done';
            net += line.net;
            if (tally) tally.rescues++;
            emit({ kind: 'line-settled', line: idx, net: line.net, outcome: 'rescue' });
          } else {
            line.phase = 'standing';
          }
        } else {
          line.phase = 'standing';
        }
        break;
      }
      case 'P':
        splitLine(line, lines, betUnits);
        emit({ kind: 'line-created', line: lines.length - 1 });
        atRisk += betUnits;
        if (tally) tally.splits++;
        break;
      case 'R':
        line.net = -line.stake / 2;
        line.phase = 'done';
        net += line.net;
        if (tally) tally.surrenders++;
        emit({ kind: 'line-settled', line: idx, net: line.net, outcome: 'surrender' });
        break;
      case 'RESCUE':
        // unreachable (only queried on doubled hands via clampAction)
        line.phase = 'standing';
        break;
    }
  }

  // --- dealer turn ---
  const anyStanding = lines.some((l) => l.phase === 'standing');
  exposeHole(); // knowledge rule: the hole card is revealed at round end
  if (anyStanding) {
    let dt = handTotal(dealerCards);
    while (dt.total < 17 || (dt.total === 17 && dt.soft && !rules.s17)) {
      const c = shoe.deal();
      roundCards.push(c);
      dealerCards.push(c);
      shoe.count.expose(c);
      emit({ kind: 'card', to: 'dealer', line: 0, role: 'hit', card: c });
      dt = handTotal(dealerCards);
    }
    const dealerTotal = dt.total;
    if (tally && dealerTotal > 21) tally.dealerBusts++;
    for (const [lineIdx, line] of lines.entries()) {
      if (line.phase !== 'standing') continue;
      const pt = handTotal(line.cards).total;
      const wager = line.stake * (line.doubled ? 2 : 1);
      let outcome: LineOutcome;
      if (dealerTotal > 21 || pt > dealerTotal) {
        line.net = wager;
        outcome = 'win';
        if (tally) tally.wins++;
      } else if (pt < dealerTotal) {
        line.net = -wager;
        outcome = 'lose';
        if (tally) tally.losses++;
      } else {
        line.net = 0;
        outcome = 'push';
        if (tally) tally.pushes++;
      }
      line.phase = 'done';
      net += line.net;
      emit({ kind: 'line-settled', line: lineIdx, net: line.net, outcome });
    }
  }

  return finish(lines.length);
}

// ---------------------------------------------------------------------------

/** Split legality: pair, not doubled, under resplitMax, aces honor rsa on a resplit. */
function canSplit(line: Line, lines: Line[], rules: Ruleset): boolean {
  if (line.cards.length !== 2) return false;
  if (line.doubled) return false;
  if (!isSplitPair(line.cards)) return false;
  if (lines.length >= rules.resplitMax) return false;
  const pairValue = cardValue(line.cards[0]!);
  if (pairValue === 11 && line.fromSplit && !rules.rsa) return false;
  return true;
}

/** Pop the pair's second card into a child line; both lines carry fromSplit/splitAces. */
function splitLine(line: Line, lines: Line[], betUnits: number): void {
  const c2 = line.cards.pop()!;
  const pairValue = cardValue(line.cards[0]!);
  const child = newLine(betUnits);
  child.cards.push(c2);
  child.fromSplit = true;
  child.splitAces = pairValue === 11;
  line.fromSplit = true;
  line.splitAces = pairValue === 11;
  line.natural = false;
  lines.push(child);
}

/** Double-range legality ('any' | '9-11' | '10-11'; restricted ranges are hard totals only). */
function doubleOnOk(rules: Ruleset, ht: { total: number; soft: boolean }): boolean {
  if (rules.doubleOn === 'any') return true;
  if (ht.soft) return false;
  if (rules.doubleOn === '9-11') return ht.total >= 9 && ht.total <= 11;
  return ht.total >= 10 && ht.total <= 11; // '10-11'
}

/** Assemble the PlayerView for a line, computing every legality flag and the live count values. */
function buildView(line: Line, lines: Line[], up: number, upVal: number, rules: Ruleset, shoe: Shoe): PlayerView {
  const ht = handTotal(line.cards);
  const cardCount = line.cards.length;
  const canDbl =
    !line.doubled &&
    (cardCount === 2 || (rules.doubleAnyNumberOfCards && ht.total < 21)) &&
    (line.fromSplit ? rules.das : true) &&
    (line.splitAces ? rules.hitSplitAces : true) &&
    doubleOnOk(rules, ht);
  return {
    ruleset: rules,
    cards: line.cards.slice(),
    total: ht.total,
    soft: ht.soft,
    cardCount,
    doubled: line.doubled,
    fromSplit: line.fromSplit,
    splitOf: line.splitAces ? 11 : 0,
    upcard: up,
    up: upVal,
    canDouble: canDbl,
    canSplit: canSplit(line, lines, rules),
    canSurrender: rules.surrender && !line.fromSplit && cardCount === 2 && !line.doubled,
    canRescue: rules.rescue && line.doubled,
    tc: shoe.count.trueCount(),
    rawTc: shoe.count.rawTrueCount(),
    runningCount: shoe.count.runningCount(),
    decksRemaining: shoe.count.decksRemaining(),
  };
}

/** Force an illegal action to its standard fallback (D→H, P→S, R→H, RESCUE→S). */
function clampAction(action: Action, view: PlayerView): Action {
  if (view.doubled) {
    return action === 'RESCUE' && view.canRescue ? 'RESCUE' : 'S';
  }
  if (action === 'D' && !view.canDouble) return 'H';
  if (action === 'P' && !view.canSplit) return 'S';
  if (action === 'R' && !view.canSurrender) return 'H';
  if (action === 'RESCUE') return 'S';
  return action;
}
