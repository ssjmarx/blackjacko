/**
 * The bootstrap: one Phaser.Game in RESIZE scale mode inside the #game
 * element, hosting the felt scene. The DOM shell (index.html) carries the
 * accessibility layer; the canvas carries the table.
 */
import Phaser from "phaser";
import { FELT } from "./config.ts";
import { FeltScene } from "./scenes/feltscene.ts";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: FELT.background,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [FeltScene],
});
