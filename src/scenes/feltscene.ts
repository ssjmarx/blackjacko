/**
 * The felt scene — the table surface everything else lands on. pt2 adds the
 * debug zone overlay through the render kit: one solve drives the canvas
 * zones, the DOM probes, and the size/axis readout, live on every resize.
 */
import Phaser from "phaser";
import { solveTable, unionRects, MARGIN_FRAC, type Rect, type TableLayout } from "../layout/table.ts";
import { CARD_STACK, DEBUG, FELT, TONYS } from "../config.ts";
import { destroy, rect, text } from "../ui/kit.ts";
import { announce, registerObject, showLowerThird } from "../ui/domshell.ts";
import { englishDeck } from "../ui/decks/english.ts";
import { cardSprite } from "../ui/cardart.ts";
import { deckStack, shoeRow } from "../ui/cardstack.ts";
import { paintCutIn, paintWood } from "../ui/wood.ts";
import { sessionSeed } from "../ui/session.ts";
import { CommandBus } from "../ui/input/bus.ts";
import { mountControls } from "../ui/input/controls.ts";
import type { Deck } from "../ui/decks/deck.ts";

/** Debug zone colors (canvas numbers) — readable ink on the felt, debug-only. */
const ZONE_COLORS = {
  dealer: 0x3b82f6,
  player: 0x22c55e,
  shoe: 0xf97316,
  deckExtra: 0xc2410c,
  pit: 0x94a3b8,
  discard: 0x14b8a6,
  chipTray: 0xa855f7,
  controls: 0xf59e0b,
  countHud: 0xeab308,
  insuranceSpot: 0xec4899,
  lineSlot: 0xffffff,
  betSpot: 0x22d3ee,
} as const;

/** The one Phaser scene: boots the felt and re-flows it on every resize. */
export class FeltScene extends Phaser.Scene {
  private readout?: Phaser.GameObjects.Text;
  private overlay: { obj: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text; id: string }[] = [];
  private cards: { obj: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics; id: string }[] = [];
  private readouts: { obj: Phaser.GameObjects.Text; id: string }[] = [];
  private wood?: Phaser.GameObjects.Image;
  private shadow?: Phaser.GameObjects.Graphics;
  private felt?: Phaser.GameObjects.Rectangle;
  private layout?: TableLayout;
  private deck?: Deck;
  private bus = new CommandBus();
  private controls?: ReturnType<typeof mountControls>;

  constructor() {
    super("felt");
  }

  /** Load the deck's art files before the scene boots. */
  preload(): void {
    this.deck = englishDeck();
    for (let b = 0; b < this.deck.backCount; b++) {
      const f = this.deck.backFor(b);
      this.load.svg(f.key, f.file);
    }
    for (let c = 0; c < 52; c++) {
      const f = this.deck.faceFor(c);
      this.load.svg(f.key, f.file);
    }
  }

  /** Boot the felt: camera background, the readout, and the resize hook. */
  create(): void {
    this.cameras.main.setBackgroundColor(FELT.background);
    if (DEBUG.layout) {
      this.readout = text(this, 8, 8, "", {
        id: "readout",
        sr: "Canvas size and dealing axis readout",
        color: FELT.readout,
        debug: true,
      });
    }
    this.reflow(this.scale.gameSize.width, this.scale.gameSize.height);
    this.scale.on("resize", (size: Phaser.Structs.Size) => this.reflow(size.width, size.height));
    this.controls = mountControls(this.bus);
    if (this.layout) this.controls.layout(this.layout);
    this.controls.setMode("idle");
    this.bus.on((c) => {
      if (c.kind === "book") announce("The strategy card opens here in pt6 — the basic strategy and index tables.");
    });
    announce("Welcome to blackjacko. Tony's Backroom: one deck, dealer stands on all 17s, blackjack pays 3 to 2.");
    if (this.deck && this.layout) {
      showLowerThird(this.deck.creditLines().join("\n"), this.layout);
      registerObject("deck credit", "text", `Deck: ${this.deck.creditLines().join(", ")}.`);
    }
    if (this.deck) this.proveDeck();
  }

  /** Re-solve the table, repaint the wood rail and every debug zone for the viewport. */
  private reflow(w: number, h: number): void {
    this.layout = solveTable(w, h);
    if (this.wood) destroy(this, this.wood, "wood rail");
    this.wood = paintWood(this, { x: 0, y: 0, w, h }, this.layout.safe, sessionSeed());
    this.wood.setDepth(-12);
    if (this.felt) destroy(this, this.felt, "felt");
    this.felt = rect(this, this.layout.safe, { id: "felt", sr: "The felt table surface.", color: FELT.fill });
    this.felt.setDepth(-10);
    if (this.shadow) destroy(this, this.shadow, "felt cut-in shadow");
    this.shadow = paintCutIn(this, this.layout.safe, Math.min(w, h) * MARGIN_FRAC);
    for (const o of this.overlay) destroy(this, o.obj, o.id);
    this.overlay = [];
    for (const c of this.cards) destroy(this, c.obj, c.id);
    this.cards = [];
    for (const r of this.readouts) destroy(this, r.obj, r.id);
    this.readouts = [];
    if (DEBUG.layout) this.paintReadout(w, h);
    this.paintTableReadouts();
    if (DEBUG.layout) this.paintZones();
    this.controls?.layout(this.layout);
    if (this.deck) this.proveDeck();
  }

  /** The table's standing readouts: bankroll on the chip column's floor, stakes on the pit's floor (spec E14). */
  private paintTableReadouts(): void {
    const l = this.layout;
    if (!l) return;
    const bank = text(this, l.bankrollPoint.x, l.bankrollPoint.y, `Bankroll ${TONYS.bankroll}`, {
      id: "bankroll",
      sr: `Bankroll ${TONYS.bankroll} units.`,
      color: FELT.readout,
      size: 15,
    });
    bank.setOrigin(0.5, 1);
    this.readouts.push({ obj: bank, id: "bankroll" });
    const stakes = text(this, l.stakesPoint.x, l.stakesPoint.y, `Table ${TONYS.min} – ${TONYS.max}`, {
      id: "table stakes",
      sr: `Table minimum ${TONYS.min}, maximum ${TONYS.max}.`,
      color: FELT.readout,
      size: 15,
    });
    stakes.setOrigin(0.5, 1);
    this.readouts.push({ obj: stakes, id: "table stakes" });
    const rules = text(this, l.rulesPoint.x, l.rulesPoint.y, TONYS.ruleTags.join(" · "), {
      id: "table rules",
      sr: `Table rules: ${TONYS.ruleTags.join("; ")}.`,
      color: FELT.readout,
      size: 15,
    });
    rules.setOrigin(0.5, 1);
    this.readouts.push({ obj: rules, id: "table rules" });
  }

  /** The pt3 proof: A♠ at true card metrics; the deck stack bleeds into deck extra at 75% pen. */
  private proveDeck(): void {
    const l = this.layout;
    const d = this.deck;
    if (!l || !d) return;
    const cardSize = { w: l.metrics.cardW, h: l.metrics.cardH };
    const aceBox = {
      x: l.dealer.x + (l.dealer.w - cardSize.w) / 2,
      y: l.dealer.y + (l.dealer.h - cardSize.h) / 2,
      ...cardSize,
    };
    const ace = cardSprite(this, d, 0, aceBox, { id: "proof ace of spades", debug: true });
    this.cards.push({ obj: ace, id: "proof ace of spades" });
    const deckExtent = unionRects(l.shoe, l.deckExtra);
    const stack = deckStack(this, d, deckExtent, {
      id: "proof deck stack",
      debug: true,
      cell: l.shoe,
      want: { x: 0, y: 0, ...cardSize },
      remaining: Math.round(0.75 * CARD_STACK.maxDeck) - 1,
      pen: 0.75,
      max: CARD_STACK.maxDeck,
      perCard: CARD_STACK.deckPx,
    });
    for (const img of stack) this.cards.push({ obj: img, id: "proof deck stack" });
    // the row-form sample runs the pit from its window-side edge (its true plant is the
    // shoe cell, which hosts the deck stack in this proof; the extents are unit-tested)
    const row = shoeRow(this, d, l.pit, {
      id: "proof shoe row",
      debug: true,
      cell: l.shoe,
      want: { x: 0, y: 0, ...cardSize },
      remaining: Math.round(0.75 * CARD_STACK.maxShoe) - 1,
      pen: 0.75,
      max: CARD_STACK.maxShoe,
      perCard: CARD_STACK.shoePx,
    });
    for (const img of row) this.cards.push({ obj: img, id: "proof shoe row" });
  }

  /** Update the size/axis readout (flips with the aspect, per goal 1). */
  private paintReadout(w: number, h: number): void {
    if (!this.readout) return;
    const portrait = h > w;
    const axis = `${portrait ? "PORTRAIT" : "LANDSCAPE"} — dealer top, player bottom`;
    this.readout.setText(`${w}×${h} · ${axis}`);
  }

  /** Draw the debug zone overlay: one outlined, labeled rect per zone. */
  private paintZones(): void {
    const l = this.layout;
    if (!l) return;
    const add = (r: Rect, color: number, id: string, sr: string): void => {
      if (r.w <= 0 || r.h <= 0) return;
      const obj = rect(this, r, { id, sr, color, alpha: 0.14, outlined: true, debug: true });
      this.overlay.push({ obj, id });
      const label = text(this, r.x + 3, r.y + 3, id, {
        id: `${id} label`,
        sr,
        color: "#ffffff",
        size: 11,
        debug: true,
      });
      this.overlay.push({ obj: label, id: `${id} label` });
    };
    add(l.dealer, ZONE_COLORS.dealer, "dealer", "The dealer's cards.");
    add(l.player, ZONE_COLORS.player, "player", "Your hands.");
    add(l.shoe, ZONE_COLORS.shoe, "shoe", "The dealing shoe, with the cut card.");
    add(l.deckExtra, ZONE_COLORS.deckExtra, "deckExtra", "The deck stack's bleed room.");
    add(l.pit, ZONE_COLORS.pit, "pit", "The middle of the table.");
    add(l.discard, ZONE_COLORS.discard, "discard", "The discard tray.");
    add(l.chipTray, ZONE_COLORS.chipTray, "chipTray", "Your chip tray.");
    add(l.controls, ZONE_COLORS.controls, "controls", "The action bar.");
    add(l.countHud, ZONE_COLORS.countHud, "countHud", "The running and true count.");
    for (const [i, s] of l.lineSlots.entries()) {
      add(s, ZONE_COLORS.lineSlot, `slot${i + 1}`, `Player line slot ${i + 1}.`);
    }
    for (const [i, b] of l.betSpots.entries()) {
      add(b, ZONE_COLORS.betSpot, `bet${i + 1}`, `Bet spot ${i + 1}.`);
    }
    for (const [i, s] of l.insuranceSpots.entries()) {
      add(s, ZONE_COLORS.insuranceSpot, `insurance${i + 1}`, `Insurance spot ${i + 1}.`);
    }
  }
}
