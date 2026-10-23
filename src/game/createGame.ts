import * as Phaser from "phaser";
import { WorldScene } from "./WorldScene";

/** Client-only entry; imported dynamically so Phaser never ships in the initial bundle. */
export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#5ec8ff",
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    physics: { default: "arcade", arcade: { debug: false } },
    input: { keyboard: true, mouse: false, touch: false },
    audio: { disableWebAudio: false },
    scene: [WorldScene],
  });
}
