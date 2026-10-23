/**
 * The felt scene — the table surface everything else lands on. pt1 ships the
 * bare table: felt at any aspect ratio plus a debug readout of canvas size and
 * orientation; the zone solver (pt2) replaces the readout with real placement.
 */
import Phaser from "phaser";
import { DEBUG, FELT } from "../config.ts";

/** The one Phaser scene: boots the felt and re-flows it on every resize. */
export class FeltScene extends Phaser.Scene {
  private readout?: Phaser.GameObjects.Text;

  constructor() {
    super("felt");
  }

  /** Boot the felt: camera background, the debug readout, and the resize hook. */
  create(): void {
    this.cameras.main.setBackgroundColor(FELT.background);
    this.readout = this.add.text(8, 8, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: FELT.readout,
    });
    this.paint(this.scale.gameSize);
    this.scale.on("resize", (size: Phaser.Structs.Size) => this.paint(size));
  }

  /** Repaint the readout for the current game size; flips with the aspect. */
  private paint(size: Phaser.Structs.Size): void {
    if (!this.readout) return;
    if (!DEBUG.layout) {
      this.readout.setText("");
      return;
    }
    const portrait = size.height > size.width;
    const axis = portrait ? "PORTRAIT — dealer top, player bottom" : "LANDSCAPE — dealer left, player right";
    this.readout.setText(`${size.width}×${size.height} · ${axis}`);
  }
}
