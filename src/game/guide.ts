import * as Phaser from "phaser";

/** Chunky pixel arrow pointing down: o outline, h highlight, y gold, s shade. */
const ARROW = [
  "....ooooo....",
  "....ohyso....",
  "....ohyso....",
  "....ohyso....",
  "ooooohysooooo",
  "ohhyyyyyyysso",
  ".ohyyyyyyyso.",
  "..ohyyyyyso..",
  "...ohyyyso...",
  "....ohyso....",
  ".....oyo.....",
  "......o......",
];
const PALETTE: Record<string, string> = { o: "#2b1a00", h: "#fff6b0", y: "#ffd23f", s: "#e39a0b" };
const TEX = "guide-arrow";
/** Screen px per arrow pixel. */
const PX = 4;
/** Screen-space margins the edge badge keeps; top clears the HUD. */
const INSET = { top: 84, side: 40, bottom: 44 };
const BADGE_R = 17;

export interface GuideTarget {
  /** Where the arrow tip points (just above the thing). */
  x: number;
  y: number;
  /** Ground spot for the pulsing ring (defaults to x, y). */
  ground?: { x: number; y: number };
  /** Shown inside the screen-edge badge when the target is off screen. */
  icon?: { key: string; frame?: number; scale?: number };
}

function ensureTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(TEX)) return;
  const w = ARROW[0].length;
  const tex = scene.textures.createCanvas(TEX, w, ARROW.length)!;
  const ctx = tex.getContext();
  ARROW.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (!PALETTE[c]) return;
      ctx.fillStyle = PALETTE[c];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  tex.refresh();
}

/**
 * Quest marker: a bouncing pixel arrow + pulsing ground ring over the target while it is
 * on screen; a round badge with the target's icon pinned to the screen edge when it is not.
 * Keeps a constant on-screen size at any camera zoom.
 */
export class GuideArrow {
  private arrow: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private badge: Phaser.GameObjects.Container;
  private badgeIcon: Phaser.GameObjects.Image;
  private badgeArrow: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene) {
    ensureTexture(scene);
    this.ring = scene.add.graphics().setDepth(2);
    this.arrow = scene.add.image(0, 0, TEX).setOrigin(0.5, 1).setDepth(20_000);

    const disc = scene.add.graphics();
    disc.fillStyle(0x000000, 0.35).fillCircle(0, 3, BADGE_R + 3);
    disc.fillStyle(0x2b1a00, 1).fillCircle(0, 0, BADGE_R + 3);
    disc.fillStyle(0xffd23f, 1).fillCircle(0, 0, BADGE_R + 1);
    disc.fillStyle(0x1b1b2f, 1).fillCircle(0, 0, BADGE_R - 2);
    this.badgeIcon = scene.add.image(0, 0, TEX);
    this.badgeArrow = scene.add.image(0, 0, TEX).setScale(2).setOrigin(0.5, 1);
    this.badge = scene.add.container(0, 0, [this.badgeArrow, disc, this.badgeIcon]).setDepth(20_001);
  }

  update(target: GuideTarget | null, time: number) {
    const cam = this.scene.cameras.main;
    const z = cam.zoom;
    const v = cam.worldView;
    if (!target) {
      this.arrow.setVisible(false);
      this.ring.setVisible(false);
      this.badge.setVisible(false);
      return;
    }

    const onScreen = Phaser.Geom.Rectangle.Contains(v, target.x, target.y);
    this.arrow.setVisible(onScreen);
    this.ring.setVisible(onScreen);
    this.badge.setVisible(!onScreen);

    if (onScreen) {
      // bounce: quick hop, soft landing, slight squash on touchdown
      const t = (time % 900) / 900;
      const hop = Math.sin(t * Math.PI);
      const s = PX / z;
      this.arrow
        .setPosition(Math.round(target.x * z) / z, target.y - hop * 5 * s)
        .setScale(s * (1 + (1 - hop) * 0.08), s * (1 - (1 - hop) * 0.1));

      const g = target.ground ?? target;
      const p = (time % 1300) / 1300;
      this.ring.clear();
      for (const k of [p, (p + 0.5) % 1]) {
        const a = (1 - k) * 0.95;
        this.ring.lineStyle(5 / z, 0x2b1a00, a * 0.6).strokeEllipse(g.x, g.y, 6 + k * 16, 3 + k * 8);
        this.ring.lineStyle(3 / z, 0xffe14d, a).strokeEllipse(g.x, g.y, 6 + k * 16, 3 + k * 8);
      }
      return;
    }

    // off screen: badge clamped to the screen edge, arrow orbiting toward the target
    const inner = new Phaser.Geom.Rectangle(
      v.x + INSET.side / z,
      v.y + INSET.top / z,
      v.width - (INSET.side * 2) / z,
      v.height - (INSET.top + INSET.bottom) / z,
    );
    const cx = inner.centerX;
    const cy = inner.centerY;
    const dx = target.x - cx;
    const dy = target.y - cy;
    const k = Math.min(dx ? inner.width / 2 / Math.abs(dx) : Infinity, dy ? inner.height / 2 / Math.abs(dy) : Infinity);
    const a = Math.atan2(dy, dx);
    const nudge = Math.sin(time / 180) * 2;
    this.badge.setPosition(cx + dx * k, cy + dy * k).setScale(1 / z);
    this.badgeArrow
      .setRotation(a - Math.PI / 2)
      .setPosition(Math.cos(a) * (BADGE_R + 16 + nudge), Math.sin(a) * (BADGE_R + 16 + nudge));
    const icon = target.icon ?? { key: TEX, scale: 1.5 };
    if (this.badgeIcon.texture.key !== icon.key || this.badgeIcon.frame.name !== String(icon.frame ?? "__BASE"))
      this.badgeIcon.setTexture(icon.key, icon.frame);
    this.badgeIcon.setScale(icon.scale ?? 1.25);
  }

  destroy() {
    this.arrow.destroy();
    this.ring.destroy();
    this.badge.destroy();
  }
}
