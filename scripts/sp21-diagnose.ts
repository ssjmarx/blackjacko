/**
 * Sp21 structural diagnosis: measure outcome frequencies and compare
 * against theoretical expectations to locate the EV gap vs WoO -0.76%.
 */
import { spanish21Ruleset, blackjackRuleset } from '../src/core/rules.ts';
import { Shoe } from '../src/core/shoe.ts';
import { mulberry32 } from '../src/core/rng.ts';
import { playRound, newTally } from '../src/core/resolver.ts';
import { SimPlayer } from '../src/core/player.ts';

async function diagnose(label: string, ruleset: ReturnType<typeof blackjackRuleset>, hands: number): Promise<void> {
  const shoe = new Shoe(ruleset, mulberry32(777));
  const player = new SimPlayer(ruleset.spanish ? { play: 'sp21', bet: 'flat', baseUnits: 1 } : { play: 'basic', bet: 'flat', baseUnits: 1 });
  const tally = newTally();
  let net = 0;
  let atRisk = 0;
  for (let i = 0; i < hands; i++) {
    if (shoe.needsShuffle() || shoe.remaining() < 21) shoe.shuffle();
    const r = await playRound({ ruleset, shoe, strategy: player, betUnits: 1, unitDollars: 25, tally });
    net += r.net;
    atRisk += r.initialWager;
  }
  const f = (n: number): string => ((n / hands) * 100).toFixed(3) + '%';
  const ev = (net / atRisk) * 100;
  console.log(`\n=== ${label}  (${hands.toLocaleString()} rounds, EV ${ev.toFixed(3)}%) ===`);
  console.log(`player naturals:    ${f(tally.naturals)}   (theory ~4.18% for 6D spanish)`);
  console.log(`dealer naturals:    ${f(tally.dealerNaturals)}`);
  console.log(`plain 21 wins:      ${f(tally.plain21Wins)}`);
  console.log(`bonus 3:2 (5c/678mixed): ${f(tally.bonus21_15)}`);
  console.log(`bonus 2:1 (6c/suited):  ${f(tally.bonus21_2)}`);
  console.log(`bonus 3:1 (7c+/spades): ${f(tally.bonus21_3)}`);
  console.log(`super bonus:        ${f(tally.superBonus)} (theory 0.00015%)`);
  console.log(`wins (vs dealer):   ${f(tally.wins)}`);
  console.log(`losses:             ${f(tally.losses)}`);
  console.log(`pushes:             ${f(tally.pushes)}`);
  console.log(`player busts:       ${f(tally.busts)}`);
  console.log(`dealer busts:       ${f(tally.dealerBusts)}`);
  console.log(`surrenders:         ${f(tally.surrenders)}`);
  console.log(`rescues:            ${f(tally.rescues)}`);
  console.log(`doubles:            ${f(tally.doubles)}`);
  console.log(`splits:             ${f(tally.splits)}`);
  console.log(`hands per round:     ${(tally.hands === 0 ? 0 : hands === 0 ? 0 : 0) || (tally.splits + hands) / hands}`);
}

await diagnose('Spanish 21 6D H17', spanish21Ruleset({ decks: 6, s17: false, pen: 0.8 }), 3_000_000);
await diagnose('Blackjack 6D H17 DAS (control)', blackjackRuleset({ decks: 6, s17: false, das: true, pen: 0.8 }), 3_000_000);
