/**
 * The live table renderer — the driver's Phaser side (spec E14): hand groups
 * under the stacking law, the dealer's choreography, the HUD fed by the
 * engine, and every animation through the skippable runner.
 */
import Phaser from "phaser";
import type { LineOutcome } from "../../core/resolver.ts";
import type { TableLayout } from "../../layout/table.ts";
import { ANIM, CARD_STACK, FELT, TONYS } from "../../config.ts";
import { AnimRunner, fade, flash, flip, place } from "../anim.ts";
import type { Deck } from "../decks/deck.ts";
import { backSprite, cardSprite } from "../cardart.ts";
import { deckStack, type StackHandle } from "../cardstack.ts";
import { roundRect, text } from "../kit.ts";
import type { RenderPort } from "./driver.ts";

/** Settlement tints: the flash the line's cards pulse through. */
const OUTCOME_TINT: Record<LineOutcome, number> = {
  blackjack: 0xffd700,
  "twenty-one": 0xffd700,
  "super-bonus": 0xffd700,
  win: 0xffffff,
  push: 0xaaaaaa,
  lose: 0xff4444,
  bust: 0xff2222,
  surrender: 0x888888,
  rescue: 0xffffff,
};

/** The dealt shoe's live rendering: hand groups, dealer row, HUD, stack, marker. */
export class TableRenderer implements RenderPort {
  private runner: AnimRunner;
  private layout: TableLayout;
  private lines = new Map<number, Phaser.GameObjects.Image[]>();
  private dealerCards: Phaser.GameObjects.Image[] = [];
  private stack?: StackHandle;
  private dealt = 0;
  private countText?: Phaser.GameObjects.Text;
  private bankrollText?: Phaser.GameObjects.Text;
  private betMarker?: Phaser.GameObjects.Graphics;
  private betLabel?: Phaser.GameObjects.Text;
  private hole?: Phaser.GameObjects.Image;
  private bankroll: number;
  private cutOut = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly deck: Deck,
    layout: TableLayout,
    bankroll: number,
  ) {
    this.runner = new AnimRunner(() => performance.now());
    this.layout = layout;
    this.bankroll = bankroll;
    scene.events.on(Phaser.Scenes.Events.UPDATE, () => this.runner.update());
    scene.input.on("pointerdown", () => this.runner.skip());
    window.addEventListener("keydown", () => this.runner.skip());
    this.mount();
  }

  /** Build the standing furniture: the count HUD, the bankroll, the live stack. */
  private mount(): void {
    const l = this.layout;
    this.countText = text(this.scene, l.countHud.x + 8, l.countHud.y + 6, "", {
      id: "count hud",
      sr: "The running and true count, live from the engine.",
      color: FELT.readout,
      size: 16,
    });
    this.bankrollText = text(this.scene, l.bankrollPoint.x, l.bankrollPoint.y, `Bankroll ${this.bankroll}`, {
      id: "bankroll",
      sr: `Bankroll ${this.bankroll} units.`,
      color: FELT.readout,
      size: 15,
    });
    this.bankrollText.setOrigin(0.5, 1);
    this.rebuildStack();
  }

  /** The count-true deck stack: rebuilt at any size change, eroded per deal. */
  private rebuildStack(): void {
    if (this.stack) for (const s of this.stack.sprites) s.destroy();
    const extent = { x: this.layout.shoe.x, y: this.layout.shoe.y, w: this.layout.shoe.w, h: this.layout.shoe.h + this.layout.deckExtra.h };
    this.stack = deckStack(this.scene, this.deck, extent, {
      id: "live deck stack",
      debug: false,
      cell: this.layout.shoe,
      want: { x: 0, y: 0, w: this.layout.metrics.cardW, h: this.layout.metrics.cardH },
      remaining: Math.round(CARD_STACK.pen * CARD_STACK.maxDeck) - this.dealt,
      pen: CARD_STACK.pen,
      max: CARD_STACK.maxDeck,
      perCard: CARD_STACK.deckPx,
    });
    for (const s of this.stack.sprites) s.setDepth(-2);
  }

  /** The shoe stack's position — every card flies from here. */
  private shoePoint(): { x: number; y: number } {
    const s = this.layout.shoe;
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  }

  /** A player card's position: the slot's center, stacked by the alternating-corner law. */
  private playerPoint(line: number, index: number): { x: number; y: number } {
    const slot = this.layout.lineSlots[Math.min(line, this.layout.lineSlots.length - 1)];
    const dx = this.layout.metrics.stackDX;
    const dy = this.layout.metrics.stackDY;
    const x = slot.x + slot.w / 2 - this.layout.metrics.cardW / 2 + (index === 0 ? 0 : (index % 2 === 1 ? -1 : 1) * dx);
    const y = slot.y + slot.h / 2 - this.layout.metrics.cardH / 2 - index * dy;
    return { x, y };
  }

  /** A dealer card's position: slot 0 holds the hole, later cards grow right. */
  private dealerPoint(index: number): { x: number; y: number } {
    const d = this.layout.dealer;
    const m = this.layout.metrics;
    const n = Math.max(this.dealerCards.length + 1, index + 1);
    const pitch = n > 1 ? Math.min(m.cardW + m.dealerGap, (d.w + this.layout.countHud.w - m.cardW) / (n - 1)) : 0;
    return { x: d.x + m.cardW / 2 + index * pitch, y: d.y + (d.h - m.cardH) / 2 };
  }

  /** Hand the renderer a fresh solve; every later placement uses it. */
  setLayout(l: TableLayout): void {
    this.layout = l;
  }

  /** A round begins: the bet marker shows the fixed unit on the first spot. */
  beginRound(): void {
    const spot = this.layout.betSpots[0];
    this.betMarker?.destroy();
    this.betMarker = roundRect(this.scene, { x: spot.x, y: spot.y, w: spot.w, h: spot.h }, {
      id: "bet marker",
      sr: "One unit bet.",
      color: 0xc8102e,
      radius: spot.w / 2,
    });
    this.betMarker.setDepth(3);
    const label = text(this.scene, spot.x + spot.w / 2, spot.y + spot.h / 2, String(TONYS.betUnits), {
      id: "bet marker label",
      sr: `${TONYS.betUnits} unit.`,
      color: "#ffffff",
      size: Math.max(10, spot.h * 0.4),
    });
    label.setOrigin(0.5, 0.5);
    this.betLabel = label;
  }

  /** Deal one card into its choreographed spot. */
  async dealCard(
    dest: "player" | "dealer",
    line: number,
    role: "initial" | "hit" | "double" | "up" | "hole",
    card: number | undefined,
  ): Promise<void> {
    const from = this.shoePoint();
    const box = { x: from.x, y: from.y, w: this.layout.metrics.cardW, h: this.layout.metrics.cardH };
    if (dest === "player") {
      const list = this.lines.get(line) ?? [];
      const to = this.playerPoint(line, list.length);
      const face = cardSprite(this.scene, this.deck, card ?? 0, box, {
        id: `hand ${line} card ${list.length + 1}`,
        debug: false,
      });
      list.push(face);
      this.lines.set(line, list);
      await place(this.runner, face, from, to, ANIM.place);
      return;
    }
    if (role === "hole") {
      const to = this.dealerPoint(0);
      const back = backSprite(this.scene, this.deck, 0, box, { id: "dealer hole", debug: false });
      this.hole = back;
      this.dealerCards.push(back);
      await place(this.runner, back, from, to, ANIM.place);
      return;
    }
    if (role === "up") {
      // the up card lands ON the hole, then slides right when the hole flips
      const face = cardSprite(this.scene, this.deck, card ?? 0, box, { id: "dealer up", debug: false });
      face.setDepth(2);
      this.dealerCards.push(face);
      await place(this.runner, face, from, this.dealerPoint(0), ANIM.place);
      return;
    }
    const to = this.dealerPoint(this.dealerCards.length);
    const face = cardSprite(this.scene, this.deck, card ?? 0, box, {
      id: `dealer card ${this.dealerCards.length + 1}`,
      debug: false,
    });
    this.dealerCards.push(face);
    await place(this.runner, face, from, to, ANIM.place);
  }

  /** The hole flips face-up and the up card slides aside — the ruled reveal. */
  async revealHole(card: number): Promise<void> {
    const frame = this.deck.faceFor(card);
    const hole = this.hole;
    if (!hole) return;
    const up = this.dealerCards[1];
    const slide = up
      ? place(this.runner, up, { x: up.x, y: up.y }, this.dealerPoint(1), ANIM.place)
      : Promise.resolve();
    await flip(this.runner, hole, () => {
      hole.setTexture(frame.key);
      hole.setDisplaySize(this.layout.metrics.cardW, this.layout.metrics.cardH);
    }, ANIM.flip);
    await slide;
  }

  /** A split: the band re-solves, the cards resize and re-place. */
  async createLine(): Promise<void> {
    this.relayout();
  }

  /** A line settles: its cards pulse the outcome's tint. */
  async settleLine(line: number, outcome: LineOutcome): Promise<void> {
    const tint = OUTCOME_TINT[outcome];
    const list = this.lines.get(line) ?? [];
    await Promise.all(list.map((img) => flash(this.runner, img, tint, ANIM.flash)));
  }

  /** The round's cards sweep to the discard tray and go out. */
  async endRound(): Promise<void> {
    const d = this.layout.discard;
    const to = { x: d.x + d.w / 2, y: d.y + d.h / 2 };
    const all = [...this.dealerCards, ...[...this.lines.values()].flat()];
    await Promise.all([
      ...all.map((img) => place(this.runner, img, { x: img.x, y: img.y }, to, ANIM.place)),
      ...all.map((img) => fade(this.runner, img, ANIM.place)),
    ]);
    for (const img of all) img.destroy();
    this.dealerCards = [];
    this.lines.clear();
    this.hole = undefined;
    this.cutOut = false;
    this.betMarker?.destroy();
    this.betLabel?.destroy();
    this.betMarker = undefined;
    this.betLabel = undefined;
  }

  /** Counts and shoe state after the latest event — the HUD never recounts; the cut slides at exhaustion. */
  updateCounts(rc: number, decksRemaining: number, dealt: number): void {
    this.dealt = dealt;
    const tc = Math.trunc(rc / Math.max(decksRemaining, 0.25));
    this.countText?.setText(`RC ${rc >= 0 ? "+" : ""}${rc} · TC ${tc >= 0 ? "+" : ""}${tc}`);
    this.stack?.setDealt(dealt);
    const dealable = Math.round(CARD_STACK.pen * CARD_STACK.maxDeck);
    if (dealt >= dealable && !this.cutOut) {
      this.cutOut = true;
      void this.cutCardOut();
    }
  }

  /** The bankroll readout, live at the chip column's floor. */
  setBankroll(units: number): void {
    this.bankroll = units;
    this.bankrollText?.setText(`Bankroll ${units}`);
  }

  /** The cut card slides across the table to the dealer — last hand (idempotent). */
  async cutCardOut(): Promise<void> {
    if (this.cutOut) return;
    this.cutOut = true;
    const cut = this.stack?.cut();
    if (!cut) return;
    const d = this.layout.dealer;
    const to = { x: d.x - this.layout.metrics.cardW * 0.6, y: d.y + d.h / 2 };
    cut.setDepth(4);
    await place(this.runner, cut, { x: cut.x, y: cut.y }, to, ANIM.place);
  }

  /** The shuffle beat: the stack rebuilds fresh, the HUD resets. */
  async shuffleBeat(): Promise<void> {
    this.dealt = 0;
    this.rebuildStack();
  }

  /** Re-place every live sprite from a fresh solve (resize, split). */
  relayout(): void {
    this.rebuildStack();
    this.countText?.setPosition(this.layout.countHud.x + 8, this.layout.countHud.y + 6);
    this.bankrollText?.setPosition(this.layout.bankrollPoint.x, this.layout.bankrollPoint.y);
    for (const [line, list] of this.lines) {
      for (const [i, img] of list.entries()) {
        const p = this.playerPoint(line, i);
        img.setPosition(p.x, p.y);
        img.setDisplaySize(this.layout.metrics.cardW, this.layout.metrics.cardH);
      }
    }
    for (const [i, img] of this.dealerCards.entries()) {
      const p = this.dealerPoint(i);
      img.setPosition(p.x, p.y);
      img.setDisplaySize(this.layout.metrics.cardW, this.layout.metrics.cardH);
    }
  }
}
