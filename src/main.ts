/**
 * The bootstrap: one Phaser.Game in RESIZE scale mode inside the #game
 * element, hosting the felt scene. The DOM shell carries the accessibility
 * layer and zone variables; both surfaces re-solve from the one solver.
 */
import Phaser from "phaser";
import { FELT } from "./config.ts";
import { FeltScene } from "./scenes/feltscene.ts";
import { applyZones, mountDomShell } from "./ui/domshell.ts";
import { solveTable } from "./layout/table.ts";

mountDomShell();
const applyDomZones = (): void => applyZones(solveTable(window.innerWidth, window.innerHeight));
applyDomZones();
window.addEventListener("resize", applyDomZones);

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
