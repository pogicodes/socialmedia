import * as Phaser from "phaser";
import type { PlatformId } from "@/lib/types";
import { bridge, MAX_TREASURES } from "./bridge";
import { GuideArrow, type GuideTarget } from "./guide";
import { findPath } from "./pathfind";
import { store } from "./state";
import { DIR_COL, FEET, reportAnchor, SPEED, T, zoomFor, type Dir } from "./WorldScene";

/** Room grid (tiles). Rows 0–1 are the back wall, row H-1 the front wall with the exit gap. */
const W = 11;
const H = 9;
const EXIT = { x: 5, y: H - 1 };
const BOARD = { x: 5, y: 2 };
const PLANTS = [
  [1, 2],
  [9, 2],
];
/** Treasure chest slots: left column faces right, right column faces left. */
const SLOTS = [
  [2, 3],
  [8, 3],
  [2, 5],
  [8, 5],
  [2, 7],
  [8, 7],
];

export interface RoomData {
  platform: PlatformId;
  sfx: (key: string, volume?: number) => void;
  /** Deep link: open the notice board right away. */
  openBoard?: boolean;
}

interface Spot {
  /** -1 = notice board, else index into bridge.meta.rooms[platform] */
  index: number;
  tx: number;
  ty: number;
  stand: { x: number; y: number };
  sprite?: Phaser.GameObjects.Sprite;
}

const key = (x: number, y: number) => y * W + x;

/** Inside a building: notice board (profile + CTA), treasure chests (latest content), exit mat. */
export class RoomScene extends Phaser.Scene {
  private platform!: PlatformId;
  private sfx!: RoomData["sfx"];
  private player!: Phaser.Physics.Arcade.Sprite;
  private dir: Dir = "up";
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private blocked = new Set<number>();
  private spots: Spot[] = [];
  private current: Spot | null = null;
  private path: { x: number; y: number }[] = [];
  private pathTarget: Spot | "exit" | null = null;
  private paused = false;
  private leaving = false;
  private prompt: string | null = null;
  private arrow!: GuideArrow;
  private font = "monospace";
  private unsubs: (() => void)[] = [];

  constructor() {
    super("room");
  }

  init(data: RoomData) {
    this.platform = data.platform;
    this.sfx = data.sfx;
    this.dir = "up";
    this.blocked = new Set();
    this.spots = [];
    this.current = null;
    this.path = [];
    this.pathTarget = null;
    this.paused = false;
    this.leaving = false;
    this.prompt = null;
  }

  create(data: RoomData) {
    this.font =
      getComputedStyle(document.documentElement).getPropertyValue("--font-press-start").trim() || "monospace";
    const p = this.platform;
    const titles = (bridge.meta.rooms[p] ?? []).slice(0, Math.min(MAX_TREASURES, SLOTS.length));
    const opened = new Set(store.get().opened);

    // ---------------------------------------------------------- layout
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (x === 0 || x === W - 1 || y <= 1 || (y === H - 1 && x !== EXIT.x)) this.blocked.add(key(x, y));
    for (const [x, y] of PLANTS) this.blocked.add(key(x, y));
    this.blocked.add(key(BOARD.x, BOARD.y));
    this.spots.push({ index: -1, tx: BOARD.x, ty: BOARD.y, stand: { x: BOARD.x, y: BOARD.y + 1 } });
    titles.forEach((_, i) => {
      const [x, y] = SLOTS[i];
      this.blocked.add(key(x, y));
      this.spots.push({ index: i, tx: x, ty: y, stand: { x: x < W / 2 ? x + 1 : x - 1, y } });
    });

    this.drawRoom(Phaser.Display.Color.HexStringToColor(bridge.meta.colors[p] ?? "#888888").color);

    this.add
      .image(BOARD.x * T + 8, (BOARD.y + 1) * T, `sign-${p}`)
      .setOrigin(0.5, 1)
      .setDepth((BOARD.y + 1) * T);
    for (const s of this.spots) {
      if (s.index < 0) continue;
      s.sprite = this.add
        .sprite(s.tx * T + 8, s.ty * T + 8, "chest", opened.has(`${p}:${s.index}`) ? 1 : 0)
        .setDepth(s.ty * T + 14);
    }

    // ---------------------------------------------------------- physics
    this.physics.world.setBounds(0, 0, W * T, H * T);
    const walls = [...this.blocked].map((k) => {
      const z = this.add.zone((k % W) * T + 8, Math.floor(k / W) * T + 8, T, T);
      this.physics.add.existing(z, true);
      return z;
    });
    this.player = this.physics.add.sprite(EXIT.x * T + 8, (EXIT.y - 1) * T + 8 - FEET, "pogi", DIR_COL.up);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(10, 6).setOffset(3, 18);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, walls);

    // ---------------------------------------------------------- camera
    const cam = this.cameras.main;
    cam.setBackgroundColor("#1b1b2f");
    this.fit();
    this.scale.on("resize", this.fit, this);
    cam.fadeIn(220, 0, 0, 0);
    this.arrow = new GuideArrow(this);

    // ---------------------------------------------------------- input
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER", false) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on("keydown-SPACE", () => this.interact());
    kb.on("keydown-ENTER", () => this.interact());

    this.unsubs.push(
      bridge.on("tap", ({ x, y }) => this.tapTo(x, y)),
      bridge.on("interact", () => this.interact()),
      bridge.on("pause", (v) => this.setPaused(v)),
      bridge.on("newgame", () => this.scene.stop()),
      bridge.on("healed", (n) => this.floatText(`Ayos! +${n} ❤`, "#ff5c8a")),
      bridge.on("cleared", (id) => id === p && this.floatText("★ CLEARED!", "#ffe14d")),
    );
    // game.destroy() skips "shutdown", so drop bridge listeners on "destroy" too
    this.events.once("destroy", () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });
    this.events.once("shutdown", () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.scale.off("resize", this.fit, this);
      bridge.emit("prompt", null);
      bridge.emit("room", null);
    });

    bridge.emit("room", p);
    if (data.openBoard) this.time.delayedCall(250, () => this.open(this.spots[0]));
  }

  // ============================================================ drawing

  private drawRoom(color: number) {
    const g = this.add.graphics().setDepth(0);
    const px = (x: number, y: number, w: number, h: number, c: number, a = 1) => g.fillStyle(c, a).fillRect(x, y, w, h);
    const tint = (c: number, by: number) => Phaser.Display.Color.ValueToColor(c).clone().lighten(by).color;
    const shade = (c: number, by: number) => Phaser.Display.Color.ValueToColor(c).clone().darken(by).color;

    // wooden floor planks
    px(T, 2 * T, (W - 2) * T, (H - 3) * T, 0xc8935a);
    for (let y = 2 * T; y < (H - 1) * T; y += 6) {
      px(T, y + 5, (W - 2) * T, 1, 0xa8743f);
      const off = ((y / 6) % 3) * 13;
      for (let x = T + off; x < (W - 1) * T; x += 40) px(x, y, 1, 5, 0xa8743f);
    }

    // rug in the platform color
    const rx = 3 * T + 4;
    const ry = 3 * T + 2;
    const rw = 5 * T - 8;
    const rh = 4 * T + 4;
    px(rx - 1, ry - 1, rw + 2, rh + 2, 0x000000, 0.35);
    px(rx, ry, rw, rh, color);
    px(rx + 3, ry + 3, rw - 6, rh - 6, tint(color, 12));
    px(rx + 5, ry + 5, rw - 10, rh - 10, color);

    // back wall: plaster, colored wainscot, baseboard, two windows
    px(0, 0, W * T, 2 * T, 0xf3e2c0);
    px(0, T + 4, W * T, T - 6, color);
    px(0, T + 4, W * T, 1, shade(color, 20));
    px(0, 2 * T - 2, W * T, 2, 0x5a3d24);
    for (const wx of [2 * T, 7 * T]) {
      px(wx - 1, 3, 2 * T + 2, T - 2, 0x5a3d24);
      px(wx + 1, 5, 2 * T - 2, T - 6, 0x9ee3ff);
      px(wx + T - 1, 5, 2, T - 6, 0x5a3d24);
      px(wx + 3, 7, 4, 2, 0xffffff, 0.8);
    }

    // side + front walls
    px(0, 2 * T, T, (H - 2) * T, 0x5a3d24);
    px(T - 3, 2 * T, 3, (H - 3) * T, 0x7a5434);
    px((W - 1) * T, 2 * T, T, (H - 2) * T, 0x5a3d24);
    px((W - 1) * T, 2 * T, 3, (H - 3) * T, 0x7a5434);
    px(0, (H - 1) * T, W * T, T, 0x5a3d24);
    px(T, (H - 1) * T, (W - 2) * T, 3, 0x7a5434);

    // exit doorway + mat
    const ex = EXIT.x * T;
    const ey = EXIT.y * T;
    px(ex, ey, T, T, 0xc8935a);
    px(ex + 1, ey + 2, T - 2, T - 4, 0x8b2f2f);
    for (let i = 0; i < 3; i++) px(ex + 3, ey + 4 + i * 3, T - 6, 1, 0xe8b04a);
    this.add
      .text(ex + 8, ey + T + 1, "▼ EXIT", {
        fontFamily: this.font,
        fontSize: "5px",
        color: "#fff",
        stroke: "#000",
        strokeThickness: 2,
        resolution: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(9_000);

    // potted plants
    for (const [x, y] of PLANTS) {
      const cx = x * T + 8;
      const cy = y * T + 8;
      px(cx - 4, cy + 1, 8, 6, 0x9c4a22);
      px(cx - 5, cy, 10, 2, 0xb85a2c);
      g.fillStyle(0x2f8f3a, 1).fillCircle(cx, cy - 3, 6);
      g.fillStyle(0x45b34f, 1).fillCircle(cx - 2, cy - 5, 3).fillCircle(cx + 3, cy - 2, 2.5);
    }

    // place name above the room
    this.add
      .text((W * T) / 2, -4, (bridge.meta.names[this.platform] ?? this.platform).toUpperCase(), {
        fontFamily: this.font,
        fontSize: "8px",
        color: "#fff",
        stroke: "#000",
        strokeThickness: 3,
        resolution: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(9_000);
  }

  private fit() {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    const z = zoomFor(width, height);
    cam.setZoom(z);
    // Follow Pogi, but on any axis where the room (plus its title row) fits, pin it centred.
    // Phaser left-aligns bounds smaller than the view, so pad them to the view size.
    const axis = (start: number, size: number, view: number) =>
      size <= view ? [start - (view - size) / 2, view] : [start, size];
    const [bx, bw] = axis(0, W * T, width / z);
    const [by, bh] = axis(-T, (H + 1) * T, height / z);
    cam.setBounds(bx, by, bw, bh);
    cam.startFollow(this.player, true, 0.12, 0.12);
  }

  // ============================================================ helpers

  private isBlocked = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= W || ty >= H || this.blocked.has(key(tx, ty));

  private feetTile() {
    return { x: Math.floor(this.player.x / T), y: Math.floor((this.player.y + FEET) / T) };
  }

  private setPaused(v: boolean) {
    this.paused = v;
    if (v) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.physics.world.pause();
    } else this.physics.world.resume();
  }

  private floatText(text: string, color: string) {
    const t = this.add
      .text(this.player.x, this.player.y - 16, text, {
        fontFamily: this.font,
        fontSize: "8px",
        color,
        stroke: "#000",
        strokeThickness: 3,
        resolution: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(10_000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  private label(s: Spot) {
    if (s.index < 0) return `READ ${(bridge.meta.names[this.platform] ?? "BOARD").toUpperCase()} BOARD`;
    const total = this.spots.length - 1;
    const seen = store.get().opened.includes(`${this.platform}:${s.index}`);
    return `${seen ? "REOPEN" : "OPEN"} TREASURE ${s.index + 1}/${total}`;
  }

  /** Board first (follow CTA), then unopened chests, then the way out. */
  private goal(): GuideTarget & { spot?: Spot } {
    const opened = store.get().opened;
    const next = this.spots.find((s) => !opened.includes(`${this.platform}:${s.index}`));
    if (next?.index === -1)
      return { x: next.tx * T + 8, y: next.ty * T - 10, ground: { x: next.tx * T + 8, y: (next.ty + 1) * T - 2 }, icon: { key: `sign-${this.platform}` }, spot: next };
    if (next) return { x: next.tx * T + 8, y: next.ty * T + 2, ground: { x: next.tx * T + 8, y: next.ty * T + 14 }, icon: { key: "chest", frame: 0, scale: 1.5 }, spot: next };
    return { x: EXIT.x * T + 8, y: EXIT.y * T, ground: { x: EXIT.x * T + 8, y: EXIT.y * T + 8 } };
  }

  // ============================================================ actions

  private interact() {
    if (this.paused || !this.sys.isActive()) return;
    if (this.current) this.open(this.current);
  }

  private open(s: Spot) {
    const id = `${this.platform}:${s.index}`;
    if (!store.get().opened.includes(id)) {
      const points = s.index >= 0 ? 1 : 0;
      store.set((st) => ({ opened: [...st.opened, id], score: st.score + points }));
      if (points) {
        this.sfx("coin", 0.5);
        this.floatText("+1", "#ffe14d");
      }
    }
    if (s.sprite) {
      s.sprite.setFrame(1);
      this.tweens.add({ targets: s.sprite, scaleY: 1.2, yoyo: true, duration: 90 });
    }
    this.sfx("open");
    this.prompt = null; // re-emit after the modal closes (label may change to REOPEN)
    bridge.emit("item", { platform: this.platform, index: s.index });
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.player.setVelocity(0, 0);
    this.sfx("close");
    const platform = this.platform;
    this.cameras.main.fadeOut(160, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
      this.scene.wake("world", { platform });
    });
  }

  private tapTo(sx: number, sy: number) {
    if (this.paused || !this.sys.isActive() || this.leaving) return;
    const wp = this.cameras.main.getWorldPoint(sx, sy);
    const tx = Math.floor(wp.x / T);
    const ty = Math.floor(wp.y / T);
    // the board sign stands a tile taller than its footprint
    const spot = this.spots.find((s) => s.tx === tx && (s.ty === ty || (s.index < 0 && ty === s.ty - 1)));
    let target: { x: number; y: number };
    this.pathTarget = null;
    if (spot) {
      target = spot.stand;
      this.pathTarget = spot;
    } else if (tx === EXIT.x && ty >= EXIT.y) {
      target = EXIT;
      this.pathTarget = "exit";
    } else {
      // nearest walkable tile around the tap
      let best: { x: number; y: number } | null = this.isBlocked(tx, ty) ? null : { x: tx, y: ty };
      for (let r = 1; r <= 3 && !best; r++)
        for (let dy = -r; dy <= r && !best; dy++)
          for (let dx = -r; dx <= r && !best; dx++) if (!this.isBlocked(tx + dx, ty + dy)) best = { x: tx + dx, y: ty + dy };
      if (!best) return;
      target = best;
    }
    const start = this.feetTile();
    const path = findPath(this.isBlocked, () => 1, W, H, start.x, start.y, target.x, target.y);
    if (!path) return;
    this.path = path;
    if (!path.length && this.pathTarget) this.arrive();

    const m = this.add.circle(target.x * T + 8, target.y * T + 8, 3, 0xffffff, 0.9).setDepth(1);
    this.tweens.add({ targets: m, scale: 2.5, alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  private arrive() {
    const t = this.pathTarget;
    this.path = [];
    this.pathTarget = null;
    this.player.setVelocity(0, 0);
    if (t === "exit") return this.leave();
    if (t) {
      this.dir = t.index < 0 ? "up" : t.tx < t.stand.x ? "left" : "right";
      this.player.setFrame(DIR_COL[this.dir]);
      this.open(t);
    }
  }

  // ============================================================ loop

  update(time: number) {
    if (this.leaving) return;
    reportAnchor(this, this.player);
    this.arrow.update(this.paused ? null : this.arrowTarget(), time);
    if (this.paused) return;

    const k = this.keys;
    let mx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let my = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (!mx && !my) {
      mx = bridge.input.x;
      my = bridge.input.y;
    }
    if (mx || my) {
      this.path = [];
      this.pathTarget = null;
    }

    let vx = 0;
    let vy = 0;
    if (this.path.length) {
      const next = this.path[0];
      const tx = next.x * T + 8;
      const ty = next.y * T + 8 - FEET;
      const dx = tx - this.player.x;
      const dy = ty - this.player.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        this.player.setPosition(tx, ty);
        this.path.shift();
        if (!this.path.length) return this.arrive();
      } else if (Math.abs(dx) > Math.abs(dy)) vx = Math.sign(dx);
      else vy = Math.sign(dy);
    } else if (Math.abs(mx) > Math.abs(my)) vx = Math.sign(mx);
    else if (my) vy = Math.sign(my);

    this.player.setVelocity(vx * SPEED, vy * SPEED);
    if (vx || vy) {
      this.dir = vx > 0 ? "right" : vx < 0 ? "left" : vy > 0 ? "down" : "up";
      this.player.anims.play(`walk-${this.dir}`, true);
    } else {
      this.player.anims.stop();
      this.player.setFrame(DIR_COL[this.dir]);
    }
    this.player.setDepth(this.player.y + FEET);

    // what are we standing next to?
    const f = this.feetTile();
    if (f.x === EXIT.x && f.y >= EXIT.y) return this.leave();
    const cur = this.spots.find((s) => Math.abs(s.tx - f.x) + Math.abs(s.ty - f.y) === 1) ?? null;
    this.current = cur;
    const prompt = cur ? this.label(cur) : null;
    if (prompt !== this.prompt) {
      this.prompt = prompt;
      bridge.emit("prompt", prompt);
    }
  }

  private arrowTarget() {
    const g = this.goal();
    return g.spot && g.spot === this.current ? null : g;
  }
}
